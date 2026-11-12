"use client";

import { polaroidBackground } from "@/lib/polaroid";

// Satu foto di dalam polaroid: badan polaroid berwarna (satu warna atau gradasi) dengan lubang
// kotak di tengah yang diisi foto (dipotong cover), dan tepi bawah lebih tebal seperti polaroid asli.
// color = "#rrggbb" atau "#rrggbb,#rrggbb". Tanpa photo, lubangnya diisi abu-abu.
export function PolaroidPhoto({ photo, color, alt }) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-[3px]"
      style={{ aspectRatio: "4 / 5", background: polaroidBackground(color), boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.1)" }}
    >
      <div
        className="absolute overflow-hidden bg-[#55555b]"
        style={{ left: "7%", top: "5.6%", width: "86%", height: "68.8%", boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.18)" }}
      >
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={alt} draggable={false} className="h-full w-full select-none object-cover" />
        )}
      </div>
    </div>
  );
}

const shadow = "drop-shadow(0 10px 16px rgba(0,0,0,0.55))";

// Tampilan opening: dua foto berframe saling bertumpuk di tengah.
//   items = [slot1, slot2], masing-masing { photo, color } atau null (color = warna polaroid).
// Slot 1 di belakang dan miring ke kiri, slot 2 di depan dan miring ke kanan,
// sebagian slot 1 masih terlihat. Kalau hanya satu yang terisi, tampil di tengah.
export default function OpeningCollage({ items, name = "", className = "" }) {
  const [a, b] = items;
  const ada = [a, b].filter(Boolean);
  if (ada.length === 0) return null;

  if (ada.length === 1) {
    const it = ada[0];
    return (
      <div className={`relative mx-auto w-[66%] ${className}`} style={{ filter: shadow }}>
        <PolaroidPhoto photo={it.photo} color={it.color} alt={`Foto ${name}`} />
      </div>
    );
  }

  return (
    <div className={`relative w-full ${className}`} style={{ aspectRatio: "100 / 90" }}>
      {/* Slot 1: di bawah, miring kiri */}
      <div
        className="absolute left-[3%] top-[9%] z-10 w-[58%]"
        style={{ transform: "rotate(-8deg)", transformOrigin: "50% 60%", filter: shadow }}
      >
        <PolaroidPhoto photo={a.photo} color={a.color} alt={`Foto 1 ${name}`} />
      </div>
      {/* Slot 2: di atas, miring kanan */}
      <div
        className="absolute right-[3%] top-[3%] z-20 w-[58%]"
        style={{ transform: "rotate(8deg)", transformOrigin: "50% 60%", filter: shadow }}
      >
        <PolaroidPhoto photo={b.photo} color={b.color} alt={`Foto 2 ${name}`} />
      </div>
    </div>
  );
}
