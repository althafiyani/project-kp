// Gaya CSS untuk memotong isi lubang foto sesuai bentuk aslinya (pratinjau di layar).
// Bentuknya diambil dari piksel lubang pada gambar frame (slot.maskUrl, dibuat di
// lib/photoStrip.js), jadi hati, oval, kucing, gelombang, atau bentuk lain tetap pas.
// Hasil akhir tidak bergantung pada ini karena frame digambar di atas foto.
export function slotShapeStyle(slot) {
  if (!slot?.maskUrl) return {};
  const url = `url("${slot.maskUrl}")`;
  return {
    WebkitMaskImage: url,
    maskImage: url,
    WebkitMaskSize: "100% 100%",
    maskSize: "100% 100%",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
  };
}
