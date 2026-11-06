import { z } from "zod";
import { KINDS, HEX_COLOR } from "@/lib/frameTextConfig";
import { normalizeFontRef } from "@/lib/fonts";
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

// Teks satu baris untuk frame: baris baru diubah jadi spasi, kosong = null.
const teksFrame = (max, label) =>
  z
    .union([
      z
        .string()
        .transform((v) => v.replace(/\s*[\r\n]+\s*/g, " "))
        .pipe(z.string().trim().max(max, `${label} maksimal ${max} karakter.`)),
      z.null(),
    ])
    .transform((v) => (v ? v : null))
    .optional();

const angka = (r, label) =>
  z
    .number(`${label} harus berupa angka.`)
    .int(`${label} harus bilangan bulat.`)
    .min(r.min, `${label} minimal ${r.min}.`)
    .max(r.max, `${label} maksimal ${r.max}.`);

const ukuranKind = (k) =>
  z.object({
    name: angka(KINDS[k].name, "Ukuran nama"),
    top: angka(KINDS[k].top, "Ukuran teks atas"),
    gap: angka(KINDS[k].gap, "Jarak"),
  });

// Referensi font: null = bawaan, atau { id, name?, url? } (dirapikan oleh normalizeFontRef).
const fontRef = z
  .union([z.object({ id: z.string().max(60), name: z.string().max(60).optional(), url: z.string().max(200).optional() }), z.null()])
  .transform((v) => normalizeFontRef(v));

const warna = z.union([
  z
    .string()
    .regex(HEX_COLOR, "Warna tidak valid.")
    .transform((v) => v.toLowerCase()),
  z.null(),
]);

export const updateEventSchema = z
  .object({
    name: nama.optional(),
    slug: slug.optional(),
    event_date: tanggal,
    // active = dibuka manual (tombol Aktif), auto = nonaktif sampai tanggal acara lalu terbuka sendiri (tombol Nonaktif).
    status: z.enum(["auto", "active"]).optional(),
    timezone: z.enum(TIMEZONES.map((t) => t.value)).optional(),
    // Teks di bagian bawah frame (font tetap, vendor mengatur isi, ukuran, dan jarak).
    frame_text_top: teksFrame(40, "Teks atas"),
    frame_text_name: teksFrame(60, "Nama pengantin"),
    // Ukuran teks per jenis frame + warna teks untuk frame gelap / cerah (null = bawaan).
    frame_text_style: z
      .object({
        narrow: ukuranKind("narrow"),
        wide: ukuranKind("wide"),
        onDark: warna,
        onLight: warna,
        fontTop: fontRef.optional(),
        fontName: fontRef.optional(),
      })
      .optional(),
    // Akun mempelai pemilik event (null = lepas akses).
    mempelai_id: z.union([z.uuid(), z.null()]).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "Tidak ada data yang diubah.",
  });

export function firstError(zodError) {
  return zodError.issues[0]?.message ?? "Data tidak valid.";
}
