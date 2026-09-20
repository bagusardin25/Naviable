// Grant, revoke, or list the Naviable REVIEWER role on Supabase Auth users.
// Role lives in auth.users.app_metadata.role (server-managed) — never in user_metadata.
//
// Usage (run from the backend/ folder):
//   node scripts/grant-reviewer.mjs --list                 # show current reviewers
//   node scripts/grant-reviewer.mjs admin@gmail.com        # grant REVIEWER
//   node scripts/grant-reviewer.mjs a@x.com b@y.com        # grant several at once
//   node scripts/grant-reviewer.mjs admin@gmail.com --revoke
//
// Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from backend/.env.
// The service_role key bypasses RLS and is never printed by this script.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  try {
    const raw = readFileSync(new URL("../.env", import.meta.url), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    /* fall back to the ambient environment */
  }
}
loadEnv();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum ada di backend/.env.");
  process.exit(1);
}
const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

async function allUsers() {
  const users = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }
  return users;
}

const roleOf = u => (typeof u.app_metadata?.role === "string" ? u.app_metadata.role : "");

async function main() {
  const args = process.argv.slice(2);
  const revoke = args.includes("--revoke");
  const emails = args.filter(a => !a.startsWith("--")).map(e => e.toLowerCase());

  if (args.includes("--list")) {
    const reviewers = (await allUsers()).filter(u => roleOf(u).toUpperCase() === "REVIEWER");
    if (!reviewers.length) return console.log("Belum ada user dengan role REVIEWER.");
    console.log(`Reviewer aktif (${reviewers.length}):`);
    for (const u of reviewers) console.log(`  ${u.email}  [${u.id}]`);
    return;
  }

  if (!emails.length) {
    console.error("Sebutkan minimal satu email. Contoh: node scripts/grant-reviewer.mjs admin@gmail.com");
    process.exit(1);
  }

  const users = await allUsers();
  for (const email of emails) {
    const user = users.find(u => (u.email ?? "").toLowerCase() === email);
    if (!user) {
      console.log(`✗ ${email}: tidak ditemukan di auth.users (akun ini harus login minimal sekali dulu).`);
      continue;
    }
    const nextRole = revoke ? null : "REVIEWER";
    const { data, error } = await admin.auth.admin.updateUserById(user.id, { app_metadata: { role: nextRole } });
    if (error) {
      console.log(`✗ ${email}: gagal — ${error.message}`);
      continue;
    }
    const applied = roleOf(data.user) || "(kosong)";
    console.log(`${revoke ? "↩" : "✓"} ${email}: role sekarang = ${applied}`);
  }
  console.log("\nMinta akun tersebut logout lalu login lagi agar token barunya membawa role.");
}

main().catch(err => {
  console.error("Gagal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
