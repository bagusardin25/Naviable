import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchContributions, type ContributionReport } from '@/lib/api';
import { markReviewsSeen, unseenReviewIds } from '@/lib/contributionUpdates';

// How often a signed-in contributor's reports are re-checked while the tab is visible,
// so an approval or rejection shows up without the user having to navigate.
const POLL_INTERVAL_MS = 60_000;

/**
 * Pull-based "a reviewer has decided on your contribution" feed. Fetches the signed-in
 * citizen's own reports and derives which decisions this device has not seen yet.
 * Re-checks when `refreshKey` changes (e.g. screen navigation), every minute while the
 * tab is visible, and whenever the tab regains focus.
 */
export function useContributionUpdates(signedIn: boolean, refreshKey: unknown) {
  const [reports, setReports] = useState<ContributionReport[]>([]);
  // Bumped after marking decisions seen, since "seen" lives in localStorage, not state.
  const [seenVersion, setSeenVersion] = useState(0);

  const load = useCallback(() => {
    if (!signedIn) return;
    fetchContributions()
      .then((data) => setReports(data.reports))
      .catch(() => { /* silent: notifications are a convenience, never block the app */ });
  }, [signedIn]);

  useEffect(() => {
    if (!signedIn) return;
    let active = true;
    fetchContributions()
      .then((data) => { if (active) setReports(data.reports); })
      .catch(() => {});
    return () => { active = false; };
  }, [signedIn, refreshKey]);

  useEffect(() => {
    if (!signedIn) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, POLL_INTERVAL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    window.addEventListener('focus', load);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', load);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [signedIn, load]);

  const visibleReports = useMemo(() => (signedIn ? reports : []), [signedIn, reports]);
  const unseenIds = useMemo(
    () => unseenReviewIds(visibleReports),
    // seenVersion forces a re-read of the localStorage "seen" set after marking.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibleReports, seenVersion]
  );

  /** Marks every current decision as seen on this device. */
  const markAllSeen = useCallback(() => {
    markReviewsSeen(visibleReports);
    setSeenVersion((version) => version + 1);
  }, [visibleReports]);

  /** Re-checks now, e.g. after the profile page marked decisions as seen. */
  const refresh = useCallback(() => {
    setSeenVersion((version) => version + 1);
    load();
  }, [load]);

  return { unseen: unseenIds.size, unseenIds, reports: visibleReports, markAllSeen, refresh };
}
