// Mengisi data contoh untuk demo / development:
//   - akun admin  (username: vendor,    password: 123456) -> bisa mengakses SEMUA event
//   - akun mempelai (username: mempelai1, password: 123456) -> hanya event demo di bawah
//   - 1 event demo yang dihubungkan ke mempelai1
// Aman dijalankan berulang kali: data yang sudah ada tidak diubah.
// Jalankan: npm run seed
import pg from "pg";
import bcrypt from "bcryptjs";

if (process.env.NODE_ENV === "production") {
  console.error("Seed demo tidak boleh dijalankan di production.");
  process.exit(1);
}

const DEMO_ADMIN = { name: "Vendor MyCard", username: "vendor", password: "123456" };
const DEMO_MEMPELAI = { name: "Pesta Pernikahan Demo", username: "mempelai1", password: "123456" };
const DEMO_EVENT = { name: "Pesta Pernikahan Demo", slug: "pernikahan-demo" };

async function ensureUser(client, u, role) {
  const hash = await bcrypt.hash(u.password, 10);
  await client.query(
    `INSERT INTO users (name, username, password_hash, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (username) DO NOTHING`,
    [u.name, u.username, hash, role],
  );
  const { rows } = await client.query("SELECT id FROM users WHERE username = $1", [u.username]);
  return rows[0].id;
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
try {
  await client.connect();

  const adminId = await ensureUser(client, DEMO_ADMIN, "admin");
  const mempelaiId = await ensureUser(client, DEMO_MEMPELAI, "mempelai");

  await client.query(
    `INSERT INTO events (vendor_id, name, slug, event_date, status, mempelai_id)
     VALUES ($1, $2, $3, CURRENT_DATE, 'active', $4)
     ON CONFLICT (slug) DO NOTHING`,
    [adminId, DEMO_EVENT.name, DEMO_EVENT.slug, mempelaiId],
  );

  console.log("Seed selesai.");
  console.log(`  Admin    : ${DEMO_ADMIN.username} / ${DEMO_ADMIN.password}`);
  console.log(`  Mempelai : ${DEMO_MEMPELAI.username} / ${DEMO_MEMPELAI.password}`);
  console.log(`  Event    : ${DEMO_EVENT.name} (slug: ${DEMO_EVENT.slug})`);
} catch (err) {
  console.error("Seed gagal:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
