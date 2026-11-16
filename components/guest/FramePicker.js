"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { pillButton } from "@/lib/ui";
import FrameArt from "@/components/guest/FrameArt";

export default function FramePicker({ slug, frames, frameText = null }) {
  const router = useRouter();
  const [selected, setSelected] = useState(null);

  if (frames.length === 0) {
    return (
      <p className="mx-auto rounded-2xl bg-cream/10 px-5 py-4 text-base font-bold">
        Belum ada frame untuk event ini.
      </p>
    );
  }

  return (
    <>
      {/* Daftar frame: 2 kolom per baris, bisa di-scroll ke bawah kalau frame-nya banyak.
          Judul di atas dan tombol di bawah tetap terlihat. */}
      <div
        role="radiogroup"
        aria-label="Pilih frame"
        className="-mx-5 flex min-h-0 w-[calc(100%+2.5rem)] flex-1 overflow-y-auto px-5 py-8 [scrollbar-color:color-mix(in_srgb,var(--gold)_55%,transparent)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cream/45 [&::-webkit-scrollbar-track]:bg-transparent"
      >
        {/* my-auto = di tengah ruang antara judul dan tombol kalau frame sedikit,
            dan mulai dari atas (bisa di-scroll) kalau frame banyak */}
        <div className="mx-auto my-auto grid w-full max-w-[380px] grid-cols-2 gap-x-4 gap-y-6">
          {frames.map((f) => {
            const aktif = selected === f.id;
            return (
              <button
                key={f.id}
                type="button"
                role="radio"
                aria-checked={aktif}
                aria-label={f.name}
                onClick={() => setSelected(f.id)}
                className={`rounded-md p-2 outline-none transition duration-200 focus-visible:ring-2 focus-visible:ring-cream ${
                  aktif ? "scale-[1.05]" : "opacity-90"
                }`}
              >
                <FrameArt
                  src={f.image_url}
                  alt={f.name}
                  glow={aktif ? "color-mix(in srgb, var(--gold-soft) 95%, transparent)" : "color-mix(in srgb, var(--gold) 30%, transparent)"}
                  radius={aktif ? 16 : 18}
                  className="w-full"
                  text={frameText}
                />
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-auto flex flex-col items-center gap-3 pt-4">
        <p className="text-sm opacity-80" aria-live="polite">
          {selected ? "Frame dipilih." : "Ketuk salah satu frame untuk memilih."}
        </p>
        <button
          type="button"
          disabled={!selected}
          onClick={() => router.push(`/event/${slug}/camera?frame=${selected}`)}
          className={pillButton}
        >
          Pilih Frame Photobooth
        </button>
      </div>
    </>
  );
}
