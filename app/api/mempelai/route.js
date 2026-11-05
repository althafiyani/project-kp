import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { query } from "@/lib/db";
import { requireAdmin, jsonError } from "@/lib/api";
import { firstError, usernameSchema, passwordSchema } from "@/lib/events";

const createSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  event_id: z.union([z.uuid(), z.null()]).optional(),
});

// Admin membuat akun mempelai (username + password) dan (opsional) langsung
// menghubungkannya ke sebuah event yang sudah ada.
export async function POST(request) {
  const { error } = await requireAdmin();
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("Format data tidak valid.", 400);
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return jsonError(firstError(parsed.error), 400);
  const { username, password, event_id } = parsed.data;

  try {
    // Nama tampilan akun = nama event (kalau ada), selain itu username-nya.
    let nama = username;
    if (event_id) {
      const ev = await query("SELECT name FROM events WHERE id = $1", [event_id]);
      if (ev.rows.length === 0) return jsonError("Event tidak ditemukan.", 404);
      nama = ev.rows[0].name.slice(0, 100);
    }

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await query(
      `INSERT INTO users (name, username, password_hash, role)
       VALUES ($1, $2, $3, 'mempelai') RETURNING id, name, username`,
      [nama, username, hash],
    );
    const user = rows[0];

    if (event_id) {
      await query("UPDATE events SET mempelai_id = $1 WHERE id = $2", [user.id, event_id]);
    }
    return NextResponse.json({ mempelai: user }, { status: 201 });
  } catch (err) {
    if (err.code === "23505") return jsonError("Username itu sudah dipakai.", 409);
    console.error("[mempelai POST] error:", err);
    return jsonError("Gagal membuat akun mempelai.", 500);
  }
}
