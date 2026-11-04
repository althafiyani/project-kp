import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";

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

const uuidSchema = z.uuid();
export function isUuid(value) {
  return uuidSchema.safeParse(value).success;
}

export function jsonError(message, status) {
  return NextResponse.json({ error: message }, { status });
}
