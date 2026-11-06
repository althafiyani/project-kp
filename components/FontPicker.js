"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BUILTIN_FONTS, FONT_GROUPS, resolveFont } from "@/lib/fonts";
import { loadFont } from "@/lib/frameText";
import { btnDanger, btnOutline, errBox } from "@/lib/ui";

// Tombol "Pilih font": kalau ditekan muncul daftar font (tiap nama ditulis dengan fontnya
// sendiri), plus font yang diupload vendor dan tombol upload font baru.
// value = referensi font ({ id, ... } atau null = bawaan, lihat lib/fonts.js).
// onChange(ref) dipanggil saat memilih; onUploaded(font) saat upload berhasil.
export default function FontPicker({ id, label, kind, value, onChange, eventId, customFonts, onCustomChange }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const boxRef = useRef(null);
  const fileRef = useRef(null);

  const current = resolveFont(value, kind);
  const customs = customFonts.map((f) => ({ ...resolveFont({ id: `c:${f.id}`, name: f.name, url: f.url }, kind), dbId: f.id }));

  // Nama font ditampilkan dengan fontnya sendiri: muat saat daftar dibuka (dan font terpilih saat tampil).
  useEffect(() => {
    loadFont(current);
  }, [current.family]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return;
    BUILTIN_FONTS.forEach((f) => loadFont(resolveFont({ id: f.id }, kind)));
    customs.forEach(loadFont);
  }, [open, customFonts.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tutup kalau klik di luar atau menekan Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => boxRef.current && !boxRef.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pilih(f) {
    const isCustom = f.id.startsWith("c:");
    onChange(isCustom ? { id: f.id, name: f.name, url: f.url } : f.id === resolveFont(null, kind).id ? null : { id: f.id });
    setOpen(false);
  }

  async function upload(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch(`/api/events/${eventId}/fonts`, { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) return router.push("/login");
      if (!res.ok) return setError(data.error || "Gagal mengupload font.");
      const f = data.font;
      onCustomChange([...customFonts, f]);
      onChange({ id: `c:${f.id}`, name: f.name, url: f.url });
      setOpen(false);
    } catch {
      setError("Tidak bisa terhubung ke server.");
    } finally {
      setBusy(false);
    }
  }

  async function hapus(f) {
    if (!confirm(`Hapus font "${f.name}"? Kalau sedang dipakai, teks kembali ke font bawaan.`)) return;
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/fonts/${f.dbId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) return router.push("/login");
      if (!res.ok) return setError(data.error || "Gagal menghapus font.");
      onCustomChange(customFonts.filter((x) => x.id !== f.dbId));
      if (value?.id === f.id) onChange(null);
      router.refresh();
    } catch {
      setError("Tidak bisa terhubung ke server.");
    } finally {
      setBusy(false);
    }
  }

  const option = (f, extra) => {
    const on = f.id === current.id;
    return (
      <li key={f.id} className="flex items-center">
        <button
          type="button"
          role="option"
          aria-selected={on}
          onClick={() => pilih(f)}
          className={`flex-1 truncate rounded px-2 py-1.5 text-left text-lg hover:bg-gold/10 ${on ? "bg-gold/15 text-gold" : "text-fg"}`}
          style={{ fontFamily: `${f.family}, serif` }}
        >
          {f.name}
        </button>
        {extra}
      </li>
    );
  };

  return (
    <div ref={boxRef} className="relative space-y-1">
      <span id={`${id}-label`} className="text-sm text-muted">
        {label}
      </span>
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${id}-label ${id}`}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-line bg-surface-2 px-3 py-2 text-left hover:border-gold/60"
      >
        <span className="truncate text-lg text-fg" style={{ fontFamily: `${current.family}, serif` }}>
          {current.name}
        </span>
        <span className="shrink-0 text-xs text-gold">{open ? "Tutup" : "Pilih font"}</span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-30 mt-1 rounded-lg border border-line bg-surface p-2 shadow-xl shadow-black/50">
          <ul role="listbox" aria-labelledby={`${id}-label`} className="max-h-72 overflow-y-auto pr-1">
            {FONT_GROUPS.map((g) => (
              <li key={g} role="presentation">
                <p className="sticky top-0 bg-surface px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted">
                  {g}
                </p>
                <ul>{BUILTIN_FONTS.filter((f) => f.group === g).map((f) => option(resolveFont({ id: f.id }, kind)))}</ul>
              </li>
            ))}
            {customs.length > 0 && (
              <li role="presentation">
                <p className="sticky top-0 bg-surface px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted">
                  Font saya
                </p>
                <ul>
                  {customs.map((f) =>
                    option(
                      f,
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => hapus(f)}
                        aria-label={`Hapus font ${f.name}`}
                        className={`${btnDanger} ml-1 px-2 py-1 text-xs`}
                      >
                        Hapus
                      </button>,
                    ),
                  )}
                </ul>
              </li>
            )}
          </ul>
          <div className="mt-2 border-t border-line pt-2">
            <input ref={fileRef} type="file" accept=".woff2,.woff,.ttf,.otf" onChange={upload} className="hidden" />
            <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className={`${btnOutline} w-full`}>
              {busy ? "Mengupload..." : "Upload font sendiri"}
            </button>
            <p className="mt-1 text-xs text-muted">WOFF2, WOFF, TTF, atau OTF. Maksimal 2 MB.</p>
          </div>
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
