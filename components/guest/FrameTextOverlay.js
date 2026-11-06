"use client";

import { useId } from "react";
import { useTextLayout } from "@/lib/useTextLayout";
import { HALO_RATIO } from "@/lib/frameText";

// Teks nama di area tulisan frame, digambar sebagai SVG di atas gambar frame.
// Koordinat SVG = piksel gambar frame, jadi ikut membesar/mengecil bersama frame.
//   info     = hasil loadFrame()
//   text     = { top, name, size, gap } atau null
//   showArea = gambar garis putus-putus batas area tulisan (untuk editor vendor)
export default function FrameTextOverlay({ info, text, showArea = false }) {
  const layout = useTextLayout(info, text);
  const uid = useId().replace(/:/g, "");
  const area = info?.textArea;
  if (!info || (!layout && !(showArea && area))) return null;

  return (
    <svg
      viewBox={`0 0 ${info.width} ${info.height}`}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      {layout && (
        <>
          <defs>
            <clipPath id={`area-${uid}`}>
              <rect x={layout.area.x} y={layout.area.y} width={layout.area.w} height={layout.area.h} />
            </clipPath>
          </defs>
          <g clipPath={`url(#area-${uid})`} fill={layout.color} textAnchor="middle">
            {layout.lines.map((l) => (
              <text
                key={l.family}
                x={l.x}
                y={l.y}
                fontSize={l.size}
                stroke={layout.halo}
                strokeWidth={Math.max(1, l.size * HALO_RATIO)}
                strokeLinejoin="round"
                paintOrder="stroke"
                style={{ fontFamily: l.family }}
              >
                {l.text}
              </text>
            ))}
          </g>
        </>
      )}
      {showArea && area && (
        <rect
          x={area.x + 1}
          y={area.y + 1}
          width={area.w - 2}
          height={area.h - 2}
          fill="none"
          stroke="#d4af37"
          strokeWidth={Math.max(1.5, info.width / 300)}
          strokeDasharray={`${info.width / 50} ${info.width / 70}`}
          opacity="0.9"
        />
      )}
    </svg>
  );
}
