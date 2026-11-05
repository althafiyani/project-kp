// Penyimpanan file. SEMUA kode lain memanggil saveFile / deleteFile / readStoredFile
// dari sini, jadi pindah penyimpanan cukup mengganti isi file ini.
//
// Versi sekarang: disimpan di folder "uploads" di laptop (untuk pengembangan).
// CATATAN: disk Vercel bersifat sementara, jadi sebelum deploy ke Vercel isi file
// ini harus diganti memakai Vercel Blob (put() dan del()).
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const BASE_DIR = path.join(process.cwd(), "uploads");
const URL_PREFIX = "/api/files/";

// Hanya path "folder/uuid.ekstensi" yang dianggap sah. Ini mencegah path traversal
// seperti "../../.env.local".
export const SAFE_REL =
  /^[a-z0-9-]+\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(png|jpg|webp|webm|ogg|mp4|m4a|mp3|woff2|woff|ttf|otf)$/;

export const CONTENT_TYPES = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
  webm: "audio/webm",
  ogg: "audio/ogg",
  mp4: "audio/mp4",
  m4a: "audio/mp4",
  mp3: "audio/mpeg",
  woff2: "font/woff2",
  woff: "font/woff",
  ttf: "font/ttf",
  otf: "font/otf",
};

// Mengembalikan URL yang disimpan di database, mis. "/api/files/frames/xxxx.png".
export async function saveFile(buffer, { folder, ext }) {
  const name = `${randomUUID()}.${ext}`;
  const dir = path.join(BASE_DIR, folder);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), buffer);
  return `${URL_PREFIX}${folder}/${name}`;
}

// Gagal menghapus file tidak boleh menggagalkan permintaan, cukup dicatat.
export async function deleteFile(url) {
  if (!url || !url.startsWith(URL_PREFIX)) return;
  const rel = url.slice(URL_PREFIX.length);
  if (!SAFE_REL.test(rel)) return;
  try {
    await fs.unlink(path.join(BASE_DIR, rel));
  } catch (err) {
    if (err.code !== "ENOENT") console.error("[storage] gagal hapus", rel, err.message);
  }
}

// Dipakai route /api/files/... Mengembalikan null kalau path tidak sah / file tidak ada.
export async function readStoredFile(rel) {
  if (!SAFE_REL.test(rel)) return null;
  try {
    const data = await fs.readFile(path.join(BASE_DIR, rel));
    const ext = rel.split(".").pop();
    return { data, contentType: CONTENT_TYPES[ext] };
  } catch {
    return null;
  }
}
