import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";

// Untuk API yang boleh dipakai admin maupun mempelai (hanya baca / unduh).
// Mengembalikan { session } atau { error }.
export async function requireUser() {
  const session = await getSession();
  if (!session) {
    return {
      error: NextResponse.json(
        { error: "Silakan login terlebih dahulu." },
        { status: 401 },
      ),
    };
  }
  return { session };
}

// Untuk semua API yang mengubah data: hanya admin. Mempelai ditolak (403).
export async function requireAdmin() {
  const { session, error } = await requireUser();
  if (error) return { error };
  if (session.role !== "admin") {
    return {
      error: NextResponse.json(
        { error: "Hanya admin yang boleh melakukan ini." },
        { status: 403 },
      ),
    };
  }
  return { session };
}

// Untuk pengaturan tampilan event (foto opening, teks frame): admin (vendor) boleh di event mana
// saja; mempelai hanya di event yang dihubungkan ke akunnya. Mengembalikan { session, admin } atau { error }.
// eventId harus sudah divalidasi sebagai UUID.
export async function requireEventEditor(eventId) {
  const { session, error } = await requireUser();
  if (error) return { error };
  if (session.role === "admin") return { session, admin: true };
  const own = await query("SELECT 1 FROM events WHERE id = $1 AND mempelai_id = $2", [eventId, session.id]);
  if (own.rows.length === 0) {
    // Sama seperti event orang lain: tampil sebagai tidak ditemukan.
    return { error: NextResponse.json({ error: "Event tidak ditemukan." }, { status: 404 }) };
  }
  return { session, admin: false };
}

const uuidSchema = z.uuid();
export function isUuid(value) {
  return uuidSchema.safeParse(value).success;
}

export function jsonError(message, status) {
  return NextResponse.json({ error: message }, { status });
}
