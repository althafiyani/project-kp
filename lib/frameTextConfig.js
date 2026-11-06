// Pengaturan teks di bagian bawah frame (aman dipakai di server maupun client).
//
// Teks terdiri dari 2 baris:
//     THE WEDDING OF        <- teks atas   (font Perandory Semi Condensed, tetap)
//     Alia & Sandra         <- nama        (font Aston Script, tetap)
// Vendor mengubah isi teks, ukuran kedua baris, jarak antar baris (masing-masing untuk
// frame sempit dan frame lebar), serta warna teks untuk frame gelap dan frame cerah.

import { normalizeFontRef } from "@/lib/fonts";

export const DEFAULT_TOP = "THE WEDDING OF";

// Dua jenis ukuran frame. Satuan ukuran = piksel pada desain setinggi 1350 (frame yang
// lebih besar/kecil diskalakan).
//   narrow: 450 x 1350,  area tulisan 450 x 245
//   wide  : 1080 x 1350, area tulisan 1080 x 240
export const KINDS = {
  narrow: {
    label: "Frame 450 × 1350",
    areaLabel: "area tulisan 450 × 245",
    name: { min: 10, max: 80, def: 36 },
    top: { min: 8, max: 50, def: 15 },
    gap: { min: 0, max: 60, def: 8 },
  },
  wide: {
    label: "Frame 1080 × 1350",
    areaLabel: "area tulisan 1080 × 240",
    name: { min: 20, max: 150, def: 80 },
    top: { min: 10, max: 80, def: 30 },
    gap: { min: 0, max: 80, def: 12 },
  },
};

// Warna teks bawaan dan pilihan cepat. Frame "gelap" = latar area tulisan gelap, jadi
// teksnya perlu terang; frame "cerah" = latar terang, teksnya perlu gelap.
export const TEXT_LIGHT = "#f4e7c3"; // bawaan untuk frame gelap
export const TEXT_DARK = "#3b2a20"; // bawaan untuk frame cerah
export const COLOR_PRESETS = {
  dark: [
    { name: "Krem", value: "#f4e7c3" },
    { name: "Putih", value: "#ffffff" },
    { name: "Emas", value: "#e6c869" },
    { name: "Rose gold", value: "#f0c2b0" },
    { name: "Hijau muda", value: "#d8e6c0" },
  ],
  light: [
    { name: "Cokelat", value: "#3b2a20" },
    { name: "Hitam", value: "#161616" },
    { name: "Marun", value: "#6b1f2a" },
    { name: "Hijau tua", value: "#3f4f2a" },
    { name: "Biru tua", value: "#1f2f4f" },
  ],
};
export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

// Frame dianggap gelap kalau rata-rata kecerahan area tulisannya di bawah angka ini (0..1).
export const DARK_LUMINANCE = 0.55;

// Kecerahan warna hex (0..1), dipakai memilih tepi tipis yang berlawanan.
export function colorLuminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

// Tepi tipis di belakang huruf supaya tetap terbaca di latar bertekstur: gelap untuk
// teks terang, terang untuk teks gelap.
export function haloFor(hex) {
  return colorLuminance(hex) > DARK_LUMINANCE ? "rgba(20,12,8,0.55)" : "rgba(255,250,235,0.7)";
}

const clamp = (v, r) => (Number.isFinite(Number(v)) ? Math.min(r.max, Math.max(r.min, Math.round(Number(v)))) : r.def);

// Melengkapi pengaturan dari database dengan nilai bawaan (kolom kosong / data lama).
// Hasil: { narrow:{name,top,gap}, wide:{name,top,gap}, onDark, onLight, fontTop, fontName }
// (onDark/onLight = hex; fontTop/fontName = referensi font atau null untuk bawaan, lihat lib/fonts.js).
export function normalizeStyle(raw) {
  const st = raw && typeof raw === "object" ? raw : {};
  const kind = (k) => {
    const v = st[k] && typeof st[k] === "object" ? st[k] : {};
    return {
      name: v.name == null ? KINDS[k].name.def : clamp(v.name, KINDS[k].name),
      top: v.top == null ? KINDS[k].top.def : clamp(v.top, KINDS[k].top),
      gap: v.gap == null ? KINDS[k].gap.def : clamp(v.gap, KINDS[k].gap),
    };
  };
  return {
    narrow: kind("narrow"),
    wide: kind("wide"),
    onDark: HEX_COLOR.test(st.onDark ?? "") ? st.onDark.toLowerCase() : TEXT_LIGHT,
    onLight: HEX_COLOR.test(st.onLight ?? "") ? st.onLight.toLowerCase() : TEXT_DARK,
    fontTop: normalizeFontRef(st.fontTop),
    fontName: normalizeFontRef(st.fontName),
  };
}

// Area tulisan minimal (px) kalau area menyesuaikan otomatis mengikuti lubang foto.
export const MIN_AUTO_AREA = 120;

// Area tulisan frame (di bagian paling bawah, selebar frame). Ukuran frame bebas.
//   - Standar: tinggi 235-245 px (245 untuk frame ramping rasio < 0,55, selain itu 240).
//   - Kalau lubang foto (slots) turun sampai masuk ke area standar itu, area tulisan menyesuaikan
//     otomatis: dimulai tepat di bawah lubang paling bawah, asal sisanya masih >= MIN_AUTO_AREA px.
// Mengembalikan { x, y, w, h, scale, kind, auto } dalam piksel gambar frame.
export function getTextArea(width, height, slots = []) {
  if (!width || !height) return null;
  const scale = 1;
  const kind = width / height < 0.55 ? "narrow" : "wide";
  const areaH = kind === "narrow" ? 245 : 240;
  const area = { x: 0, y: height - areaH, w: width, h: areaH, scale, kind, auto: false };
  const lowest = slots.reduce((m, s) => Math.max(m, s.y + s.h), 0);
  if (lowest > area.y) {
    const y = Math.ceil(lowest + Math.max(6, height * 0.01));
    if (height - y >= MIN_AUTO_AREA) return { ...area, y, h: height - y, auto: true };
  }
  return area;
}

// Mengubah baris event di database menjadi pengaturan teks, atau null kalau nama kosong
// (tanpa nama pengantin, frame ditampilkan tanpa teks).
// Hasil: { top, name, narrow, wide, onDark, onLight }.
export function frameTextFromEvent(row) {
  const name = (row?.frame_text_name ?? "").trim();
  if (!name) return null;
  return {
    top: (row.frame_text_top ?? "").trim() || DEFAULT_TOP,
    name,
    ...normalizeStyle(row.frame_text_style),
  };
}
