// Katalog stiker bawaan (gambar di public/stickers, diperkecil dari folder design/sticker).
// w / h = ukuran gambar (setelah tepi transparan dipotong), dipakai untuk menjaga rasio.
export const STICKERS = [
  { id: "stiker1", name: "Kamera", src: "/stickers/stiker1.webp", w: 720, h: 460 },
  { id: "stiker2", name: "Bulu pena", src: "/stickers/stiker2.webp", w: 720, h: 688 },
  { id: "stiker3", name: "Kucing abu", src: "/stickers/stiker3.webp", w: 673, h: 720 },
  { id: "stiker4", name: "Kucing kaget", src: "/stickers/stiker4.webp", w: 720, h: 691 },
  { id: "stiker5", name: "Kucing riang", src: "/stickers/stiker5.webp", w: 688, h: 720 },
  { id: "stiker6", name: "Smiley", src: "/stickers/stiker6.webp", w: 720, h: 720 },
  { id: "stiker7", name: "Bintang merah", src: "/stickers/stiker7.webp", w: 720, h: 720 },
  { id: "stiker8", name: "Pita merah", src: "/stickers/stiker8.webp", w: 563, h: 720 },
  { id: "stiker9", name: "Kilau merah", src: "/stickers/stiker9.webp", w: 719, h: 720 },
  { id: "stiker10", name: "Marah", src: "/stickers/stiker10.webp", w: 720, h: 685 },
  { id: "stiker11", name: "Topi beruang", src: "/stickers/stiker11.webp", w: 720, h: 507 },
  { id: "stiker12", name: "Bebek", src: "/stickers/stiker12.webp", w: 720, h: 706 },
  { id: "stiker13", name: "Katak", src: "/stickers/stiker13.webp", w: 720, h: 581 },
  { id: "stiker14", name: "Topi koboi", src: "/stickers/stiker14.webp", w: 720, h: 543 },
  { id: "stiker15", name: "Pipi merona", src: "/stickers/stiker15.webp", w: 720, h: 246 },
  { id: "stiker16", name: "Pipi hati", src: "/stickers/stiker16.webp", w: 720, h: 199 },
  { id: "stiker17", name: "Kilau warna", src: "/stickers/stiker17.webp", w: 680, h: 720 },
  { id: "stiker18", name: "Kancing", src: "/stickers/stiker18.webp", w: 720, h: 720 },
  { id: "stiker19", name: "Bintang putih", src: "/stickers/stiker19.webp", w: 632, h: 720 },
  { id: "stiker20", name: "Spiral", src: "/stickers/stiker20.webp", w: 625, h: 720 },
  { id: "stiker21", name: "Ikan", src: "/stickers/stiker21.webp", w: 720, h: 262 },
  { id: "stiker22", name: "Kandil", src: "/stickers/stiker22.webp", w: 527, h: 720 },
  { id: "stiker23", name: "Gelas pita", src: "/stickers/stiker23.webp", w: 404, h: 720 },
  { id: "stiker24", name: "Kue", src: "/stickers/stiker24.webp", w: 638, h: 720 },
  { id: "stiker25", name: "Alien", src: "/stickers/stiker25.webp", w: 720, h: 576 }
];

export const MAX_STICKERS = 20; // jumlah stiker maksimal di satu foto

export function getSticker(id) {
  return STICKERS.find((s) => s.id === id) ?? null;
}
