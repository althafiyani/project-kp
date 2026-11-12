// Katalog frame bawaan yang bisa dipilih vendor untuk event-nya.
// Posisi lubang foto TIDAK ditulis di sini: dideteksi otomatis dari area transparan
// pada gambarnya (lihat lib/frameSlots.js dan lib/photoStrip.js, loadFrame).
//
// Menambah frame baru: taruh PNG-nya di public/frames/ (bagian foto dibuat transparan),
// lalu tambahkan satu baris di FRAME_TEMPLATES.

export const FRAME_TEMPLATES = [
  { key: "frame1", name: "Frame 1", image: "/frames/frame1.png" },
  { key: "frame2", name: "Frame 2", image: "/frames/frame2.png" },
  { key: "frame3", name: "Frame 3", image: "/frames/frame3.png" },
  { key: "frame4", name: "Frame 4", image: "/frames/frame4.png" },
  { key: "frame5", name: "Frame 5", image: "/frames/frame5.png" },
  { key: "frame6", name: "Frame 6", image: "/frames/frame6.png" },
  { key: "frame7", name: "Frame 7", image: "/frames/frame7.png" },
  { key: "frame8", name: "Frame 8", image: "/frames/frame8.png" },
  { key: "frame9", name: "Frame 9", image: "/frames/frame9.png" },
  { key: "frame10", name: "Frame 10", image: "/frames/frame10.png" },
  { key: "frame11", name: "Frame 11", image: "/frames/frame11.png" },
  { key: "frame12", name: "Frame 12", image: "/frames/frame12.png" },
  { key: "frame13", name: "Frame 13", image: "/frames/frame13.png" },
  { key: "frame14", name: "Frame 14", image: "/frames/frame14.png" },
  { key: "frame15", name: "Frame 15", image: "/frames/frame15.png" },
  { key: "frame16", name: "Frame 16", image: "/frames/frame16.png" },
  { key: "frame17", name: "Frame 17", image: "/frames/frame17.png" },
  { key: "frame18", name: "Frame 18", image: "/frames/frame18.png" },
  { key: "frame19", name: "Frame 19", image: "/frames/frame19.png" },
  { key: "frame20", name: "Frame 20", image: "/frames/frame20.png" },
  { key: "frame21", name: "Frame 21", image: "/frames/frame21.png" },
  { key: "frame22", name: "Frame 22", image: "/frames/frame22.png" },
  { key: "frame23", name: "Frame 23", image: "/frames/frame23.png" },
  { key: "frame24", name: "Frame 24", image: "/frames/frame24.png" },
  { key: "frame25", name: "Frame 25", image: "/frames/frame25.png" },
  { key: "frame26", name: "Frame 26", image: "/frames/frame26.png" },
  { key: "frame27", name: "Frame 27", image: "/frames/frame27.png" },
  { key: "frame28", name: "Frame 28", image: "/frames/frame28.png" },
  { key: "frame29", name: "Frame 29", image: "/frames/frame29.png" },
  { key: "frame30", name: "Frame 30", image: "/frames/frame30.png" },
];

// Frame untuk foto di halaman pembuka (opening): hanya yang punya 1 area foto.
export const OPENING_FRAME_KEYS = ["frame13", "frame15", "frame22"];
export const OPENING_FRAMES = FRAME_TEMPLATES.filter((t) => OPENING_FRAME_KEYS.includes(t.key));

export function getTemplateByKey(key) {
  return FRAME_TEMPLATES.find((t) => t.key === key) ?? null;
}

// Frame di database menyimpan image_url, jadi templatenya dicari dari situ.
export function getTemplateByImage(url) {
  return FRAME_TEMPLATES.find((t) => t.image === url) ?? null;
}
