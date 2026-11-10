import { headers } from "next/headers";
import fs from "node:fs/promises";
import path from "node:path";

// Alamat dasar situs, dipakai untuk membuat link event dan isi QR Code.
//
// Urutan yang dipakai:
//  1. Alamat yang sedang dipakai browser (Host / X-Forwarded-Host), kalau itu alamat
//     publik. Contoh: dashboard dibuka lewat https://xxxx.trycloudflare.com atau domain
//     Vercel. Ini otomatis ikut berubah kalau alamat tunnel berubah.
//  2. File .tunnel-url yang ditulis `npm run tunnel` (dashboard dibuka lewat
//     localhost, tapi tamu masuk lewat tunnel Cloudflare).
//  3. APP_URL di .env.local (cadangan manual).
//  4. Alamat request apa adanya (localhost).
const LOCAL_HOST = /^(localhost|127\.|0\.0\.0\.0|\[?::1|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i;
const TUNNEL_URL = /^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/i;

async function readTunnelUrl() {
  try {
    const text = (await fs.readFile(path.join(process.cwd(), ".tunnel-url"), "utf8")).trim();
    return TUNNEL_URL.test(text) ? text : null;
  } catch {
    return null; // file belum ada = tunnel tidak dijalankan lewat npm run tunnel
  }
}

export async function getBaseUrl() {
  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(",")[0].trim();
  const proto = (h.get("x-forwarded-proto") ?? "").split(",")[0].trim();

  // Alamat publik selalu HTTPS, jadi kalau header proto tidak ada, anggap https.
  if (host && !LOCAL_HOST.test(host)) return `${proto || "https"}://${host}`;

  const tunnel = await readTunnelUrl();
  if (tunnel) return tunnel;

  if (process.env.APP_URL) return process.env.APP_URL.trim().replace(/\/+$/, "");
  return host ? `${proto || "http"}://${host}` : "http://localhost:3000";
}
