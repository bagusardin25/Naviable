import type { ContributionReport, ReviewStatus } from './api';

// Tracks which reviewed contributions the citizen has already seen, per device (localStorage).
// "Reviewed" = admin has responded; a still-pending SUBMITTED report is not treated as an update.
// Covers BOTH contribution types (Tambah Lokasi Baru and Laporkan Perubahan) — both are reports
// sharing one review lifecycle.

const KEY = 'naviable_seen_reviews_v1';
const REVIEWED: ReadonlySet<ReviewStatus> = new Set<ReviewStatus>([
  'APPROVED',
  'NEEDS_REVISION',
  'REJECTED',
  'PUBLISHED',
]);

// Signature changes whenever the decision changes, so a re-review re-notifies.
function signature(report: ContributionReport): string | null {
  if (!report.reviewStatus || !REVIEWED.has(report.reviewStatus)) return null;
  return `${report.id}:${report.reviewStatus}:${report.reviewedAt ?? ''}`;
}

function readSeen(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

/** Number of reviewed contributions the citizen has not seen yet. */
export function countUnseenReviews(reports: ContributionReport[]): number {
  const seen = readSeen();
  return reports.reduce((total, report) => {
    const sig = signature(report);
    return sig && !seen.has(sig) ? total + 1 : total;
  }, 0);
}

/** IDs of reports whose current review decision is new to this device. */
export function unseenReviewIds(reports: ContributionReport[]): Set<string> {
  const seen = readSeen();
  const ids = new Set<string>();
  for (const report of reports) {
    const sig = signature(report);
    if (sig && !seen.has(sig)) ids.add(report.id);
  }
  return ids;
}

/** Records the current review decisions as seen. */
export function markReviewsSeen(reports: ContributionReport[]): void {
  if (typeof window === 'undefined') return;
  try {
    const seen = readSeen();
    for (const report of reports) {
      const sig = signature(report);
      if (sig) seen.add(sig);
    }
    localStorage.setItem(KEY, JSON.stringify([...seen]));
  } catch {
    // ignore storage errors; the indicator is a best-effort convenience
  }
}
