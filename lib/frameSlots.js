// Deteksi otomatis lubang foto pada desain frame (PNG dengan area transparan).
// Tidak ada ukuran yang ditulis manual: tiap frame dibaca langsung dari gambarnya,
// jadi desain baru tinggal ditaruh di public/frames/ dan didaftarkan di katalog.

export const MAX_SLOTS = 6;

const ALPHA_HOLE = 128; // piksel dengan alpha di bawah ini dianggap "bolong"
const MIN_AREA_RATIO = 0.04; // lubang foto minimal 4% luas frame; hiasan kecil diabaikan
const RECT_FILL = 0.985; // lubang yang mengisi >= 98,5% kotak pembungkusnya dianggap kotak biasa

// Foto digambar sedikit lebih besar dari lubangnya supaya tidak ada celah di tepi.
// Aman, karena frame digambar DI ATAS foto dan menutupi kelebihannya.
export const OVERSCAN = 3;

// image = { width, height, data } (hasil getImageData). Mengembalikan daftar lubang
// foto { shape: "rect" | "custom", x, y, w, h, mask } dalam piksel gambar, urut dari atas ke
// bawah (kalau sebaris, dari kiri ke kanan). Bentuk apa pun (hati, oval, kucing, gelombang, dst.)
// dibaca langsung dari piksel lubangnya: mask = { w, h, data } (data[i] = 1 kalau piksel itu
// bagian lubang), jadi tidak ada bentuk yang "ditebak".
export function detectSlots(image) {
  const { width: W, height: H, data } = image;
  const hole = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) hole[i] = data[i * 4 + 3] < ALPHA_HOLE ? 1 : 0;

  // Garis transparan tipis (sisa export, 1-4 px) sering menyambungkan dua lubang yang
  // sebenarnya terpisah. Lubang dikikis dulu supaya sambungan tipis putus, dilabeli,
  // lalu label dikembangkan lagi sebesar kikisan itu di dalam lubang aslinya.
  const R = Math.max(1, Math.round(Math.min(W, H) * 0.002));
  const core = erode(hole, W, H, R);
  const label = new Int32Array(W * H);
  const stack = new Int32Array(W * H);
  let count = 0;
  for (let start = 0; start < W * H; start++) {
    if (!core[start] || label[start]) continue;
    const id = ++count;
    let sp = 0;
    stack[sp++] = start;
    label[start] = id;
    while (sp > 0) {
      const p = stack[--sp];
      const x = p % W;
      if (x > 0 && core[p - 1] && !label[p - 1]) { label[p - 1] = id; stack[sp++] = p - 1; }
      if (x < W - 1 && core[p + 1] && !label[p + 1]) { label[p + 1] = id; stack[sp++] = p + 1; }
      if (p >= W && core[p - W] && !label[p - W]) { label[p - W] = id; stack[sp++] = p - W; }
      if (p < W * (H - 1) && core[p + W] && !label[p + W]) { label[p + W] = id; stack[sp++] = p + W; }
    }
  }
  for (let r = 0; r < R; r++) {
    const next = label.slice();
    for (let p = 0; p < W * H; p++) {
      if (label[p] || !hole[p]) continue;
      const x = p % W;
      const l = (x > 0 && label[p - 1]) || (x < W - 1 && label[p + 1]) || (p >= W && label[p - W]) || (p < W * (H - 1) && label[p + W]);
      if (l) next[p] = l;
    }
    label.set(next);
  }

  // Ukuran tiap area (kotak pembungkus, luas, menyentuh tepi gambar atau tidak).
  const info = Array.from({ length: count + 1 }, () => ({ minX: W, maxX: 0, minY: H, maxY: 0, area: 0, edge: false }));
  for (let p = 0; p < W * H; p++) {
    const id = label[p];
    if (!id) continue;
    const x = p % W;
    const y = (p - x) / W;
    const o = info[id];
    o.area++;
    if (x < o.minX) o.minX = x;
    if (x > o.maxX) o.maxX = x;
    if (y < o.minY) o.minY = y;
    if (y > o.maxY) o.maxY = y;
    if (x === 0 || y === 0 || x === W - 1 || y === H - 1) o.edge = true;
  }

  const found = [];
  for (let id = 1; id <= count; id++) {
    const { minX, maxX, minY, maxY, area, edge } = info[id];
    // Area transparan yang menyentuh tepi = margin luar, bukan lubang foto.
    if (edge || area < W * H * MIN_AREA_RATIO) continue;

    const w = maxX - minX + 1;
    const h = maxY - minY + 1;
    const shape = area / (w * h) >= RECT_FILL ? "rect" : "custom";
    let mask = null;
    if (shape === "custom") {
      const data2 = new Uint8Array(w * h);
      for (let yy = 0; yy < h; yy++) {
        const row = (minY + yy) * W + minX;
        for (let xx = 0; xx < w; xx++) if (label[row + xx] === id) data2[yy * w + xx] = 1;
      }
      mask = { w, h, data: data2 };
    }
    found.push({ shape, x: minX, y: minY, w, h, mask });
  }

  return orderSlots(found).slice(0, MAX_SLOTS);
}

// Mengikis area bolong (1) sebesar r piksel ke segala arah (kotak). Di luar gambar dianggap bolong,
// supaya margin luar yang menempel tepi tetap menempel.
function erode(src, W, H, r) {
  const tmp = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    const row = y * W;
    let bad = 0; // jumlah piksel TIDAK bolong di jendela [x-r, x+r]
    for (let x = 0; x < Math.min(W, r); x++) if (!src[row + x]) bad++;
    for (let x = 0; x < W; x++) {
      if (x + r < W && !src[row + x + r]) bad++;
      if (x - r - 1 >= 0 && !src[row + x - r - 1]) bad--;
      tmp[row + x] = src[row + x] && bad === 0 ? 1 : 0;
    }
  }
  const out = new Uint8Array(W * H);
  for (let x = 0; x < W; x++) {
    let bad = 0;
    for (let y = 0; y < Math.min(H, r); y++) if (!tmp[y * W + x]) bad++;
    for (let y = 0; y < H; y++) {
      if (y + r < H && !tmp[(y + r) * W + x]) bad++;
      if (y - r - 1 >= 0 && !tmp[(y - r - 1) * W + x]) bad--;
      out[y * W + x] = tmp[y * W + x] && bad === 0 ? 1 : 0;
    }
  }
  return out;
}

// Urutan atas ke bawah. Lubang yang kira-kira sebaris diurutkan kiri ke kanan.
function orderSlots(list) {
  const sorted = [...list].sort((a, b) => a.y + a.h / 2 - (b.y + b.h / 2));
  const rows = [];
  for (const s of sorted) {
    const cy = s.y + s.h / 2;
    const row = rows.find((r) => Math.abs(r.cy - cy) < Math.min(r.h, s.h) * 0.5);
    if (row) row.items.push(s);
    else rows.push({ cy, h: s.h, items: [s] });
  }
  return rows.flatMap((r) => r.items.sort((a, b) => a.x - b.x));
}

// Bagian foto sumber yang dipotong (dari tengah) agar memenuhi kotak tujuan
// tanpa gepeng, seperti object-fit: cover.
export function coverCrop(srcW, srcH, dstW, dstH) {
  const srcRatio = srcW / srcH;
  const dstRatio = dstW / dstH;
  let sw, sh;
  if (srcRatio > dstRatio) {
    sh = srcH;
    sw = sh * dstRatio;
  } else {
    sw = srcW;
    sh = sw / dstRatio;
  }
  return { sx: (srcW - sw) / 2, sy: (srcH - sh) / 2, sw, sh };
}

// Warna rata-rata piksel opak di tepi luar frame (cincin setebal ~8 px).
// Dipakai sebagai latar strip supaya garis transparan tipis di tepi frame
// (sisa export) tidak tampak sebagai garis putih.
export function edgeColor(image) {
  const { width, height, data } = image;
  const ring = Math.max(2, Math.min(8, Math.floor(Math.min(width, height) / 20)));
  let r = 0, g = 0, b = 0, n = 0;
  for (let y = 0; y < height; y += 3) {
    for (let x = 0; x < width; x += 3) {
      const onRing = x < ring || y < ring || x >= width - ring || y >= height - ring;
      if (!onRing) {
        // loncat ke tepi kanan agar tidak memindai bagian dalam
        if (y >= ring && y < height - ring && x >= ring) x = Math.max(x, width - ring - 3);
        continue;
      }
      const i = (y * width + x) * 4;
      if (data[i + 3] > 200) { r += data[i]; g += data[i + 1]; b += data[i + 2]; n++; }
    }
  }
  if (n === 0) return "#ffffff";
  const h = (v) => Math.round(v / n).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}
