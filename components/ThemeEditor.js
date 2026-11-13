"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_DARK, DEFAULT_GOLD, THEME_PRESETS, contrast, normalizeHex, themeVars } from "@/lib/theme";
import { btnGold, btnOutline, okBox, errBox, input } from "@/lib/ui";

// Satu baris pilihan warna: kotak warna bebas + isian kode hex + tombol Bawaan.
function ColorRow({ id, title, hint, value, def, onChange }) {
  const [teks, setTeks] = useState(value);
  useEffect(() => setTeks(value), [value]);
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-fg">
        {title}
      </label>
      <p className="text-xs text-muted">{hint}</p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="color"
          aria-label={`${title}: pilih warna`}
          value={value}
          onChange={(e) => onChange(e.target.value.toLowerCase())}
          className="h-10 w-12 cursor-pointer rounded border border-line bg-transparent p-0.5"
        />
        <input
          id={id}
          value={teks}
          maxLength={7}
          spellCheck={false}
          onChange={(e) => {
            const v = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`;
            setTeks(v);
            const ok = normalizeHex(v);
            if (ok) onChange(ok);
          }}
          onBlur={() => setTeks(value)}
          className={`${input} !w-28 font-mono uppercase`}
          aria-describedby={`${id}-hint`}
        />
        {value !== def && (
          <button type="button" onClick={() => onChange(def)} className="text-xs text-gold underline">
            Bawaan
          </button>
        )}
      </div>
      <span id={`${id}-hint`} className="sr-only">
        Kode warna format #rrggbb
      </span>
    </div>
  );
}

// Pratinjau kecil halaman tamu memakai dua warna yang sedang dipilih.
function Preview({ dark, gold }) {
  const vars = themeVars(dark, gold) ?? {};
  return (
    <div
      className="space-y-3 rounded-xl border border-line p-4 text-center font-heritage text-cream"
      style={{
        ...vars,
        background: "radial-gradient(ellipse at 50% 0%, var(--ink-glow, #2f2f34) 0%, transparent 65%), var(--ink)",
      }}
      aria-label="Pratinjau halaman tamu"
      role="img"
    >
      <p className="text-xs opacity-80">Pratinjau halaman tamu</p>
      <h3 className="text-lg font-bold tracking-tight">LET&apos;S CELEBRATE LOVE</h3>
      <div
        className="mx-auto flex h-24 w-20 items-center justify-center rounded-md border-2 border-gold text-[10px]"
        style={{ boxShadow: "0 0 14px color-mix(in srgb, var(--gold) 50%, transparent)", background: "var(--surface)" }}
      >
        Foto
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="inline-flex rounded-full bg-gold px-4 py-1.5 font-sans text-xs font-bold text-ink">Mulai</span>
        <span className="inline-flex rounded-full border border-gold/70 px-4 py-1.5 font-sans text-xs font-bold text-gold">
          Kembali
        </span>
      </div>
      <p className="font-sans text-[11px] text-muted">Teks keterangan abu-abu tetap sama.</p>
    </div>
  );
}

// saved = { dark, gold } dari database (null = bawaan).
// Hanya dua warna yang bisa diganti: "hitam" (semua yang gelap) dan "gold" (semua yang emas).
export default function ThemeEditor({ eventId, saved }) {
  const router = useRouter();
  const awal = { dark: normalizeHex(saved.dark) ?? DEFAULT_DARK, gold: normalizeHex(saved.gold) ?? DEFAULT_GOLD };
  const [dark, setDark] = useState(awal.dark);
  const [gold, setGold] = useState(awal.gold);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(t);
  }, [notice]);

  const rasio = contrast(dark, gold);
  const berubah = dark !== awal.dark || gold !== awal.gold;
  const bawaan = dark === DEFAULT_DARK && gold === DEFAULT_GOLD;

  async function simpan(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme_dark: dark === DEFAULT_DARK ? null : dark,
          theme_gold: gold === DEFAULT_GOLD ? null : gold,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) return router.push("/login");
      if (!res.ok) return setError(data.error || "Gagal menyimpan warna.");
      setNotice("Warna disimpan. Halaman tamu langsung memakai warna ini.");
      router.refresh();
    } catch {
      setError("Tidak bisa terhubung ke server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={simpan} className="space-y-4">
      <p className="text-sm text-muted">
        Ganti dua warna halaman tamu saja: <strong className="text-fg">hitam</strong> (semua bagian yang gelap) dan{" "}
        <strong className="text-fg">gold</strong> (semua bagian yang emas). Warna lain di halaman tamu mengikuti dua warna ini.
      </p>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Pilihan warna cepat">
        {THEME_PRESETS.map((p) => {
          const aktif = p.dark === dark && p.gold === gold;
          return (
            <button
              key={p.name}
              type="button"
              aria-pressed={aktif}
              onClick={() => {
                setDark(p.dark);
                setGold(p.gold);
              }}
              className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
                aktif ? "border-gold bg-gold/15 text-gold" : "border-line text-muted hover:border-gold/60"
              }`}
            >
              <span aria-hidden="true" className="flex h-4 w-8 overflow-hidden rounded-full border border-white/20">
                <span className="w-1/2" style={{ background: p.dark }} />
                <span className="w-1/2" style={{ background: p.gold }} />
              </span>
              {p.name}
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-4">
          <ColorRow
            id="th-dark"
            title="Warna hitam"
            hint="Latar halaman, kartu, garis tepi."
            value={dark}
            def={DEFAULT_DARK}
            onChange={setDark}
          />
          <ColorRow
            id="th-gold"
            title="Warna gold"
            hint="Tombol, tulisan, garis aksen, cahaya di sekeliling foto."
            value={gold}
            def={DEFAULT_GOLD}
            onChange={setGold}
          />
          {rasio < 3 && (
            <p role="alert" className="rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-sm text-gold-soft">
              Kedua warna ini terlalu mirip (kontras {rasio.toFixed(1)}:1), jadi tulisan dan tombol akan sulit dibaca. Pilih
              warna yang lebih berbeda terang-gelapnya.
            </p>
          )}
        </div>
        <Preview dark={dark} gold={gold} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy || !berubah} className={btnGold}>
          {busy ? "Menyimpan..." : "Simpan warna"}
        </button>
        {!bawaan && (
          <button
            type="button"
            onClick={() => {
              setDark(DEFAULT_DARK);
              setGold(DEFAULT_GOLD);
            }}
            className={btnOutline}
          >
            Kembalikan ke bawaan
          </button>
        )}
      </div>
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
    </form>
  );
}
