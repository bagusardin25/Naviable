import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createApp } from "../src/app.js";
import { LocalStore } from "../src/store.js";
import { chainScore, chainSummary, summarizePlace } from "../src/lib/types.js";
import { csvCell } from "../src/lib/evidence.js";
import { readConfig, type Config } from "../src/config.js";

const image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1ioAAAAASUVORK5CYII=';
async function fixture(mode: 'local' | 'supabase' = 'local') {
  const directory = await mkdtemp(join(tmpdir(), 'naviable-test-'));
  const store = await new LocalStore(directory).init();
  const config: Config = { mode, production: false, host: '127.0.0.1', port: 4000, localDir: directory, origins: ['http://localhost:3000'], publicUrl: 'http://localhost:4000', trustProxy: 0 };
  const app = createApp({ store, config, authenticate: async token => token === 'valid-test-token' ? 'test-user' : undefined, analyze: async () => { throw new Error('provider unavailable'); } });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}`;
  const get = (path: string, headers?: Record<string, string>) => fetch(`${base}${path}`, { headers });
  const post = (path: string, body: unknown, key = randomUUID(), token = mode === 'local' ? 'valid-test-token' : '') => fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key, ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  return { directory, store, config, get, post, close: async () => {
    server.closeAllConnections(); await new Promise<void>((yes, no) => server.close(e => e ? no(e) : yes()));
    if (!resolve(directory).startsWith(resolve(tmpdir()) + '\\') && !resolve(directory).startsWith(resolve(tmpdir()) + '/')) throw new Error('Unsafe temporary path');
    await rm(directory, { recursive: true, force: true });
  } };
}
function report(placeId: string) {
  return { placeId, reporterName: 'Kontributor uji', image, mimeType: 'image/png', humanConfirmed: true,
    elements: [{ element: 'E5_guiding_block', status: 'TERHALANG', note: 'Terhalang kendaraan' }] };
}

test('guest reads stay public and every contribution requires auth, including local storage', async () => {
  const f = await fixture();
  try {
    const id = (await f.store.listPlaces())[0].id;
    for (const path of ['/api/places', `/api/places/${id}`, `/api/places/${id}/reports`, `/api/places/${id}/reviews`, '/api/observatory']) assert.equal((await f.get(path)).status, 200);
    for (const path of ['/api/places', '/api/reports', '/api/reviews', '/api/analyze']) {
      assert.equal((await f.post(path, {}, randomUUID(), '')).status, 401);
      assert.equal((await f.post(path, {}, randomUUID(), 'expired-token')).status, 401);
    }
    assert.equal((await f.get('/api/me')).status, 401);
  } finally { await f.close(); }
});

test('new location is atomic and idempotent; reviews persist without changing accessibility evidence', async () => {
  const f = await fixture();
  try {
    const { placeId: _placeId, ...evidence } = report('unused');
    const body = { ...evidence, location: { name: 'Lokasi Uji Baru', category: 'Taman Kota', address: 'Jalan Uji 10, Surabaya', lat: -7.25, lng: 112.75 } };
    const key = randomUUID();
    const responses = await Promise.all([f.post('/api/places', body, key), f.post('/api/places', body, key)]);
    assert.deepEqual(responses.map(r => r.status).sort(), [200, 201]);
    const [a, b] = await Promise.all(responses.map(r => r.json()));
    assert.equal(a.place.id, b.place.id); assert.equal((await f.store.listPlaces()).length, 45);
    assert.equal(a.place.reportCount, 1); assert.equal(a.place.verifiedByTeam, false);
    assert.equal(Object.keys(a.place.elements).length, 1);
    assert.equal((await f.post('/api/places', { ...body, location: { ...body.location, name: 'Changed' } }, key)).status, 409);
    assert.equal((await f.post('/api/places', { ...body, image: 'invalid photo bytes' })).status, 400);
    assert.equal((await f.post('/api/places', { ...body, location: { ...body.location, lat: 100 } })).status, 400);
    assert.equal((await f.store.listPlaces()).length, 45);
    const before = await f.store.getPlace(a.place.id);
    const review = { placeId: a.place.id, reviewerName: 'Pengunjung Uji', experience: 'Petugas membantu saya saat berkunjung.' };
    const reviewKey = randomUUID();
    assert.equal((await f.post('/api/reviews', review, reviewKey)).status, 201);
    assert.equal((await f.post('/api/reviews', review, reviewKey)).status, 200);
    assert.equal((await f.post('/api/reviews', { ...review, experience: 'Pengalaman lain yang berbeda.' }, reviewKey)).status, 409);
    assert.equal((await f.post('/api/reviews', { ...review, elements: [] })).status, 400);
    assert.equal((await f.post('/api/reviews', { ...review, placeId: 'missing' })).status, 404);
    assert.deepEqual(await f.store.getPlace(a.place.id), before);
    const publicReviews = await (await f.get(`/api/places/${a.place.id}/reviews`)).json();
    assert.equal(publicReviews.total, 1); assert.equal(publicReviews.reviews[0].actorId, undefined);
    assert.equal(publicReviews.reviews[0].requestKey, undefined);
    const restored = await new LocalStore(f.directory).init();
    assert.deepEqual(await restored.getPlace(a.place.id), before);
    assert.equal((await restored.listReviews(a.place.id, 20, 0)).reviews[0].experience, review.experience);
    const photo = await f.get(`/api/photos/${a.reportId}`);
    assert.equal(photo.status, 200);
  } finally { await f.close(); }
});

test('seed, filters, pagination, unknown coordinates and evidence boundaries', async () => {
  const f = await fixture();
  try {
    const result = await (await f.get('/api/places?profile=mobilitas')).json();
    assert.equal(result.total, 44);
    assert.ok(result.places.every((p: { score: unknown; elements: object; verifiedByTeam: boolean; overall: string }) => p.score === null && Object.keys(p.elements).length === 0 && !p.verifiedByTeam && p.overall === 'BELUM_DIKETAHUI'));
    const missing = await (await f.get('/api/places?geocoded=false')).json();
    assert.equal(missing.total, 7);
    assert.ok(missing.places.every((p: { lat: unknown; lng: unknown }) => p.lat === null && p.lng === null));
    assert.equal((await (await f.get('/api/places?geocoded=true')).json()).total, 37);
    const page = await (await f.get('/api/places?limit=2&offset=2')).json();
    assert.equal(page.places.length, 2); assert.equal(page.total, 44);
    assert.equal((await (await f.get('/api/places?q=Siola')).json()).places[0].id, 'desk-mpp-siola');
    const bbox = await (await f.get('/api/places?bbox=112.63,-7.4,112.85,-7.2')).json();
    assert.ok(bbox.places.every((p: { lat: number | null }) => p.lat !== null));
    assert.equal((await f.get('/api/places?profile=invalid')).status, 400);
    assert.equal((await f.get('/api/places?bbox=bad')).status, 400);
    assert.equal((await f.get('/api/places?limit=500')).status, 400);
    assert.equal((await f.get('/api/places/missing')).status, 404);
    assert.equal((await f.get('/api/ready')).status, 200);
    const stats = await (await f.get('/api/observatory')).json();
    assert.equal(stats.brokenPlaces, 0); assert.equal(stats.elements.E5_guiding_block.BELUM_DIKETAHUI, 44);
    assert.equal(stats.districts[0].name, 'Belum diketahui');
  } finally { await f.close(); }
});

test('publish persists across restart; retries and concurrent corrections preserve audit history', async () => {
  const f = await fixture();
  try {
    const id = (await f.store.listPlaces())[0].id;
    const payload = report(id), key = randomUUID();
    const savedResponse = await f.post('/api/reports', payload, key);
    assert.equal(savedResponse.status, 201);
    const saved = await savedResponse.json();
    assert.equal(saved.place.elements.E5_guiding_block.status, 'TERHALANG');
    assert.equal(saved.place.verifiedByTeam, false); assert.equal(saved.place.photoCount, 1);
    const photo = await f.get(saved.photoUrl);
    assert.equal(photo.headers.get('content-type'), 'image/png');
    assert.deepEqual(Buffer.from(await photo.arrayBuffer()), Buffer.from(image, 'base64'));
    const retry = await f.post('/api/reports', payload, key);
    assert.equal(retry.status, 200); assert.equal((await retry.json()).reportId, saved.reportId);
    assert.equal((await f.post('/api/reports', { ...payload, reporterName: 'different' }, key)).status, 409);
    const correction = { ...payload, elements: [{ element: 'E5_guiding_block', status: 'UTUH', note: 'Hambatan sudah dipindahkan' }] };
    const sameKey = randomUUID();
    const attempts = await Promise.all([f.post('/api/reports', correction, sameKey), f.post('/api/reports', correction, sameKey)]);
    assert.deepEqual(attempts.map(r => r.status).sort(), [200, 201]);
    const restored = await new LocalStore(f.directory).init();
    const place = (await restored.getPlace(id))!;
    assert.equal(place.reportCount, 2); assert.equal(place.elements.E5_guiding_block!.status, 'UTUH');
    assert.equal((await restored.listReports(id))[1].elements[0].status, 'TERHALANG');
    const history = await (await f.get(`/api/places/${id}/reports?limit=1`)).json();
    assert.equal(history.total, 2); assert.equal(history.reports.length, 1);
    assert.equal(history.reports[0].actorId, undefined); assert.equal(history.reports[0].inputHash, undefined);
    assert.equal((await (await f.get('/api/me', { Authorization: 'Bearer valid-test-token' })).json()).total, 2);
    const csv = await f.get('/api/evidence.csv');
    assert.match(csv.headers.get('content-disposition')!, /attachment/);
    assert.match(await csv.text(), /Hambatan sudah dipindahkan/);
    const filteredCsv = await f.get('/api/evidence.csv?element=E5_guiding_block&status=UTUH');
    const filteredText = await filteredCsv.text();
    assert.match(filteredText, /Hambatan sudah dipindahkan/);
    assert.ok(!filteredText.includes('E1_door'));
  } finally { await f.close(); }
});

test('rejects invalid uploads, missing human confirmation and duplicate elements without writes', async () => {
  const f = await fixture();
  try {
    const id = (await f.store.listPlaces())[0].id, body = report(id);
    for (const invalid of [{ ...body, humanConfirmed: false }, { ...body, elements: [...body.elements, ...body.elements] },
      { ...body, elements: [{ element: 'not-real', status: 'UTUH' }] }, { ...body, mimeType: 'image/jpeg' },
      { ...body, image: 'invalid-base64-characters' }, { ...body, reporterName: '   ' }, { ...body, image: undefined },
      { ...body, actorId: 'impersonation' }]) assert.equal((await f.post('/api/reports', invalid)).status, 400);
    assert.equal((await f.post('/api/reports', { ...body, placeId: 'unknown' })).status, 404);
    assert.equal((await f.store.getPlace(id))!.reportCount, 0);
    assert.equal((await f.get('/api/places', { Origin: 'https://evil.example' })).status, 403);
    const allowed = await f.get('/api/places', { Origin: 'http://localhost:3000' });
    assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:3000');
  } finally { await f.close(); }
});

test('cloud mutations require validated auth; AI failure leaves manual reporting functional', async () => {
  const f = await fixture('supabase');
  try {
    const id = (await f.store.listPlaces())[0].id, body = report(id);
    assert.equal((await f.post('/api/reports', body)).status, 401);
    assert.equal((await f.post('/api/reports', body, randomUUID(), 'invalid')).status, 401);
    const analysis = await f.post('/api/analyze', { image, mimeType: 'image/png' }, randomUUID(), 'valid-test-token');
    assert.equal(analysis.status, 503); assert.equal((await analysis.json()).fallback, 'manual_checklist');
    assert.equal((await f.store.getPlace(id))!.reportCount, 0);
    assert.equal((await f.post('/api/reports', body, randomUUID(), 'valid-test-token')).status, 201);
    assert.equal((await f.get('/api/me')).status, 401);
    const me = await (await f.get('/api/me', { Authorization: 'Bearer valid-test-token' })).json();
    assert.equal(me.total, 1);
    for (let i = 0; i < 9; i++) await f.post('/api/analyze', { image, mimeType: 'image/png' }, randomUUID(), 'valid-test-token');
    const limited = await f.post('/api/analyze', { image, mimeType: 'image/png' }, randomUUID(), 'valid-test-token');
    assert.equal(limited.status, 429); assert.ok(limited.headers.has('retry-after'));
  } finally { await f.close(); }
});

test('journey returns point hints only and rejects missing coordinates', async () => {
  const f = await fixture();
  try {
    const places = await f.store.listPlaces(), known = places.filter(p => !p.needsGeocoding), unknown = places.find(p => p.needsGeocoding)!;
    const response = await f.get(`/api/journey?from=${known[0].id}&to=${known[1].id}`);
    const journey = await response.json();
    assert.equal(response.status, 200); assert.equal(journey.geometry, null); assert.equal(journey.routing, false);
    assert.equal(journey.points[0].id, known[0].id); assert.equal(journey.points.at(-1).id, known[1].id);
    assert.equal((await f.get(`/api/journey?from=${unknown.id}&to=${known[1].id}`)).status, 422);
  } finally { await f.close(); }
});

test('score excludes unknown/AI-only evidence and summary never labels incomplete chain intact', () => {
  assert.equal(chainScore({}, 'mobilitas'), null);
  assert.equal(chainScore({ E1_door: { status: 'UTUH', lockedBy: 'ai_draf' } }, 'mobilitas'), null);
  const evidence = { E1_door: { status: 'UTUH' as const, lockedBy: 'kontributor' as const }, E2_ramp: { status: 'TIDAK_STANDAR' as const, lockedBy: 'kontributor' as const } };
  assert.equal(chainScore(evidence, 'mobilitas'), 75);
  assert.match(chainSummary(evidence), /ramp/); assert.match(chainSummary(evidence), /6 elemen belum diketahui/);
  assert.equal(summarizePlace({ elements: { E1_door: evidence.E1_door } } as never).overall, 'BELUM_DIKETAHUI');
  assert.equal(csvCell('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"');
  assert.match(csvCell(' \t+SUM(1,2)'), /^"'/);
});

test('production cannot silently run local storage', () => {
  const previous = process.env.NODE_ENV, previousStore = process.env.DATA_STORE;
  try { process.env.NODE_ENV = 'production'; process.env.DATA_STORE = 'local'; assert.throws(readConfig, /Production requires/); }
  finally {
    if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous;
    if (previousStore === undefined) delete process.env.DATA_STORE; else process.env.DATA_STORE = previousStore;
  }
});

test('reviewer workflow: list, detail, approve, revise with notes, reject, and audit trail', async () => {
  const f = await fixture();
  try {
    const statsRes = await f.get('/api/reviewer/stats');
    assert.equal(statsRes.status, 200);
    const stats = await statsRes.json();
    assert.ok(typeof stats.submitted === 'number');

    const reportsRes = await f.get('/api/reviewer/reports?status=SUBMITTED');
    assert.equal(reportsRes.status, 200);
    const reportList = await reportsRes.json();
    assert.ok(reportList.reports.length > 0);
    const target = reportList.reports[0];

    const detailRes = await f.get(`/api/reviewer/reports/${target.id}`);
    assert.equal(detailRes.status, 200);
    const detail = await detailRes.json();
    assert.equal(detail.report.id, target.id);

    // Needs revision requires note
    const badRev = await f.post(`/api/reviewer/reports/${target.id}/review`, {
      decision: 'NEEDS_REVISION',
      reviewer: 'reviewer.naviable',
      note: '   ',
    });
    assert.equal(badRev.status, 400);

    // Approve report
    const approveRes = await f.post(`/api/reviewer/reports/${target.id}/review`, {
      decision: 'APPROVED',
      reviewer: 'reviewer.naviable',
      note: 'Bukti foto jelas dan konsisten.',
      checklist: { photo_clear: true, elements_match: true },
    });
    assert.equal(approveRes.status, 200);
    const approved = await approveRes.json();
    assert.equal(approved.report.reviewStatus, 'APPROVED');
    assert.equal(approved.report.reviewedBy, 'reviewer.naviable');

    // Check place was updated with verifiedByTeam = true
    const place = await f.store.getPlace(target.placeId);
    assert.ok(place);
    assert.equal(place.verifiedByTeam, true);

    // Check history
    const historyRes = await f.get('/api/reviewer/history');
    assert.equal(historyRes.status, 200);
    const history = await historyRes.json();
    assert.ok(history.history.some((h: { id: string }) => h.id === target.id));
  } finally { await f.close(); }
});

