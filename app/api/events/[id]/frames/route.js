import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin, isUuid, jsonError } from "@/lib/api";
import { getTemplateByKey } from "@/lib/frameTemplates";
import { readImageUpload } from "@/lib/upload";
import { saveFile, deleteFile } from "@/lib/storage";
import { AREA_MAX, AREA_MIN, FRAME_LIMITS, matchFrameSize, readPngInfo } from "@/lib/frameRules";

// Dua cara menambah frame ke event (hanya admin):
//   1) JSON { "template": "frame1" }      -> pilih dari katalog bawaan (lib/frameTemplates.js)
//   2) multipart: file (PNG), name        -> upload frame sendiri, harus sesuai ketentuan
//      ukuran di lib/frameRules.js (450x1350 atau 1080x1350, PNG dengan latar transparan).
export async function POST(request, { params }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  if (!isUuid(id)) return jsonError("Event tidak ditemukan.", 404);

  if ((request.headers.get("content-type") ?? "").includes("multipart/form-data")) {
    return uploadFrame(request, id);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("Format data tidak valid.", 400);
  }

  const template = getTemplateByKey(String(body?.template ?? ""));
  if (!template) return jsonError("Frame tidak dikenal.", 400);

  try {
    const own = await query("SELECT id FROM events WHERE id = $1", [id]);
    if (own.rows.length === 0) return jsonError("Event tidak ditemukan.", 404);

    const dup = await query("SELECT 1 FROM frames WHERE event_id = $1 AND image_url = $2", [
      id,
      template.image,
    ]);
    if (dup.rows.length > 0) return jsonError("Frame ini sudah dipakai di event ini.", 409);

    const { rows } = await query(
      "INSERT INTO frames (event_id, name, image_url) VALUES ($1, $2, $3) RETURNING id, name, image_url",
      [id, template.name, template.image],
    );
    return NextResponse.json({ frame: rows[0] }, { status: 201 });
  } catch (err) {
    console.error("[frames POST] error:", err);
    return jsonError("Gagal menambahkan frame.", 500);
  }
}

async function uploadFrame(request, eventId) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return jsonError("Format data tidak valid.", 400);
  }

  const up = await readImageUpload(form, "file", ["png"]);
  if (!up.ok) return jsonError(up.error, up.status);

  const info = readPngInfo(up.buffer);
  if (!info) return jsonError("File PNG rusak atau tidak utuh.", 400);
  if (!matchFrameSize(info.width, info.height)) {
    const L = FRAME_LIMITS;
    return jsonError(
      `Ukuran frame ${info.width} × ${info.height} px tidak sesuai. Lebar ${L.minW}-${L.maxW} px, tinggi ${L.minH}-${L.maxH} px, dan sisakan area tulisan ${AREA_MIN}-${AREA_MAX} px di bagian bawah.`,
      400,
    );
  }
  if (!info.hasAlpha) {
    return jsonError("Frame harus PNG dengan area transparan di tempat foto (lubang foto).", 400);
  }

  const nama = String(form.get("name") ?? "").replace(/\s+/g, " ").trim().slice(0, 100) || "Frame sendiri";

  let url = null;
  try {
    const own = await query("SELECT id FROM events WHERE id = $1", [eventId]);
    if (own.rows.length === 0) return jsonError("Event tidak ditemukan.", 404);

    url = await saveFile(up.buffer, { folder: "frames", ext: "png" });
    const { rows } = await query(
      "INSERT INTO frames (event_id, name, image_url) VALUES ($1, $2, $3) RETURNING id, name, image_url",
      [eventId, nama, url],
    );
    return NextResponse.json({ frame: rows[0] }, { status: 201 });
  } catch (err) {
    if (url) await deleteFile(url);
    console.error("[frames upload] error:", err);
    return jsonError("Gagal menyimpan frame.", 500);
  }
}
