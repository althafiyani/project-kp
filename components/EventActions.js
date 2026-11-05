"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { btnOutline, btnDanger } from "@/lib/ui";

// Hanya dirender untuk admin (halaman memeriksa perannya).
export default function EventActions({ id, status, access, afterDeleteGoTo }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function call(method, body) {
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/events/${id}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.push("/login");
        return false;
      }
      if (!res.ok) {
        setError(data.error || "Terjadi kesalahan.");
        return false;
      }
      return true;
    } catch {
      setError("Tidak bisa terhubung ke server.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function setMode(next) {
    if (busy) return;
    if (await call("PATCH", { status: next })) router.refresh();
  }

  async function remove() {
    if (!confirm("Hapus event ini beserta semua foto dan voice note-nya? Tindakan ini tidak bisa dibatalkan.")) return;
    if (await call("DELETE")) {
      if (afterDeleteGoTo) router.push(afterDeleteGoTo);
      router.refresh();
    }
  }

  const manual = status === "active";
  const aktifOn = Boolean(access?.open);
  const tombol = (on) =>
    `px-3 py-1.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
      on ? "bg-gold font-semibold text-ink" : "text-gold hover:bg-gold/10"
    }`;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Akses halaman tamu" className="inline-flex overflow-hidden rounded-lg border border-gold/60">
          {/* Aktif: buka manual (mis. untuk tes). Nonaktif: kembali ke otomatis, terbuka sendiri di tanggal acara. */}
          <button
            type="button"
            aria-pressed={aktifOn}
            onClick={() => setMode("active")}
            disabled={busy || aktifOn}
            title="Buka halaman tamu sekarang (mis. untuk tes)."
            className={tombol(aktifOn)}
          >
            Aktif
          </button>
          <button
            type="button"
            aria-pressed={!aktifOn}
            onClick={() => setMode("auto")}
            disabled={busy || !manual}
            title="Tutup lagi. Di tanggal acara halaman tamu terbuka sendiri."
            className={tombol(!aktifOn)}
          >
            Nonaktif
          </button>
        </div>
        <button onClick={remove} disabled={busy} className={btnDanger}>
          Hapus
        </button>
        {error && <span className="text-sm text-bad">{error}</span>}
      </div>
      {access && (
        <p className="text-xs text-muted">
          Halaman tamu sekarang: <span className={access.open ? "text-ok" : "text-fg"}>{access.label}</span> ({access.detail}).{" "}
          {manual
            ? "Setelah tes, tekan Nonaktif: halaman tertutup lagi dan terbuka sendiri di tanggal acara."
            : "Nonaktif berarti otomatis: halaman tamu terbuka sendiri di tanggal acara, tidak perlu diaktifkan."}
        </p>
      )}
    </div>
  );
}
