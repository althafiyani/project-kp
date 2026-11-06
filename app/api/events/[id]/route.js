import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin, requireEventEditor, isUuid, jsonError } from "@/lib/api";
import { updateEventSchema, firstError } from "@/lib/events";
import { deleteFile } from "@/lib/storage";

// Kolom yang boleh diubah (daftar putih, bukan dari input pengguna).
const KOLOM = ["name", "slug", "event_date", "status", "timezone", "mempelai_id",
  "frame_text_top", "frame_text_name", "frame_text_style"];

// Kolom yang boleh diubah mempelai pemilik event.
const KOLOM_MEMPELAI = ["frame_text_top", "frame_text_name", "frame_text_style"];

// Admin boleh mengubah semua kolom; mempelai pemilik event hanya KOLOM_MEMPELAI. Hapus: hanya admin.
export async function PATCH(request, { params }) {
  const { id } = await params;
  if (!isUuid(id)) return jsonError("Event tidak ditemukan.", 404);
  const { error, admin } = await requireEventEditor(id);
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("Format data tidak valid.", 400);
  }

  const parsed = updateEventSchema.safeParse(body);
  if (!parsed.success) return jsonError(firstError(parsed.error), 400);

  // Mempelai hanya boleh mengubah teks frame; sisanya khusus admin.
  if (!admin && Object.keys(parsed.data).some((k) => !KOLOM_MEMPELAI.includes(k))) {
    return jsonError("Hanya admin yang boleh mengubah bagian ini.", 403);
  }

  try {
    // Akun yang dihubungkan harus benar-benar akun mempelai.
    const mid = parsed.data.mempelai_id;
    if (mid) {
      const cek = await query("SELECT 1 FROM users WHERE id = $1 AND role = 'mempelai'", [mid]);
      if (cek.rows.length === 0) return jsonError("Akun mempelai tidak ditemukan.", 400);
    }

    const sets = [];
    const values = [];
    for (const kolom of KOLOM) {
      if (kolom in parsed.data) {
        const v = parsed.data[kolom];
        // frame_text_style disimpan sebagai JSONB.
        values.push(kolom === "frame_text_style" ? JSON.stringify(v) : v);
        sets.push(`${kolom} = $${values.length}${kolom === "frame_text_style" ? "::jsonb" : ""}`);
      }
    }
    values.push(id);

    const { rows } = await query(
      `UPDATE events SET ${sets.join(", ")}
        WHERE id = $${values.length}
        RETURNING id, name, slug, to_char(event_date, 'YYYY-MM-DD') AS event_date, status, mempelai_id`,
      values,
    );
    if (rows.length === 0) return jsonError("Event tidak ditemukan.", 404);
    return NextResponse.json({ event: rows[0] });
  } catch (err) {
    // 23505 = pelanggaran UNIQUE: link itu sudah dipakai event lain.
    if (err.code === "23505") {
      return jsonError("Link itu sudah dipakai event lain. Coba yang lain.", 409);
    }
    console.error("[events PATCH] error:", err);
    return jsonError("Gagal mengubah event.", 500);
  }
}

export async function DELETE(_request, { params }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  if (!isUuid(id)) return jsonError("Event tidak ditemukan.", 404);

  try {
    // Catat dulu semua file milik event ini, supaya bisa dibersihkan dari disk.
    const info = await query(
      `SELECT e.opening_design_url AS opening,
              COALESCE((SELECT array_agg(image_url) FROM frames WHERE event_id = e.id), '{}') AS frames,
              COALESCE((SELECT array_agg(url) FROM event_fonts WHERE event_id = e.id), '{}') AS fonts,
              COALESCE((SELECT array_agg(photo_url) FROM submissions WHERE event_id = e.id), '{}') AS photos,
              COALESCE((SELECT array_agg(audio_url) FROM submissions
                          WHERE event_id = e.id AND audio_url IS NOT NULL), '{}') AS audios
         FROM events e
        WHERE e.id = $1`,
      [id],
    );
    if (info.rows.length === 0) return jsonError("Event tidak ditemukan.", 404);
    const f = info.rows[0];

    // Frame dan foto ikut terhapus dari database (ON DELETE CASCADE).
    const { rowCount } = await query("DELETE FROM events WHERE id = $1", [id]);
    if (rowCount === 0) return jsonError("Event tidak ditemukan.", 404);

    await Promise.all(
      [f.opening, ...f.frames, ...f.fonts, ...f.photos, ...f.audios].map((u) => deleteFile(u)),
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[events DELETE] error:", err);
    return jsonError("Gagal menghapus event.", 500);
  }
}
