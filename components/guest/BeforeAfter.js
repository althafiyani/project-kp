"use client";

import { useEffect, useRef, useState } from "react";

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// Pembanding sebelum / sesudah di atas pratinjau strip. Dipasang menimpa pratinjau yang sudah
// berfilter (= sesudah). Bagian kiri garis menampilkan foto tanpa filter (= sebelum).
// Garis bisa digeser dengan jari, kursor, atau tombol panah kiri / kanan.
//
// beforeCanvas = canvas strip tanpa filter (ukurannya sama dengan pratinjau)
export default function BeforeAfter({ beforeCanvas }) {
  const boxRef = useRef(null);
  const holderRef = useRef(null);
  const dragging = useRef(false);
  const [pos, setPos] = useState(50); // letak garis, 0..100 (% dari lebar)
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const holder = holderRef.current;
    if (!holder) return;
    if (beforeCanvas) {
      beforeCanvas.style.cssText = "width:100%;height:100%";
      holder.replaceChildren(beforeCanvas);
    } else {
      holder.replaceChildren();
    }
  }, [beforeCanvas]);

  function moveTo(e) {
    const r = boxRef.current.getBoundingClientRect();
    setPos(clamp(((e.clientX - r.left) / r.width) * 100, 2, 98));
  }

  return (
    <div
      ref={boxRef}
      className="absolute inset-0 cursor-ew-resize select-none"
      style={{ touchAction: "none" }}
      onPointerDown={(e) => {
        dragging.current = true;
        setTouched(true);
        e.currentTarget.setPointerCapture(e.pointerId);
        moveTo(e);
      }}
      onPointerMove={(e) => dragging.current && moveTo(e)}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
    >
      {/* Sebelum: hanya bagian di kiri garis yang terlihat */}
      <div ref={holderRef} className="pointer-events-none absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} />

      <span className="pointer-events-none absolute left-1.5 top-1.5 rounded-full bg-black/65 px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wide text-white">
        Sebelum
      </span>
      <span className="pointer-events-none absolute right-1.5 top-1.5 rounded-full bg-gold px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wide text-ink">
        Sesudah
      </span>

      {/* Garis pembatas dan pegangan */}
      <div className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_6px_rgba(0,0,0,0.6)]" style={{ left: `${pos}%` }} />
      <button
        type="button"
        role="slider"
        aria-label="Bandingkan sebelum dan sesudah filter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setPos((p) => clamp(p - 5, 2, 98));
          else if (e.key === "ArrowRight") setPos((p) => clamp(p + 5, 2, 98));
          else return;
          setTouched(true);
          e.preventDefault();
        }}
        className="absolute top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-ink shadow-[0_1px_8px_rgba(0,0,0,0.55)] outline-none focus-visible:ring-2 focus-visible:ring-gold"
        style={{ left: `${pos}%`, touchAction: "none" }}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 7l-5 5 5 5M15 7l5 5-5 5" />
        </svg>
      </button>

      {!touched && (
        <p className="pointer-events-none absolute inset-x-0 bottom-8 mx-auto w-max max-w-[92%] rounded bg-black/60 px-2 py-0.5 text-center font-sans text-[10px] font-bold text-gold">
          Geser untuk membandingkan
        </p>
      )}
    </div>
  );
}
