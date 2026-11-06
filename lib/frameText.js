// Menghitung dan menggambar teks di area tulisan frame. Hanya dipanggil dari client
// (memakai canvas dan font yang dimuat browser).
//
// Satu fungsi layout dipakai di tiga tempat supaya hasilnya sama persis:
//   - tampilan di layar (overlay SVG, components/guest/FrameTextOverlay.js)
//   - gambar hasil akhir (canvas, composeStrip di lib/photoStrip.js)
//   - pratinjau di dashboard vendor
import { TEXT_DARK, TEXT_LIGHT, getTextArea, haloFor } from "@/lib/frameTextConfig";
import { resolveFont } from "@/lib/fonts";

// Font dimuat lewat FontFace API (tidak bergantung pada CSS). Font teks atas dan nama dipilih
// vendor (text.fontTop / text.fontName, lihat lib/fonts.js); kosong = font bawaan.

// Tebal tepi tipis = persentase dari ukuran huruf.
export const HALO_RATIO = 0.03;

const fontLoads = new Map();
// Memuat dan mendaftarkan satu font (hasil resolveFont). Hasil dicache per family.
export function loadFont(font) {
  if (!fontLoads.has(font.family)) {
    const p = (async () => {
      try {
        const face = new FontFace(font.family.replace(/"/g, ""), `url(${font.url}) format("${font.format}")`);
        await face.load();
        document.fonts.add(face);
      } catch (err) {
        console.error(`[frameText] font ${font.name} gagal dimuat:`, err);
        fontLoads.delete(font.family); // boleh dicoba lagi nanti
      }
    })();
    fontLoads.set(font.family, p);
  }
  return fontLoads.get(font.family);
}

// Font yang dipakai sebuah pengaturan teks.
export function textFonts(text) {
  return { top: resolveFont(text?.fontTop, "top"), name: resolveFont(text?.fontName, "name") };
}

// Wajib selesai sebelum mengukur atau menggambar teks.
export function ensureTextFonts(text) {
  const f = textFonts(text);
  return Promise.all([loadFont(f.top), loadFont(f.name)]).then(() => undefined);
}

let measureCtx = null;
function measure(text, size, family) {
  if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
  measureCtx.font = `${size}px ${family}`;
  const m = measureCtx.measureText(text);
  return {
    w: m.width,
    asc: m.actualBoundingBoxAscent,
    desc: m.actualBoundingBoxDescent,
  };
}

// Menghitung posisi dan ukuran teks. Teks TIDAK PERNAH keluar dari area tulisan:
//   1. Nama terlalu lebar -> otomatis diperkecil sampai muat selebar area.
//   2. Terlalu tinggi -> jarak dikurangi dulu, lalu nama diperkecil.
//   3. Semua digambar dengan potongan (clip) tepat di area tulisan.
// frame = hasil loadFrame() (width, height, dark). text = { top, name, narrow, wide, onDark, onLight }.
// Hasil: { area, dark, color, halo, lines: [{ text, size, x, y, family }], fitted } atau null.
export function layoutFrameText(frame, text) {
  if (!frame || !text || !text.name) return null;
  const area = frame.textArea ?? getTextArea(frame.width, frame.height);
  if (!area) return null;

  const fonts = textFonts(text);
  const FONT_TOP = `${fonts.top.family}, serif`;
  const FONT_NAME = `${fonts.name.family}, serif`;
  const s = area.scale;
  const g = text[area.kind] ?? text.wide; // ukuran sesuai jenis frame
  const padX = area.w * 0.05;
  const padY = area.h * 0.06;
  const maxW = area.w - padX * 2;
  const maxH = area.h - padY * 2;

  // Baris atas (ukuran tetap; hanya diperkecil kalau sangat panjang).
  let topSize = g.top * s;
  let m1 = measure(text.top, topSize, FONT_TOP);
  const k1 = Math.min(1, maxW / m1.w, (maxH * 0.45) / Math.max(1, m1.asc + m1.desc)); // tidak boleh memakan > 45% tinggi area
  if (k1 < 1) {
    const k = k1;
    topSize *= k;
    m1 = { w: m1.w * k, asc: m1.asc * k, desc: m1.desc * k };
  }

  // Baris nama (ukuran dari vendor).
  const wanted = g.name * s;
  let nameSize = wanted;
  let m2 = measure(text.name, nameSize, FONT_NAME);
  const scaleName = (k) => {
    nameSize *= k;
    m2 = { w: m2.w * k, asc: m2.asc * k, desc: m2.desc * k };
  };
  if (m2.w > maxW) scaleName(maxW / m2.w);

  let gap = g.gap * s;
  const h1 = m1.asc + m1.desc;
  const avail = maxH - h1;
  if (gap + (m2.asc + m2.desc) > avail) {
    gap = Math.max(0, Math.min(gap, avail - (m2.asc + m2.desc)));
    const h2 = m2.asc + m2.desc;
    if (gap + h2 > avail) scaleName(Math.max(0.05, (avail - gap) / h2));
  }

  const h2 = m2.asc + m2.desc;
  const total = h1 + gap + h2;
  const top = area.y + padY + (maxH - total) / 2; // blok teks di tengah area
  const cx = area.x + area.w / 2;

  const dark = Boolean(frame.dark);
  const color = dark ? (text.onDark ?? TEXT_LIGHT) : (text.onLight ?? TEXT_DARK);
  return {
    area,
    dark,
    color,
    halo: haloFor(color),
    fitted: nameSize < wanted - 0.5,
    lines: [
      { text: text.top, size: topSize, x: cx, y: top + m1.asc, family: FONT_TOP },
      { text: text.name, size: nameSize, x: cx, y: top + h1 + gap + m2.asc, family: FONT_NAME },
    ],
  };
}

// Menggambar hasil layout ke canvas. k = skala canvas terhadap ukuran gambar frame.
export function drawTextLayout(ctx, layout, k = 1) {
  const a = layout.area;
  ctx.save();
  ctx.beginPath();
  ctx.rect(a.x * k, a.y * k, a.w * k, a.h * k); // tidak boleh keluar dari area tulisan
  ctx.clip();
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = layout.color;
  ctx.strokeStyle = layout.halo;
  ctx.lineJoin = "round";
  for (const l of layout.lines) {
    ctx.font = `${l.size * k}px ${l.family}`;
    ctx.lineWidth = Math.max(1, l.size * k * HALO_RATIO);
    ctx.strokeText(l.text, l.x * k, l.y * k); // tepi tipis di belakang
    ctx.fillText(l.text, l.x * k, l.y * k);
  }
  ctx.restore();
}
