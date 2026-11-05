// Kapan halaman tamu terbuka (aman dipakai di server maupun client).
//
// events.status punya 2 mode yang diatur vendor lewat tombol Aktif / Nonaktif:
//   "active" (tombol Aktif)    : dibuka manual, mis. untuk tes. Tanggal diabaikan.
//   "auto"   (tombol Nonaktif) : tertutup sampai tanggal acara, lalu TERBUKA SENDIRI di tanggal acara
//                                sampai GRACE_HOUR pagi hari berikutnya (zona waktu event: WIB/WITA/WIT).
//                                Event tanpa tanggal acara tetap tertutup sampai vendor menekan Aktif.
// Jadi vendor tidak perlu ingat mengaktifkan event pada hari acara. Nilai lama "inactive" diperlakukan sebagai "auto".
// Dashboard (admin dan mempelai) tidak terpengaruh.

// Jam (waktu setempat) hari berikutnya saat sesi ditutup, supaya acara yang molor lewat tengah malam tidak terputus.
export const GRACE_HOUR = 6;

export const TIMEZONES = [
  { value: "Asia/Jakarta", label: "WIB" },
  { value: "Asia/Makassar", label: "WITA" },
  { value: "Asia/Jayapura", label: "WIT" },
];
export const DEFAULT_TZ = "Asia/Jakarta";
export const tzLabel = (tz) => TIMEZONES.find((t) => t.value === tz)?.label ?? "WIB";

export const STATUS_MODES = ["auto", "active"];

// Tanggal ("YYYY-MM-DD") dan jam (0-23) saat ini menurut zona waktu tz.
function localNow(tz, now) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
}

function nextDay(isoDate) {
  const t = new Date(`${isoDate}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + 1);
  return t.toISOString().slice(0, 10);
}

// Untuk mode "auto": null (terbuka), "belum" (sebelum tanggal acara) atau "selesai" (sudah lewat).
export function windowState(eventDate, tz = DEFAULT_TZ, now = new Date()) {
  if (!eventDate) return null;
  const { date, hour } = localNow(tz, now);
  if (date < eventDate) return "belum";
  if (date === eventDate) return null;
  if (date === nextDay(eventDate) && hour < GRACE_HOUR) return null;
  return "selesai";
}

// ev = { status, event_date, timezone }. Hasil: { open, mode, reason }
// reason: null | "belum" (sebelum tanggal acara) | "selesai" (sudah lewat) | "tanpa-tanggal" (mode auto tanpa tanggal acara).
export function eventAccess(ev, now = new Date()) {
  if (ev.status === "active") return { open: true, mode: "active", reason: null };
  if (!ev.event_date) return { open: false, mode: "auto", reason: "tanpa-tanggal" };
  const reason = windowState(ev.event_date, ev.timezone || DEFAULT_TZ, now);
  return { open: reason === null, mode: "auto", reason };
}

// Teks status untuk dashboard.
export function accessInfo(ev, now = new Date()) {
  const a = eventAccess(ev, now);
  if (a.mode === "active") return { open: true, label: "Aktif", detail: "Dibuka manual" };
  if (a.reason === "tanpa-tanggal") return { open: false, label: "Nonaktif", detail: "Isi tanggal acara agar aktif otomatis" };
  if (a.reason === "belum") return { open: false, label: "Nonaktif", detail: "Akan aktif otomatis di tanggal acara" };
  if (a.reason === "selesai") return { open: false, label: "Nonaktif", detail: "Acara sudah selesai" };
  return { open: true, label: "Aktif", detail: "Otomatis (hari acara)" };
}

// Potongan SQL yang setara eventAccess().open. alias = alias tabel events di query.
// Tanpa tanggal acara (event_date NULL) hasilnya false, bukan NULL.
export const sqlIsOpen = (alias = "events") => `COALESCE(
  ${alias}.status = 'active'
  OR ((now() AT TIME ZONE ${alias}.timezone) >= ${alias}.event_date::timestamp
      AND (now() AT TIME ZONE ${alias}.timezone) < ${alias}.event_date::timestamp + interval '1 day ${GRACE_HOUR} hours'),
  false)`;
