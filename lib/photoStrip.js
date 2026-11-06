// Fungsi canvas untuk frame dan strip foto. Hanya dipanggil dari komponen client.
import { coverCrop, detectSlots, edgeColor, OVERSCAN } from "@/lib/frameSlots";
import { getTextArea, DARK_LUMINANCE } from "@/lib/frameTextConfig";
import { drawTextLayout, layoutFrameText } from "@/lib/frameText";

// iOS membatasi ukuran canvas (sekitar 16 juta piksel). Kita batasi lebih aman.
const MAX_PIXELS = 8_000_000;
// Desain frame beresolusi kecil (mis. 450 x 1350). Hasil strip digambar 2x lebih besar
// supaya foto tamu tetap tajam dan tidak ikut diperkecil ke ukuran frame.
export const OUTPUT_SCALE = 2;
// Deteksi lubang cukup dilakukan pada gambar sekitar 1,5 juta piksel (lebih cepat).
const DETECT_PIXELS = 1_500_000;

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Gagal memuat gambar."));
    img.src = src;
  });
}

// Menilai frame gelap atau cerah: rata-rata kecerahan piksel di area tulisan (bagian
// bawah frame, piksel transparan dilewati). fromY = awal area, pecahan tinggi gambar (0..1).
// Kecerahan = 0.299 R + 0.587 G + 0.114 B (0..1). Di bawah DARK_LUMINANCE = frame gelap.
function isDarkArea(imageData, fromY) {
  const { data, width, height } = imageData;
  let sum = 0;
  let n = 0;
  for (let y = Math.floor(height * fromY); y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const i = (y * width + x) * 4;
      if (data[i + 3] < 128) continue;
      sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      n++;
    }
  }
  const lum = n ? sum / n / 255 : 0.8;
  return lum < DARK_LUMINANCE;
}

// Untuk frame buatan sendiri: menentukan latar area tulisan gelap atau cerah dengan lebih teliti
// daripada rata-rata biasa. Yang dipakai nilai tengah (median) kecerahan di bagian tempat teks
// ditulis, jadi hiasan kecil yang gelap/terang (hati, bintang) tidak membelokkan hasilnya. Batasnya
// = kecerahan di mana teks krem terang dan teks cokelat tua sama-sama terbaca (kontras WCAG).
const LIN = Array.from({ length: 256 }, (_, v) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
});
const CUSTOM_DARK_LUM = 0.21;
function isDarkAreaRobust(imageData, area) {
  const { data, width } = imageData;
  const bins = new Uint32Array(1001);
  let n = 0;
  const y0 = Math.floor(area.y + area.h * 0.1);
  const y1 = Math.floor(area.y + area.h * 0.9);
  const x0 = Math.floor(width * 0.1);
  const x1 = Math.floor(width * 0.9);
  for (let y = y0; y < y1; y += 2) {
    for (let x = x0; x < x1; x += 2) {
      const i = (y * width + x) * 4;
      if (data[i + 3] < 128) continue;
      const lum = 0.2126 * LIN[data[i]] + 0.7152 * LIN[data[i + 1]] + 0.0722 * LIN[data[i + 2]];
      bins[Math.min(1000, Math.round(lum * 1000))]++;
      n++;
    }
  }
  if (!n) return false;
  let acc = 0;
  for (let b = 0; b <= 1000; b++) {
    acc += bins[b];
    if (acc >= n / 2) return b / 1000 < CUSTOM_DARK_LUM;
  }
  return false;
}

const frameCache = new Map();

// Memuat frame lalu mendeteksi lubang fotonya otomatis dari area transparan.
// Hasilnya disimpan per URL, jadi frame yang sama tidak diproses dua kali.
// Mengembalikan { img, width, height, slots, edge, textArea, dark }.
// textArea = area tulisan di bagian bawah (null kalau ukuran frame bukan salah satu
// dari dua jenis yang punya area tulisan), dark = true kalau latar area itu gelap
// (teks memakai warna "frame gelap"), false kalau cerah.
export function loadFrame(url) {
  let promise = frameCache.get(url);
  if (!promise) {
    promise = (async () => {
      const img = await loadImage(url);
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      const k = Math.min(1, Math.sqrt(DETECT_PIXELS / (width * height)));
      const cw = Math.max(1, Math.round(width * k));
      const ch = Math.max(1, Math.round(height * k));
      const canvas = document.createElement("canvas");
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, cw, ch);

      let slots = [];
      let edge = "#ffffff";
      let textArea = getTextArea(width, height);
      let dark = false;
      try {
        const data = ctx.getImageData(0, 0, cw, ch);
        // Koordinat dikembalikan ke ukuran asli gambar.
        const sx = width / cw;
        const sy = height / ch;
        slots = detectSlots(data).map((s) => ({
          shape: s.shape,
          x: s.x * sx,
          y: s.y * sy,
          w: s.w * sx,
          h: s.h * sy,
          maskUrl: s.mask ? maskToUrl(s.mask, sx) : null,
        }));
        edge = edgeColor(data);
        textArea = getTextArea(width, height, slots);
        if (textArea) {
          // Frame bawaan (/frames/...) tetap memakai cara lama supaya tampilannya tidak berubah.
          dark = url.startsWith("/frames/") ? isDarkArea(data, textArea.y / height) : isDarkAreaRobust(data, textArea);
        }
      } catch {
        // canvas tidak bisa dibaca -> slots kosong, ditangani pemanggil
      }
      return { img, width, height, slots, edge, textArea, dark };
    })();
    frameCache.set(url, promise);
    promise.catch(() => frameCache.delete(url));
  }
  return promise;
}

// Menaruh tiap foto di lubangnya (dipotong dari tengah), lalu menimpa dengan frame.
// frame = hasil loadFrame(); photos = daftar canvas foto, urut sesuai lubang.
// text = { top, name, size, gap } atau null: teks nama digambar di area tulisan frame.
// Mengubah mask lubang (hasil detectSlots) menjadi gambar PNG kecil untuk CSS mask.
// Bentuknya diperlebar ~2 px; aman, karena frame digambar di atas foto dan menutupi kelebihannya.
function maskToUrl(mask, sx) {
  const pad = Math.max(1, Math.round(OVERSCAN / sx));
  const mw = mask.w + pad * 2;
  const mh = mask.h + pad * 2;
  const raw = document.createElement("canvas");
  raw.width = mask.w;
  raw.height = mask.h;
  const rctx = raw.getContext("2d");
  const img = rctx.createImageData(mask.w, mask.h);
  for (let i = 0; i < mask.data.length; i++) {
    if (mask.data[i]) {
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = 0;
      img.data[i * 4 + 3] = 255;
    }
  }
  rctx.putImageData(img, 0, 0);
  const out = document.createElement("canvas");
  out.width = mw;
  out.height = mh;
  const octx = out.getContext("2d");
  const r = Math.min(2, pad);
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) octx.drawImage(raw, pad + dx, pad + dy);
  }
  return out.toDataURL("image/png");
}

export function composeStrip({ frame, photos, text = null }) {
  const { img, width: fw, height: fh, slots, edge } = frame;
  const scale = Math.min(OUTPUT_SCALE, Math.sqrt(MAX_PIXELS / (fw * fh)));
  const W = Math.round(fw * scale);
  const H = Math.round(fh * scale);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, W, H);

  slots.forEach((slot, i) => {
    const photo = photos[i];
    if (!photo) return;
    const x = slot.x - OVERSCAN;
    const y = slot.y - OVERSCAN;
    const w = slot.w + OVERSCAN * 2;
    const h = slot.h + OVERSCAN * 2;
    const { sx, sy, sw, sh } = coverCrop(photo.width, photo.height, w, h);
    ctx.drawImage(
      photo,
      sx, sy, sw, sh,
      Math.floor(x * scale), Math.floor(y * scale),
      Math.ceil(w * scale), Math.ceil(h * scale),
    );
  });
  ctx.drawImage(img, 0, 0, W, H);

  // Teks nama ditulis di atas desain frame (font harus sudah dimuat: ensureTextFonts).
  const layout = text ? layoutFrameText(frame, text) : null;
  if (layout) drawTextLayout(ctx, layout, W / fw);
  return canvas;
}

export function canvasToBlob(canvas, type = "image/jpeg", quality = 0.92) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Gagal membuat gambar."))),
      type,
      quality,
    );
  });
}
