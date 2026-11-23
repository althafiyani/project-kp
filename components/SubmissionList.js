"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import CheckMark from "@/components/CheckMark";
import { btnGold, btnOutline, errBox } from "@/lib/ui";

// Jumlah foto yang ditampilkan langsung di halaman; sisanya lewat "Lihat semua foto".
const PREVIEW = 6;

// readOnly = true untuk akun mempelai: bisa melihat, memilih, dan export, tapi tidak bisa menghapus.
// inline  = true: seluruh galeri (semua foto + voice note + tombol pilih/export) langsung tampil di halaman,
//           tanpa tombol "Lihat semua foto" dan jendela popup. Dipakai di dashboard mempelai.
export default function SubmissionList({ items, eventId, readOnly = false, inline = false }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState(() => new Set());

  // Hanya id yang masih ada di daftar (kalau ada foto yang baru dihapus, otomatis terbuang).
  const selectedIds = useMemo(() => items.filter((s) => selected.has(s.id)).map((s) => s.id), [items, selected]);
  const allSelected = items.length > 0 && selectedIds.length === items.length;

  function closeModal() {
    setOpen(false);
    setSelecting(false);
    setSelected(new Set());
  }

  function toggleSelecting() {
    setSelecting((v) => !v);
    setSelected(new Set());
  }

  function toggleOne(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelecting(true);
    setSelected(allSelected ? new Set() : new Set(items.map((s) => s.id)));
  }

  async function hapus(id) {
    if (!confirm("Hapus foto ini? Tidak bisa dikembalikan.")) return;
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/submissions/${id}`, { method: "DELETE" });
      const hasil = await res.json().catch(() => ({}));
      if (res.status === 401) return router.push("/login");
      if (!res.ok) return setError(hasil.error || "Gagal menghapus foto.");
      router.refresh();
    } catch {
      setError("Tidak bisa terhubung ke server.");
    } finally {
      setBusy(false);
    }
  }

  if (items.length === 0) return <p className="text-sm text-muted">Belum ada foto dari tamu.</p>;

  const toolbar = (
    <>
      <button
        type="button"
        onClick={toggleSelecting}
        aria-pressed={selecting}
        className={selecting ? btnGold : btnOutline}
      >
        {selecting ? "Batal" : "Select"}
      </button>
      <button type="button" onClick={toggleAll} className={btnOutline}>
        {allSelected ? "Batal pilih semua" : "Pilih semua"}
      </button>
      <span className="ml-auto text-sm text-muted">
        {selectedIds.length > 0 ? `${selectedIds.length} dari ${items.length} dipilih` : `${items.length} foto`}
      </span>
    </>
  );

  // Export ZIP: form biasa (POST), jadi browser yang mengurus unduhan file besar.
  // Hanya foto yang dipilih yang ikut di-export.
  const footer = (
    <form method="POST" action={`/api/events/${eventId}/export`} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="ids" value={selectedIds.join(",")} />
      <button type="submit" disabled={selectedIds.length === 0} className={btnGold}>
        Export ZIP{selectedIds.length > 0 ? ` (${selectedIds.length} dipilih)` : ""}
      </button>
      {selectedIds.length === 0 && (
        <span className="text-sm text-muted">Tekan Select lalu pilih foto, atau tekan Pilih semua.</span>
      )}
    </form>
  );

  const galeri = (
    <div className="space-y-3">
          {error && (
            <p role="alert" className={errBox}>
              {error}
            </p>
          )}
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((s) => {
              const checked = selected.has(s.id);
              if (selecting) {
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      aria-label="Pilih foto ini"
                      onClick={() => toggleOne(s.id)}
                      className={`relative block w-full rounded-lg border p-2 transition ${
                        checked ? "border-gold bg-gold/10" : "border-line bg-surface-2 hover:border-gold/50"
                      }`}
                    >
                      <span className="absolute right-3 top-3 z-10">
                        <CheckMark checked={checked} />
                      </span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={s.photo_url} alt="Foto tamu" loading="lazy" className="h-48 w-full rounded bg-ink object-contain" />
                    </button>
                  </li>
                );
              }
              return (
                <li key={s.id} className="space-y-2 rounded-lg border border-line bg-surface-2 p-2">
                  <a href={s.photo_url} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.photo_url} alt="Foto tamu" loading="lazy" className="h-48 w-full rounded bg-ink object-contain" />
                  </a>
                  {s.audio_url && <audio src={s.audio_url} controls preload="none" className="w-full" />}
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <a href={s.photo_url} download className="text-gold hover:underline">
                      Unduh
                    </a>
                    {!readOnly && (
                      <button onClick={() => hapus(s.id)} disabled={busy} className="text-bad hover:underline disabled:opacity-60">
                        Hapus
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
    </div>
  );

  if (inline) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">{toolbar}</div>
        {galeri}
        {footer}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="grid grid-cols-3 gap-2">
        {items.slice(0, PREVIEW).map((s) => (
          <li key={s.id}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.photo_url} alt="Foto tamu" loading="lazy" className="h-32 w-full rounded border border-line bg-ink object-contain" />
          </li>
        ))}
      </ul>

      <button type="button" onClick={() => setOpen(true)} className={btnOutline}>
        Lihat semua foto ({items.length})
      </button>

      <Modal open={open} onClose={closeModal} title={`Foto dari Tamu (${items.length})`} toolbar={toolbar} footer={footer}>
        {galeri}
      </Modal>
    </div>
  );
}
