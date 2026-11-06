import { card } from "@/lib/ui";

// Bagian halaman yang bisa dibuka-tutup dan tertutup secara bawaan, supaya halaman tidak
// langsung panjang. Memakai <details>, jadi tidak butuh JavaScript.
export default function Section({ title, children, defaultOpen = false }) {
  return (
    <details className={`group ${card}`} open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-gold [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <span aria-hidden="true" className="text-xs text-muted transition group-open:rotate-180">
          ▼
        </span>
      </summary>
      <div className="mt-4 space-y-4">{children}</div>
    </details>
  );
}
