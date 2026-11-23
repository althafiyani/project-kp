import { query } from "@/lib/db";
import { requireUser, isUuid, jsonError } from "@/lib/api";
import { eventScope } from "@/lib/access";
import { readStoredFile } from "@/lib/storage";
import { createZip } from "@/lib/zip";

// Unduh foto + voice note sebuah event dalam satu file ZIP.
//   GET  : semua foto event.
//   POST : hanya foto yang dipilih (form field "ids" = daftar id dipisah koma).
// Admin: event mana saja. Mempelai: hanya event miliknya.
export const dynamic = "force-dynamic";

const URL_PREFIX = "/api/files/";
const MAX_IDS = 1000;

function relPath(url) {
  return url && url.startsWith(URL_PREFIX) ? url.slice(URL_PREFIX.length) : null;
}

// selectedIds = null -> semua foto; array -> hanya id itu.
async function buildZip(eventId, selectedIds) {
  const { session, error } = await requireUser();
  if (error) return error;

  if (!isUuid(eventId)) return jsonError("Event tidak ditemukan.", 404);

  try {
    const sc = eventScope(session, "e", 2);
    const ev = await query(
      `SELECT e.id, e.name, e.slug FROM events e WHERE e.id = $1 AND ${sc.clause}`,
      [eventId, ...sc.params],
    );
    const event = ev.rows[0];
    if (!event) return jsonError("Event tidak ditemukan.", 404);

    // Foto hanya diambil dari event ini, jadi id foto event lain diabaikan.
    const subs = selectedIds
      ? await query(
          `SELECT id, photo_url, audio_url, created_at FROM submissions
            WHERE event_id = $1 AND id = ANY($2::uuid[]) ORDER BY created_at ASC`,
          [event.id, selectedIds],
        )
      : await query(
          `SELECT id, photo_url, audio_url, created_at FROM submissions
            WHERE event_id = $1 ORDER BY created_at ASC`,
          [event.id],
        );
    if (selectedIds && subs.rows.length === 0) return jsonError("Foto yang dipilih tidak ditemukan.", 404);

    const entries = [];
    let foto = 0;
    let suara = 0;
    let gagal = 0;
    for (const [i, s] of subs.rows.entries()) {
      // Nomor urut sama untuk foto dan suara milik tamu yang sama.
      const no = String(i + 1).padStart(3, "0");
      const kode = String(s.id).slice(0, 8);

      const fotoRel = relPath(s.photo_url);
      const f = fotoRel ? await readStoredFile(fotoRel) : null;
      if (f) {
        entries.push({ name: `foto/${no}-${kode}.${fotoRel.split(".").pop()}`, data: f.data });
        foto++;
      } else {
        gagal++;
      }

      if (s.audio_url) {
        const audioRel = relPath(s.audio_url);
        const a = audioRel ? await readStoredFile(audioRel) : null;
        if (a) {
          entries.push({
            name: `voice-note/${no}-${kode}.${audioRel.split(".").pop()}`,
            data: a.data,
          });
          suara++;
        } else {
          gagal++;
        }
      }
    }

    const info = [
      `Event       : ${event.name}`,
      `Link        : /event/${event.slug}`,
      `Diunduh     : ${new Date().toISOString()}`,
      selectedIds ? `Isi         : ${subs.rows.length} foto yang dipilih` : "Isi         : semua foto",
      `Foto        : ${foto}`,
      `Voice note  : ${suara}`,
      gagal ? `File hilang : ${gagal} (tidak ditemukan di penyimpanan)` : null,
    ]
      .filter(Boolean)
      .join("\n");
    entries.push({ name: "info.txt", data: Buffer.from(info + "\n", "utf8") });

    const zip = createZip(entries);
    const nama = selectedIds ? `photobooth-${event.slug}-terpilih.zip` : `photobooth-${event.slug}.zip`;
    return new Response(zip, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${nama}"`,
        "Content-Length": String(zip.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[export] error:", err);
    return jsonError("Gagal membuat file ZIP.", 500);
  }
}

export async function GET(_request, { params }) {
  const { id } = await params;
  return buildZip(id, null);
}

export async function POST(request, { params }) {
  const { id } = await params;
  let raw = "";
  try {
    const form = await request.formData();
    raw = String(form.get("ids") ?? "");
  } catch {
    return jsonError("Permintaan tidak valid.", 400);
  }
  const ids = [...new Set(raw.split(",").map((x) => x.trim()).filter(isUuid))].slice(0, MAX_IDS);
  if (ids.length === 0) return jsonError("Pilih minimal satu foto untuk di-export.", 400);
  return buildZip(id, ids);
}
