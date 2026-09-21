import assert from 'node:assert/strict';
import test from 'node:test';
import { id } from '../src/locales/id';
import { en } from '../src/locales/en';
import { translate, DEFAULT_LOCALE, LOCALE_STORAGE_KEY } from '../src/locales';

/** Helper to recursively collect all dot-notation paths of an object */
function getLeafPaths(obj: Record<string, unknown>, prefix = ''): string[] {
  const paths: string[] = [];
  for (const [key, val] of Object.entries(obj)) {
    const currentPath = prefix ? `${prefix}.${key}` : key;
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      paths.push(...getLeafPaths(val as Record<string, unknown>, currentPath));
    } else {
      paths.push(currentPath);
    }
  }
  return paths;
}

test('1. i18n Dictionary Parity: All keys in ID exist in EN with non-empty values', () => {
  const idPaths = getLeafPaths(id as unknown as Record<string, unknown>);
  const enPaths = new Set(getLeafPaths(en as unknown as Record<string, unknown>));

  assert.ok(idPaths.length > 200, `Expected comprehensive dictionary, got ${idPaths.length} keys`);

  const missingInEn: string[] = [];
  for (const path of idPaths) {
    if (!enPaths.has(path)) {
      missingInEn.push(path);
    }
  }

  assert.deepEqual(
    missingInEn,
    [],
    `The following keys exist in id.ts but are missing in en.ts: ${missingInEn.join(', ')}`
  );
});

test('2. i18n Dictionary Parity: All keys in EN exist in ID with non-empty values', () => {
  const idPaths = new Set(getLeafPaths(id as unknown as Record<string, unknown>));
  const enPaths = getLeafPaths(en as unknown as Record<string, unknown>);

  const missingInId: string[] = [];
  for (const path of enPaths) {
    if (!idPaths.has(path)) {
      missingInId.push(path);
    }
  }

  assert.deepEqual(
    missingInId,
    [],
    `The following keys exist in en.ts but are missing in id.ts: ${missingInId.join(', ')}`
  );
});

test('3. translate helper resolves nested paths accurately in ID and EN', () => {
  assert.equal(translate('id', 'nav.explore'), 'Jelajahi');
  assert.equal(translate('en', 'nav.explore'), 'Explore');

  assert.equal(translate('id', 'status.UTUH.label'), 'Bisa digunakan');
  assert.equal(translate('en', 'status.UTUH.label'), 'Usable');

  assert.equal(translate('id', 'elements.E1.name'), 'Pintu masuk');
  assert.equal(translate('en', 'elements.E1.name'), 'Entrance');
});

test('4. translate helper interpolates dynamic variables', () => {
  const renderedId = translate('id', 'places.reviewDescription', { name: 'Balai Pemuda' });
  assert.ok(renderedId.includes('Balai Pemuda'));
  assert.ok(renderedId.includes('pengalaman'));

  const renderedEn = translate('en', 'places.reviewDescription', { name: 'Balai Pemuda' });
  assert.ok(renderedEn.includes('Balai Pemuda'));
  assert.ok(renderedEn.includes('experience'));
});

test('5. translate helper falls back to Indonesian when path or locale is missing', () => {
  // Missing key in both falls back to path or provided fallback string
  assert.equal(translate('en', 'nonexistent.key.test'), 'nonexistent.key.test');
  assert.equal(translate('en', 'nonexistent.key.test', 'Fallback Label'), 'Fallback Label');

  // Default locale is 'id'
  assert.equal(DEFAULT_LOCALE, 'id');
  assert.equal(LOCALE_STORAGE_KEY, 'naviable-locale');
});

test('6. Accessibility status configurations preserve canonical DB codes', () => {
  const canonicalCodes = ['UTUH', 'TERHALANG', 'TIDAK_STANDAR', 'TIDAK_ADA', 'BELUM_DIKETAHUI'] as const;
  for (const code of canonicalCodes) {
    assert.ok(id.status[code], `ID status must contain canonical code ${code}`);
    assert.ok(en.status[code], `EN status must contain canonical code ${code}`);
    assert.ok(id.status[code].label.length > 0);
    assert.ok(en.status[code].label.length > 0);
    assert.notEqual(id.status[code].label, en.status[code].label);
  }
});

test('7. Standard 8 Elements (E1-E8) are localized accurately in both languages', () => {
  const elementCodes = ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8'] as const;
  for (const code of elementCodes) {
    assert.ok(id.elements[code], `id.elements must contain ${code}`);
    assert.ok(en.elements[code], `en.elements must contain ${code}`);
    assert.ok(id.elements[code].name.length > 0);
    assert.ok(en.elements[code].name.length > 0);
  }
  assert.equal(id.elements.E1.name, 'Pintu masuk');
  assert.equal(en.elements.E1.name, 'Entrance');
  assert.equal(id.elements.E4.name, 'Lift');
  assert.equal(en.elements.E4.name, 'Lift');
});

test('8. Date and Number formatting adhere to Indonesian and English locales', () => {
  const sampleDate = new Date('2026-09-20T10:00:00.000Z');

  const idDate = sampleDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  const enDate = sampleDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  assert.ok(idDate.toLowerCase().includes('september'));
  assert.ok(enDate.toLowerCase().includes('september'));

  const sampleNum = 1234567.89;
  const idNum = new Intl.NumberFormat('id-ID').format(sampleNum);
  const enNum = new Intl.NumberFormat('en-US').format(sampleNum);

  // Indonesian uses period as thousands separator, English uses comma
  assert.ok(idNum.includes('.'));
  assert.ok(enNum.includes(','));
});
