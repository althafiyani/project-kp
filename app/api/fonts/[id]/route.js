import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireUser, isUuid, jsonError } from "@/lib/api";
import { deleteFile } from "@/lib/storage";

// Hapus font sendiri. Kalau font itu sedang dipilih untuk teks frame, pilihan dikembalikan ke bawaan.
export async function DELETE(_request, { params }) {
  const { session, error } = await requireUser();
  if (error) return error;

  const { id } = await params;
  if (!isUuid(id)) return jsonError("Font tidak ditemukan.", 404);

  try {
    // Admin boleh menghapus font mana saja; mempelai hanya font di event miliknya.
    const { rows } = await query(
      `DELETE FROM event_fonts f
        WHERE f.id = $1
          AND ($2 OR EXISTS (SELECT 1 FROM events e WHERE e.id = f.event_id AND e.mempelai_id = $3))
        RETURNING f.event_id, f.url`,
      [id, session.role === "admin", session.id],
    );
    if (rows.length === 0) return jsonError("Font tidak ditemukan.", 404);
    const ref = `c:${id}`;
    await query(
      `UPDATE events
          SET frame_text_style = CASE WHEN frame_text_style->'fontName'->>'id' = $2 THEN frame_text_style - 'fontName' ELSE frame_text_style END
        WHERE id = $1 AND frame_text_style->'fontName'->>'id' = $2`,
      [rows[0].event_id, ref],
    );
    await query(
      `UPDATE events
          SET frame_text_style = CASE WHEN frame_text_style->'fontTop'->>'id' = $2 THEN frame_text_style - 'fontTop' ELSE frame_text_style END
        WHERE id = $1 AND frame_text_style->'fontTop'->>'id' = $2`,
      [rows[0].event_id, ref],
    );
    await deleteFile(rows[0].url);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[fonts DELETE] error:", err);
    return jsonError("Gagal menghapus font.", 500);
  }
}
