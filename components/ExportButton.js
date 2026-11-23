import { btnGold } from "@/lib/ui";

// Mengunduh semua foto + voice note event sebagai satu file ZIP.
// Pakai <a download> biasa: browser yang mengurus unduhannya (file bisa besar).
export default function ExportButton({ eventId, className = "" }) {
  return (
    <a href={`/api/events/${eventId}/export`} download className={`${btnGold} ${className}`}>
      Export semua (ZIP)
    </a>
  );
}
