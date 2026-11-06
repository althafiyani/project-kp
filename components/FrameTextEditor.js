"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { COLOR_PRESETS, DEFAULT_TOP, KINDS, TEXT_DARK, TEXT_LIGHT, normalizeStyle } from "@/lib/frameTextConfig";
import { useFrame } from "@/lib/useFrame";
import { useTextLayout } from "@/lib/useTextLayout";
import { btnGold, btnOutline, okBox, errBox, input, label } from "@/lib/ui";
import FrameArt from "@/components/guest/FrameArt";
import FontPicker from "@/components/FontPicker";
import { sameFont } from "@/lib/fonts";

const SAMPLE_NAME = "Alia & Sandra";

// Dua jenis ukuran frame yang punya area tulisan (contoh frame untuk pratinjau).
const PREVIEWS = [
  { src: "/frames/frame1.png", kind: "narrow" },
  { src: "/frames/frame15.png", kind: "wide" },
];

// Pratinjau bagian bawah frame (area tulisan + sedikit area di atasnya).
// Garis putus-putus emas = batas area tulisan; teks tidak pernah melewatinya.
function AreaPreview({ src, kind, text }) {
  const info = useFrame(src);
  const layout = useTextLayout(info, text);
  const w = info?.width ?? 450;
  const h = info?.height ?? 1350;
  const cropH = info?.textArea ? info.textArea.h * 1.7 : h * 0.2;
  return (
    <figure className="space-y-1">
      <figcaption className="text-xs text-muted">
        {KINDS[kind].label} · {KINDS[kind].areaLabel}
        {layout && <span> · latar terdeteksi {layout.dark ? "gelap" : "cerah"}</span>}
        {layout?.fitted && <span className="text-gold-soft"> · nama otomatis diperkecil agar muat</span>}
      </figcaption>
      <div
        className="relative w-full overflow-hidden rounded-md border border-line bg-ink"
        style={{ aspectRatio: `${w} / ${cropH}` }}
      >
        <div className="absolute bottom-0 left-0 w-full">
          <FrameArt src={src} alt="" glow="transparent" radius={0} className="w-full" text={text} showArea />
        </div>
      </div>
    </figure>
  );
}

function Slider({ id, name, short, value, min, max, onChange }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <label htmlFor={id} className="text-muted" aria-label={name}>
          {short ?? name}
        </label>
        <span className="rounded bg-surface-2 px-2 py-0.5 text-xs text-fg">{value}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-gold"
      />
    </div>
  );
}

// Pilihan warna: kotak warna cepat + pemilih warna bebas + tombol kembali ke bawaan.
function ColorPicker({ id, name, hint, value, presets, def, background, onChange }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span id={id} className="text-muted">
          {name}
        </span>
        <span
          className="rounded px-2 py-0.5 text-sm font-medium"
          style={{ color: value, background, border: "1px solid rgba(128,128,128,0.4)" }}
          aria-hidden="true"
        >
          Aa Contoh
        </span>
      </div>
      <p className="text-xs text-muted">{hint}</p>
      <div role="radiogroup" aria-labelledby={id} className="flex flex-wrap items-center gap-2">
        {presets.map((p) => {
          const on = p.value === value;
          return (
            <button
              key={p.value}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={p.name}
              title={p.name}
              onClick={() => onChange(p.value)}
              className={`h-8 w-8 rounded-full border-2 transition ${on ? "border-gold ring-2 ring-gold/40" : "border-line hover:border-gold/60"}`}
              style={{ background: p.value }}
            />
          );
        })}
        <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-2 py-1 text-xs text-muted hover:border-gold/60">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label={`${name}: warna bebas`}
            className="h-6 w-6 cursor-pointer border-0 bg-transparent p-0"
          />
          Bebas
        </label>
        {value !== def && (
          <button type="button" onClick={() => onChange(def)} className="text-xs text-gold underline">
            Bawaan
          </button>
        )}
      </div>
    </div>
  );
}

// saved = { top, name, style } dari database (boleh null/kosong).
// Kiri: isian. Kanan: pratinjau (di HP: isian di atas, pratinjau di bawah).
const NO_FONTS = [];

export default function FrameTextEditor({ eventId, saved, fonts = NO_FONTS }) {
  const router = useRouter();
  const awal = { top: saved.top ?? "", name: saved.name ?? "", style: normalizeStyle(saved.style) };
  const [top, setTop] = useState(awal.top);
  const [name, setName] = useState(awal.name);
  const [style, setStyle] = useState(awal.style);
  const [customFonts, setCustomFonts] = useState(fonts);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => setCustomFonts(fonts), [fonts]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(t);
  }, [notice]);

  const setNum = (kind, key, v) => setStyle((s) => ({ ...s, [kind]: { ...s[kind], [key]: v } }));

  const kosong = !name.trim();
  // Pratinjau memakai nama contoh kalau isiannya masih kosong.
  const text = { top: top.trim() || DEFAULT_TOP, name: kosong ? SAMPLE_NAME : name.trim(), ...style };
  const berubah =
    top.trim() !== awal.top.trim() ||
    name.trim() !== awal.name.trim() ||
    JSON.stringify({ ...style, fontTop: null, fontName: null }) !==
      JSON.stringify({ ...awal.style, fontTop: null, fontName: null }) ||
    !sameFont(style.fontTop, awal.style.fontTop) ||
    !sameFont(style.fontName, awal.style.fontName);

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
          frame_text_top: top.trim() || null,
          frame_text_name: name.trim() || null,
          frame_text_style: {
            narrow: style.narrow,
            wide: style.wide,
            onDark: style.onDark === TEXT_LIGHT ? null : style.onDark,
            onLight: style.onLight === TEXT_DARK ? null : style.onLight,
            fontTop: style.fontTop,
            fontName: style.fontName,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) return router.push("/login");
      if (!res.ok) return setError(data.error || "Gagal menyimpan teks frame.");
      setNotice(
        name.trim()
          ? "Teks frame disimpan. Semua frame di pilihan tamu sekarang bertuliskan nama ini."
          : "Nama dikosongkan, frame tampil tanpa teks.",
      );
      router.refresh();
    } catch {
      setError("Tidak bisa terhubung ke server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={simpan} className="grid gap-5 md:grid-cols-2">
      {/* Kiri: isian */}
      <div className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="ft-top" className={label}>
            Teks atas
          </label>
          <input
            id="ft-top"
            value={top}
            onChange={(e) => setTop(e.target.value)}
            maxLength={40}
            placeholder={DEFAULT_TOP}
            className={input}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="ft-name" className={label}>
            Nama pengantin
          </label>
          <input
            id="ft-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder={SAMPLE_NAME}
            className={input}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <FontPicker
            id="ft-font-top"
            label="Font teks atas"
            kind="top"
            value={style.fontTop}
            onChange={(v) => setStyle((s) => ({ ...s, fontTop: v }))}
            eventId={eventId}
            customFonts={customFonts}
            onCustomChange={setCustomFonts}
          />
          <FontPicker
            id="ft-font-name"
            label="Font nama"
            kind="name"
            value={style.fontName}
            onChange={(v) => setStyle((s) => ({ ...s, fontName: v }))}
            eventId={eventId}
            customFonts={customFonts}
            onCustomChange={setCustomFonts}
          />
        </div>

        {/* Slider ukuran: dua jenis frame bersebelahan (kiri-kanan) supaya tidak memanjang ke bawah. */}
        <div className="grid grid-cols-2 gap-3">
        {["narrow", "wide"].map((k) => (
          <fieldset key={k} className="min-w-0 space-y-2 rounded-lg border border-line p-3">
            <legend className="px-1 text-sm font-medium text-gold">{KINDS[k].label}</legend>
            <Slider id={`ft-${k}-name`} name={`Ukuran font nama (${KINDS[k].label})`} short="Ukuran font nama" value={style[k].name} min={KINDS[k].name.min} max={KINDS[k].name.max} onChange={(v) => setNum(k, "name", v)} />
            <Slider id={`ft-${k}-top`} name={`Ukuran teks atas (${KINDS[k].label})`} short="Ukuran teks atas" value={style[k].top} min={KINDS[k].top.min} max={KINDS[k].top.max} onChange={(v) => setNum(k, "top", v)} />
            <Slider id={`ft-${k}-gap`} name={`Jarak antar baris (${KINDS[k].label})`} short="Jarak antar baris" value={style[k].gap} min={KINDS[k].gap.min} max={KINDS[k].gap.max} onChange={(v) => setNum(k, "gap", v)} />
          </fieldset>
        ))}
        </div>

        <fieldset className="space-y-4 rounded-lg border border-line p-3">
          <legend className="px-1 text-sm font-medium text-gold">Warna teks</legend>
          <ColorPicker
            id="ft-color-dark"
            name="Warna di frame gelap"
            hint="Dipakai otomatis kalau latar area tulisan gelap."
            value={style.onDark}
            presets={COLOR_PRESETS.dark}
            def={TEXT_LIGHT}
            background="#1f1410"
            onChange={(v) => setStyle((s) => ({ ...s, onDark: v }))}
          />
          <ColorPicker
            id="ft-color-light"
            name="Warna di frame cerah"
            hint="Dipakai otomatis kalau latar area tulisan cerah."
            value={style.onLight}
            presets={COLOR_PRESETS.light}
            def={TEXT_DARK}
            background="#f1e8d6"
            onChange={(v) => setStyle((s) => ({ ...s, onLight: v }))}
          />
          <p className="text-xs text-muted">
            Gelap atau cerahnya frame dideteksi otomatis: sistem merata-ratakan kecerahan piksel di area tulisan
            (bagian bawah frame). Di bawah 55% kecerahan = frame gelap, selebihnya = frame cerah.
          </p>
        </fieldset>

        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" disabled={busy || !berubah} className={btnGold}>
            {busy ? "Menyimpan..." : "Simpan"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setStyle(normalizeStyle(null))}
            className={btnOutline}
          >
            Kembalikan ke bawaan
          </button>
        </div>

        <p className="text-xs text-muted">
          Teks selalu berada di area tulisan bagian bawah frame dan tidak akan
          melewatinya: kalau terlalu besar atau terlalu panjang, otomatis diperkecil. Nama dikosongkan lalu disimpan =
          frame tanpa teks.
        </p>

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
      </div>

      {/* Kanan: pratinjau (tetap terlihat saat form di kiri di-scroll, di layar lebar) */}
      <div className="space-y-3 md:sticky md:top-4 md:self-start">
        <p className="text-sm text-muted">
          {kosong ? "Contoh tampilan (isi nama pengantin untuk memakai nama sendiri)" : "Pratinjau"}
        </p>
        {PREVIEWS.map((p) => (
          <AreaPreview key={p.src} src={p.src} kind={p.kind} text={text} />
        ))}
      </div>
    </form>
  );
}
