"use client";

import { useFrame } from "@/lib/useFrame";
import { slotShapeStyle } from "@/lib/slotShape";
import { OVERSCAN } from "@/lib/frameSlots";
import FrameTextOverlay from "@/components/guest/FrameTextOverlay";

// Menampilkan frame apa adanya (tanpa kotak/pemotongan). Lubang foto (hasil deteksi
// otomatis dari area transparan) diberi latar abu-abu, dan glow emas mengikuti bentuk
// frame lewat drop-shadow.
export default function FrameArt({
  src,
  alt,
  glow = "color-mix(in srgb, var(--gold) 55%, transparent)",
  radius = 18,
  className = "",
  style,
  text = null,
  showArea = false,
}) {
  const info = useFrame(src);

  const w = info?.width ?? 450;
  const h = info?.height ?? 1350;
  return (
    <div
      className={`relative ${className}`}
      style={{
        aspectRatio: `${w} / ${h}`,
        filter: `drop-shadow(0 0 ${radius}px ${glow})`,
        ...style,
      }}
    >
      {info?.slots.map((s, i) => (
        <div
          key={i}
          className="absolute bg-[color-mix(in_srgb,var(--ink),white_30%)]"
          style={{
            left: `${((s.x - OVERSCAN) / w) * 100}%`,
            top: `${((s.y - OVERSCAN) / h) * 100}%`,
            width: `${((s.w + OVERSCAN * 2) / w) * 100}%`,
            height: `${((s.h + OVERSCAN * 2) / h) * 100}%`,
            ...slotShapeStyle(s),
          }}
        />
      ))}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} draggable={false} className="absolute inset-0 h-full w-full select-none" />
      {(text || showArea) && <FrameTextOverlay info={info} text={text} showArea={showArea} />}
    </div>
  );
}
