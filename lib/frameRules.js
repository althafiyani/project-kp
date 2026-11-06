// Ketentuan frame buatan vendor (aman dipakai di server maupun client).
//
// Ukuran bebas (dalam piksel), asal:
//   - PNG dengan lubang foto transparan,
//   - di bagian paling bawah ada area tulisan setinggi 235-245 px (tinggi sebenarnya, apa pun
//     ukuran frame-nya) untuk "THE WEDDING OF" dan nama pengantin,
//   - lubang foto tidak boleh masuk ke area tulisan itu.
// Dua contoh ukuran yang dipakai frame bawaan:
//   450 x 1350   (frame sempit), 1080 x 1350 (frame lebar, 1 sampai 4 lubang foto)
export const FRAME_TYPES = [
  { kind: "narrow", w: 450, h: 1350, areaH: 245, label: "Contoh frame sempit", holes: "1 sampai 3 lubang foto" },
  { kind: "wide", w: 1080, h: 1350, areaH: 240, label: "Contoh frame lebar", holes: "1 sampai 4 lubang foto" },
];
export const AREA_MIN = 235; // tinggi area tulisan minimal (px)
export const AREA_MAX = 245; // dan maksimal
export const FRAME_LIMITS = { minW: 200, maxW: 4000, minH: 500, maxH: 6000, minRatio: 0.2, maxRatio: 1.5 };
export const FRAME_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

// Mengembalikan { areaMin, areaMax } (px) kalau ukurannya diterima,
// atau null kalau terlalu kecil/besar atau rasionya tidak wajar.
export function matchFrameSize(width, height) {
  const L = FRAME_LIMITS;
  if (!Number.isInteger(width) || !Number.isInteger(height)) return null;
  if (width < L.minW || width > L.maxW || height < L.minH || height > L.maxH) return null;
  const ratio = width / height;
  if (ratio < L.minRatio || ratio > L.maxRatio) return null;
  return { areaMin: AREA_MIN, areaMax: AREA_MAX };
}

// Membaca ukuran dan jenis warna sebuah file PNG dari header-nya (tanpa mendekode gambar).
// Mengembalikan { width, height, hasAlpha } atau null kalau bukan PNG yang utuh.
export function readPngInfo(buf) {
  const SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (buf.length < 33 || SIG.some((b, i) => buf[i] !== b)) return null;
  if (buf.subarray(12, 16).toString("ascii") !== "IHDR") return null;
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const colorType = buf[25];
  let hasAlpha = colorType === 4 || colorType === 6;
  if (colorType === 3) {
    // PNG berpalet: transparan kalau ada blok tRNS sebelum data gambar.
    let pos = 8;
    while (pos + 12 <= buf.length) {
      const len = buf.readUInt32BE(pos);
      const type = buf.subarray(pos + 4, pos + 8).toString("ascii");
      if (type === "tRNS") {
        hasAlpha = true;
        break;
      }
      if (type === "IDAT" || type === "IEND") break;
      pos += 12 + len;
    }
  }
  return { width, height, hasAlpha };
}
