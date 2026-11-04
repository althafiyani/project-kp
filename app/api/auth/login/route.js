import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { createSessionToken, setSessionCookie } from "@/lib/auth";

// Hash palsu: dipakai kalau username tidak ditemukan, supaya waktu respons
// tetap mirip dan orang tidak bisa menebak username mana yang terdaftar.
const DUMMY_HASH = bcrypt.hashSync("password-palsu-untuk-menyamarkan-waktu", 10);

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Format data tidak valid." }, { status: 400 });
  }

  const username = String(body?.username ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");

  if (!username || username.length > 150 || !password || password.length > 200) {
    return NextResponse.json(
      { error: "Isi username dan password dengan benar." },
      { status: 400 },
    );
  }

  try {
    const { rows } = await query(
      "SELECT id, name, username, password_hash, role FROM users WHERE username = $1",
      [username],
    );
    const user = rows[0];

    const passwordCocok = await bcrypt.compare(
      password,
      user ? user.password_hash : DUMMY_HASH,
    );

    if (!user || !passwordCocok) {
      return NextResponse.json(
        { error: "Username atau password salah." },
        { status: 401 },
      );
    }

    const token = await createSessionToken(user);
    await setSessionCookie(token);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[login] error:", err);
    return NextResponse.json(
      { error: "Server sedang bermasalah. Coba lagi sebentar." },
      { status: 500 },
    );
  }
}
