"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { btnGold, card, input, label, errBox } from "@/lib/ui";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.get("username"),
          password: form.get("password"),
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Login gagal. Coba lagi.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Tidak bisa terhubung ke server. Periksa koneksi internetmu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={handleSubmit} className={`w-full max-w-sm space-y-4 p-8 ${card}`}>
        <div>
          <h1 className="text-xl font-semibold text-gold">Login</h1>
          <p className="text-sm text-muted">Virtual Photobooth MyCard</p>
        </div>

        <label className={label}>
          Username
          <input
            name="username"
            type="text"
            required
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            className={`mt-1 ${input}`}
          />
        </label>

        <label className={label}>
          Password
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className={`mt-1 ${input}`}
          />
        </label>

        {error && (
          <p role="alert" className={errBox}>
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className={`w-full py-2.5 ${btnGold}`}>
          {loading ? "Memproses..." : "Masuk"}
        </button>
      </form>
    </main>
  );
}
