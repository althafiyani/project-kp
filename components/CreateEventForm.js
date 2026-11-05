"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { card, btnGold, input, label, errBox } from "@/lib/ui";
import { TIMEZONES } from "@/lib/eventWindow";

export default function CreateEventForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const formEl = e.currentTarget;
    const form = new FormData(formEl);

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          event_date: form.get("event_date"),
          timezone: form.get("timezone"),
          username: form.get("username"),
          password: form.get("password"),
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) {
        setError(data.error || "Gagal membuat event.");
        return;
      }
      formEl.reset();
      router.push(`/dashboard/events/${data.event.id}`);
      router.refresh();
    } catch {
      setError("Tidak bisa terhubung ke server. Periksa koneksi internetmu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-3 ${card}`}>
      <h2 className="font-semibold text-gold">Tambah Event</h2>
      <div className="grid gap-3 sm:grid-cols-[1fr_180px_120px]">
        <label className={label}>
          Nama event
          <input
            name="name"
            required
            minLength={3}
            maxLength={150}
            placeholder="mis. Tiara & Rifqi"
            className={`mt-1 ${input}`}
          />
        </label>
        <label className={label}>
          Tanggal acara
          <input name="event_date" type="date" className={`mt-1 ${input}`} />
        </label>
        <label className={label}>
          Zona waktu
          <select name="timezone" defaultValue="Asia/Jakarta" className={`mt-1 ${input}`}>
            {TIMEZONES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Akun login untuk mempelai: dari username ini dashboard-nya hanya menampilkan event ini. */}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={label}>
          Username mempelai
          <input
            name="username"
            required
            minLength={3}
            maxLength={30}
            autoCapitalize="none"
            autoComplete="off"
            spellCheck={false}
            placeholder="mis. mempelai1"
            className={`mt-1 ${input}`}
          />
        </label>
        <label className={label}>
          Password (min. 6 karakter)
          <input
            name="password"
            type="text"
            required
            minLength={6}
            maxLength={100}
            autoComplete="off"
            placeholder="mis. 123456"
            className={`mt-1 ${input}`}
          />
        </label>
      </div>
      <p className="text-xs text-muted">
        Event baru berstatus Nonaktif dan terbuka sendiri di tanggal acara (sampai pukul 06.00 hari berikutnya, menurut zona waktu event). Tanggal acara perlu diisi.
      </p>
      <p className="text-xs text-muted">
        Username dan password ini dipakai mempelai untuk login. Mereka hanya bisa melihat event ini.
      </p>
      <button type="submit" disabled={loading} className={`${btnGold} px-5`}>
        {loading ? "Membuat..." : "Buat Event"}
      </button>
      {error && (
        <p role="alert" className={errBox}>
          {error}
        </p>
      )}
    </form>
  );
}
