import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { z } from "zod";

export const backendRoot = fileURLToPath(new URL("../", import.meta.url));
export function loadEnv() {
  const path = resolve(backendRoot, ".env");
  if (existsSync(path)) process.loadEnvFile(path);
}
export function readConfig() {
  const mode = z.enum(["local", "supabase"]).parse(process.env.DATA_STORE ?? "local");
  const production = process.env.NODE_ENV === "production";
  if (production && mode === "local") throw new Error("Production requires DATA_STORE=supabase");
  if (mode === "supabase" && (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    throw new Error("Supabase mode requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }
  return {
    mode, production,
    port: z.coerce.number().int().min(1).max(65535).parse(process.env.PORT ?? 4000),
    host: mode === "local" ? "127.0.0.1" : "0.0.0.0",
    localDir: resolve(backendRoot, process.env.LOCAL_DATA_DIR ?? ".local"),
    origins: (process.env.CORS_ORIGIN ?? "http://localhost:3000,http://127.0.0.1:3000").split(",").map(s => s.trim()).filter(Boolean),
    publicUrl: (process.env.PUBLIC_API_URL ?? `http://localhost:${process.env.PORT ?? 4000}`).replace(/\/$/, ""),
    trustProxy: z.coerce.number().int().min(0).max(5).parse(process.env.TRUST_PROXY_HOPS ?? 0),
  };
}
export type Config = ReturnType<typeof readConfig>;
