"use client";

import { OVERSCAN } from "@/lib/frameSlots";
import { slotShapeStyle } from "@/lib/slotShape";
import FrameTextOverlay from "@/components/guest/FrameTextOverlay";

// Panggung foto: desain frame ditampilkan utuh, dan tiap lubang fotonya diisi sesuatu
// (kamera langsung, foto yang sudah diambil, atau latar abu-abu). Frame digambar DI
// ATAS isi lubang, sama seperti hasil akhirnya.
//
// frame       = hasil loadFrame() (img, width, height, slots)
// src         = URL gambar frame
// renderSlot  = (index) => isi lubang ke-index (elemen React atau null)
export default function FrameStage({ frame, src, alt, renderSlot, text = null, glow = "color-mix(in srgb, var(--gold) 50%, transparent)" }) {
  const { width: w, height: h, slots } = frame;

  return (
    <div
      className="relative max-w-full"
      style={{
        aspectRatio: `${w} / ${h}`,
        // Setinggi mungkin, tapi tombol di bawah tetap kelihatan.
        height: "min(calc(100dvh - 12rem), 720px)",
        filter: `drop-shadow(0 0 16px ${glow})`,
      }}
    >
      {slots.map((s, i) => (
        <div
          key={i}
          className="absolute overflow-hidden bg-[color-mix(in_srgb,var(--ink),white_18%)]"
          style={{
            left: `${((s.x - OVERSCAN) / w) * 100}%`,
            top: `${((s.y - OVERSCAN) / h) * 100}%`,
            width: `${((s.w + OVERSCAN * 2) / w) * 100}%`,
            height: `${((s.h + OVERSCAN * 2) / h) * 100}%`,
            ...slotShapeStyle(s),
          }}
        >
          {renderSlot(i)}
        </div>
      ))}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full select-none"
      />
      {text && <FrameTextOverlay info={frame} text={text} />}
    </div>
  );
}
