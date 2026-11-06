"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FRAME_TEMPLATES } from "@/lib/frameTemplates";
import { useFrame } from "@/lib/useFrame";
import { btnOutline, okBox, errBox } from "@/lib/ui";
import FrameArt from "@/components/guest/FrameArt";
import Modal from "@/components/Modal";
import CheckMark from "@/components/CheckMark";

// Jumlah frame yang ditampilkan langsung di halaman; sisanya lewat "Lihat semua frame".
const PREVIEW = 3;

// Keterangan otomatis: jumlah dan bentuk lubang foto yang terdeteksi dari gambar frame.
function FrameInfo({ src }) {
  const info = useFrame(src);
  if (!info) return <span className="text-xs text-muted">Membaca frame...</span>;
  if (info.slots.length === 0) {
    return <span className="text-xs text-bad">Area foto tidak terdeteksi (bagian foto harus transparan).</span>;
  }
  const bentuk = info.slots.every((s) => s.shape === "rect") ? "kotak" : info.slots.some((s) => s.shape === "rect") ? "kotak dan bentuk bebas" : "bentuk bebas";
  return (
    <span className="text-xs text-muted">
      {info.slots.length} foto, {bentuk}
    </span>
  );
}

// Satu frame yang bisa dicentang: ceklis menyala = dipakai di event ini.
function FrameTile({ item, checked, busy, onToggle, text }) {
  return (
    <li>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={item.name}
        onClick={() => onToggle(item)}
        disabled={busy}
        className={`relative block w-full space-y-2 rounded-lg border p-2 text-left transition disabled:cursor-wait disabled:opacity-60 ${
          checked ? "border-gold bg-gold/10" : "border-line bg-surface-2 hover:border-gold/50"
        }`}
      >
        <span className="absolute right-3 top-3 z-10">
          <CheckMark checked={checked} />
        </span>
        <span className="flex h-44 items-center justify-center rounded bg-ink p-2">
          <FrameArt src={item.image} alt={item.name} glow="color-mix(in srgb, var(--gold) 25%, transparent)" radius={8} className="h-full" text={text} />
        </span>
        <span className="block">
          <span className="block text-sm text-fg">{item.name}</span>
          <FrameInfo src={item.image} />
        </span>
      </button>
    </li>
  );
}

// Admin mencentang frame dari katalog bawaan (lib/frameTemplates.js), tidak upload sendiri.
// Posisi lubang fotonya dideteksi otomatis dari desain.
export default function FrameManager({ eventId, frames, frameText = null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [open, setOpen] = useState(false);

  // Pesan "berhasil" hilang sendiri setelah beberapa detik.
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(t);
  }, [notice]);

  // Daftar gabungan: semua frame katalog (dicentang kalau sudah dipakai) + frame lama
  // di event ini yang tidak ada di katalog (selalu tercentang, bisa dilepas).
  const byImage = new Map(frames.map((f) => [f.image_url, f]));
  const katalog = FRAME_TEMPLATES.map((t) => ({ key: t.key, name: t.name, image: t.image, frame: byImage.get(t.image) ?? null }));
  const inCatalog = new Set(FRAME_TEMPLATES.map((t) => t.image));
  const lainnya = frames
    .filter((f) => !inCatalog.has(f.image_url))
    .map((f) => ({ key: f.id, name: f.name, image: f.image_url, frame: f, extra: true }));
  const items = [...katalog, ...lainnya];
  const dipakai = items.filter((i) => i.frame);
  // Frame upload sendiri hanya ada di event ini, jadi ditampilkan di bagian tersendiri.
  const custom = lainnya;

  async function toggle(item) {
    if (busy) return;
    if (item.frame && item.extra && !confirm("Frame ini hasil upload sendiri. Kalau dilepas, frame dan filenya DIHAPUS dan tidak bisa dikembalikan. Lanjut?")) {
      return;
    }
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const res = item.frame
        ? await fetch(`/api/frames/${item.frame.id}`, { method: "DELETE" })
        : await fetch(`/api/events/${eventId}/frames`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ template: item.key }),
          });
      const hasil = await res.json().catch(() => ({}));
      if (res.status === 401) return router.push("/login");
      if (!res.ok) return setError(hasil.error || "Gagal menyimpan pilihan frame.");
      setNotice(item.frame ? `${item.name} dilepas dari event.` : `${item.name} dipakai di event ini.`);
      router.refresh();
    } catch {
      setError("Tidak bisa terhubung ke server.");
    } finally {
      setBusy(false);
    }
  }

  const pesan = (
    <>
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
    </>
  );

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted">
          {dipakai.length === 0
            ? "Belum ada frame yang dipakai. Centang minimal satu supaya tamu bisa berfoto."
            : `Dipakai di event ini (${dipakai.length}): ${dipakai.map((i) => i.name).join(", ")}`}
        </p>
      </div>

      {!open && pesan}

      {custom.length > 0 && (
        <section className="space-y-2" aria-label="Frame custom">
          <h3 className="text-sm font-medium text-fg">Frame custom (hasil upload, hanya untuk event ini)</h3>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {custom.map((item) => (
              <FrameTile key={item.key} item={item} checked busy={busy} onToggle={toggle} text={frameText} />
            ))}
          </ul>
          <p className="text-xs text-muted">Frame custom langsung dipakai tamu. Klik untuk menghapusnya dari event ini.</p>
        </section>
      )}

      <section className="space-y-2" aria-label="Frame bawaan">
        {custom.length > 0 && <h3 className="text-sm font-medium text-fg">Frame bawaan</h3>}
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {katalog.slice(0, PREVIEW).map((item) => (
            <FrameTile key={item.key} item={item} checked={Boolean(item.frame)} busy={busy} onToggle={toggle} text={frameText} />
          ))}
        </ul>
      </section>

      {katalog.length > PREVIEW && (
        <button type="button" onClick={() => setOpen(true)} className={btnOutline}>
          Lihat semua frame bawaan ({katalog.length})
        </button>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Semua Frame Bawaan">
        <div className="space-y-3">
          <p className="text-sm text-muted">Centang frame yang mau dipakai tamu. Ceklis kosong = tidak dipakai.</p>
          {pesan}
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {katalog.map((item) => (
              <FrameTile key={item.key} item={item} checked={Boolean(item.frame)} busy={busy} onToggle={toggle} text={frameText} />
            ))}
          </ul>
        </div>
      </Modal>
    </div>
  );
}
