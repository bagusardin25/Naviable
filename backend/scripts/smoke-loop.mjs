#!/usr/bin/env node
/**
 * End-to-end smoke test for the flagship loop, run against a *running* backend:
 *
 *   publish a photo report -> place shows contributor evidence -> retry is idempotent
 *   -> conflicting retry is rejected -> report history keeps the trail -> CSV export carries it
 *
 * Usage:
 *   BASE_URL=http://127.0.0.1:4000 node scripts/smoke-loop.mjs [placeId]
 *
 * Safe against a local dev database: it picks a place that has no field evidence yet, so it
 * never overwrites seeded or previously submitted evidence.
 */
const base = (process.env.BASE_URL ?? "http://127.0.0.1:4000").replace(/\/$/, "");

// 1x1 transparent PNG — enough to satisfy the signature/MIME checks without shipping a fixture.
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1ioAAAAASUVORK5CYII=";

let failures = 0;
function check(label, condition, detail = "") {
  if (condition) {
    console.log(`  PASS  ${label}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

const json = async (path, init) => {
  const response = await fetch(`${base}${path}`, { ...init, headers: { ...init?.headers, ...(process.env.SMOKE_AUTH_TOKEN ? { Authorization: `Bearer ${process.env.SMOKE_AUTH_TOKEN}` } : {}) } });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: response.status, headers: response.headers, body };
};

const report = (placeId, note) => ({
  placeId,
  reporterName: "Dimas (smoke test)",
  image: PNG,
  mimeType: "image/png",
  humanConfirmed: true,
  elements: [
    { element: "E5_guiding_block", status: "TERHALANG", note },
    { element: "E2_ramp", status: "TIDAK_STANDAR", note: "Ramp tanpa handrail" },
    { element: "E3_toilet", status: "TIDAK_ADA" },
  ],
});

try {
  console.log(`Naviable smoke test against ${base}\n`);

  const health = await json("/api/health");
  console.log(`health: ${JSON.stringify(health.body)}`);
  if (health.status !== 200) throw new Error(`backend not reachable (${health.status})`);
  if (!process.env.SMOKE_AUTH_TOKEN) throw new Error('Set SMOKE_AUTH_TOKEN to an authenticated test account token; guest writes are disabled.');

  console.log("\n[1] pick a place with no field evidence yet");
  const list = await json("/api/places?geocoded=true&limit=100");
  const place = process.argv[2]
    ? list.body.places.find(p => p.id === process.argv[2])
    : list.body.places.find(p => p.reportCount === 0 && p.lat !== null);
  if (!place) throw new Error("no suitable place found; pass a placeId argument");
  console.log(`  place: ${place.id} — ${place.name} (reports: ${place.reportCount})`);
  check("place starts without contributor evidence", place.reportCount === 0 && Object.keys(place.elements).length === 0);

  console.log("\n[2] publish a human-locked report");
  const key = crypto.randomUUID();
  const note = `Guiding block tertutup motor (smoke ${new Date().toISOString().slice(11, 19)})`;
  const first = await json("/api/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": key },
    body: JSON.stringify(report(place.id, note)),
  });
  check("publish returns 201", first.status === 201, JSON.stringify(first.body).slice(0, 200));
  const reportId = first.body.reportId;
  check("place now reports contributor evidence", first.body.place?.elements?.E5_guiding_block?.status === "TERHALANG");
  check("citizen report does NOT auto-verify the place", first.body.place?.verifiedByTeam === false);
  check("overall status follows the evidence", first.body.place?.overall === "TIDAK_ADA", first.body.place?.overall);
  check(
    "summary names the broken elements instead of only a score",
    typeof first.body.place?.summary === "string" && /toilet|ramp|jalur pemandu/.test(first.body.place.summary),
    first.body.place?.summary
  );
  check("reportCount incremented", first.body.place?.reportCount === 1);

  console.log("\n[3] retrying the same key replays instead of duplicating");
  const retry = await json("/api/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": key },
    body: JSON.stringify(report(place.id, note)),
  });
  check("retry returns 200 (replay)", retry.status === 200, String(retry.status));
  check("retry keeps the same report id", retry.body.reportId === reportId);

  console.log("\n[4] reusing the key with different content is rejected");
  const conflict = await json("/api/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": key },
    body: JSON.stringify(report(place.id, "konten berbeda")),
  });
  check("conflicting reuse returns 409", conflict.status === 409, String(conflict.status));

  console.log("\n[5] the correction trail is exposed");
  const detail = await json(`/api/places/${encodeURIComponent(place.id)}`);
  check("place detail reports the new status", detail.body.place?.elements?.E5_guiding_block?.status === "TERHALANG");
  const history = await json(`/api/places/${encodeURIComponent(place.id)}/reports?limit=20`);
  check("history has exactly one report", history.body.total === 1, String(history.body.total));
  check("history entry carries the reporter and note", history.body.reports?.[0]?.elements?.some(e => e.note === note));
  check(
    "history does not leak internal fields",
    history.body.reports?.[0]?.actorId === undefined && history.body.reports?.[0]?.inputHash === undefined
  );
  check(
    "history photo is served",
    (await fetch(`${base}${history.body.reports[0].photoUrl}`)).headers.get("content-type") === "image/png"
  );

  console.log("\n[6] CSV evidence export carries the report");
  const csv = await fetch(`${base}/api/evidence.csv`);
  const csvText = await csv.text();
  check("csv is an attachment", /attachment/.test(csv.headers.get("content-disposition") ?? ""));
  check("csv contains the contributor note", csvText.includes(note));
  check("csv row is marked as contributor-locked", csvText.includes("kontributor"));
  check("csv link points at the report photo", csvText.includes(`/api/photos/${reportId}`));

  console.log("\n[7] observatory counts the broken chain");
  const observatory = await json("/api/observatory");
  check("brokenPlaces increased to 1", observatory.body.brokenPlaces === 1, String(observatory.body.brokenPlaces));
  check(
    "element distribution records the blocked guiding path",
    observatory.body.elements?.E5_guiding_block?.TERHALANG === 1,
    JSON.stringify(observatory.body.elements?.E5_guiding_block)
  );
} catch (error) {
  failures += 1;
  console.error(`\nERROR: ${error.message}`);
}

console.log(failures === 0 ? "\nSmoke test passed." : `\nSmoke test FAILED (${failures} check(s)).`);
process.exitCode = failures === 0 ? 0 : 1;
