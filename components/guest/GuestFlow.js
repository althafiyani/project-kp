"use client";

import { useState } from "react";
import Link from "next/link";
import FramePicker from "@/components/guest/FramePicker";
import InactiveNotice from "@/components/guest/InactiveNotice";
import OpeningCollage from "@/components/guest/OpeningCollage";

// Opening + Pilih Frame dalam satu layar: saat amplop diketuk, halaman Opening
// bergeser ke atas dan halaman Pilih Frame naik dari bawah (seperti di-scroll).
const layer =
  "absolute inset-0 overflow-y-auto transition-transform duration-700 ease-in-out motion-reduce:transition-none";
const column = "mx-auto flex min-h-full w-full max-w-[520px] flex-col px-5 py-6 md:py-10";

// Teks judul bawaan kalau vendor belum mengisi sendiri.
const DEFAULT_TITLE = "LET'S CELEBRATE LOVE";

export default function GuestFlow({ slug, name, dateText, openingUrl, openingItems = [], openingTitle, frameText = null, theme, active, closed = null, frames }) {
  const [stage, setStage] = useState("opening");
  const inFrame = stage === "frame";

  const adaFoto = openingItems.some(Boolean);

  // Opening: 2 foto berframe yang bertumpuk. Kalau belum diatur, pakai gambar amplop lama
  // atau kotak bertuliskan nama event.
  const amplop = adaFoto ? (
    <div className="envelope-float w-[min(calc(100vw-2.5rem),calc(50dvh*1.087),480px)]">
      <OpeningCollage items={openingItems} name={name} />
    </div>
  ) : (
    <div className="aspect-[353/420] w-[min(100%,calc(58dvh*0.8405),460px)] overflow-hidden rounded-[14px]">
      {openingUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={openingUrl}
          alt={`Undangan ${name}`}
          className="envelope-float h-full w-full object-contain"
          draggable={false}
        />
      ) : (
        <div className="flex h-full items-center justify-center rounded-[14px] border border-cream/30 p-6 text-center text-lg font-bold">
          {name}
        </div>
      )}
    </div>
  );

  return (
    <div className="guest-bg relative h-dvh overflow-hidden font-heritage text-cream" style={theme}>
      {/* Layer 1: Opening */}
      <div
        className={`${layer} ${inFrame ? "-translate-y-full" : "translate-y-0"}`}
        aria-hidden={inFrame}
        inert={inFrame}
      >
        <div className={`${column} items-center justify-center gap-6 text-center`}>
          <h1 className="sr-only">{name}</h1>
          <p className="whitespace-pre-line text-lg font-bold leading-6 tracking-[-0.45px] md:text-2xl">
            {openingTitle || DEFAULT_TITLE}
          </p>

          {active ? (
            <button
              type="button"
              onClick={() => setStage("frame")}
              aria-label="Buka undangan dan mulai berfoto"
              className="active:scale-[0.98] transition"
            >
              {amplop}
            </button>
          ) : (
            <>
              {amplop}
              <InactiveNotice closed={closed} dateText={dateText} />
            </>
          )}

          <div>
            <p className="text-lg font-bold leading-6 tracking-[-0.45px] md:text-xl">
              {active ? "Ketuk foto untuk memulai" : closed ? "" : dateText}
            </p>
            <p className="mt-1 text-sm opacity-70">Virtual Photobooth</p>
          </div>
        </div>
      </div>

      {/* Layer 2: Pilih Frame */}
      <div
        className={`${layer} ${inFrame ? "translate-y-0" : "translate-y-full"}`}
        aria-hidden={!inFrame}
        inert={!inFrame}
      >
        {/* h-full: tinggi kolom = tinggi layar, supaya daftar frame yang di-scroll
            (bukan seluruh halaman) dan tombol Pilih Frame selalu terlihat. */}
        <div className={`${column} h-full text-center`}>
          <div className="relative flex items-center justify-center">
            <button
              type="button"
              onClick={() => setStage("opening")}
              className="absolute left-0 text-sm underline opacity-80"
            >
              Kembali
            </button>
            <h2 className="text-lg font-bold leading-6 tracking-[-0.45px] md:text-2xl">PILIH FRAME</h2>
          </div>
          <FramePicker slug={slug} frames={frames} frameText={frameText} />
          <Link href={`/event/${slug}/gallery`} className="mt-4 text-sm underline opacity-80">
            Lihat galeri tamu
          </Link>
        </div>
      </div>
    </div>
  );
}
