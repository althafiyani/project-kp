import { z } from "zod";
import { TIMEZONES } from "@/lib/eventWindow";

const nama = z
  .string()
  .trim()
  .min(3, "Nama event minimal 3 karakter.")
  .max(150, "Nama event maksimal 150 karakter.");

// Tanggal opsional: "YYYY-MM-DD", string kosong, atau null.
// PENTING: .optional() harus paling akhir. Kalau tidak, kolom yang tidak dikirim
// ikut berubah jadi null dan tanggal acara bisa terhapus saat vendor hanya
// mengubah status.
const tanggal = z
  .union([z.iso.date("Format tanggal tidak valid."), z.literal(""), z.null()])
  .transform((v) => (v ? v : null))
  .optional();

// Link event buatan sendiri: huruf kecil, angka, dan tanda hubung (-).
// Aturannya sengaja sejalan dengan pengecekan slug di lib/guest.js.
const slug = z
  .string()
  .trim()
  .toLowerCase()
  .min(4, "Link minimal 4 karakter.")
  .max(60, "Link maksimal 60 karakter.")
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    "Link hanya boleh huruf kecil, angka, dan tanda hubung (-). Tanda hubung tidak boleh di awal, di akhir, atau berurutan.",
  );

// Akun login: username huruf kecil/angka (boleh titik, strip, garis bawah), password bebas.
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9][a-z0-9._-]{2,29}$/,
    "Username 3-30 karakter: huruf kecil, angka, titik, strip (-) atau garis bawah (_).",
  );

export const passwordSchema = z
  .string()
  .min(6, "Password minimal 6 karakter.")
  .max(100, "Password maksimal 100 karakter.");

// Saat membuat event, admin sekaligus membuat akun login untuk mempelainya
// (username + password). Dua-duanya harus diisi bersama.
export const createEventSchema = z
  .object({
    name: nama,
    event_date: tanggal,
    timezone: z.enum(TIMEZONES.map((t) => t.value)).optional(),
    username: usernameSchema.optional(),
    password: passwordSchema.optional(),
  })
  .refine((v) => Boolean(v.username) === Boolean(v.password), {
    message: "Isi username dan password sekaligus.",
  });

export const updateEventSchema = z
  .object({
    name: nama.optional(),
    slug: slug.optional(),
    event_date: tanggal,
    // active = dibuka manual (tombol Aktif), auto = nonaktif sampai tanggal acara lalu terbuka sendiri (tombol Nonaktif).
    status: z.enum(["auto", "active"]).optional(),
    timezone: z.enum(TIMEZONES.map((t) => t.value)).optional(),
    // Akun mempelai pemilik event (null = lepas akses).
    mempelai_id: z.union([z.uuid(), z.null()]).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "Tidak ada data yang diubah.",
  });

export function firstError(zodError) {
  return zodError.issues[0]?.message ?? "Data tidak valid.";
}
