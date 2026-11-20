import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { isUuid, jsonError } from "@/lib/api";
import { readAudioUpload, MAX_AUDIO_BYTES } from "@/lib/upload";
import { saveFile, deleteFile } from "@/lib/storage";
import { sqlIsOpen } from "@/lib/eventWindow";

// Foto tamu langsung tersimpan otomatis, jadi voice note ditambahkan SESUDAH itu
// ke foto yang sama. Aturannya sengaja sempit: hanya sekali (audio masih kosong),
// hanya untuk event aktif, dan hanya dalam waktu singkat setelah foto dibuat.
// Id foto berupa UUID acak yang hanya diketahui tamu yang baru menyimpannya.
const WINDOW_MIN = 60;

export async function POST(request, { params }) {
  const { slug, id } = await params;
  if (!/^[a-z0-9-]{1,150}$/.test(slug) || !isUuid(id)) {
    return jsonError("Foto tidak ditemukan.", 404);
  }

  const panjang = Number(request.headers.get("content-length") || 0);
  if (panjang > MAX_AUDIO_BYTES + 1024 * 1024) return jsonError("Ukuran file terlalu besar.", 413);

  let audioUrl = null;
  try {
    let form;
    try {
      form = await request.formData();
    } catch {
      return jsonError("Format data tidak valid.", 400);
    }

    const au = await readAudioUpload(form, "audio");
    if (!au.ok) return jsonError(au.error, au.status);
    if (au.none) return jsonError("Voice note belum direkam.", 400);

    audioUrl = await saveFile(au.buffer, { folder: "audio", ext: au.type.ext });

    // Satu UPDATE atomik: semua syarat diperiksa sekaligus, jadi dua permintaan
    // bersamaan tidak bisa saling menimpa voice note.
    const { rows } = await query(
      `UPDATE submissions s SET audio_url = $3
         FROM events e
        WHERE s.id = $1 AND e.id = s.event_id AND e.slug = $2
          AND ${sqlIsOpen("e")}
          AND s.audio_url IS NULL
          AND s.created_at > now() - ($4 || ' minutes')::interval
        RETURNING s.id`,
      [id, slug, audioUrl, String(WINDOW_MIN)],
    );
    if (rows.length === 0) {
      await deleteFile(audioUrl);
      return jsonError("Voice note tidak bisa ditambahkan ke foto ini.", 409);
    }

    return NextResponse.json({ id: rows[0].id, audio_url: audioUrl });
  } catch (err) {
    if (audioUrl) await deleteFile(audioUrl);
    console.error("[submissions voice POST] error:", err);
    return jsonError("Gagal menyimpan voice note.", 500);
  }
}
