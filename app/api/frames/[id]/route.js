import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin, isUuid, jsonError } from "@/lib/api";
import { deleteFile } from "@/lib/storage";

export async function DELETE(_request, { params }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  if (!isUuid(id)) return jsonError("Frame tidak ditemukan.", 404);

  try {
    const { rows } = await query("DELETE FROM frames WHERE id = $1 RETURNING image_url", [id]);
    if (rows.length === 0) return jsonError("Frame tidak ditemukan.", 404);
    await deleteFile(rows[0].image_url);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[frames DELETE] error:", err);
    return jsonError("Gagal menghapus frame.", 500);
  }
}
