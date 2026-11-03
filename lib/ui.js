// Gaya bersama (tema gelap abu-abu dengan aksen emas).
// Warna dasarnya ada di app/globals.css (gold, ink, surface, line, ok, bad).

// --- Halaman tamu: tombol berbentuk pil ---
export const pillButton =
  "inline-flex items-center justify-center rounded-full bg-gold px-6 py-3 font-sans text-sm font-bold text-ink shadow-lg shadow-black/40 transition hover:bg-gold-soft active:scale-95 disabled:cursor-not-allowed disabled:opacity-50";

export const pillButtonGhost =
  "inline-flex items-center justify-center rounded-full border border-gold/70 px-6 py-3 font-sans text-sm font-bold text-gold transition hover:bg-gold/10 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50";

// --- Pesan status (dipakai di halaman tamu maupun dashboard) ---
// Sukses = hijau, error = merah.
export const okBox =
  "rounded-lg border border-ok/40 bg-ok/10 px-3 py-2 text-sm font-semibold text-ok";
export const errBox =
  "rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-sm font-semibold text-bad";
export const warnBox =
  "rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-sm text-gold-soft";

// --- Dashboard ---
export const card = "rounded-xl border border-line bg-surface p-5 shadow-lg shadow-black/30";

export const btnGold =
  "inline-flex items-center justify-center rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-ink transition hover:bg-gold-soft disabled:cursor-not-allowed disabled:opacity-60";

export const btnOutline =
  "inline-flex items-center justify-center rounded-lg border border-gold/60 px-3 py-1.5 text-sm text-gold transition hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-60";

export const btnDanger =
  "inline-flex items-center justify-center rounded-lg border border-bad/50 px-3 py-1.5 text-sm text-bad transition hover:bg-bad/10 disabled:cursor-not-allowed disabled:opacity-60";

export const input =
  "w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-fg placeholder:text-muted focus:border-gold focus:outline-none";

export const label = "block text-sm text-muted";
