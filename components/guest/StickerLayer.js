"use client";

import { useRef } from "react";
import { getSticker } from "@/lib/stickers";

const MIN_SIZE = 0.08; // lebar stiker minimal (pecahan lebar strip)
const MAX_SIZE = 1.3;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// Lapisan stiker di atas gambar strip. Semua stiker bisa:
//   - digeser (seret dengan jari atau kursor)
//   - dipilih dengan diketuk; stiker terpilih punya 4 tombol di sudutnya:
//       kiri atas = cerminkan, kanan atas = hapus (merah),
//       kiri bawah = putar (seret), kanan bawah = ubah ukuran (seret)
//
// items    = [{ uid, id, x, y, size, rot, flip }]  (posisi/ukuran = pecahan strip)
// selected = uid stiker terpilih, atau null
export default function StickerLayer({ items, selected, onSelect, onChange, onRemove }) {
  const boxRef = useRef(null);
  const drag = useRef(null);

  const rect = () => boxRef.current.getBoundingClientRect();

  function startMove(e, it) {
    e.stopPropagation();
    e.preventDefault();
    onSelect(it.uid);
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { mode: "move", uid: it.uid, sx: e.clientX, sy: e.clientY, x0: it.x, y0: it.y, r: rect() };
  }

  function startHandle(e, it, mode) {
    e.stopPropagation();
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const r = rect();
    const cx = r.left + it.x * r.width;
    const cy = r.top + it.y * r.height;
    drag.current = {
      mode,
      uid: it.uid,
      cx,
      cy,
      a0: Math.atan2(e.clientY - cy, e.clientX - cx),
      d0: Math.hypot(e.clientX - cx, e.clientY - cy) || 1,
      rot0: it.rot,
      size0: it.size,
    };
  }

  function onMove(e) {
    const d = drag.current;
    if (!d) return;
    if (d.mode === "move") {
      onChange(d.uid, {
        x: clamp(d.x0 + (e.clientX - d.sx) / d.r.width, 0, 1),
        y: clamp(d.y0 + (e.clientY - d.sy) / d.r.height, 0, 1),
      });
    } else if (d.mode === "rotate") {
      const a = Math.atan2(e.clientY - d.cy, e.clientX - d.cx);
      onChange(d.uid, { rot: d.rot0 + ((a - d.a0) * 180) / Math.PI });
    } else if (d.mode === "scale") {
      const dist = Math.hypot(e.clientX - d.cx, e.clientY - d.cy);
      onChange(d.uid, { size: clamp(d.size0 * (dist / d.d0), MIN_SIZE, MAX_SIZE) });
    }
  }

  function endDrag(e) {
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    drag.current = null;
  }

  const handlers = { onPointerMove: onMove, onPointerUp: endDrag, onPointerCancel: endDrag };
  const sel = items.find((i) => i.uid === selected) ?? null;
  const placement = (it) => ({
    left: `${it.x * 100}%`,
    top: `${it.y * 100}%`,
    width: `${it.size * 100}%`,
    aspectRatio: `${getSticker(it.id).w} / ${getSticker(it.id).h}`,
    transform: `translate(-50%, -50%) rotate(${it.rot}deg)`,
  });

  return (
    <div ref={boxRef} className="absolute inset-0 select-none" style={{ touchAction: "none" }}>
      {/* Lapisan 1: stiker (terpotong di tepi strip, sama seperti hasil akhir). */}
      <div className="absolute inset-0 overflow-hidden" onPointerDown={() => onSelect(null)}>
        {items.map((it) => (
          <div
            key={it.uid}
            data-sticker={it.id}
            role="button"
            aria-label={`Stiker ${getSticker(it.id).name}`}
            aria-pressed={it.uid === selected}
            className="absolute cursor-grab active:cursor-grabbing"
            style={{ ...placement(it), touchAction: "none" }}
            onPointerDown={(e) => startMove(e, it)}
            {...handlers}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getSticker(it.id).src}
              alt=""
              draggable={false}
              className="pointer-events-none h-full w-full"
              style={{ transform: it.flip ? "scaleX(-1)" : undefined }}
            />
          </div>
        ))}
      </div>

      {/* Lapisan 2: kotak pilihan dan tombol (tidak terpotong, supaya tombol di tepi tetap bisa dipencet). */}
      {sel && (
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute" style={placement(sel)}>
            <div className="absolute inset-0 rounded-sm border border-sky-300/80" />
            <Handle pos="tl" label="Cerminkan stiker" bg="#ffffff" onClick={() => onChange(sel.uid, { flip: !sel.flip })}>
              <path d="M7 8h10M13 4l4 4-4 4M17 16H7M11 12l-4 4 4 4" />
            </Handle>
            <Handle pos="tr" label="Hapus stiker" bg="#ef4444" onClick={() => onRemove(sel.uid)}>
              <path d="M7 7l10 10M17 7L7 17" stroke="#fff" strokeWidth="3" />
            </Handle>
            <Handle
              pos="bl"
              label="Putar stiker (seret)"
              bg="#ffffff"
              drag
              onPointerDown={(e) => startHandle(e, sel, "rotate")}
              {...handlers}
            >
              <path d="M20 12a8 8 0 1 1-2.5-5.8M20 4v5h-5" stroke="#16a34a" strokeWidth="2.6" />
            </Handle>
            <Handle
              pos="br"
              label="Ubah ukuran stiker (seret)"
              bg="#2563eb"
              drag
              onPointerDown={(e) => startHandle(e, sel, "scale")}
              {...handlers}
            >
              <path d="M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7" stroke="#fff" strokeWidth="2.6" />
            </Handle>
          </div>
        </div>
      )}
    </div>
  );
}

const POS = {
  tl: "left-0 top-0",
  tr: "left-full top-0",
  bl: "left-0 top-full",
  br: "left-full top-full",
};

// Tombol bulat di sudut kotak stiker. drag = tombol yang diseret (bukan diklik).
function Handle({ pos, label, bg, children, onClick, drag: dragging = false, ...rest }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      data-handle={pos}
      onClick={dragging ? undefined : onClick}
      onPointerDown={dragging ? rest.onPointerDown : (e) => e.stopPropagation()}
      onPointerMove={rest.onPointerMove}
      onPointerUp={rest.onPointerUp}
      onPointerCancel={rest.onPointerCancel}
      className={`pointer-events-auto absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full shadow-[0_1px_6px_rgba(0,0,0,0.45)] ${
        POS[pos]
      } ${dragging ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
      style={{ background: bg, touchAction: "none" }}
    >
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="#334155"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {children}
      </svg>
    </button>
  );
}
