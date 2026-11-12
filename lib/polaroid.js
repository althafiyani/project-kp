// Warna polaroid di halaman pembuka tamu (aman dipakai di server maupun client).
// Disimpan di kolom events.opening_frame_1 / opening_frame_2 sebagai teks:
//   "#rrggbb"            -> satu warna
//   "#rrggbb,#rrggbb"    -> gradasi dari warna pertama ke warna kedua
// Nilai lama (kunci template frame) atau yang tidak valid dibaca sebagai putih.
export const POLAROID_DEFAULT = "#ffffff";
export const POLAROID_RE = /^#[0-9a-f]{6}(,#[0-9a-f]{6})?$/;

export const POLAROID_PRESETS = [
  { name: "Putih", value: "#ffffff" },
  { name: "Krem", value: "#f6efe2" },
  { name: "Hitam", value: "#1d1d20" },
  { name: "Pink", value: "#f4c2cf" },
  { name: "Hijau sage", value: "#cfe0cb" },
  { name: "Biru muda", value: "#cfe3f2" },
  { name: "Navy", value: "#1f2f4f" },
  { name: "Marun", value: "#6b1f2a" },
  { name: "Emas", value: "#d4af37" },
];

// Hasil: { from, to } (to = null kalau satu warna).
export function parsePolaroid(value) {
  const v = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!POLAROID_RE.test(v)) return { from: POLAROID_DEFAULT, to: null };
  const [from, to] = v.split(",");
  return { from, to: to && to !== from ? to : null };
}

// { from, to } -> teks untuk disimpan.
export function encodePolaroid({ from, to }) {
  return to && to !== from ? `${from},${to}` : from;
}

// Nilai CSS "background" untuk badan polaroid.
export function polaroidBackground(value) {
  const { from, to } = typeof value === "object" && value ? value : parsePolaroid(value);
  return to ? `linear-gradient(160deg, ${from}, ${to})` : from;
}
