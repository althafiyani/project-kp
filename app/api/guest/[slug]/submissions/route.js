import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { query } from "@/lib/db";
import { isUuid, jsonError } from "@/lib/api";
import { readImageUpload, readAudioUpload, MAX_IMAGE_BYTES, MAX_AUDIO_BYTES } from "@/lib/upload";
import { saveFile, deleteFile } from "@/lib/storage";
import { sqlIsOpen } from "@/lib/eventWindow";

// Batas sederhana: tiap IP maksimal 10 kiriman per 10 menit.
const RATE_MAX = 10;
const RATE_WINDOW_MIN = 10;

async function ipHash() {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") || "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
  // Disimpan sebagai hash, bukan IP asli.
  return createHash("sha256")
    .update(`${ip}|${process.env.JWT_SECRET ?? ""}`)
    .digest("hex");
}

export async function POST(request, { params }) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,150}$/.test(slug)) return jsonError("Event tidak ditemukan.", 404);

  const panjang = Number(request.headers.get("content-length") || 0);
  if (panjang > MAX_IMAGE_BYTES + MAX_AUDIO_BYTES + 1024 * 1024) return jsonError("Ukuran file terlalu besar.", 413);

  let photoUrl = null;
  let audioUrl = null;
  try {
    const ev = await query(
      `SELECT id, ${sqlIsOpen("events")} AS terbuka FROM events WHERE slug = $1`,
      [slug],
    );
    const event = ev.rows[0];
    if (!event) return jsonError("Event tidak ditemukan.", 404);
    if (!event.terbuka) return jsonError("Sesi ini sedang tidak aktif (di luar tanggal acara atau ditutup vendor).", 403);

    const hash = await ipHash();
    const lim = await query(
      `SELECT COUNT(*)::int AS n FROM upload_logs
        WHERE ip_hash = $1 AND created_at > now() - ($2 || ' minutes')::interval`,
      [hash, String(RATE_WINDOW_MIN)],
    );
    if (lim.rows[0].n >= RATE_MAX) {
      return jsonError("Terlalu banyak kiriman. Tunggu beberapa menit lalu coba lagi.", 429);
    }

    let form;
    try {
      form = await request.formData();
    } catch {
      return jsonError("Format data tidak valid.", 400);
    }

    const frameId = String(form.get("frame") ?? "");
    if (!isUuid(frameId)) return jsonError("Frame tidak valid.", 400);
    const fr = await query("SELECT id FROM frames WHERE id = $1 AND event_id = $2", [
      frameId,
      event.id,
    ]);
    if (fr.rows.length === 0) return jsonError("Frame tidak valid.", 400);

    const up = await readImageUpload(form, "photo", ["jpg", "png", "webp"]);
    if (!up.ok) return jsonError(up.error, up.status);

    const au = await readAudioUpload(form, "audio");
    if (!au.ok) return jsonError(au.error, au.status);

    photoUrl = await saveFile(up.buffer, { folder: "photos", ext: up.type.ext });
    if (!au.none) audioUrl = await saveFile(au.buffer, { folder: "audio", ext: au.type.ext });
    const { rows } = await query(
      `INSERT INTO submissions (event_id, frame_id, photo_url, audio_url)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [event.id, frameId, photoUrl, audioUrl],
    );
    await query("INSERT INTO upload_logs (ip_hash) VALUES ($1)", [hash]);
    // Bersihkan log lama supaya tabel tidak membengkak.
    await query("DELETE FROM upload_logs WHERE created_at < now() - interval '1 day'");

    return NextResponse.json({ id: rows[0].id, photo_url: photoUrl, audio_url: audioUrl }, { status: 201 });
  } catch (err) {
    if (photoUrl) await deleteFile(photoUrl);
    if (audioUrl) await deleteFile(audioUrl);
    console.error("[submissions POST] error:", err);
    return jsonError("Gagal menyimpan foto.", 500);
  }
}
