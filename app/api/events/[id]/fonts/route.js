import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireEventEditor, isUuid, jsonError } from "@/lib/api";
import { saveFile, deleteFile } from "@/lib/storage";
import { detectFontType } from "@/lib/fonts";

const MAX_FONT_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_FONTS_PER_EVENT = 10;

// Upload font sendiri untuk teks frame (admin, atau mempelai pemilik event). multipart: file (.woff2/.woff/.ttf/.otf), name.
export async function POST(request, { params }) {
  const { id } = await params;
  if (!isUuid(id)) return jsonError("Event tidak ditemukan.", 404);
  const { error } = await requireEventEditor(id);
  if (error) return error;

  let form;
  try {
    form = await request.formData();
  } catch {
    return jsonError("Format data tidak valid.", 400);
  }
  const file = form.get("file");
  if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function" || file.size === 0) {
    return jsonError("File font belum dipilih.", 400);
  }
  if (file.size > MAX_FONT_BYTES) return jsonError("Ukuran file font maksimal 2 MB.", 413);

  // Jenis font dibaca dari isi file, bukan dari ekstensi.
  const buffer = Buffer.from(await file.arrayBuffer());
  const type = detectFontType(buffer);
  if (!type) return jsonError("Format font tidak didukung. Gunakan WOFF2, WOFF, TTF, atau OTF.", 415);

  const fallback = String(file.name ?? "").replace(/\.[^.]+$/, "");
  const nama = String(form.get("name") ?? "").replace(/\s+/g, " ").trim().slice(0, 60) || fallback.slice(0, 60) || "Font saya";

  let url = null;
  try {
    const own = await query("SELECT (SELECT count(*) FROM event_fonts WHERE event_id = e.id)::int AS n FROM events e WHERE e.id = $1", [id]);
    if (own.rows.length === 0) return jsonError("Event tidak ditemukan.", 404);
    if (own.rows[0].n >= MAX_FONTS_PER_EVENT) {
      return jsonError(`Maksimal ${MAX_FONTS_PER_EVENT} font sendiri per event. Hapus yang tidak dipakai dulu.`, 409);
    }

    url = await saveFile(buffer, { folder: "fonts", ext: type.ext });
    const { rows } = await query(
      "INSERT INTO event_fonts (event_id, name, url) VALUES ($1, $2, $3) RETURNING id, name, url",
      [id, nama, url],
    );
    return NextResponse.json({ font: rows[0] }, { status: 201 });
  } catch (err) {
    if (url) await deleteFile(url);
    console.error("[fonts upload] error:", err);
    return jsonError("Gagal menyimpan font.", 500);
  }
}
