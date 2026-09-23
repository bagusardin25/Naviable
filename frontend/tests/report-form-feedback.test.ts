import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

function source(relativePath: string): string {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
}

test('notes and details stay editable while the photo check runs; only the photo is locked', () => {
  const form = source('src/components/reports/ReportForm.tsx');
  assert.match(form, /<fieldset disabled=\{submitting\} className="card form-card"/);
  assert.equal(form.includes('<fieldset disabled={busy || analyzing} className="card form-card"'), false);
  assert.match(form, /id="file-upload-input"[^>]*disabled=\{reading \|\| analyzing\}/);
});

test('the uploaded photo stays visible in the upload box', () => {
  const form = source('src/components/reports/ReportForm.tsx');
  assert.match(form, /<img src=\{photo\.image\} alt=\{t\('reports\.photoPreviewAlt'\)\} className="upload-preview-img" \/>/);
});

test('a photo showing another element offers a switch instead of changing it silently', () => {
  const form = source('src/components/reports/ReportForm.tsx');
  assert.match(form, /t\('reports\.aiElementMismatch'/);
  assert.match(form, /onClick=\{\(\) => selectElement\(code\)\}/);
  // The analysis result itself never rewrites the contributor's choice.
  assert.equal(/setAnalysis\([^)]*\)[^;]*;\s*setElementCode/.test(form), false);
});

test('a new location waits for approval instead of opening on the map', () => {
  const app = source('src/components/explore/ExploreApp.tsx');
  assert.match(app, /if \(!updated\.pendingApproval\) \{/);
  const api = source('src/lib/api.ts');
  assert.match(api, /pendingApproval: Boolean\(p\.pendingApproval\)/);
  const form = source('src/components/reports/ReportForm.tsx');
  assert.match(form, /submittedSuccessPlace\.pendingApproval\s*\?\s*t\('reports\.successCurateDescNewPlace'\)/);
  const reviewer = source('src/app/reviewer/reports/[id]/page.tsx');
  assert.match(reviewer, /report\.placePendingApproval && \(/);
  assert.match(reviewer, /t\('reviewer\.pendingPlaceNotice'\)/);
});
