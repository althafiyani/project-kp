import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin, isUuid, jsonError } from "@/lib/api";
import { deleteFile } from "@/lib/storage";

export async function DELETE(_request, { params }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  if (!isUuid(id)) return jsonError("Foto tidak ditemukan.", 404);

  try {
    const { rows } = await query(
      "DELETE FROM submissions WHERE id = $1 RETURNING photo_url, audio_url",
      [id],
    );
    if (rows.length === 0) return jsonError("Foto tidak ditemukan.", 404);
    await deleteFile(rows[0].photo_url);
    if (rows[0].audio_url) await deleteFile(rows[0].audio_url);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[submissions DELETE] error:", err);
    return jsonError("Gagal menghapus foto.", 500);
  }
}
