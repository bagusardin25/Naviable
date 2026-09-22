import { useCallback, useEffect, useState } from 'react';
import { fetchContributions } from '@/lib/api';
import { countUnseenReviews } from '@/lib/contributionUpdates';

/**
 * Pull-based indicator for "the admin has responded to your contribution".
 * Fetches the signed-in citizen's own reports and counts reviewed ones not yet seen
 * on this device. Re-runs whenever `refreshKey` changes (e.g. screen navigation),
 * so leaving the profile — which marks them seen — clears the badge.
 */
export function useContributionUpdates(signedIn: boolean, refreshKey: unknown) {
  const [count, setCount] = useState(0);

  // Manual re-check (e.g. after the profile marks updates as seen).
  const refresh = useCallback(() => {
    if (!signedIn) return;
    fetchContributions()
      .then(data => setCount(countUnseenReviews(data.reports)))
      .catch(() => { /* silent: the badge is a convenience, never blocks the app */ });
  }, [signedIn]);

  useEffect(() => {
    if (!signedIn) return;
    let active = true;
    fetchContributions()
      .then(data => { if (active) setCount(countUnseenReviews(data.reports)); })
      .catch(() => {});
    return () => { active = false; };
  }, [signedIn, refreshKey]);

  // Derived so signing out shows 0 without a synchronous state update.
  return { unseen: signedIn ? count : 0, refresh };
}
