import { loadEnv, readConfig } from "./config.js";
import { createApp } from "./app.js";
import { LocalStore, SupabaseStore } from "./store.js";
import { adminSupabase } from "./lib/supabase.js";

loadEnv();
const config = readConfig();
const supabase = config.mode === "supabase" ? adminSupabase() : null;
const store = supabase ? new SupabaseStore(supabase) : await new LocalStore(config.localDir).init();
const app = createApp({ store, config, authenticate: async token => {
  const { data, error } = await supabase!.auth.getUser(token);
  if (error) return undefined;
  return data.user?.id;
} });
const server = app.listen(config.port, config.host, () => console.log(`Naviable API http://${config.host}:${config.port} (${config.mode})`));
for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
});
