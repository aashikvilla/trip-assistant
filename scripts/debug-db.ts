import * as fsEnv from "fs";
const envContent = fsEnv.readFileSync(".env.local", "utf8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIndex = trimmed.indexOf("=");
  if (eqIndex === -1) continue;
  const key = trimmed.slice(0, eqIndex);
  const value = trimmed.slice(eqIndex + 1);
  if (!process.env[key]) process.env[key] = value;
}

import { createClient } from "@supabase/supabase-js";

const sr = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const tripId = "87654321-4321-4321-4321-210987654321";

const { data, error } = await sr
  .from("trips")
  .select("*")
  .eq("id", tripId)
  .single();

if (error) {
  console.error("❌ Error:", error);
  process.exit(1);
} else {
  console.log("✅ Success! Trip found:", data?.name);
  process.exit(0);
}
