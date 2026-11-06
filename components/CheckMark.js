// Kotak ceklis: menyala (emas + tanda centang) kalau checked, kosong kalau tidak.
// Hanya tampilan; klik ditangani oleh tombol pembungkusnya.
export default function CheckMark({ checked, className = "" }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition ${
        checked ? "border-gold bg-gold text-ink" : "border-muted/70 bg-ink/70 text-transparent"
      } ${className}`}
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 10.5l4 4 8-9" />
      </svg>
    </span>
  );
}
