// Warna halaman tamu. Hanya dua warna yang bisa diganti per event:
//   dark = semua warna "hitam" (latar halaman, kartu, garis, kolom isian)
//   gold = semua warna "gold" (tombol, teks, garis aksen, cahaya di sekeliling foto)
// Warna turunan (kartu sedikit lebih terang, teks emas lembut, dll.) dihitung dari dua warna ini,
// lalu dipasang sebagai variabel CSS pada pembungkus halaman tamu (lihat app/globals.css).

export const DEFAULT_DARK = "#131315";
export const DEFAULT_GOLD = "#d4af37";

const HEX = /^#[0-9a-f]{6}$/;

// Pilihan cepat di editor (hitam, gold).
export const THEME_PRESETS = [
  { name: "Bawaan", dark: DEFAULT_DARK, gold: DEFAULT_GOLD },
  { name: "Navy & Silver", dark: "#0f1b2d", gold: "#c9d1d9" },
  { name: "Maroon & Emas", dark: "#3b0d11", gold: "#e0b84f" },
  { name: "Krem & Rose Gold", dark: "#faf6f2", gold: "#a8576a" },
];

export const normalizeHex = (v) => (typeof v === "string" && HEX.test(v.trim().toLowerCase()) ? v.trim().toLowerCase() : null);

const toRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (rgb) => "#" + rgb.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("");

// Campur dua warna: t = 0 -> a, t = 1 -> b.
export function mix(a, b, t) {
  const A = toRgb(a);
  const B = toRgb(b);
  return toHex(A.map((v, i) => v + (B[i] - v) * t));
}

// Kecerahan relatif (0 gelap .. 1 terang) menurut WCAG.
export function luminance(hex) {
  const [r, g, b] = toRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Rasio kontras dua warna (1 = sama, 21 = hitam dan putih). Di bawah 3 teks sulit dibaca.
export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Variabel CSS untuk pasangan warna (hex #rrggbb atau kosong = bawaan).
// Mengembalikan undefined kalau semuanya bawaan, jadi tampilan lama tidak berubah sama sekali.
export function themeVars(dark, gold) {
  const d = normalizeHex(dark) ?? DEFAULT_DARK;
  const g = normalizeHex(gold) ?? DEFAULT_GOLD;
  const vars = {};
  if (d !== DEFAULT_DARK) {
    // Latar terang: kartu dan garis dibuat sedikit lebih gelap. Latar gelap: sedikit lebih terang.
    const toward = luminance(d) < 0.5 ? "#ffffff" : "#000000";
    vars["--ink"] = d;
    vars["--surface"] = mix(d, toward, 0.06);
    vars["--surface-2"] = mix(d, toward, 0.11);
    vars["--line"] = mix(d, toward, 0.19);
    vars["--ink-glow"] = mix(d, toward, luminance(d) < 0.5 ? 0.16 : 0.05);
    vars.colorScheme = luminance(d) < 0.5 ? "dark" : "light";
  }
  if (g !== DEFAULT_GOLD || d !== DEFAULT_DARK) {
    vars["--gold"] = g;
    const terang = luminance(d) < 0.5; // latar gelap: aksen dibuat lebih terang; latar terang: lebih gelap agar tetap terbaca
    vars["--gold-soft"] = terang ? mix(g, "#ffffff", 0.25) : mix(g, "#000000", 0.12);
    vars["--fg"] = terang ? mix(g, "#ffffff", 0.37) : mix(g, "#000000", 0.3);
  }
  return Object.keys(vars).length ? vars : undefined;
}

// Versi dari baris event di database.
export const themeFromEvent = (event) => themeVars(event?.theme_dark, event?.theme_gold);

// Warna gold dengan transparansi (untuk cahaya / bayangan di sekeliling foto).
export const goldA = (alpha) => `color-mix(in srgb, var(--gold) ${Math.round(alpha * 100)}%, transparent)`;
