import assert from 'node:assert/strict';
import test from 'node:test';
import { saveDraftPhoto, getDraftPhoto, deleteDraftPhoto } from '../src/lib/draftStorage';

test('draftStorage handles environments without window/indexedDB gracefully without throwing', async () => {
  const draftKey = 'naviable_report_draft_v2:test_user:correction:123';
  const photo = { image: 'data:image/jpeg;base64,sample123', mimeType: 'image/jpeg' };

  // In Node.js environment without mock window.indexedDB, all functions must resolve safely without unhandled rejections
  await assert.doesNotReject(async () => {
    await saveDraftPhoto(draftKey, photo);
  });

  const retrieved = await getDraftPhoto(draftKey);
  assert.equal(retrieved, null);

  await assert.doesNotReject(async () => {
    await deleteDraftPhoto(draftKey);
  });
});

test('draftStorage handles empty/null draftKey parameters gracefully', async () => {
  await assert.doesNotReject(async () => {
    await saveDraftPhoto('', { image: 'abc', mimeType: 'image/png' });
  });

  const emptyResult = await getDraftPhoto('');
  assert.equal(emptyResult, null);

  await assert.doesNotReject(async () => {
    await deleteDraftPhoto('');
  });
});
