import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

function source(relativePath: string): string {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
}

test('contributors see (and hear) the AI description of their photo', () => {
  const panel = source('src/components/reports/AIDraftPanel.tsx');
  assert.match(panel, /analysis\?\.description \? \(/);
  assert.match(panel, /className="ai-photo-description" aria-live="polite"/);
});

test('reviewers see the stored AI description, never placeholder "detections"', () => {
  const page = source('src/app/reviewer/reports/[id]/page.tsx');
  assert.match(page, /\{report\.aiDescription\}/);
  // The old block presented the contributor's own element as an AI detection with a
  // hard-coded "High" confidence; it must not come back.
  assert.equal(page.includes('Tinggi (High)'), false);
  assert.equal(page.includes('aiDetectedInPhoto'), false);
  assert.match(page, /t\('reviewer\.aiAnalysisUnavailable'\)/);
});
