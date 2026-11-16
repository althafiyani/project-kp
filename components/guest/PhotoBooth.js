"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { loadFrame, composeStrip, canvasToBlob } from "@/lib/photoStrip";
import { ensureTextFonts } from "@/lib/frameText";
import { pillButton, pillButtonGhost, okBox, errBox } from "@/lib/ui";
import FrameArt from "@/components/guest/FrameArt";
import FrameStage from "@/components/guest/FrameStage";

const COUNTDOWN_FROM = 3; // hitung mundur sebelum jepret
const AUTO_CONTINUE = 5; // detik jeda di layar cek foto sebelum lanjut otomatis
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function cameraErrorMessage(err) {
  switch (err?.name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Izin kamera ditolak. Aktifkan izin kamera untuk situs ini di pengaturan browser, lalu muat ulang halaman.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "Kamera tidak ditemukan di perangkat ini.";
    case "NotReadableError":
    case "AbortError":
      return "Kamera sedang dipakai aplikasi lain. Tutup aplikasi itu lalu coba lagi.";
    default:
      return "Kamera tidak bisa dibuka. Coba muat ulang halaman.";
  }
}

export default function PhotoBooth({ slug, frame, frameText = null }) {
  // loading -> ready -> live (ambil 1 foto) -> confirm (cek foto itu) -> ... -> review (hasil strip)
  // -> final (upload ke galeri)
  const [phase, setPhase] = useState("loading");
  const [error, setError] = useState("");
  const [frameInfo, setFrameInfo] = useState(null); // { img, width, height, slots, edge }
  const [facing, setFacing] = useState("user");
  const [canFlip, setCanFlip] = useState(false);
  const [counting, setCounting] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [flashKey, setFlashKey] = useState(0);
  const [current, setCurrent] = useState(0); // lubang yang sedang diambil
  const [photos, setPhotos] = useState([]); // foto yang sudah disetujui, per lubang: { canvas, url }
  const [pending, setPending] = useState(null); // { canvas, url } foto yang sedang dicek
  const [resultUrl, setResultUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [autoLeft, setAutoLeft] = useState(AUTO_CONTINUE);

  const savingRef = useRef(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const blobRef = useRef(null);
  const runRef = useRef(0); // naik tiap kali hitung mundur dibatalkan
  const resultUrlRef = useRef(null);
  const acceptRef = useRef(null);
  const acceptingRef = useRef(false);
  const audioCtxRef = useRef(null);
  const fromReviewRef = useRef(false); // true = sedang mengulang satu lubang dari layar hasil

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // Suara hitung mundur dibuat dengan Web Audio (tanpa file). AudioContext harus
  // dibuka dari ketukan tamu, jadi dipanggil di dalam takeOne().
  function unlockAudio() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audioCtxRef.current) audioCtxRef.current = new AC();
      if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
    } catch {
      // tanpa suara pun foto tetap jalan
    }
  }

  function beep(freq, ms, volume = 0.3) {
    try {
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t0 = ctx.currentTime;
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + ms / 1000);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + ms / 1000 + 0.03);
    } catch {
      // abaikan
    }
  }

  // 1) Muat frame, lalu deteksi lubang fotonya otomatis dari area transparan.
  useEffect(() => {
    let batal = false;
    (async () => {
      try {
        // Font teks harus siap sebelum frame dipakai, supaya hasil akhir ikut bertulisan.
        const [info] = await Promise.all([loadFrame(frame.image_url), frameText ? ensureTextFonts(frameText) : null]);
        if (batal) return;
        if (info.slots.length === 0) {
          setError(
            "Area foto pada frame ini tidak terdeteksi. Pastikan bagian foto pada desain berupa area transparan.",
          );
          setPhase("error");
          return;
        }
        setFrameInfo(info);
        setPhase("ready");
      } catch {
        if (!batal) {
          setError("Frame gagal dimuat. Periksa koneksi internetmu lalu muat ulang halaman.");
          setPhase("error");
        }
      }
    })();
    return () => {
      batal = true;
    };
  }, [frame.image_url]);

  // 2) Bersih-bersih saat halaman ditutup.
  useEffect(
    () => () => {
      runRef.current++;
      stopStream();
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
      audioCtxRef.current?.close?.().catch(() => {});
    },
    [stopStream],
  );

  // 3) Sambungkan kamera ke <video>. Elemen video ada di dalam lubang yang sedang
  // diambil, jadi disambungkan ulang setiap pindah lubang.
  useEffect(() => {
    if (phase !== "live") return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;
    if (video.srcObject !== stream) video.srcObject = stream;
    video.play().catch(() => {});
  }, [phase, facing, current]);

  const startCamera = useCallback(
    async (facingMode) => {
      setError("");
      if (!window.isSecureContext) {
        setError("Kamera hanya bisa dipakai lewat koneksi aman (HTTPS).");
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Browser ini belum mendukung kamera. Coba Chrome atau Safari versi terbaru.");
        return;
      }
      stopStream();
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 1280 } },
          audio: false,
        });
        streamRef.current = stream;
        setFacing(facingMode);
        setPhase("live");
        navigator.mediaDevices
          .enumerateDevices()
          .then((list) => setCanFlip(list.filter((d) => d.kind === "videoinput").length > 1))
          .catch(() => {});
      } catch (err) {
        setError(cameraErrorMessage(err));
        setPhase("ready");
      }
    },
    [stopStream],
  );

  function captureFrame() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (facing === "user") {
      // Kamera depan disimpan terbalik kiri-kanan, sama dengan yang terlihat di layar.
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas;
  }

  // Ambil SATU foto: hitung mundur (angkanya muncul di lubang yang sedang diambil,
  // disertai bunyi "tit" tiap detik), jepret, lalu tampilkan di lubang itu untuk dicek.
  async function takeOne() {
    const runId = ++runRef.current;
    setError("");
    setCounting(true);
    unlockAudio();
    try {
      for (let n = COUNTDOWN_FROM; n >= 1; n--) {
        setCountdown(n);
        beep(n === 1 ? 1175 : 880, 180);
        await sleep(1000);
        if (runRef.current !== runId) return;
      }
      setCountdown(null);
      const canvas = captureFrame();
      if (!canvas) {
        setError("Gagal mengambil foto. Pastikan kamera masih menyala, lalu coba lagi.");
        return;
      }
      beep(1568, 260, 0.35); // bunyi jepret
      setFlashKey((k) => k + 1);
      setPending({ canvas, url: canvas.toDataURL("image/jpeg", 0.85) });
      await sleep(250);
      if (runRef.current !== runId) return;
      setPhase("confirm");
    } finally {
      if (runRef.current === runId) {
        setCounting(false);
        setCountdown(null);
      }
    }
  }

  async function buildStrip(list) {
    try {
      const strip = composeStrip({ frame: frameInfo, photos: list.map((p) => p.canvas), text: frameText });
      const blob = await canvasToBlob(strip, "image/jpeg", 0.92);
      blobRef.current = blob;
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
      const url = URL.createObjectURL(blob);
      resultUrlRef.current = url;
      setResultUrl(url);
      setSaved(false);
      setPhase("review");
    } catch {
      setError("Gagal menyusun foto. Silakan coba lagi.");
      setPhase("live");
    }
  }

  // Foto di lubang ini oke -> tersimpan di lubang itu, lanjut ke lubang berikutnya
  // (atau susun hasil kalau semua lubang sudah terisi).
  async function accept() {
    if (!pending || acceptingRef.current) return;
    acceptingRef.current = true;
    try {
      await acceptInner();
    } finally {
      acceptingRef.current = false;
    }
  }

  async function acceptInner() {
    const total = frameInfo.slots.length;
    const list = [...photos];
    list[current] = pending;
    setPhotos(list);
    setPending(null);
    if (fromReviewRef.current) {
      fromReviewRef.current = false;
      await buildStrip(list);
    } else if (current + 1 < total) {
      setCurrent(current + 1);
      setPhase("live");
    } else {
      await buildStrip(list);
    }
  }

  // Foto di lubang ini kurang bagus -> ambil lagi lubang yang sama.
  function redo() {
    setPending(null);
    setError("");
    setPhase("live");
  }

  // Dari layar hasil: ulang satu lubang saja.
  function retakeSlot(i) {
    fromReviewRef.current = true;
    setCurrent(i);
    setPending(null);
    setError("");
    setPhase("live");
  }

  function retakeAll() {
    fromReviewRef.current = false;
    setPhotos([]);
    setCurrent(0);
    setPending(null);
    setError("");
    setSaved(false);
    blobRef.current = null;
    setPhase("live");
  }

  // Foto strip dikirim ke galeri.
  async function save() {
    if (!blobRef.current || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      const form = new FormData();
      form.append("frame", frame.id);
      form.append("photo", blobRef.current, "strip.jpg");
      const res = await fetch(`/api/guest/${slug}/submissions`, { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal mengunggah foto. Coba lagi.");
        return;
      }
      setSaved(true);
    } catch {
      setError("Koneksi bermasalah. Foto belum terunggah, coba lagi.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  // Dari layar hasil -> layar akhir (upload ke galeri).
  function goFinal() {
    if (!blobRef.current) return;
    setSaved(false);
    setError("");
    setPhase("final");
  }

  useEffect(() => {
    acceptRef.current = accept;
  });

  // Di layar cek foto: 5 detik tanpa disentuh = lanjut otomatis.
  useEffect(() => {
    if (phase !== "confirm") return;
    let left = AUTO_CONTINUE;
    setAutoLeft(left);
    const id = setInterval(() => {
      left -= 1;
      setAutoLeft(Math.max(left, 0));
      if (left <= 0) {
        clearInterval(id);
        acceptRef.current?.();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  const slots = frameInfo?.slots ?? [];
  const total = slots.length;

  const judul =
    phase === "live" || phase === "confirm"
      ? `FOTO ${current + 1} DARI ${total}`
      : phase === "review"
        ? "HASIL FOTO"
        : phase === "final"
            ? "SIMPAN FOTO"
            : "SIAP BERFOTO?";

  const errorBox = error && (
    <p role="alert" className={errBox}>
      {error}
    </p>
  );

  // Isi tiap lubang pada panggung: kamera langsung (lubang yang sedang diambil),
  // foto yang sedang dicek, atau foto yang sudah disetujui.
  function renderSlot(i) {
    const aktif = i === current;
    if (aktif && phase === "live") {
      return (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
            style={{ transform: facing === "user" ? "scaleX(-1)" : undefined }}
          />
          {countdown !== null && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <span key={countdown} className="count-pop text-6xl font-bold leading-none text-gold">
                {countdown}
              </span>
            </div>
          )}
          {flashKey > 0 && <div key={flashKey} className="flash absolute inset-0 bg-white" />}
        </>
      );
    }
    if (aktif && phase === "confirm" && pending) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={pending.url} alt={`Foto ke-${i + 1}`} className="h-full w-full object-cover" />;
    }
    if (photos[i]) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={photos[i].url} alt={`Foto ke-${i + 1}`} className="h-full w-full object-cover" />;
    }
    return null;
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-4 text-center">
      <p className="text-lg font-bold leading-6 tracking-[-0.45px] text-gold md:text-xl">{judul}</p>

      {phase === "loading" && <p className="mt-10 text-sm opacity-80">Menyiapkan frame...</p>}

      {phase === "error" && (
        <>
          <p role="alert" className={errBox}>
            {error}
          </p>
          <Link href={`/event/${slug}`} className={pillButtonGhost}>
            Kembali
          </Link>
        </>
      )}

      {phase === "ready" && (
        <>
          <FrameArt src={frame.image_url} alt={frame.name} className="h-[clamp(240px,46dvh,560px)]" text={frameText} />
          <p className="text-sm opacity-90">
            Frame ini punya <strong>{total} foto</strong>. Kamu foto satu per satu langsung di
            dalam frame: ada hitung mundur {COUNTDOWN_FROM} detik berbunyi, lalu fotonya dicek
            dulu. Tekan Ulangi kalau kurang bagus, atau Lanjut untuk menyimpannya di frame.
          </p>
          {errorBox}
          <div className="mt-auto flex flex-col items-center gap-3 pt-2">
            <button type="button" onClick={() => startCamera(facing)} className={pillButton}>
              {error ? "Coba Lagi" : "Mulai Kamera"}
            </button>
            <Link href={`/event/${slug}/frame`} className="text-sm underline opacity-80">
              Ganti frame
            </Link>
          </div>
        </>
      )}

      {phase === "live" && frameInfo && (
        <>
          <FrameStage frame={frameInfo} src={frame.image_url} alt={frame.name} renderSlot={renderSlot} text={frameText} />

          {errorBox}

          <div className="mt-auto flex items-center gap-3 pt-1">
            {counting ? (
              <p className="text-sm opacity-80">Lihat ke kamera dan bergaya...</p>
            ) : (
              <>
                <button type="button" onClick={takeOne} className={pillButton}>
                  {error ? "Coba Lagi" : "Ambil Foto"}
                </button>
                {canFlip && (
                  <button
                    type="button"
                    onClick={() => startCamera(facing === "user" ? "environment" : "user")}
                    className={pillButtonGhost}
                  >
                    Balik Kamera
                  </button>
                )}
              </>
            )}
          </div>
        </>
      )}

      {phase === "confirm" && pending && frameInfo && (
        <>
          <FrameStage frame={frameInfo} src={frame.image_url} alt={frame.name} renderSlot={renderSlot} text={frameText} />
          <p className="text-sm opacity-90" aria-live="polite">
            Fotonya oke? Lanjut otomatis dalam <strong>{autoLeft}</strong> detik.
          </p>
          <div className="mt-auto flex items-center gap-3 pt-1">
            <button type="button" onClick={redo} className={pillButtonGhost}>
              Ulangi
            </button>
            <button type="button" onClick={accept} className={pillButton}>
              {fromReviewRef.current || current + 1 >= total ? "Selesai" : "Lanjut"} ({autoLeft})
            </button>
          </div>
        </>
      )}

      {/* 1) Semua lubang sudah terisi: cek hasilnya, ulang atau lanjut. */}
      {phase === "review" && resultUrl && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resultUrl}
            alt="Hasil foto kamu"
            className="max-h-[56dvh] w-auto"
            style={{ filter: "drop-shadow(0 0 18px color-mix(in srgb, var(--gold) 55%, transparent))" }}
          />

          {total > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {slots.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => retakeSlot(i)}
                  className="rounded-full border border-gold/60 px-3 py-1.5 font-sans text-xs font-bold text-gold"
                >
                  Ulang foto {i + 1}
                </button>
              ))}
            </div>
          )}

          {errorBox}
          <div className="mt-auto flex flex-wrap items-center justify-center gap-3 pt-2">
            <button type="button" onClick={retakeAll} className={pillButtonGhost}>
              Take Ulang
            </button>
            <button type="button" onClick={goFinal} className={pillButton}>
              Next
            </button>
          </div>
        </>
      )}

      {/* 2) Hasil akhir: upload ke galeri. */}
      {phase === "final" && resultUrl && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resultUrl}
            alt="Hasil foto kamu"
            className="max-h-[42dvh] w-auto"
            style={{ filter: "drop-shadow(0 0 18px color-mix(in srgb, var(--gold) 55%, transparent))" }}
          />

          {saved && (
            <p role="status" className={okBox}>
              Foto berhasil diunggah ke galeri. Terima kasih sudah berfoto!
            </p>
          )}

          {errorBox}
          <div className="mt-auto flex flex-wrap items-center justify-center gap-3 pt-2">
            {!saved && (
              <button type="button" onClick={() => setPhase("review")} disabled={saving} className={pillButtonGhost}>
                Kembali
              </button>
            )}
            <a href={resultUrl} download={`foto-${slug}.jpg`} className={pillButtonGhost}>
              Unduh Foto
            </a>
            {!saved ? (
              <button type="button" onClick={save} disabled={saving} className={pillButton}>
                {saving
                  ? "Mengunggah..."
                  : error
                    ? "Coba Lagi"
                    : "Upload ke Galeri"}
              </button>
            ) : (
              <>
                <button type="button" onClick={retakeAll} className={pillButtonGhost}>
                  Foto Lagi
                </button>
                <Link href={`/event/${slug}/gallery`} className={pillButton}>
                  Lihat Galeri
                </Link>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
