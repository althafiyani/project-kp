"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { btnGold, btnOutline, btnDanger, input, label, okBox, errBox } from "@/lib/ui";

// Khusus admin: mengatur akun mempelai yang boleh melihat event ini.
//   mempelai  = akun yang sekarang terhubung ({ id, name, username } atau null)
//   daftar    = semua akun mempelai yang sudah ada ([{ id, name, username }])
export default function MempelaiAccess({ eventId, mempelai, daftar }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pilih, setPilih] = useState("");
  const [baru, setBaru] = useState(false);
  const [resetPw, setResetPw] = useState(false);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(t);
  }, [notice]);

  // Satu pintu untuk semua panggilan API: menangani 401, error, dan pesan sukses.
  async function kirim(url, method, body, sukses) {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
      setNotice(sukses);
      router.refresh();
      return true;
    } catch {
      setError("Tidak bisa terhubung ke server.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const hubungkan = () =>
    pilih && kirim(`/api/events/${eventId}`, "PATCH", { mempelai_id: pilih }, "Akses mempelai berhasil diperbarui.");

  async function lepas() {
    if (!confirm("Lepas akses mempelai dari event ini? Akunnya tetap ada, tapi tidak bisa membuka event ini lagi.")) return;
    await kirim(`/api/events/${eventId}`, "PATCH", { mempelai_id: null }, "Akses mempelai berhasil dilepas.");
  }

  async function buat(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const formEl = e.currentTarget;
    const ok = await kirim(
      "/api/mempelai",
      "POST",
      {
        username: f.get("username"),
        password: f.get("password"),
        event_id: eventId,
      },
      "Akun mempelai berhasil dibuat dan dihubungkan ke event ini.",
    );
    if (ok) {
      formEl.reset();
      setBaru(false);
    }
  }

  async function ganti(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const formEl = e.currentTarget;
    const ok = await kirim(
      `/api/mempelai/${mempelai.id}`,
      "PATCH",
      { password: f.get("password") },
      "Password mempelai berhasil diganti.",
    );
    if (ok) {
      formEl.reset();
      setResetPw(false);
    }
  }

  return (
    <div className="space-y-4">
      {notice && (
        <p role="status" className={okBox}>
          {notice}
        </p>
      )}

      {mempelai ? (
        <div className="space-y-3">
          <p className="text-sm text-fg">
            Username mempelai: <strong>{mempelai.username}</strong>
          </p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setResetPw((v) => !v)} disabled={busy} className={btnOutline}>
              Ganti password
            </button>
            <button onClick={lepas} disabled={busy} className={btnDanger}>
              Lepas akses
            </button>
          </div>
          {resetPw && (
            <form onSubmit={ganti} className="flex flex-wrap items-end gap-2">
              <label className={`${label} flex-1`}>
                Password baru (min. 6 karakter)
                <input name="password" type="text" required minLength={6} maxLength={100} className={`mt-1 ${input}`} />
              </label>
              <button type="submit" disabled={busy} className={btnGold}>
                Simpan
              </button>
            </form>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted">
          Belum ada akun mempelai. Mempelai yang punya akun bisa login dan melihat event ini saja.
        </p>
      )}

      {!mempelai && (
        <div className="space-y-3">
          {daftar.length > 0 && (
            <div className="flex flex-wrap items-end gap-2">
              <label className={`${label} flex-1`}>
                Hubungkan ke akun yang sudah ada
                <select value={pilih} onChange={(e) => setPilih(e.target.value)} className={`mt-1 ${input}`}>
                  <option value="">Pilih akun mempelai...</option>
                  {daftar.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.username} ({m.name})
                    </option>
                  ))}
                </select>
              </label>
              <button onClick={hubungkan} disabled={busy || !pilih} className={btnGold}>
                Hubungkan
              </button>
            </div>
          )}

          <button onClick={() => setBaru((v) => !v)} disabled={busy} className={btnOutline}>
            {baru ? "Batal" : "Buat akun mempelai baru"}
          </button>

          {baru && (
            <form onSubmit={buat} className="grid gap-3 sm:grid-cols-2">
              <label className={label}>
                Username
                <input name="username" required minLength={3} maxLength={30} autoCapitalize="none" autoComplete="off" spellCheck={false} placeholder="mis. mempelai1" className={`mt-1 ${input}`} />
              </label>
              <label className={label}>
                Password (min. 6 karakter)
                <input name="password" type="text" required minLength={6} maxLength={100} autoComplete="off" className={`mt-1 ${input}`} />
              </label>
              <div className="sm:col-span-2">
                <button type="submit" disabled={busy} className={btnGold}>
                  {busy ? "Membuat..." : "Buat dan hubungkan"}
                </button>
              </div>
            </form>
          )}
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
