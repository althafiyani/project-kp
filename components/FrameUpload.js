"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AREA_MAX, AREA_MIN, FRAME_LIMITS, FRAME_MAX_BYTES, matchFrameSize } from "@/lib/frameRules";
import { MIN_AUTO_AREA, frameTextFromEvent } from "@/lib/frameTextConfig";
import { OVERSCAN } from "@/lib/frameSlots";
import { useFrame } from "@/lib/useFrame";
import { btnGold, okBox, errBox, input, label } from "@/lib/ui";
import FrameTextOverlay from "@/components/guest/FrameTextOverlay";

const SAMPLE_TEXT = frameTextFromEvent({ frame_text_name: "Alia & Sandra" });
// Latar kotak-kotak = bagian transparan.
const CHECKER = {
  backgroundColor: "#2a2a2f",
  backgroundImage:
    "linear-gradient(45deg,#3a3a40 25%,transparent 25%,transparent 75%,#3a3a40 75%),linear-gradient(45deg,#3a3a40 25%,transparent 25%,transparent 75%,#3a3a40 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0, 8px 8px",
};

// Gambar skema ketentuan frame: ukuran bebas, lubang foto di atas, area tulisan di bagian bawah.
function Guide() {
  return (
    <figure className="mx-auto max-w-xs space-y-1.5">
      <figcaption className="text-center text-xs text-fg">
        <span className="font-medium text-gold">Skema frame</span> · ukuran bebas (lebar × tinggi dalam px)
      </figcaption>
      <div
        className="relative mx-auto w-full overflow-hidden rounded-md border border-line"
        style={{ ...CHECKER, aspectRatio: "3 / 4", maxWidth: 240 }}
        role="img"
        aria-label={`Skema frame: lubang foto transparan di atas, area tulisan setinggi ${AREA_MIN} sampai ${AREA_MAX} piksel di bagian bawah`}
      >
        {/* Lubang foto: bentuk bebas, jumlah 1 sampai 6, terdeteksi otomatis */}
        <div className="absolute inset-x-[8%] top-[4%] bottom-[27%] flex items-center justify-center rounded-sm border-2 border-dashed border-ok/80 bg-ok/10 text-center text-[10px] leading-tight text-ok">
          Lubang foto
          <br />
          (bagian transparan,
          <br />
          bentuk bebas, 1 sampai 6)
        </div>
        {/* Area tulisan */}
        <div className="absolute inset-x-0 bottom-0 flex h-[22%] flex-col items-center justify-center border-t-2 border-dashed border-gold bg-gold/15 text-center text-[10px] leading-tight text-gold">
          <span>Area tulisan</span>
          <span>
            tinggi {AREA_MIN}-{AREA_MAX} px
          </span>
        </div>
      </div>
      <p className="text-center text-[11px] text-muted">
        Area tulisan di bawah lubang foto. Kalau lubang foto turun, area tulisan menyesuaikan otomatis.
      </p>
    </figure>
  );
}

// Baris centang hasil pemeriksaan.
function Check({ ok, children }) {
  return (
    <li className={`flex items-start gap-2 text-sm ${ok ? "text-ok" : "text-bad"}`}>
      <span aria-hidden="true" className="mt-0.5 font-bold">
        {ok ? "✓" : "✕"}
      </span>
      <span className="text-fg">
        <span className="sr-only">{ok ? "Lolos: " : "Tidak lolos: "}</span>
        {children}
      </span>
    </li>
  );
}

// Upload frame buatan sendiri. Frame diperiksa dulu di browser (ukuran, lubang foto
// terdeteksi, tidak menabrak area tulisan) dan hanya bisa diunggah kalau semuanya lolos.
// Server memeriksa ulang jenis file dan ukurannya.
export default function FrameUpload({ eventId, frameText = null }) {
  const router = useRouter();
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [open, setOpen] = useState(false);
  const [namaDiubah, setNamaDiubah] = useState(false); // true = nama sudah diketik sendiri

  useEffect(() => {
    if (!file) {
      setUrl("");
      return;
    }
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(t);
  }, [notice]);

  const info = useFrame(url || null);

  // Hasil pemeriksaan (null selama gambar belum selesai dibaca).
  const cek = useMemo(() => {
    if (!file || !info) return null;
    const size = matchFrameSize(info.width, info.height);
    const area = info.textArea;
    const holes = info.slots.length;
    // Area tulisan menyesuaikan otomatis kalau lubang turun ke bawah; baru gagal kalau sisanya
    // kurang dari area minimal.
    const tabrak = area ? info.slots.filter((s) => s.y + s.h > area.y + 2).length : 0;
    const otomatis = Boolean(area?.auto);
    return {
      size,
      holes,
      tabrak,
      otomatis,
      areaH: area?.h ?? 0,
      berat: file.size <= FRAME_MAX_BYTES,
      lolos: Boolean(size) && holes > 0 && tabrak === 0 && file.size <= FRAME_MAX_BYTES,
    };
  }, [file, info]);

  function pilih(e) {
    setError("");
    setNotice("");
    const f = e.target.files?.[0] ?? null;
    if (f && f.type !== "image/png") {
      setError("Frame harus berupa file PNG (dengan latar transparan).");
      e.target.value = "";
      return setFile(null);
    }
    setFile(f);
    if (f && !namaDiubah) setName(f.name.replace(/\.png$/i, "").slice(0, 100));
  }

  async function unggah(e) {
    e.preventDefault();
    if (!file || !cek?.lolos) return;
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("name", name.trim());
      const res = await fetch(`/api/events/${eventId}/frames`, { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) return router.push("/login");
      if (!res.ok) return setError(data.error || "Gagal mengunggah frame.");
      setNotice(`Frame "${data.frame?.name ?? ""}" ditambahkan dan langsung dipakai di event ini.`);
      setFile(null);
      setName("");
      setNamaDiubah(false);
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch {
      setError("Tidak bisa terhubung ke server.");
    } finally {
      setBusy(false);
    }
  }

  const sample = frameText ?? SAMPLE_TEXT;

  return (
    <details
      className="rounded-lg border border-line bg-surface-2/40 p-3 open:space-y-4"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="cursor-pointer select-none text-sm font-medium text-gold">Upload frame sendiri</summary>

      <div className="space-y-2">
        <p className="text-sm text-muted">
          Ukuran frame bebas (dalam piksel). Bagian yang ingin diisi foto dibuat <strong className="text-fg">transparan</strong>, dan
          bagian bawah disisakan {AREA_MIN}-{AREA_MAX} px untuk tulisan &quot;THE WEDDING OF&quot; dan nama pengantin.
        </p>
        <Guide />
        <ul className="list-disc space-y-0.5 pl-5 text-xs text-muted">
          <li>Format PNG dengan latar transparan (bukan JPG), maksimal 5 MB.</li>
          <li>
            Lebar {FRAME_LIMITS.minW}-{FRAME_LIMITS.maxW} px dan tinggi {FRAME_LIMITS.minH}-{FRAME_LIMITS.maxH} px. Sistem membaca ukuran dan
            jumlah lubang otomatis (maksimal 6 lubang).
          </li>
          <li>
            Tinggi area tulisan standar {AREA_MIN}-{AREA_MAX} px dari tepi bawah. Kalau lubang foto turun lebih rendah dari itu, area tulisan
            menyesuaikan otomatis di bawah lubang, asal sisa ruangnya minimal {MIN_AUTO_AREA} px.
          </li>
          <li>Lubang foto = area yang benar-benar transparan, tidak boleh masuk ke area tulisan di bawah.</li>
        </ul>
      </div>

      <form onSubmit={unggah} className="space-y-3">
        <div className="space-y-1">
          <label htmlFor="fu-file" className={label}>
            File frame (PNG)
          </label>
          <input
            id="fu-file"
            ref={fileRef}
            type="file"
            accept="image/png"
            onChange={pilih}
            className="block w-full text-sm text-fg file:mr-3 file:rounded-lg file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-sm file:text-gold"
          />
        </div>

        {file && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="space-y-1">
                <label htmlFor="fu-name" className={label}>
                  Nama frame
                </label>
                <input
                  id="fu-name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setNamaDiubah(true);
                  }}
                  maxLength={100}
                  placeholder="Frame sendiri"
                  className={input}
                />
              </div>
              <p className="text-xs text-muted">Pemeriksaan otomatis:</p>
              {!cek ? (
                <p className="text-sm text-muted">Membaca frame...</p>
              ) : (
                <ul className="space-y-1.5">
                  <Check ok={Boolean(cek.size)}>
                    {cek.size
                      ? `Ukuran ${info.width} × ${info.height} px diterima (area tulisan ${cek.size.areaMin}-${cek.size.areaMax} px dari bawah)`
                      : `Ukuran ${info.width} × ${info.height} px di luar batas. Lebar ${FRAME_LIMITS.minW}-${FRAME_LIMITS.maxW} px, tinggi ${FRAME_LIMITS.minH}-${FRAME_LIMITS.maxH} px.`}
                  </Check>
                  <Check ok={cek.holes > 0}>
                    {cek.holes > 0
                      ? `${cek.holes} lubang foto terdeteksi (garis hijau di pratinjau)`
                      : "Lubang foto tidak terdeteksi. Bagian foto harus transparan."}
                  </Check>
                  <Check ok={cek.tabrak === 0}>
                    {cek.tabrak === 0
                      ? cek.otomatis
                        ? `Area tulisan menyesuaikan otomatis (${cek.areaH} px, mengikuti posisi lubang foto paling bawah)`
                        : "Lubang foto tidak menabrak area tulisan"
                      : `Ruang di bawah lubang foto terlalu sempit untuk tulisan (kurang dari ${MIN_AUTO_AREA} px). Naikkan atau kecilkan lubangnya.`}
                  </Check>
                  <Check ok={cek.berat}>
                    {cek.berat ? "Ukuran file di bawah 5 MB" : "File lebih dari 5 MB"}
                  </Check>
                </ul>
              )}
              <button type="submit" disabled={busy || !cek?.lolos} className={btnGold}>
                {busy ? "Mengunggah..." : "Upload dan pakai frame ini"}
              </button>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted">Pratinjau (kotak-kotak = transparan)</p>
              <div
                className="relative mx-auto w-full overflow-hidden rounded-md border border-line"
                style={{
                  ...CHECKER,
                  aspectRatio: `${info?.width ?? 450} / ${info?.height ?? 1350}`,
                  maxWidth: info && info.width > info.height * 0.5 ? 300 : 150,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="Pratinjau frame yang dipilih" draggable={false} className="absolute inset-0 h-full w-full" />
                {info && (
                  <svg viewBox={`0 0 ${info.width} ${info.height}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
                    <defs>
                      {info.slots.map((s, i) =>
                        s.maskUrl ? (
                          <mask key={i} id={`slot-mask-${i}`}>
                            <image href={s.maskUrl} x={s.x - OVERSCAN} y={s.y - OVERSCAN} width={s.w + OVERSCAN * 2} height={s.h + OVERSCAN * 2} preserveAspectRatio="none" />
                          </mask>
                        ) : null,
                      )}
                    </defs>
                    {info.slots.map((s, i) =>
                      s.maskUrl ? (
                        <rect key={i} x={s.x - OVERSCAN} y={s.y - OVERSCAN} width={s.w + OVERSCAN * 2} height={s.h + OVERSCAN * 2} fill="rgba(74,222,128,0.35)" mask={`url(#slot-mask-${i})`} />
                      ) : (
                        <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} stroke="#4ade80" strokeWidth={Math.max(2, info.width / 200)} strokeDasharray="12 8" fill="rgba(74,222,128,0.12)" />
                      ),
                    )}
                  </svg>
                )}
                {info?.textArea && <FrameTextOverlay info={info} text={sample} showArea />}
              </div>
              <p className="text-center text-[11px] text-muted">Hijau = lubang foto · kuning = area tulisan</p>
              {info?.textArea && (
                <p className="text-center text-[11px] text-muted">
                  Latar tulisan terdeteksi {info.dark ? "gelap" : "cerah"}, jadi teks memakai warna &quot;frame {info.dark ? "gelap" : "cerah"}&quot; dari
                  pengaturan Teks Frame.
                </p>
              )}
            </div>
          </div>
        )}
      </form>

      {notice && (
        <p role="status" className={okBox}>
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className={errBox}>
          {error}
        </p>
      )}
    </details>
  );
}
