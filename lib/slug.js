import { randomInt } from "node:crypto";

// Tanpa huruf/angka yang mirip (i, l, o, 0, 1) supaya mudah dibaca manusia.
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export function randomCode(length = 4) {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

// "Tiara & Rifqi" -> "tiara-rifqi"
export function slugify(text) {
  const base = String(text)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // buang aksen
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return base || "event";
}

// Slug + kode acak, contoh: "tiara-rifqi-7k2p".
// Kode acak membuat link sulit ditebak orang lain.
export function makeSlug(name) {
  return `${slugify(name)}-${randomCode(4)}`;
}
