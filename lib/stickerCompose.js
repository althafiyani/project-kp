// Menggabungkan stiker ke gambar strip (canvas). Hanya dipanggil dari client.
import { getSticker } from "@/lib/stickers";

const imageCache = new Map();

// Memuat gambar stiker (disimpan, jadi tiap stiker hanya dimuat sekali).
export function loadStickerImage(src) {
  let p = imageCache.get(src);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Stiker gagal dimuat: ${src}`));
      img.src = src;
    });
    imageCache.set(src, p);
    p.catch(() => imageCache.delete(src));
  }
  return p;
}

// items = [{ id, x, y, size, rot, flip }] dengan:
//   x, y  = posisi tengah stiker, pecahan dari lebar / tinggi strip (0..1)
//   size  = lebar stiker, pecahan dari lebar strip
//   rot   = putaran dalam derajat, flip = dicerminkan kiri-kanan
// Mengembalikan canvas baru; canvas asli tidak diubah.
export async function composeWithStickers(base, items) {
  const out = document.createElement("canvas");
  out.width = base.width;
  out.height = base.height;
  const ctx = out.getContext("2d");
  ctx.drawImage(base, 0, 0);
  ctx.imageSmoothingQuality = "high";

  for (const it of items) {
    const s = getSticker(it.id);
    if (!s) continue;
    const img = await loadStickerImage(s.src);
    const bw = it.size * out.width;
    const bh = (bw * s.h) / s.w;
    ctx.save();
    ctx.translate(it.x * out.width, it.y * out.height);
    ctx.rotate((it.rot * Math.PI) / 180);
    if (it.flip) ctx.scale(-1, 1);
    ctx.drawImage(img, -bw / 2, -bh / 2, bw, bh);
    ctx.restore();
  }
  return out;
}
