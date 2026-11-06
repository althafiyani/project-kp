"use client";

import { useEffect, useRef } from "react";

// Popup (dialog) dengan isi yang bisa di-scroll.
//   header   : judul + tombol Tutup (tetap di atas)
//   toolbar  : baris tombol di bawah header (opsional, tetap di atas)
//   children : isi, bagian inilah yang di-scroll
//   footer   : bagian bawah (opsional, tetap terlihat di bawah)
// Ditutup dengan tombol Tutup, tombol Esc, atau ketuk area gelap di luar popup.
export default function Modal({ open, onClose, title, toolbar, footer, children }) {
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // halaman di belakang tidak ikut ter-scroll
    const onKey = (e) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-2xl shadow-black/60 outline-none sm:rounded-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="font-semibold text-gold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-line px-3 py-1 text-sm text-fg transition hover:border-gold hover:text-gold"
          >
            Tutup
          </button>
        </div>

        {toolbar && <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">{toolbar}</div>}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">{children}</div>

        {footer && <div className="border-t border-line bg-surface px-4 py-3">{footer}</div>}
      </div>
    </div>
  );
}
