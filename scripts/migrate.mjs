import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

// Menjalankan semua file di sql/migrations/*.sql yang belum pernah dijalankan,
// berurutan menurut nama file. Riwayatnya dicatat di tabel schema_migrations.
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
const dir = path.join(process.cwd(), "sql", "migrations");

await client.connect();
await client.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    name       TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);

const done = new Set(
  (await client.query("SELECT name FROM schema_migrations")).rows.map((r) => r.name)
);
const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

let count = 0;
for (const file of files) {
  if (done.has(file)) continue;
  const sql = await readFile(path.join(dir, file), "utf8");
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
    await client.query("COMMIT");
    console.log("applied:", file);
    count++;
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("gagal:", file, "-", err.message);
    await client.end();
    process.exit(1);
  }
}

console.log(count ? `${count} migrasi dijalankan.` : "Tidak ada migrasi baru.");
await client.end();
