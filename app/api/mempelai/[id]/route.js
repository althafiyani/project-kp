import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { query } from "@/lib/db";
import { requireAdmin, isUuid, jsonError } from "@/lib/api";
import { firstError, passwordSchema } from "@/lib/events";

const schema = z.object({ password: passwordSchema });

// Admin mengganti password akun mempelai (mis. kalau lupa).
export async function PATCH(request, { params }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  if (!isUuid(id)) return jsonError("Akun tidak ditemukan.", 404);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("Format data tidak valid.", 400);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(firstError(parsed.error), 400);

  try {
    const hash = await bcrypt.hash(parsed.data.password, 10);
    const { rowCount } = await query(
      "UPDATE users SET password_hash = $1 WHERE id = $2 AND role = 'mempelai'",
      [hash, id],
    );
    if (rowCount === 0) return jsonError("Akun mempelai tidak ditemukan.", 404);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[mempelai PATCH] error:", err);
    return jsonError("Gagal mengganti password.", 500);
  }
}
