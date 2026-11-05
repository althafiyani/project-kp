"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatTanggal } from "@/lib/format";
import { btnGold, btnOutline, input, label, okBox, errBox } from "@/lib/ui";
import { TIMEZONES } from "@/lib/eventWindow";

// Form nama, tanggal, dan link (slug) event yang langsung tampil (tanpa tombol Edit), dengan
// tombol Perbarui dan Batal. Disimpan lewat PATCH /api/events/[id].
// Kalau link diganti, QR Code di halaman ini otomatis ikut berubah karena dibuat
// ulang dari slug terbaru. Link/QR lama yang sudah dibagikan atau dicetak berhenti berfungsi.

// ["nama", "tanggal", "link"] -> "nama, tanggal, dan link"
function daftar(items) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} dan ${items[items.length - 1]}`;
}

export default function EventInfoEditor({ id, name, slug, eventDate, timezone = "Asia/Jakarta", access }) {
  const router = useRouter();
  const [nameValue, setNameValue] = useState(name);
  const [slugValue, setSlugValue] = useState(slug);
  const [dateValue, setDateValue] = useState(eventDate || "");
  const [tzValue, setTzValue] = useState(timezone);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Setelah data disimpan dan halaman dimuat ulang, isian ikut nilai terbaru dari database.
  useEffect(() => {
    setNameValue(name);
    setSlugValue(slug);
    setDateValue(eventDate || "");
    setTzValue(timezone);
  }, [name, slug, eventDate, timezone]);

  // Pesan "berhasil diperbarui" hilang sendiri setelah beberapa detik.
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(t);
  }, [notice]);

  // Batal = isian dikembalikan ke nilai yang tersimpan.
  function cancel() {
    setNameValue(name);
    setSlugValue(slug);
    setDateValue(eventDate || "");
    setTzValue(timezone);
    setError("");
    setNotice("");
  }

  // Spasi otomatis jadi "-", huruf besar jadi kecil, karakter lain dibuang.
  function handleSlugChange(e) {
    const cleaned = e.target.value
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-{2,}/g, "-")
      .slice(0, 60);
    setSlugValue(cleaned);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const trimmed = nameValue.trim();
    if (trimmed.length < 3) {
      setError("Nama event minimal 3 karakter.");
      return;
    }

    const newSlug = slugValue.replace(/^-+|-+$/g, "");
    const nameChanged = trimmed !== name;
    const dateChanged = dateValue !== (eventDate || "");
    const slugChanged = newSlug !== slug;
    const tzChanged = tzValue !== timezone;

    if (!nameChanged && !dateChanged && !slugChanged && !tzChanged) {
      setNotice("Tidak ada yang diubah.");
      return;
    }

    if (slugChanged) {
      if (newSlug.length < 4) {
        setError("Link minimal 4 karakter.");
        return;
      }
      if (
        !confirm(
          "Mengganti link akan mematikan link dan QR Code lama. Tamu yang memakai link/QR lama tidak akan bisa membuka event ini lagi.\n\nLanjutkan?",
        )
      ) {
        return;
      }
    }

    // Hanya kirim bagian yang benar-benar berubah.
    const payload = {};
    if (nameChanged) payload.name = trimmed;
    // Tanggal kosong ("") = hapus tanggal acara.
    if (dateChanged) payload.event_date = dateValue;
    if (slugChanged) payload.slug = newSlug;
    if (tzChanged) payload.timezone = tzValue;

    setSaving(true);
    try {
      const res = await fetch(`/api/events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) {
        setError(data.error || "Gagal menyimpan perubahan.");
        return;
      }

      const berubah = [];
      if (nameChanged) berubah.push("nama");
      if (dateChanged) berubah.push("tanggal");
      if (slugChanged) berubah.push("link");
      if (tzChanged) berubah.push("zona waktu");
      const kalimat = `${daftar(berubah)} acara berhasil diperbarui.`;
      setNotice(
        (kalimat.charAt(0).toUpperCase() + kalimat.slice(1)) +
          (slugChanged ? " QR Code ikut diperbarui." : ""),
      );
      router.refresh();
    } catch {
      setError("Tidak bisa terhubung ke server.");
    } finally {
      setSaving(false);
    }
  }

  // Tombol hanya muncul kalau ada isian yang berbeda dari data tersimpan.
  const dirty =
    nameValue.trim() !== name ||
    dateValue !== (eventDate || "") ||
    slugValue.replace(/^-+|-+$/g, "") !== slug ||
    tzValue !== timezone;

  const noticeBox = notice && (
    <p role="status" className={okBox}>
      {notice}
    </p>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <h1 className="text-2xl font-semibold text-gold">{name}</h1>
        <p className="mt-1 text-sm text-muted">
          {formatTanggal(eventDate)} · {access.label} ({access.detail})
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_180px_120px]">
        <label className={label}>
          Nama acara
          <input
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            required
            minLength={3}
            maxLength={150}
            className={`mt-1 ${input}`}
          />
        </label>
        <label className={label}>
          Tanggal acara
          <input
            type="date"
            value={dateValue}
            onChange={(e) => setDateValue(e.target.value)}
            className={`mt-1 ${input}`}
          />
        </label>
        <label className={label}>
          Zona waktu
          <select value={tzValue} onChange={(e) => setTzValue(e.target.value)} className={`mt-1 ${input}`}>
            {TIMEZONES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className={label}>
        Link event
        <div className="mt-1 flex items-center overflow-hidden rounded-lg border border-line bg-surface-2 focus-within:border-gold">
          <span className="whitespace-nowrap bg-ink px-3 py-2 font-mono text-sm text-muted">
            /event/
          </span>
          <input
            value={slugValue}
            onChange={handleSlugChange}
            required
            minLength={4}
            maxLength={60}
            spellCheck={false}
            autoCapitalize="none"
            className="w-full bg-transparent px-3 py-2 font-mono text-sm text-fg outline-none"
          />
        </div>
        <span className="mt-1 block text-xs text-muted">
          Huruf kecil, angka, dan tanda hubung (-). QR Code otomatis ikut berubah, tapi
          link dan QR lama berhenti berfungsi. Link yang gampang ditebak berarti galeri
          fotonya juga gampang dibuka orang lain.
        </span>
      </label>

      {/* Tombol ada di bawah kolom nama, tanggal, dan link. */}
      {(dirty || saving) && (
        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" disabled={saving} className={btnGold}>
            {saving ? "Memperbarui..." : "Perbarui"}
          </button>
          <button type="button" onClick={cancel} disabled={saving} className={`${btnOutline} px-4 py-2`}>
            Batal
          </button>
        </div>
      )}

      {noticeBox}
      {error && (
        <p role="alert" className={errBox}>
          {error}
        </p>
      )}
    </form>
  );
}
