import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

function source(relativePath: string): string {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
}

test('1. PlaceCard: location pin emoji is replaced with Lucide location Icon component', () => {
  const placeCard = source('src/components/places/PlaceCard.tsx');

  // Must not have hardcoded pin emoji
  assert.equal(placeCard.includes('📍'), false, 'PlaceCard must not contain 📍 emoji');
  assert.equal(placeCard.includes('📌'), false, 'PlaceCard must not contain 📌 emoji');

  // Must use proper Icon component
  assert.match(
    placeCard,
    /<Icon\s+name="location"\s+size=\{12\}\s+className="flex-shrink-0"\s+style=\{\{\s*marginTop:\s*'1\.5px',\s*color:\s*'currentColor'\s*\}\}\s+aria-hidden="true"\s*\/>/,
    'PlaceCard must render Icon with name="location" and aria-hidden="true"'
  );

  // Must have proper address container styling for responsive wrapping
  assert.ok(placeCard.includes('className="place-card-address"'));
  assert.ok(placeCard.includes("overflowWrap: 'anywhere'"));
  assert.ok(placeCard.includes("color: 'currentColor'"));
});

test('2. PlaceList: external place button uses Icon and has no emoji in text', () => {
  const placeList = source('src/components/places/PlaceList.tsx');

  // Must not have plus emoji
  assert.equal(placeList.includes('➕'), false, 'PlaceList must not contain ➕ emoji');

  // Must have Icon and clean text
  assert.match(placeList, /<Icon\s+name="plus"\s+size=\{12\}\s*\/>/);
  assert.ok(placeList.includes("locale === 'en' ? 'Add This Place' : 'Tambah Tempat Ini'"));
});

test('3. LeafletMap: popup action button renders plus icon without emoji', () => {
  const leafletMap = source('src/components/map/LeafletMap.tsx');

  assert.equal(leafletMap.includes('➕'), false, 'LeafletMap must not contain ➕ emoji');
  assert.match(
    leafletMap,
    /<Icon\s+name="plus"\s+size=\{13\}\s+aria-hidden="true"\s*\/>/,
    'LeafletMap popup button must render Icon with name="plus"'
  );
});

test('4. PlaceDetailDrawer: external source link renders external-link icon without unicode arrow', () => {
  const drawer = source('src/components/places/PlaceDetailDrawer.tsx');

  assert.equal(drawer.includes('↗'), false, 'PlaceDetailDrawer must not contain ↗ arrow');
  assert.match(
    drawer,
    /<Icon\s+name="external-link"\s+size=\{12\}\s+aria-hidden="true"\s*\/>/,
    'PlaceDetailDrawer must render Icon with name="external-link"'
  );
});

test('5. Locales: static UI action strings do not contain emojis or unicode arrows', () => {
  const idLocale = source('src/locales/id.ts');
  const enLocale = source('src/locales/en.ts');

  // ID checks
  assert.ok(idLocale.includes("addPoint: 'Tambah'"), 'id.ts addPoint must not have emoji');
  assert.ok(idLocale.includes("addToNaviable: 'Tambah ke Naviable'"), 'id.ts addToNaviable must not have emoji');
  assert.ok(idLocale.includes("openOriginalSource: 'Buka sumber asli'"), 'id.ts openOriginalSource must not have arrow');
  assert.equal(idLocale.includes("addPoint: '➕"), false);
  assert.equal(idLocale.includes("addToNaviable: '➕"), false);

  // EN checks
  assert.ok(enLocale.includes("addPoint: 'Add'"), 'en.ts addPoint must not have emoji');
  assert.ok(enLocale.includes("addToNaviable: 'Add to Naviable'"), 'en.ts addToNaviable must not have emoji');
  assert.ok(enLocale.includes("openOriginalSource: 'Open original source'"), 'en.ts openOriginalSource must not have arrow');
  assert.equal(enLocale.includes("addPoint: '➕"), false);
  assert.equal(enLocale.includes("addToNaviable: '➕"), false);
});

test('6. Global static UI audit: No decorative emojis in components or app routes', () => {
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{1F1E6}-\u{1F1FF}\u{1FA70}-\u{1FAFF}]/u;
  const disallowedSpecial = ['📍', '📌', '♿', '🔊', '🔍', '📷', '⚠️', '✅', '❌', 'ℹ️', '➕'];

  const testDir = path.dirname(fileURLToPath(import.meta.url));
  const srcDir = path.join(testDir, '..', 'src');

  function checkDir(dir: string) {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      if (statSync(fullPath).isDirectory()) {
        checkDir(fullPath);
      } else if (/\.(tsx|jsx)$/.test(entry)) {
        const content = readFileSync(fullPath, 'utf8');
        for (const emoji of disallowedSpecial) {
          assert.equal(
            content.includes(emoji),
            false,
            `File ${path.relative(srcDir, fullPath)} must not contain decorative emoji ${emoji}`
          );
        }
        assert.equal(
          emojiRegex.test(content),
          false,
          `File ${path.relative(srcDir, fullPath)} must not contain Unicode emojis`
        );
      }
    }
  }

  checkDir(path.join(srcDir, 'components'));
  checkDir(path.join(srcDir, 'app'));
});
