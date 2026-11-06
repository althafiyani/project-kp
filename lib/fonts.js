// Daftar font untuk teks frame (aman dipakai di server maupun client).
//
// Font disimpan di database sebagai "referensi font":
//   null                              -> font bawaan
//   { id: "playfair-display" }        -> font dari daftar di bawah
//   { id: "c:<uuid>", name, url }     -> font yang diupload vendor untuk event itu
// File font daftar ada di public/fonts/library (huruf Latin, lisensi OFL).

const lib = (id, name, group) => ({ id, name, group, url: `/fonts/library/${id}.woff2`, format: "woff2" });

export const FONT_GROUPS = ["Bawaan", "Serif", "Latin"];

export const BUILTIN_FONTS = [
  { id: "perandory", name: "Perandory Semi Condensed", group: "Bawaan", url: "/fonts/PerandorySemiCondensed.otf", format: "opentype" },
  { id: "aston-script", name: "Aston Script", group: "Bawaan", url: "/fonts/AstonScript.otf", format: "opentype" },

  lib("playfair-display", "Playfair Display", "Serif"),
  lib("cormorant-garamond", "Cormorant Garamond", "Serif"),
  lib("cinzel", "Cinzel", "Serif"),
  lib("libre-baskerville", "Libre Baskerville", "Serif"),
  lib("lora", "Lora", "Serif"),
  lib("merriweather", "Merriweather", "Serif"),
  lib("dm-serif-display", "DM Serif Display", "Serif"),
  lib("bodoni-moda", "Bodoni Moda", "Serif"),
  lib("eb-garamond", "EB Garamond", "Serif"),
  lib("crimson-text", "Crimson Text", "Serif"),
  lib("spectral", "Spectral", "Serif"),
  lib("abril-fatface", "Abril Fatface", "Serif"),
  lib("old-standard-tt", "Old Standard TT", "Serif"),
  lib("prata", "Prata", "Serif"),
  lib("gilda-display", "Gilda Display", "Serif"),
  lib("marcellus", "Marcellus", "Serif"),
  lib("cardo", "Cardo", "Serif"),
  lib("vollkorn", "Vollkorn", "Serif"),

  lib("great-vibes", "Great Vibes", "Latin"),
  lib("dancing-script", "Dancing Script", "Latin"),
  lib("parisienne", "Parisienne", "Latin"),
  lib("allura", "Allura", "Latin"),
  lib("alex-brush", "Alex Brush", "Latin"),
  lib("sacramento", "Sacramento", "Latin"),
  lib("tangerine", "Tangerine", "Latin"),
  lib("pinyon-script", "Pinyon Script", "Latin"),
  lib("italianno", "Italianno", "Latin"),
  lib("montserrat", "Montserrat", "Latin"),
  lib("poppins", "Poppins", "Latin"),
  lib("josefin-sans", "Josefin Sans", "Latin"),
];

export const DEFAULT_FONT_TOP = "perandory";
export const DEFAULT_FONT_NAME = "aston-script";

const BY_ID = new Map(BUILTIN_FONTS.map((f) => [f.id, f]));

export const CUSTOM_FONT_URL = /^\/api\/files\/fonts\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(woff2|woff|ttf|otf)$/;
const CUSTOM_ID = /^c:[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

// Merapikan referensi font dari database / input. Yang tidak sah jadi null (= bawaan).
export function normalizeFontRef(raw) {
  if (!raw || typeof raw !== "object") return null;
  const id = String(raw.id ?? "");
  if (BY_ID.has(id)) return { id };
  if (CUSTOM_ID.test(id) && CUSTOM_FONT_URL.test(String(raw.url ?? ""))) {
    return { id, name: String(raw.name ?? "Font saya").slice(0, 60), url: raw.url };
  }
  return null;
}

// Data lengkap sebuah font untuk dimuat/dipakai. kind: "top" | "name" (menentukan font bawaan).
export function resolveFont(ref, kind) {
  const r = normalizeFontRef(ref);
  if (r && BY_ID.has(r.id)) {
    const f = BY_ID.get(r.id);
    return { ...f, family: `"ff-${f.id}"` };
  }
  if (r) {
    const format = r.url.endsWith(".woff2") ? "woff2" : r.url.endsWith(".woff") ? "woff" : r.url.endsWith(".otf") ? "opentype" : "truetype";
    return { id: r.id, name: r.name, group: "Font saya", url: r.url, format, family: `"ff-${r.id.slice(2)}"` };
  }
  return resolveFont({ id: kind === "top" ? DEFAULT_FONT_TOP : DEFAULT_FONT_NAME }, kind);
}

export function sameFont(a, b) {
  return (normalizeFontRef(a)?.id ?? null) === (normalizeFontRef(b)?.id ?? null);
}

// Jenis file font dari isi file (bukan ekstensi). null = bukan font yang didukung.
export function detectFontType(buf) {
  if (buf.length < 12) return null;
  const tag = buf.subarray(0, 4).toString("latin1");
  if (tag === "wOF2") return { ext: "woff2" };
  if (tag === "wOFF") return { ext: "woff" };
  if (tag === "OTTO") return { ext: "otf" };
  if (buf[0] === 0x00 && buf[1] === 0x01 && buf[2] === 0x00 && buf[3] === 0x00) return { ext: "ttf" };
  if (tag === "true") return { ext: "ttf" };
  return null;
}
