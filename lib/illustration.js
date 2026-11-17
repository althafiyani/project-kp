// Filter gaya ilustrasi (kartun, komik, sketsa, cat air). Semuanya pengolahan citra biasa di
// canvas (tanpa AI, tanpa server), jadi gratis dan jalan di browser tamu.
//
// Pola umum: foto diperkecil ke ukuran kerja -> dihaluskan tanpa merusak tepi (bilateral filter)
// -> warna disederhanakan (posterize) -> garis tepi dari deteksi tepi (Sobel) ditambahkan ->
// dikembalikan ke ukuran semula.
//
// Hanya dipanggil dari komponen client (memakai canvas).

const WORK_MAX = 600; // sisi terpanjang saat diproses (px), supaya cepat di HP

const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

function newCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

// --- Dasar pengolahan ---------------------------------------------------------------------

// Menghaluskan gambar tetapi mempertahankan tepi: piksel tetangga yang warnanya jauh berbeda
// diberi bobot kecil. Mengembalikan array RGBA baru.
function bilateral(src, w, h, radius, sigmaColor, passes) {
  const lut = new Float32Array(766); // bobot menurut selisih warna (jumlah |dR|+|dG|+|dB|)
  for (let i = 0; i < lut.length; i++) lut[i] = Math.exp(-((i / 3) * (i / 3)) / (2 * sigmaColor * sigmaColor));
  const size = radius * 2 + 1;
  const spatial = new Float32Array(size * size);
  const sigmaSpace = radius / 1.6 + 0.4;
  for (let dy = -radius; dy <= radius; dy++)
    for (let dx = -radius; dx <= radius; dx++)
      spatial[(dy + radius) * size + dx + radius] = Math.exp(-(dx * dx + dy * dy) / (2 * sigmaSpace * sigmaSpace));

  // Selisih posisi tetangga (dalam indeks array RGBA) sudah dihitung di depan, jadi bagian dalam gambar
  // (yang tetangganya pasti ada semua) diproses tanpa pengecekan batas. Urutan penjumlahan sama
  // dengan versi lambat, jadi hasilnya identik.
  const nb = size * size;
  const offs = new Int32Array(nb);
  for (let dy = -radius; dy <= radius; dy++)
    for (let dx = -radius; dx <= radius; dx++) offs[(dy + radius) * size + dx + radius] = (dy * w + dx) * 4;

  let cur = src;
  for (let p = 0; p < passes; p++) {
    const out = new Uint8ClampedArray(cur.length);
    for (let y = 0; y < h; y++) {
      const interiorY = y >= radius && y < h - radius;
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const r0 = cur[i];
        const g0 = cur[i + 1];
        const b0 = cur[i + 2];
        let sr = 0;
        let sg = 0;
        let sb = 0;
        let sw = 0;
        if (interiorY && x >= radius && x < w - radius) {
          for (let k = 0; k < nb; k++) {
            const j = i + offs[k];
            const r = cur[j];
            const g = cur[j + 1];
            const b = cur[j + 2];
            const diff = Math.abs(r - r0) + Math.abs(g - g0) + Math.abs(b - b0);
            const wt = spatial[k] * lut[diff];
            sr += r * wt;
            sg += g * wt;
            sb += b * wt;
            sw += wt;
          }
        } else {
          for (let dy = -radius; dy <= radius; dy++) {
            const yy = y + dy;
            if (yy < 0 || yy >= h) continue;
            for (let dx = -radius; dx <= radius; dx++) {
              const xx = x + dx;
              if (xx < 0 || xx >= w) continue;
              const j = (yy * w + xx) * 4;
              const r = cur[j];
              const g = cur[j + 1];
              const b = cur[j + 2];
              const diff = Math.abs(r - r0) + Math.abs(g - g0) + Math.abs(b - b0);
              const wt = spatial[(dy + radius) * size + dx + radius] * lut[diff];
              sr += r * wt;
              sg += g * wt;
              sb += b * wt;
              sw += wt;
            }
          }
        }
        out[i] = sr / sw;
        out[i + 1] = sg / sw;
        out[i + 2] = sb / sw;
        out[i + 3] = 255;
      }
    }
    cur = out;
  }
  return cur;
}

// Kecerahan tiap piksel (0..255).
function lumaOf(d, n) {
  const l = new Float32Array(n);
  for (let i = 0; i < n; i++) l[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
  return l;
}

// Blur kotak satu arah memakai jumlah berjalan (cepat). Diulang 3x ~ blur halus.
function boxBlur(src, w, h, radius, times = 3) {
  let a = src;
  let b = new Float32Array(src.length);
  for (let t = 0; t < times; t++) {
    for (let y = 0; y < h; y++) {
      let sum = 0;
      const row = y * w;
      for (let x = -radius; x <= radius; x++) sum += a[row + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) {
        b[row + x] = sum / (radius * 2 + 1);
        sum += a[row + Math.min(w - 1, x + radius + 1)] - a[row + Math.max(0, x - radius)];
      }
    }
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let y = -radius; y <= radius; y++) sum += b[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) {
        a[y * w + x] = sum / (radius * 2 + 1);
        sum += b[Math.min(h - 1, y + radius + 1) * w + x] - b[Math.max(0, y - radius) * w + x];
      }
    }
  }
  return a;
}

// Kekuatan garis tepi 0..1 (Sobel), t0 = mulai terlihat, t1 = hitam penuh.
function edgeStrength(luma, w, h, t0, t1) {
  const out = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const a = luma[i - w - 1];
      const b = luma[i - w];
      const c = luma[i - w + 1];
      const d = luma[i - 1];
      const f = luma[i + 1];
      const g = luma[i + w - 1];
      const hh = luma[i + w];
      const k = luma[i + w + 1];
      const gx = c + 2 * f + k - (a + 2 * d + g);
      const gy = g + 2 * hh + k - (a + 2 * b + c);
      out[i] = clamp01((Math.hypot(gx, gy) - t0) / (t1 - t0));
    }
  }
  return out;
}

// Menebalkan garis: tiap piksel diambil nilai terbesar dari tetangganya.
function dilate(src, w, h) {
  const out = new Float32Array(src.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let m = src[y * w + x];
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          const v = src[yy * w + xx];
          if (v > m) m = v;
        }
      }
      out[y * w + x] = m;
    }
  }
  return out;
}

// Menyederhanakan warna: kecerahan dibagi `levels` tingkat, warna asli tetap terjaga.
// mix = 1 penuh bertingkat, makin kecil makin halus.
function posterize(d, n, levels, mix = 1) {
  const step = 255 / (levels - 1);
  for (let i = 0; i < n; i++) {
    const r = d[i * 4];
    const g = d[i * 4 + 1];
    const b = d[i * 4 + 2];
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    const lq = Math.round(l / step) * step;
    const target = (lq + 1) / (l + 1);
    const ratio = 1 + (target - 1) * mix;
    d[i * 4] = clamp255(r * ratio);
    d[i * 4 + 1] = clamp255(g * ratio);
    d[i * 4 + 2] = clamp255(b * ratio);
  }
}

// Warna lebih pekat (sat > 1) atau lebih pudar, plus terang/gelap (add) dan kontras.
function tone(d, n, { sat = 1, add = 0, contrast = 1 } = {}) {
  for (let i = 0; i < n; i++) {
    const r = d[i * 4];
    const g = d[i * 4 + 1];
    const b = d[i * 4 + 2];
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    d[i * 4] = clamp255((l + (r - l) * sat - 128) * contrast + 128 + add);
    d[i * 4 + 1] = clamp255((l + (g - l) * sat - 128) * contrast + 128 + add);
    d[i * 4 + 2] = clamp255((l + (b - l) * sat - 128) * contrast + 128 + add);
  }
}

// Menempelkan garis tepi (warna `ink`) dengan kepekatan `strength`.
function inkEdges(d, edge, n, strength, ink = [20, 16, 24]) {
  for (let i = 0; i < n; i++) {
    const a = edge[i] * strength;
    if (a <= 0) continue;
    d[i * 4] = d[i * 4] * (1 - a) + ink[0] * a;
    d[i * 4 + 1] = d[i * 4 + 1] * (1 - a) + ink[1] * a;
    d[i * 4 + 2] = d[i * 4 + 2] * (1 - a) + ink[2] * a;
  }
}

// Bilangan acak tetap (supaya hasil tidak berubah-ubah tiap diproses).
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// --- Gaya ---------------------------------------------------------------------------------

const STYLES = {
  // Kartun: warna datar bertingkat dengan garis tepi tegas.
  cartoon(d, w, h) {
    const n = w * h;
    const sm = bilateral(d, w, h, 2, 26, 3);
    const edge = dilate(edgeStrength(lumaOf(sm, n), w, h, 45, 130), w, h); // garis diambil sebelum warna disederhanakan
    posterize(sm, n, 6);
    tone(sm, n, { sat: 1.35, contrast: 1.05 });
    inkEdges(sm, edge, n, 0.9);
    return sm;
  },

  // Kartun lembut: warna halus, garis tipis dan tidak terlalu hitam.
  soft(d, w, h) {
    const n = w * h;
    const sm = bilateral(d, w, h, 2, 32, 3);
    posterize(sm, n, 9, 0.6);
    tone(sm, n, { sat: 1.2, add: 8, contrast: 1.02 });
    const edge = edgeStrength(lumaOf(sm, n), w, h, 40, 150);
    inkEdges(sm, edge, n, 0.5, [70, 46, 52]);
    return sm;
  },

  // Komik: warna sedikit, kontras tinggi, garis tebal, dan bintik halftone di bagian gelap.
  comic(d, w, h) {
    const n = w * h;
    const sm = bilateral(d, w, h, 2, 28, 2);
    tone(sm, n, { sat: 1.45, contrast: 1.12 });
    posterize(sm, n, 5);
    const edge = dilate(edgeStrength(lumaOf(sm, n), w, h, 50, 120), w, h);
    inkEdges(sm, edge, n, 1);
    // bintik halftone: bulatan gelap makin besar di bagian gelap. Digambar langsung ke array piksel
    // (bukan canvas) supaya gaya ini bisa dijalankan di Web Worker.
    const cell = Math.max(5, Math.round(Math.max(w, h) / 90));
    const luma = lumaOf(sm, n);
    const DOT = [20, 10, 30];
    const DOT_ALPHA = 0.42;
    for (let cy = 0; cy < h; cy += cell) {
      for (let cx = 0; cx < w; cx += cell) {
        let sum = 0;
        let cnt = 0;
        for (let y = cy; y < Math.min(h, cy + cell); y++)
          for (let x = cx; x < Math.min(w, cx + cell); x++) {
            sum += luma[y * w + x];
            cnt++;
          }
        const dark = 1 - sum / cnt / 255;
        if (dark < 0.28) continue;
        const rad = (cell / 2) * Math.min(1, (dark - 0.2) * 1.5);
        const mx = cx + cell / 2;
        const my = cy + cell / 2;
        for (let y = Math.max(0, Math.floor(my - rad - 1)); y <= Math.min(h - 1, Math.ceil(my + rad + 1)); y++) {
          for (let x = Math.max(0, Math.floor(mx - rad - 1)); x <= Math.min(w - 1, Math.ceil(mx + rad + 1)); x++) {
            const cover = clamp01(rad + 0.5 - Math.hypot(x + 0.5 - mx, y + 0.5 - my)); // tepi bulatan dihaluskan
            if (cover <= 0) continue;
            const aa = cover * DOT_ALPHA;
            const i = (y * w + x) * 4;
            sm[i] = sm[i] * (1 - aa) + DOT[0] * aa;
            sm[i + 1] = sm[i + 1] * (1 - aa) + DOT[1] * aa;
            sm[i + 2] = sm[i + 2] * (1 - aa) + DOT[2] * aa;
          }
        }
      }
    }
    return sm;
  },

  // Sketsa: gambar pensil di kertas (teknik "color dodge" dari gambar yang dibalik dan di-blur).
  sketch(d, w, h) {
    const n = w * h;
    const gray = lumaOf(d, n);
    const inv = new Float32Array(n);
    for (let i = 0; i < n; i++) inv[i] = 255 - gray[i];
    const blur = boxBlur(inv, w, h, Math.max(3, Math.round(Math.max(w, h) / 70)), 3);
    const out = new Uint8ClampedArray(n * 4);
    for (let i = 0; i < n; i++) {
      let v = clamp255((gray[i] * 255) / (255 - blur[i] + 1));
      v = 255 * Math.pow(v / 255, 1.6); // garis lebih tegas
      out[i * 4] = v * (252 / 255); // warna kertas sedikit krem
      out[i * 4 + 1] = v * (247 / 255);
      out[i * 4 + 2] = v * (236 / 255);
      out[i * 4 + 3] = 255;
    }
    return out;
  },

  // Cat air: warna lembut menyatu, terang, dengan tekstur kertas halus.
  watercolor(d, w, h) {
    const n = w * h;
    const sm = bilateral(d, w, h, 2, 40, 3);
    posterize(sm, n, 10, 0.5);
    tone(sm, n, { sat: 1.05, add: 14, contrast: 0.92 });
    const edge = edgeStrength(lumaOf(sm, n), w, h, 35, 140);
    inkEdges(sm, edge, n, 0.22, [90, 70, 80]);
    const rnd = seeded(7);
    for (let i = 0; i < n; i++) {
      const noise = (rnd() - 0.5) * 14;
      sm[i * 4] = clamp255(sm[i * 4] + noise);
      sm[i * 4 + 1] = clamp255(sm[i * 4 + 1] + noise);
      sm[i * 4 + 2] = clamp255(sm[i * 4 + 2] + noise);
    }
    return sm;
  },
};

export const ILLUSTRATION_STYLES = Object.keys(STYLES);

// Menjalankan satu gaya pada array piksel RGBA (w x h). Murni angka, tanpa canvas, jadi bisa dipanggil
// dari Web Worker (lihat illustration.worker.js) maupun langsung. Mengembalikan Uint8ClampedArray baru.
export function runStyle(style, data, w, h) {
  const fn = STYLES[style];
  return fn ? fn(data, w, h) : data;
}

// Menyiapkan foto ke ukuran kerja. Hasil: { work (canvas), wctx, src (data RGBA), ww, hh }.
function prepare(photo) {
  const w = photo.width;
  const h = photo.height;
  const scale = Math.min(1, WORK_MAX / Math.max(w, h));
  const ww = Math.max(8, Math.round(w * scale));
  const hh = Math.max(8, Math.round(h * scale));
  const work = newCanvas(ww, hh);
  const wctx = work.getContext("2d", { willReadFrequently: true });
  wctx.imageSmoothingQuality = "high";
  wctx.drawImage(photo, 0, 0, ww, hh);
  return { work, wctx, src: wctx.getImageData(0, 0, ww, hh).data, ww, hh };
}

// Menaruh hasil ke canvas kerja lalu mengembalikannya ke ukuran foto semula.
function finish(photo, { work, wctx, ww, hh }, result) {
  wctx.putImageData(new ImageData(new Uint8ClampedArray(result), ww, hh), 0, 0);
  const w = photo.width;
  const h = photo.height;
  if (ww === w && hh === h) return work;
  const out = newCanvas(w, h);
  const octx = out.getContext("2d");
  octx.imageSmoothingQuality = "high";
  octx.drawImage(work, 0, 0, w, h);
  return out;
}

// Mengembalikan canvas baru (ukuran sama dengan `photo`) bergaya ilustrasi `style`.
// Versi sinkron: memblokir tampilan selama diproses. Untuk foto sungguhan pakai illustrateAsync().
export function illustrate(photo, style) {
  if (!STYLES[style]) return photo;
  const p = prepare(photo);
  return finish(photo, p, runStyle(style, p.src, p.ww, p.hh));
}

// --- Versi Web Worker ---------------------------------------------------------------------
// Pengolahan citra berat, jadi dikerjakan di beberapa worker sekaligus (satu foto per worker) dan
// tidak membekukan halaman. Kalau worker tidak tersedia / gagal, otomatis kembali ke cara sinkron.

let pool = null; // { idle, queue, workers } | "gagal"

function createPool() {
  if (typeof Worker === "undefined") return "gagal";
  const size = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1));
  const p = { idle: [], queue: [], workers: [] };
  const pump = () => {
    while (p.idle.length && p.queue.length) {
      const wk = p.idle.pop();
      const job = p.queue.shift();
      wk.job = job;
      wk.postMessage({ style: job.style, buf: job.buf, w: job.w, h: job.h }, [job.buf]);
    }
  };
  const gagal = (err) => {
    // satu saja bermasalah -> hentikan semua dan pakai cara sinkron untuk seterusnya
    pool = "gagal";
    for (const wk of p.workers) {
      wk.job?.reject(err);
      wk.terminate();
    }
    for (const job of p.queue) job.reject(err);
  };
  try {
    for (let i = 0; i < size; i++) {
      const wk = new Worker(new URL("./illustration.worker.js", import.meta.url));
      wk.onmessage = (e) => {
        const job = wk.job;
        wk.job = null;
        p.idle.push(wk);
        job.resolve(new Uint8ClampedArray(e.data.buf));
        pump();
      };
      wk.onerror = (e) => gagal(e instanceof Error ? e : new Error(e.message || "Worker gagal"));
      p.workers.push(wk);
      p.idle.push(wk);
    }
  } catch (err) {
    return "gagal";
  }
  p.pump = pump;
  return p;
}

function runInWorker(style, data, w, h) {
  if (!pool) pool = createPool();
  if (pool === "gagal") return Promise.reject(new Error("Worker tidak tersedia"));
  const p = pool;
  return new Promise((resolve, reject) => {
    // salinan buffer: array asli (data) tetap utuh untuk cadangan sinkron kalau worker gagal
    const buf = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    p.queue.push({ style, buf, w, h, resolve, reject });
    p.pump();
  });
}

// Sama seperti illustrate(), tetapi diproses di Web Worker (paralel, tidak membekukan halaman).
export async function illustrateAsync(photo, style) {
  if (!STYLES[style]) return photo;
  const p = prepare(photo);
  let result;
  try {
    result = await runInWorker(style, p.src, p.ww, p.hh);
  } catch {
    result = runStyle(style, p.src, p.ww, p.hh);
  }
  return finish(photo, p, result);
}
