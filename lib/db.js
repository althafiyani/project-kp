import { Pool } from "pg";

// Satu "pool" koneksi dipakai bersama. Disimpan di globalThis supaya saat
// mode dev (hot reload) tidak membuat koneksi baru terus-menerus.
const globalForPg = globalThis;

export const pool =
  globalForPg.__pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.__pgPool = pool;
}

// Selalu pakai parameter ($1, $2, ...) untuk nilai dari pengguna.
// JANGAN menyambung string SQL sendiri, itu celah SQL injection.
export function query(text, params) {
  return pool.query(text, params);
}
