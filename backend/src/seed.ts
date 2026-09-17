import { loadEnv, readConfig } from "./config.js";
import { loadSeed } from "./lib/seed-data.js";
import { adminSupabase } from "./lib/supabase.js";
import { LocalStore, toPlaceRow } from "./store.js";

loadEnv();
const config = readConfig();
if (config.mode === "local") {
  const store = await new LocalStore(config.localDir).init();
  console.log(`Local store ready: ${(await store.listPlaces()).length} places. Existing reports preserved.`);
} else {
  const places = await loadSeed();
  const { error } = await adminSupabase().from("places").upsert(places.map(toPlaceRow), { onConflict: "id", ignoreDuplicates: true });
  if (error) throw error;
  console.log(`Seed complete: ${places.length} source records. Existing places/evidence preserved.`);
}
