"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { POLAROID_PRESETS, encodePolaroid, parsePolaroid } from "@/lib/polaroid";
import { btnGold, btnDanger, okBox, errBox, input, label } from "@/lib/ui";
import OpeningCollage, { PolaroidPhoto } from "@/components/guest/OpeningCollage";

const MAX_BYTES = 5 * 1024 * 1024;

// Satu baris pilihan warna: contoh warna cepat + pemilih warna bebas.
function ColorRow({ title, value, onChange, disabled }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted">{title}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {POLAROID_PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            disabled={disabled}
            title={p.name}
            aria-label={`${title}: ${p.name}`}
            aria-pressed={value === p.value}
            onClick={() => onChange(p.value)}
            className={`h-6 w-6 rounded-full border-2 disabled:opacity-60 ${value === p.value ? "border-gold" : "border-white/30"}`}
            style={{ background: p.value }}
          />
        ))}
        <input
          type="color"
          disabled={disabled}
          aria-label={`${title}: pilih warna sendiri`}
          value={value}
          onChange={(e) => onChange(e.target.value.toLowerCase())}
          className="h-7 w-9 cursor-pointer rounded border border-line bg-transparent p-0.5 disabled:opacity-60"
        />
      </div>
    </div>
  );
}

// Satu slot: pilih foto + warna polaroid (satu warna atau gradasi dua warna), dengan pratinjau langsung.
function SlotEditor({ eventId, slot, saved, onDone }) {
  const router = useRouter();
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const awal = parsePolaroid(saved?.frame);
  const [from, setFrom] = useState(awal.from);
  const [to, setTo] = useState(awal.to ?? "#f4c2cf");
  const [gradasi, setGradasi] = useState(Boolean(awal.to));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Sinkron dengan data tersimpan setelah halaman di-refresh.
  useEffect(() => {
    const p = parsePolaroid(saved?.frame);
    setFrom(p.from);
    setTo(p.to ?? "#f4c2cf");
    setGradasi(Boolean(p.to));
  }, [saved?.frame]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const photo = previewUrl || saved?.photo || "";
  const warna = encodePolaroid({ from, to: gradasi ? to : null });
  const tersimpan = encodePolaroid(parsePolaroid(saved?.frame));
  const berubah = Boolean(file) || (saved?.photo && tersimpan !== warna);

  function pilihFile(e) {
    setError("");
    const f = e.target.files?.[0] ?? null;
    if (f && f.size > MAX_BYTES) {
      setError("Ukuran file maksimal 5 MB.");
      e.target.value = "";
      return setFile(null);
    }
    setFile(f);
  }

  async function kirim(method, body, url) {
    setError("");
    setBusy(true);
    try {
      const res = await fetch(url, { method, body });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) return router.push("/login");
      if (!res.ok) return setError(data.error || "Terjadi kesalahan.");
      return true;
    } catch {
      setError("Tidak bisa terhubung ke server.");
    } finally {
      setBusy(false);
    }
  }

  async function simpan(e) {
    e.preventDefault();
    if (!file && !saved?.photo) return setError("Pilih foto dulu.");
    const fd = new FormData();
    fd.set("slot", String(slot));
    fd.set("color", warna);
    if (file) fd.set("file", file);
    if (await kirim("POST", fd, `/api/events/${eventId}/opening`)) {
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      onDone(`Foto ${slot} berhasil disimpan.`);
      router.refresh();
    }
  }

  async function hapus() {
    if (!confirm(`Hapus foto ${slot} dari halaman opening?`)) return;
    if (await kirim("DELETE", undefined, `/api/events/${eventId}/opening?slot=${slot}`)) {
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      onDone(`Foto ${slot} dihapus.`);
      router.refresh();
    }
  }

  return (
    <form onSubmit={simpan} className="space-y-3 rounded-lg border border-line bg-surface-2 p-3">
      <h3 className="text-sm font-medium text-gold">Polaroid {slot}</h3>

      <div className="mx-auto w-40" style={{ filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.45))" }}>
        <PolaroidPhoto photo={photo} color={warna} alt={`Pratinjau foto ${slot}`} />
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={pilihFile}
        aria-label={`Upload foto ${slot}`}
        className="block w-full text-sm text-fg file:mr-3 file:rounded-lg file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-sm file:text-gold"
      />

      <div className="space-y-2.5">
        <p className="text-sm text-muted">Warna polaroid</p>
        <div role="radiogroup" aria-label={`Jenis warna polaroid ${slot}`} className="flex gap-2">
          {[
            { v: false, t: "1 warna" },
            { v: true, t: "2 warna (gradasi)" },
          ].map((o) => (
            <button
              key={o.t}
              type="button"
              role="radio"
              aria-checked={gradasi === o.v}
              onClick={() => setGradasi(o.v)}
              className={`rounded-full border px-3 py-1 text-xs ${
                gradasi === o.v ? "border-gold bg-gold/15 text-gold" : "border-line text-muted hover:border-gold/60"
              }`}
            >
              {o.t}
            </button>
          ))}
        </div>
        <ColorRow title={gradasi ? "Warna 1 (atas)" : "Warna"} value={from} onChange={setFrom} disabled={busy} />
        {gradasi && <ColorRow title="Warna 2 (bawah)" value={to} onChange={setTo} disabled={busy} />}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={busy || (!file && !saved?.photo)} className={`${btnGold} px-3 py-1.5`}>
          {busy ? "Menyimpan..." : saved?.photo ? (berubah ? "Simpan perubahan" : "Tersimpan") : "Simpan foto"}
        </button>
        {saved?.photo && (
          <button type="button" disabled={busy} onClick={hapus} className={btnDanger}>
            Hapus
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className={errBox}>
          {error}
        </p>
      )}
    </form>
  );
}

const DEFAULT_TITLE = "LET'S CELEBRATE LOVE";

// Teks judul di atas foto pada halaman pembuka tamu. Kosong = teks bawaan.
function TitleEditor({ eventId, title, onDone }) {
  const router = useRouter();
  const [value, setValue] = useState(title);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setValue(title);
  }, [title]);

  async function simpan(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opening_title: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) return router.push("/login");
      if (!res.ok) return setError(data.error || "Gagal menyimpan teks.");
      onDone(value.trim() ? "Teks judul disimpan." : "Teks judul dikembalikan ke bawaan.");
      router.refresh();
    } catch {
      setError("Tidak bisa terhubung ke server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={simpan} className="space-y-2">
      <label htmlFor="opening-title" className={label}>
        Teks judul di halaman tamu
      </label>
      <div className="flex flex-wrap gap-2">
        <textarea
          id="opening-title"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={80}
          rows={2}
          placeholder={DEFAULT_TITLE}
          className={`${input} min-w-0 flex-1 resize-y`}
        />
        <button type="submit" disabled={busy || value.trim() === title.trim()} className={`${btnGold} self-start px-3 py-1.5`}>
          {busy ? "Menyimpan..." : "Simpan teks"}
        </button>
      </div>
      <p className="text-xs text-muted">
        Tekan Enter untuk pindah baris (maksimal 3 baris, 80 karakter). Dikosongkan = memakai teks bawaan ({DEFAULT_TITLE}).
      </p>
      {error && (
        <p role="alert" className={errBox}>
          {error}
        </p>
      )}
    </form>
  );
}

// slots = [slot1, slot2], masing-masing { photo, frame (warna polaroid) } atau null.
export default function OpeningUpload({ eventId, slots, legacyUrl, title = "" }) {
  const router = useRouter();
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(t);
  }, [notice]);

  const toItem = (s) => (s?.photo ? { photo: s.photo, color: s.frame } : null);
  const items = [toItem(slots[0]), toItem(slots[1])];

  async function hapusLama() {
    if (!confirm("Hapus gambar amplop lama?")) return;
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/events/${eventId}/opening`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) return router.push("/login");
      if (!res.ok) return setError(data.error || "Gagal menghapus.");
      router.refresh();
    } catch {
      setError("Tidak bisa terhubung ke server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Upload 2 foto, lalu atur warna polaroid-nya (satu warna atau gradasi dua warna). Di halaman tamu keduanya tampil
        bertumpuk: foto 1 di belakang miring ke kiri, foto 2 di depan miring ke kanan. PNG, JPG, atau WebP, maksimal 5 MB per foto.
      </p>

      {notice && (
        <p role="status" className={okBox}>
          {notice}
        </p>
      )}

      <TitleEditor eventId={eventId} title={title} onDone={setNotice} />

      <div className="grid gap-3 sm:grid-cols-2">
        <SlotEditor eventId={eventId} slot={1} saved={slots[0]} onDone={setNotice} />
        <SlotEditor eventId={eventId} slot={2} saved={slots[1]} onDone={setNotice} />
      </div>

      {(items[0] || items[1]) && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gold">Tampilan di halaman tamu</h3>
          <div className="mx-auto w-full max-w-sm rounded-lg border border-line bg-ink p-4">
            <OpeningCollage items={items} />
          </div>
        </div>
      )}

      {legacyUrl && !items[0] && !items[1] && (
        <div className="space-y-2 rounded-lg border border-line p-3">
          <p className="text-sm text-muted">
            Saat ini halaman tamu masih memakai gambar amplop lama. Simpan minimal satu foto opening di atas untuk menggantinya.
          </p>
          <button type="button" disabled={busy} onClick={hapusLama} className={btnDanger}>
            Hapus gambar amplop lama
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className={errBox}>
          {error}
        </p>
      )}
    </div>
  );
}
