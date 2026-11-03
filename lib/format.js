const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

// "2026-11-20" -> "20 November 2026". Tanpa Date() supaya tidak kena geseran zona waktu.
export function formatTanggal(isoDate) {
  if (!isoDate) return "-";
  const [y, m, d] = String(isoDate).split("-").map(Number);
  if (!y || !m || !d) return "-";
  return `${d} ${BULAN[m - 1]} ${y}`;
}
