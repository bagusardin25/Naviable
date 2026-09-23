#!/usr/bin/env node
/**
 * SQL acceptance test for the Naviable schema.
 *
 * Creates a throwaway PostgreSQL cluster inside `backend/.local/pgtest` on a free
 * port, applies the migrations and runs the assertions in `supabase/tests/`.
 * It never touches a database the user already has running (5432 included), and
 * removes the cluster afterwards unless KEEP_PG_CLUSTER=1.
 *
 * Usage: npm run test:sql        (set PG_BIN to point at a PostgreSQL bin dir)
 */
import { execFile, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readdir, rm, readFile } from "node:fs/promises";
import { createServer } from "node:net";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const backendRoot = fileURLToPath(new URL("../", import.meta.url));
const dataDir = join(backendRoot, ".local", "pgtest");
const logFile = join(backendRoot, ".local", "pgtest-startup.log");
const database = "naviable_sqltest";

function findBin() {
  if (process.env.PG_BIN) return process.env.PG_BIN;
  const candidates = [
    process.env.PGBIN,
    ...(process.platform === "win32"
      ? ["16", "17", "18", "15"].map(v => join("C:", "Program Files", "PostgreSQL", v, "bin"))
      : ["/usr/lib/postgresql/18/bin", "/usr/lib/postgresql/17/bin", "/usr/lib/postgresql/16/bin", "/usr/bin", "/usr/local/bin"]),
  ].filter(Boolean);
  return candidates.find(dir => existsSync(join(dir, process.platform === "win32" ? "initdb.exe" : "initdb")));
}

async function freePort() {
  const probe = createServer();
  await new Promise((ready, fail) => probe.once("error", fail).listen(0, "127.0.0.1", ready));
  const { port } = probe.address();
  await new Promise(done => probe.close(done));
  return port;
}

async function main() {
  const bin = findBin();
  if (!bin) {
    console.log("SKIP: no PostgreSQL binaries found. Install PostgreSQL or set PG_BIN=<bin dir>.");
    return;
  }
  const tool = name => join(bin, process.platform === "win32" ? `${name}.exe` : name);
  const psql = (args, options = {}) => run(tool("psql"), args, { cwd: backendRoot, timeout: 120_000, maxBuffer: 16 * 1024 * 1024, ...options });
  const script = name => join(backendRoot, "supabase", name);
  // `pg_ctl start` hands its stdio to the postgres daemon, which then holds the
  // pipes open: waiting on them never resolves, so ignore stdio entirely.
  const detached = (name, args) => new Promise((done, fail) => {
    const child = spawn(tool(name), args, { cwd: backendRoot, stdio: "ignore", windowsHide: true });
    child.once("error", fail);
    child.once("exit", code => code === 0 ? done() : fail(new Error(`${name} exited with code ${code}`)));
  });
  const waitForPort = async (deadline = Date.now() + 30_000) => {
    for (;;) {
      const open = await new Promise(ready => {
        const socket = createServer();
        socket.once("error", () => ready(false));
        socket.listen(port, "127.0.0.1", () => socket.close(() => ready(true)));
      });
      if (!open) return;
      if (Date.now() > deadline) throw new Error(`PostgreSQL did not accept connections on port ${port}`);
      await new Promise(r => setTimeout(r, 250));
    }
  };

  await rm(dataDir, { recursive: true, force: true });
  await rm(logFile, { force: true });  // keep startup output scoped to this run
  await mkdir(join(backendRoot, ".local"), { recursive: true });
  const port = await freePort();
  let serverStarted = false;

  try {
    console.log(`Initializing throwaway cluster in ${dataDir} (PostgreSQL on port ${port})`);
    await run(tool("initdb"), ["-D", dataDir, "-U", "postgres", "-A", "trust", "-E", "UTF8", "--no-sync"],
      { timeout: 120_000, maxBuffer: 8 * 1024 * 1024 });

    const extraOptions = process.platform === "win32" ? "" : " -c unix_socket_directories=/tmp";
    // Host is pinned to loopback so the test cluster is never reachable off-box.
    await detached("pg_ctl", ["-D", dataDir, "-l", logFile, "-o", `-p ${port} -c listen_addresses=127.0.0.1${extraOptions}`, "-w", "-t", "30", "start"]);
    serverStarted = true;
    await waitForPort();

    const connect = ["-h", "127.0.0.1", "-p", String(port), "-U", "postgres", "-v", "ON_ERROR_STOP=1"];
    await psql([...connect, "-d", "postgres", "-c", `create database ${database}`]);

    const execute = async (label, file) => {
      console.log(`\n=== ${label} ===`);
      const { stdout, stderr } = await psql([...connect, "-d", database, "-f", file]);
      process.stdout.write(stdout ?? "");
      if (stderr) process.stdout.write(stderr);
    };

    // Supabase provisions these roles itself; a bare cluster needs them first.
    await execute("bootstrap roles (local scaffolding)", script("tests/00_local_roles.sql"));
    await execute("apply 001_naviable.sql", script("migrations/001_naviable.sql"));
    await execute("apply 003_contribution_flows.sql", script("migrations/003_contribution_flows.sql"));
    await execute("apply 004_reviewer_audit.sql", script("migrations/004_reviewer_audit.sql"));
    await execute("apply 005_reviewer_element_override.sql", script("migrations/005_reviewer_element_override.sql"));
    await execute("apply 006_place_approval.sql", script("migrations/006_place_approval.sql"));
    await execute("apply 007_place_elements_sync.sql", script("migrations/007_place_elements_sync.sql"));

    // 002 needs PostGIS *and* the Supabase `storage` schema, so it is opt-in.
    const { stdout: compatible } = await psql([...connect, "-d", database, "-tAc",
      "select exists(select 1 from pg_available_extensions where name = 'postgis') and exists(select 1 from pg_namespace where nspname = 'storage')"]);
    if (compatible.trim() === "t") {
      await execute("apply 002_supabase_extras.sql", script("migrations/002_supabase_extras.sql"));
    } else {
      console.log("\nSKIP: 002_supabase_extras.sql needs PostGIS and the Supabase `storage` schema; not available locally.");
    }

    const tests = (await readdir(join(backendRoot, "supabase", "tests"))).filter(f => f.endsWith(".sql") && f !== "00_local_roles.sql").sort();
    if (tests.length === 0) throw new Error("No SQL test files found");
    for (const name of tests) await execute(`assertions: ${name}`, script(join("tests", name)));

    console.log("\nAll SQL acceptance tests passed.");
  } catch (error) {
    console.error("\nSQL acceptance test FAILED.");
    console.error(error.stdout || error.stderr || error.message);
    if (existsSync(logFile)) {
      try {
        const logContent = await readFile(logFile, "utf8");
        if (logContent.trim()) console.error(`\nCluster log:\n${logContent}`);
      } catch {}
    }
    if (serverStarted) console.error(`\nIf this run leaves the cluster up: pg_ctl -D "${dataDir}" -m immediate stop`);
    process.exitCode = 1;
  } finally {
    if (serverStarted && process.env.KEEP_PG_CLUSTER !== "1") {
      await detached("pg_ctl", ["-D", dataDir, "-m", "immediate", "-w", "-t", "30", "stop"]).catch(() => {});
      await rm(dataDir, { recursive: true, force: true });
      // Keep the startup log only when something failed; it is already printed on failure.
      if (!process.exitCode) await rm(logFile, { force: true });
    } else if (serverStarted) {
      console.log(`KEEP_PG_CLUSTER=1 — cluster left running on port ${port} (stop with pg_ctl -D "${dataDir}" stop)`);
    }
  }
}

await main();
