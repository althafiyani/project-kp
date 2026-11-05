import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { pool, query } from "@/lib/db";
import { requireUser, requireAdmin, jsonError } from "@/lib/api";
import { eventScope } from "@/lib/access";
import { createEventSchema, firstError } from "@/lib/events";
import { makeSlug } from "@/lib/slug";

// Admin: semua event. Mempelai: hanya event miliknya.
export async function GET() {
  const { session, error } = await requireUser();
  if (error) return error;

  try {
    const sc = eventScope(session, "e", 1);
    const { rows } = await query(
      `SELECT e.id, e.name, e.slug,
              to_char(e.event_date, 'YYYY-MM-DD') AS event_date,
              e.status, e.created_at,
              (SELECT COUNT(*) FROM submissions s WHERE s.event_id = e.id)::int AS total_foto
         FROM events e
        WHERE ${sc.clause}
        ORDER BY e.created_at DESC`,
      sc.params,
    );
    return NextResponse.json({ events: rows });
  } catch (err) {
    console.error("[events GET] error:", err);
    return jsonError("Gagal memuat daftar event.", 500);
  }
}

// Membuat akun mempelai + event dalam satu transaksi: kalau salah satunya gagal,
// dua-duanya dibatalkan (tidak ada akun yatim). Mengembalikan { event } atau
// { conflict: "username" | "slug" }.
async function createWithAccount({ adminId, name, event_date, timezone, username, password }) {
  const hash = await bcrypt.hash(password, 10);
  for (let attempt = 0; attempt < 5; attempt++) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const u = await client.query(
        `INSERT INTO users (name, username, password_hash, role)
         VALUES ($1, $2, $3, 'mempelai') RETURNING id`,
        [name.slice(0, 100), username, hash],
      );
      const e = await client.query(
        `INSERT INTO events (vendor_id, name, slug, event_date, mempelai_id, timezone)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, name, slug, to_char(event_date, 'YYYY-MM-DD') AS event_date, status`,
        [adminId, name, makeSlug(name), event_date, u.rows[0].id, timezone],
      );
      await client.query("COMMIT");
      return { event: e.rows[0] };
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      if (err.code === "23505") {
        if (err.table === "users") return { conflict: "username" };
        continue; // slug bentrok (jarang) -> coba lagi dengan kode baru
      }
      throw err;
    } finally {
      client.release();
    }
  }
  return { conflict: "slug" };
}

// Hanya admin yang boleh membuat event.
export async function POST(request) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("Format data tidak valid.", 400);
  }

  const parsed = createEventSchema.safeParse(body);
  if (!parsed.success) return jsonError(firstError(parsed.error), 400);
  const name = parsed.data.name;
  const event_date = parsed.data.event_date ?? null;
  const timezone = parsed.data.timezone ?? "Asia/Jakarta";
  const { username, password } = parsed.data;

  try {
    if (username) {
      const r = await createWithAccount({ adminId: session.id, name, event_date, timezone, username, password });
      if (r.conflict === "username") return jsonError("Username itu sudah dipakai. Pilih yang lain.", 409);
      if (r.conflict) return jsonError("Gagal membuat link unik. Coba lagi.", 500);
      return NextResponse.json({ event: r.event }, { status: 201 });
    }

    // Slug bentrok sangat jarang terjadi, tapi kalau ya, coba lagi dengan kode baru.
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const { rows } = await query(
          `INSERT INTO events (vendor_id, name, slug, event_date, timezone)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, name, slug, to_char(event_date, 'YYYY-MM-DD') AS event_date, status`,
          [session.id, name, makeSlug(name), event_date, timezone],
        );
        return NextResponse.json({ event: rows[0] }, { status: 201 });
      } catch (err) {
        if (err.code !== "23505") throw err; // bukan bentrok slug -> lempar
      }
    }
    return jsonError("Gagal membuat link unik. Coba lagi.", 500);
  } catch (err) {
    console.error("[events POST] error:", err);
    return jsonError("Gagal membuat event.", 500);
  }
}
