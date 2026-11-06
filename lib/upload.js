export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB, sesuai proposal

// Jenis file dibaca dari ISI file (magic bytes), bukan dari nama atau ekstensi
// yang bisa dipalsukan. SVG sengaja tidak diizinkan (bisa berisi script).
export function detectImageType(buf) {
  if (
    buf.length >= 8 &&
    buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return { ext: "png", mime: "image/png" };
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { ext: "jpg", mime: "image/jpeg" };
  }
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { ext: "webp", mime: "image/webp" };
  }
  return null;
}

// Membaca & memvalidasi satu file gambar dari FormData.
// Hasil: { ok: true, buffer, type } atau { ok: false, status, error }
export async function readImageUpload(formData, field, allowedExts) {
  const file = formData.get(field);
  if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") {
    return { ok: false, status: 400, error: "File belum dipilih." };
  }
  if (file.size === 0) {
    return { ok: false, status: 400, error: "File kosong." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, status: 413, error: "Ukuran file maksimal 5 MB." };
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const type = detectImageType(buffer);
  if (!type || !allowedExts.includes(type.ext)) {
    return {
      ok: false,
      status: 415,
      error: `Format file tidak didukung. Gunakan ${allowedExts.join(", ").toUpperCase()}.`,
    };
  }
  return { ok: true, buffer, type };
}
