// Backs up the Decision Log: its two tables as JSON, and every uploaded file.
//
//   node --env-file=.env.local scripts/backup-decision-log.mjs [output-folder]
//
// Writes <folder>/decisions.json, <folder>/decision_documents.json and
// <folder>/files/<decision id>/<stored name>. The default folder is
// ./decision-log-backup-<today>. Run it now and then, and keep the folder
// somewhere that is not this laptop. (The Supabase Pro nightly backup covers
// the tables but not uploaded files, which is why this exists.)

import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const BUCKET = "decision-documents";
const out = process.argv[2] ?? `decision-log-backup-${new Date().toISOString().slice(0, 10)}`;
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const save = (name, data) => {
  const file = join(out, name);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, typeof data === "string" ? data : Buffer.from(data));
};

const decisions = await db.from("decisions").select("*").order("decision_date");
const documents = await db.from("decision_documents").select("*").order("created_at");
for (const r of [decisions, documents]) {
  if (r.error) {
    console.error(`Can't read the tables (${r.error.message}). Has migration 006 been run?`);
    process.exit(1);
  }
}
save("decisions.json", JSON.stringify(decisions.data, null, 2));
save("decision_documents.json", JSON.stringify(documents.data, null, 2));

let saved = 0;
const failed = [];
for (const doc of documents.data) {
  const { data, error } = await db.storage.from(BUCKET).download(doc.storage_path);
  if (error || !data) {
    failed.push(`${doc.file_name} (${doc.storage_path}): ${error?.message ?? "no data"}`);
    continue;
  }
  save(join("files", doc.storage_path), await data.arrayBuffer());
  saved++;
}
console.log(`${decisions.data.length} decisions, ${documents.data.length} document records, ${saved} files saved to ${out}/`);
if (failed.length) {
  console.error(`${failed.length} file(s) could not be downloaded:\n  ${failed.join("\n  ")}`);
  process.exit(1);
}
