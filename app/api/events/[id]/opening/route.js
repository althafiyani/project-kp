import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireEventEditor, isUuid, jsonError } from "@/lib/api";
import { readImageUpload, MAX_IMAGE_BYTES } from "@/lib/upload";
import { saveFile, deleteFile } from "@/lib/storage";
import { POLAROID_RE } from "@/lib/polaroid";

// Foto opening: ada 2 slot (1 dan 2). Tiap slot = satu foto dalam polaroid berwarna (satu warna atau gradasi).
// Nama kolom dipilih dari daftar tetap ini, bukan dari input pengguna.
const SLOT_COLUMNS = {
  1: { photo: "opening_photo_1", frame: "opening_frame_1" },
  2: { photo: "opening_photo_2", frame: "opening_frame_2" },
};

function readSlot(value) {
  const n = Number(value);
  return SLOT_COLUMNS[n] ? n : null;
}

// POST multipart: slot (1|2), color ("#rrggbb" atau "#rrggbb,#rrggbb"), file (foto, boleh kosong
// kalau slot itu sudah punya foto dan hanya mau ganti warna).
export async function POST(request, { params }) {
  const { id } = await params;
  if (!isUuid(id)) return jsonError("Event tidak ditemukan.", 404);
  const { error } = await requireEventEditor(id);
  if (error) return error;

  const panjang = Number(request.headers.get("content-length") || 0);
  if (panjang > MAX_IMAGE_BYTES + 512 * 1024) {
    return jsonError("Ukuran file maksimal 5 MB.", 413);
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return jsonError("Format data tidak valid.", 400);
  }

  const slot = readSlot(form.get("slot"));
  if (!slot) return jsonError("Slot foto tidak valid.", 400);
  const color = String(form.get("color") ?? "").trim().toLowerCase();
  if (!POLAROID_RE.test(color)) return jsonError("Warna polaroid tidak valid.", 400);

  const cols = SLOT_COLUMNS[slot];
  const file = form.get("file");
  const adaFile = Boolean(file && typeof file !== "string" && file.size > 0);

  try {
    const own = await query(`SELECT ${cols.photo} AS photo FROM events WHERE id = $1`, [id]);
    if (own.rows.length === 0) return jsonError("Event tidak ditemukan.", 404);
    const lama = own.rows[0].photo;

    let url = lama;
    if (adaFile) {
      const up = await readImageUpload(form, "file", ["png", "jpg", "webp"]);
      if (!up.ok) return jsonError(up.error, up.status);
      url = await saveFile(up.buffer, { folder: "opening", ext: up.type.ext });
    } else if (!lama) {
      return jsonError("Pilih foto dulu.", 400);
    }

    try {
      await query(`UPDATE events SET ${cols.photo} = $1, ${cols.frame} = $2 WHERE id = $3`, [url, color, id]);
    } catch (err) {
      if (adaFile) await deleteFile(url);
      throw err;
    }
    if (adaFile) await deleteFile(lama); // ganti foto -> file lama dibuang
    return NextResponse.json({ slot, photo: url, color });
  } catch (err) {
    console.error("[opening POST] error:", err);
    return jsonError("Gagal menyimpan foto opening.", 500);
  }
}

// DELETE ?slot=1|2 : kosongkan satu slot foto opening.
// Tanpa ?slot : hapus gambar amplop lama (opening_design_url).
export async function DELETE(request, { params }) {
  const { id } = await params;
  if (!isUuid(id)) return jsonError("Event tidak ditemukan.", 404);
  const { error } = await requireEventEditor(id);
  if (error) return error;

  const raw = new URL(request.url).searchParams.get("slot");
  const slot = raw === null ? null : readSlot(raw);
  if (raw !== null && !slot) return jsonError("Slot foto tidak valid.", 400);

  try {
    if (slot) {
      const cols = SLOT_COLUMNS[slot];
      const own = await query(`SELECT ${cols.photo} AS photo FROM events WHERE id = $1`, [id]);
      if (own.rows.length === 0) return jsonError("Event tidak ditemukan.", 404);
      await query(`UPDATE events SET ${cols.photo} = NULL, ${cols.frame} = NULL WHERE id = $1`, [id]);
      await deleteFile(own.rows[0].photo);
      return NextResponse.json({ ok: true });
    }

    const own = await query("SELECT opening_design_url FROM events WHERE id = $1", [id]);
    if (own.rows.length === 0) return jsonError("Event tidak ditemukan.", 404);
    await query("UPDATE events SET opening_design_url = NULL WHERE id = $1", [id]);
    await deleteFile(own.rows[0].opening_design_url);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[opening DELETE] error:", err);
    return jsonError("Gagal menghapus foto opening.", 500);
  }
}
