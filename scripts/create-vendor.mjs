// Membuat akun ADMIN (vendor MyCard). Akun mempelai dibuat dari dashboard admin saat menambah event.
// Jalankan: node --env-file=.env.local scripts/create-vendor.mjs
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import pg from "pg";
import bcrypt from "bcryptjs";

const rl = readline.createInterface({ input, output });
const name = (await rl.question("Nama vendor: ")).trim();
const username = (await rl.question("Username (huruf kecil/angka, min 3 karakter): ")).trim().toLowerCase();
const password = await rl.question("Password (min 6 karakter): ");
rl.close();

if (!name || !/^[a-z0-9][a-z0-9._-]{2,29}$/.test(username) || password.length < 6) {
  console.error("Data tidak valid. Nama wajib, username 3-30 karakter (huruf kecil/angka/titik/strip), password minimal 6 karakter.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
try {
  await client.connect();
  const hash = await bcrypt.hash(password, 10);
  const { rows } = await client.query(
    "INSERT INTO users (name, username, password_hash, role) VALUES ($1, $2, $3, 'admin') RETURNING id",
    [name, username, hash],
  );
  console.log("Akun admin dibuat. ID:", rows[0].id);
} catch (err) {
  if (err.code === "23505") {
    console.error("Username itu sudah dipakai.");
  } else {
    console.error("Gagal:", err.message);
  }
  process.exitCode = 1;
} finally {
  await client.end();
}
