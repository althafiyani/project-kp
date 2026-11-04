import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "pb_session";
const MAX_AGE_SECONDS = 60 * 60 * 8; // login berlaku 8 jam
const ROLES = ["admin", "mempelai"];

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("JWT_SECRET belum diisi (atau terlalu pendek) di .env.local");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(user) {
  return new SignJWT({ name: user.name, username: user.username, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(getSecret());
}

export async function setSessionCookie(token) {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true, // tidak bisa dibaca JavaScript di browser
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production", // HTTPS saja di production
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

// Mengembalikan { id, name, username, role } jika login valid, atau null jika tidak.
// role = "admin" (kelola semua event) atau "mempelai" (hanya lihat event sendiri).
export async function getSession() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
    });
    // Token lama (sebelum ada peran) dianggap tidak sah, jadi harus login ulang.
    if (!ROLES.includes(payload.role)) return null;
    return { id: payload.sub, name: payload.name, username: payload.username, role: payload.role };
  } catch {
    return null; // token rusak / kedaluwarsa
  }
}
