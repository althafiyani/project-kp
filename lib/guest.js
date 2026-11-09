import { query } from "@/lib/db";
import { eventAccess } from "@/lib/eventWindow";

// Data event untuk halaman tamu. null jika slug tidak sah atau tidak ada.
// status hasilnya "active"/"inactive" menurut mode dan tanggal acara (lihat lib/eventWindow.js).
export async function getGuestEvent(slug) {
  if (!/^[a-z0-9-]{1,150}$/.test(slug)) return null;
  const { rows } = await query(
    `SELECT id, name, slug, to_char(event_date, 'YYYY-MM-DD') AS event_date,
            status, timezone, opening_design_url,
            frame_text_top, frame_text_name, frame_text_style
       FROM events WHERE slug = $1`,
    [slug],
  );
  const event = rows[0];
  if (!event) return null;
  // Halaman tamu memeriksa event.status === "active". Di sini status mentah (auto/active)
  // diubah jadi hasil akhirnya: "active" kalau sedang terbuka, selain itu "inactive". `closed` ("belum" | "selesai")
  // dipakai untuk teks pemberitahuan; null kalau ditutup manual atau terbuka.
  const a = eventAccess(event);
  return { ...event, status: a.open ? "active" : "inactive", closed: a.reason === "selesai" ? "selesai" : a.reason === "belum" || a.reason === "tanpa-tanggal" ? "belum" : null };
}
