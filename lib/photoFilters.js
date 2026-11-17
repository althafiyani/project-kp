// Filter foto: Normal + 20 filter warna yang dikelompokkan (5 B&W, 8 Cool Tone, 7 Warm Tone)
// + 5 filter Ilustrasi (foto diubah jadi gambar kartun / komik / sketsa / cat air).
// Hanya dipanggil dari komponen client (memakai canvas).
//
// Filter diterapkan ke TIAP FOTO (bukan ke seluruh strip), sehingga desain frame
// tetap berwarna asli. Foto dipotong dulu sesuai bentuk lubangnya, jadi efek seperti
// blur radial pas di bagian foto yang benar-benar terlihat di frame.
import { coverCrop, OVERSCAN } from "@/lib/frameSlots";
import { composeStrip, OUTPUT_SCALE } from "@/lib/photoStrip";
import { illustrate, illustrateAsync } from "@/lib/illustration";

// Parameter tiap filter warna (grade):
//   brightness  tambah/kurangi terang (-1..1)      contrast   pengali kontras (1 = normal)
//   saturation  pengali warna (0 = hitam-putih)    tint       pengali [R, G, B]
//   sepia       0..1                               fade       angkat warna hitam (efek matte) 0..1
//   split       {shadow:[r,g,b], highlight:[r,g,b]} geser warna di bayangan / bagian terang
// radial: true = bagian samping/atas/bawah di-blur halus, tengah tetap tajam.
//
// Kelompok (pilihan di atas daftar filter): tiap filter punya group = id di FILTER_GROUPS.
export const FILTER_GROUPS = [
  { id: "bw", name: "B&W" },
  { id: "cool", name: "Cool Tone" },
  { id: "warm", name: "Warm Tone" },
  { id: "ilustrasi", name: "Ilustrasi" },
];

// Kelompok yang mengubah foto jadi gambar (ada pembanding sebelum/sesudah di layarnya).
export const ILLUSTRATION_GROUP = "ilustrasi";

export const FILTERS = [
  { id: "normal", name: "Normal" },

  // --- B&W (5)
  { id: "bw-terang", name: "B&W Terang", group: "bw", grade: { saturation: 0, brightness: 0.12, contrast: 1.0 } },
  { id: "bw-gelap", name: "B&W Gelap", group: "bw", grade: { saturation: 0, brightness: -0.08, contrast: 1.2 } },
  { id: "bw-klasik", name: "Klasik", group: "bw", grade: { saturation: 0, contrast: 1.08, fade: 0.08, brightness: 0.03 } },
  { id: "bw-noir", name: "Noir", group: "bw", grade: { saturation: 0, contrast: 1.5, brightness: -0.14 } },
  { id: "bw-fokus", name: "B&W Fokus", group: "bw", radial: true, grade: { saturation: 0, contrast: 1.1 } },

  // --- Cool Tone (8)
  { id: "dingin", name: "Dingin", group: "cool", grade: { tint: [0.86, 0.98, 1.1], saturation: 1.05 } },
  { id: "es", name: "Es", group: "cool", grade: { tint: [0.82, 0.98, 1.15], saturation: 0.95, brightness: 0.05 } },
  { id: "laut", name: "Laut", group: "cool", grade: { tint: [0.8, 1.0, 1.08], saturation: 1.2, contrast: 1.08 } },
  { id: "embun", name: "Embun", group: "cool", grade: { tint: [0.92, 1.0, 1.08], saturation: 0.75, brightness: 0.1, fade: 0.1, contrast: 0.9 } },
  {
    id: "sinema",
    name: "Sinema",
    group: "cool",
    grade: { contrast: 1.15, saturation: 1.1, split: { shadow: [-20, 4, 14], highlight: [18, 6, -16] } },
  },
  { id: "malam", name: "Biru Malam", group: "cool", grade: { tint: [0.78, 0.9, 1.15], saturation: 1.1, contrast: 1.15, brightness: -0.08 } },
  { id: "mint", name: "Mint", group: "cool", grade: { tint: [0.9, 1.08, 1.0], saturation: 1.1, brightness: 0.04 } },
  { id: "lavender", name: "Lavender", group: "cool", grade: { tint: [1.02, 0.94, 1.12], saturation: 0.95, brightness: 0.06, fade: 0.05 } },

  // --- Warm Tone (7)
  { id: "hangat", name: "Hangat", group: "warm", grade: { tint: [1.08, 1.0, 0.86], saturation: 1.1, brightness: 0.02 } },
  { id: "sepia", name: "Sepia", group: "warm", grade: { sepia: 0.9, contrast: 1.05, brightness: 0.02 } },
  {
    id: "vintage",
    name: "Vintage",
    group: "warm",
    grade: { saturation: 0.75, contrast: 0.92, fade: 0.14, tint: [1.06, 1.0, 0.9], brightness: 0.03, sepia: 0.25 },
  },
  { id: "golden", name: "Golden Hour", group: "warm", grade: { tint: [1.12, 1.02, 0.8], saturation: 1.25, contrast: 1.08, brightness: 0.03 } },
  { id: "peach", name: "Peach", group: "warm", grade: { tint: [1.08, 0.97, 0.92], saturation: 0.9, brightness: 0.08, fade: 0.06, contrast: 0.92 } },
  {
    id: "senja",
    name: "Senja",
    group: "warm",
    grade: { tint: [1.1, 0.95, 0.85], contrast: 1.12, saturation: 1.3, split: { shadow: [14, 0, -10], highlight: [10, 4, -10] } },
  },
  { id: "cerah", name: "Cerah", group: "warm", grade: { saturation: 1.5, contrast: 1.15, brightness: 0.02, tint: [1.04, 1.0, 0.94] } },

  // --- Ilustrasi (5): foto jadi gambar. illustration = nama gaya di lib/illustration.js
  { id: "il-kartun", name: "Kartun", group: "ilustrasi", illustration: "cartoon" },
  { id: "il-lembut", name: "Kartun Lembut", group: "ilustrasi", illustration: "soft" },
  { id: "il-komik", name: "Komik", group: "ilustrasi", illustration: "comic" },
  { id: "il-sketsa", name: "Sketsa", group: "ilustrasi", illustration: "sketch" },
  { id: "il-catair", name: "Cat Air", group: "ilustrasi", illustration: "watercolor" },
];

// Filter dalam satu kelompok, sesuai urutan.
export const filtersOf = (groupId) => FILTERS.filter((f) => f.group === groupId);

export function newCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

// Salinan foto yang dipotong (dari tengah) menjadi w x h, seperti object-fit: cover.
export function cropCover(photo, w, h) {
  const out = newCanvas(w, h);
  const { sx, sy, sw, sh } = coverCrop(photo.width, photo.height, w, h);
  const ctx = out.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(photo, sx, sy, sw, sh, 0, 0, w, h);
  return out;
}

function colorGrade(canvas, p) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  const contrast = p.contrast ?? 1;
  const add = (p.brightness ?? 0) * 255;
  const sat = p.saturation ?? 1;
  const [tr, tg, tb] = p.tint ?? [1, 1, 1];
  const sepia = p.sepia ?? 0;
  const fade = p.fade ?? 0;
  const lift = 70; // warna hitam diangkat ke abu-abu gelap saat fade
  const split = p.split;

  for (let i = 0; i < d.length; i += 4) {
    let r = (d[i] - 128) * contrast + 128 + add;
    let g = (d[i + 1] - 128) * contrast + 128 + add;
    let b = (d[i + 2] - 128) * contrast + 128 + add;

    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    r = l + (r - l) * sat;
    g = l + (g - l) * sat;
    b = l + (b - l) * sat;

    r *= tr;
    g *= tg;
    b *= tb;

    if (split) {
      const t = Math.min(1, Math.max(0, l / 255));
      r += split.shadow[0] * (1 - t) + split.highlight[0] * t;
      g += split.shadow[1] * (1 - t) + split.highlight[1] * t;
      b += split.shadow[2] * (1 - t) + split.highlight[2] * t;
    }

    if (sepia) {
      const sr = 0.393 * r + 0.769 * g + 0.189 * b;
      const sg = 0.349 * r + 0.686 * g + 0.168 * b;
      const sb = 0.272 * r + 0.534 * g + 0.131 * b;
      r = r + (sr - r) * sepia;
      g = g + (sg - g) * sepia;
      b = b + (sb - b) * sepia;
    }

    if (fade) {
      r = r * (1 - fade) + lift * fade;
      g = g * (1 - fade) + lift * fade;
      b = b * (1 - fade) + lift * fade;
    }

    d[i] = r; // Uint8ClampedArray membulatkan dan membatasi 0..255 sendiri
    d[i + 1] = g;
    d[i + 2] = b;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

// Bulatan di tengah tetap tajam, bagian samping/atas/bawah di-blur halus.
// Blur dibuat dengan memperkecil lalu memperbesar gambar (cepat, dan jalan di semua browser).
function radialBlur(src) {
  const w = src.width;
  const h = src.height;

  let small = newCanvas(Math.max(8, Math.round(w / 10)), Math.max(8, Math.round(h / 10)));
  let sctx = small.getContext("2d");
  sctx.imageSmoothingQuality = "high";
  sctx.drawImage(src, 0, 0, small.width, small.height);
  const tiny = newCanvas(Math.max(6, Math.round(w / 20)), Math.max(6, Math.round(h / 20)));
  const tctx = tiny.getContext("2d");
  tctx.imageSmoothingQuality = "high";
  tctx.drawImage(small, 0, 0, tiny.width, tiny.height);
  small = tiny;

  const out = newCanvas(w, h);
  const ctx = out.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(small, 0, 0, w, h); // lapisan blur

  // Lapisan tajam: foto asli yang hanya tersisa di tengah (pudar halus ke pinggir).
  const sharp = newCanvas(w, h);
  const kctx = sharp.getContext("2d");
  kctx.drawImage(src, 0, 0);
  const m = Math.min(w, h);
  const grad = kctx.createRadialGradient(w / 2, h / 2, m * 0.3, w / 2, h / 2, m * 0.7);
  grad.addColorStop(0, "rgba(0,0,0,1)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  kctx.globalCompositeOperation = "destination-in";
  kctx.fillStyle = grad;
  kctx.fillRect(0, 0, w, h);

  ctx.drawImage(sharp, 0, 0);
  return out;
}

// Mengembalikan canvas baru berisi foto yang sudah difilter (foto asli tidak diubah).
export function applyFilter(photo, filterId) {
  const f = FILTERS.find((x) => x.id === filterId);
  if (!f || filterId === "normal") return photo;
  if (f.illustration) return illustrate(photo, f.illustration);
  if (f.radial) {
    const blurred = radialBlur(photo);
    return f.grade ? colorGrade(blurred, f.grade) : blurred;
  }
  const copy = newCanvas(photo.width, photo.height);
  copy.getContext("2d").drawImage(photo, 0, 0);
  return colorGrade(copy, f.grade);
}

// Seperti applyFilter, tapi filter ilustrasi dikerjakan di Web Worker (tidak membekukan halaman).
export async function applyFilterAsync(photo, filterId) {
  const f = FILTERS.find((x) => x.id === filterId);
  if (f?.illustration) return illustrateAsync(photo, f.illustration);
  return applyFilter(photo, filterId);
}

// Seperti renderFiltered, tapi semua foto difilter paralel (satu worker per foto). Untuk filter ilustrasi.
export async function renderFilteredAsync(frame, photos, filterId, text = null) {
  const filtered = await Promise.all(
    frame.slots.map((slot, i) => {
      if (!photos[i]) return null;
      const w = Math.round((slot.w + OVERSCAN * 2) * OUTPUT_SCALE);
      const h = Math.round((slot.h + OVERSCAN * 2) * OUTPUT_SCALE);
      return applyFilterAsync(cropCover(photos[i], w, h), filterId);
    }),
  );
  return composeStrip({ frame, photos: filtered, text });
}

// Menyusun strip dari foto-foto mentah + filter yang dipilih.
// Tiap foto dipotong sesuai lubangnya (ukuran sama dengan hasil akhir), difilter,
// lalu ditempel ke frame.
export function renderFiltered(frame, photos, filterId, text = null) {
  const cropped = frame.slots.map((slot, i) => {
    if (!photos[i]) return null;
    const w = Math.round((slot.w + OVERSCAN * 2) * OUTPUT_SCALE);
    const h = Math.round((slot.h + OVERSCAN * 2) * OUTPUT_SCALE);
    return applyFilter(cropCover(photos[i], w, h), filterId);
  });
  return composeStrip({ frame, photos: cropped, text });
}

// Gambar kecil contoh tiap filter (dari foto pertama), untuk daftar pilihan filter.
export function makeThumbs(photo, w = 140, h = 160) {
  const base = cropCover(photo, w, h);
  const thumbs = {};
  for (const f of FILTERS) thumbs[f.id] = applyFilter(base, f.id).toDataURL("image/jpeg", 0.8);
  return thumbs;
}
