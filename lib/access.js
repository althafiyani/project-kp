// Hak akses event.
//  - admin    : semua event, boleh mengubah apa saja
//  - mempelai : hanya event yang dihubungkan ke akunnya (events.mempelai_id): lihat + unduh, dan boleh
//               mengatur foto opening serta teks frame sendiri (lihat requireEventEditor di lib/api.js)

export const isAdmin = (session) => session?.role === "admin";

// Potongan SQL "event mana yang boleh dibuka sesi ini".
//   alias = nama/alias tabel events di query, idx = nomor parameter ($n) berikutnya.
// Contoh:  const sc = eventScope(session, "e", 2);
//          query(`SELECT ... FROM events e WHERE e.id = $1 AND ${sc.clause}`, [id, ...sc.params])
export function eventScope(session, alias, idx) {
  if (isAdmin(session)) return { clause: "TRUE", params: [] };
  return { clause: `${alias}.mempelai_id = $${idx}`, params: [session.id] };
}
