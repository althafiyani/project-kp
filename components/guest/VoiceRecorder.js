"use client";

import { useEffect, useRef, useState } from "react";
import { pillButton, pillButtonGhost } from "@/lib/ui";

const MAX_SECONDS = 60;
// Urutan preferensi: Chrome/Android = webm, Safari/iOS = mp4.
const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

function pickMime() {
  if (typeof MediaRecorder === "undefined") return null;
  return MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
}

function micError(err) {
  switch (err?.name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Izin mikrofon ditolak. Aktifkan izin mikrofon di pengaturan browser, lalu coba lagi.";
    case "NotFoundError":
      return "Mikrofon tidak ditemukan di perangkat ini.";
    case "NotReadableError":
      return "Mikrofon sedang dipakai aplikasi lain.";
    default:
      return "Mikrofon tidak bisa dibuka.";
  }
}

// onChange(blob | null): dipanggil saat rekaman jadi atau dihapus.
export default function VoiceRecorder({ onChange, disabled }) {
  const [state, setState] = useState("idle"); // idle | recording | done
  const [seconds, setSeconds] = useState(0);
  const [url, setUrl] = useState(null);
  const [error, setError] = useState("");
  const recRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const urlRef = useRef(null);

  const cleanup = () => {
    clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(
    () => () => {
      cleanup();
      if (recRef.current?.state === "recording") {
        recRef.current.onstop = null;
        recRef.current.stop();
      }
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  async function start() {
    setError("");
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Browser ini belum mendukung perekaman suara. Coba Chrome atau Safari versi terbaru.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = () => {
        cleanup();
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || mime || "audio/webm" });
        if (blob.size === 0) {
          setError("Rekaman kosong, coba lagi.");
          setState("idle");
          return;
        }
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        const u = URL.createObjectURL(blob);
        urlRef.current = u;
        setUrl(u);
        setState("done");
        onChange(blob);
      };
      recRef.current = rec;
      rec.start();
      setSeconds(0);
      setState("recording");
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) stop();
          return s + 1;
        });
      }, 1000);
    } catch (err) {
      cleanup();
      setError(micError(err));
    }
  }

  function stop() {
    clearInterval(timerRef.current);
    if (recRef.current?.state === "recording") recRef.current.stop();
  }

  function remove() {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setUrl(null);
    setState("idle");
    onChange(null);
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl bg-cream/10 px-4 py-4">
      <p className="text-sm font-bold">Pesan suara untuk pengantin (opsional)</p>

      {state === "idle" && (
        <button type="button" onClick={start} disabled={disabled} className={pillButtonGhost}>
          Rekam Suara
        </button>
      )}

      {state === "recording" && (
        <>
          <p className="font-sans text-sm" aria-live="off">
            <span className="mr-2 inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-bad" />
            Merekam {mm}:{ss} / 01:00
          </p>
          <button type="button" onClick={stop} className={pillButton}>
            Berhenti
          </button>
        </>
      )}

      {state === "done" && url && (
        <>
          <audio src={url} controls preload="metadata" className="w-full" />
          <button type="button" onClick={remove} disabled={disabled} className="text-sm underline opacity-80">
            Hapus dan rekam ulang
          </button>
        </>
      )}

      {error && (
        <p role="alert" className="text-sm font-bold text-bad">
          {error}
        </p>
      )}
    </div>
  );
}
