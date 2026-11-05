import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { eventScope, isAdmin } from "@/lib/access";
import { query } from "@/lib/db";
import { formatTanggal } from "@/lib/format";
import { card } from "@/lib/ui";
import { accessInfo, sqlIsOpen } from "@/lib/eventWindow";
import LogoutButton from "@/components/LogoutButton";
import CreateEventForm from "@/components/CreateEventForm";
import EventActions from "@/components/EventActions";

export const metadata = { title: "Dashboard | Virtual Photobooth MyCard" };

export default async function DashboardPage() {
  // Penjaga: tanpa login langsung dilempar ke /login
  const session = await getSession();
  if (!session) redirect("/login");

  const admin = isAdmin(session);
  // Admin melihat SEMUA event. Mempelai hanya event yang dihubungkan ke akunnya.
  const sc = eventScope(session, "e", 1);

  const [statResult, eventResult] = await Promise.all([
    query(
      `SELECT
         (SELECT COUNT(*) FROM events e WHERE ${sc.clause})::int AS total_event,
         (SELECT COUNT(*) FROM events e WHERE ${sc.clause} AND ${sqlIsOpen("e")})::int AS event_aktif,
         (SELECT COUNT(*) FROM submissions s JOIN events e ON e.id = s.event_id
            WHERE ${sc.clause})::int AS total_foto`,
      sc.params,
    ),
    query(
      `SELECT e.id, e.name, e.slug,
              to_char(e.event_date, 'YYYY-MM-DD') AS event_date, e.status, e.timezone,
              u.username AS mempelai_username,
              (SELECT COUNT(*) FROM submissions s WHERE s.event_id = e.id)::int AS total_foto
         FROM events e
         LEFT JOIN users u ON u.id = e.mempelai_id
        WHERE ${sc.clause}
        ORDER BY e.created_at DESC`,
      sc.params,
    ),
  ]);
  const stat = statResult.rows[0];
  const events = eventResult.rows;

  const kartu = [
    ["Total Event", stat.total_event],
    ["Event Aktif", stat.event_aktif],
    ["Total Foto", stat.total_foto],
  ];

  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gold">
            {admin ? "Dashboard Admin" : "Dashboard Mempelai"}
          </h1>
          <p className="text-sm text-muted">
            Halo, {session.name}
            <span className="ml-2 rounded-full border border-gold/40 px-2 py-0.5 text-xs text-gold">
              {admin ? "Admin" : "Mempelai"}
            </span>
          </p>
        </div>
        <LogoutButton />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {kartu.map(([label, nilai]) => (
          <div key={label} className={card}>
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-1 text-3xl font-semibold text-gold">{nilai}</p>
          </div>
        ))}
      </div>

      {admin && <CreateEventForm />}

      <section className="space-y-3">
        <h2 className="font-semibold text-gold">{admin ? "Semua Event" : "Event Saya"}</h2>
        {events.length === 0 ? (
          <p className={`${card} text-sm text-muted`}>
            {admin
              ? "Belum ada event. Buat event pertamamu di atas."
              : "Belum ada event yang dihubungkan ke akunmu. Hubungi penyelenggara."}
          </p>
        ) : (
          <ul className="space-y-3">
            {events.map((ev) => (
              <li
                key={ev.id}
                className={`flex flex-col gap-3 ${card} sm:flex-row sm:items-center sm:justify-between`}
              >
                <div>
                  <Link
                    href={`/dashboard/events/${ev.id}`}
                    className="font-medium text-gold hover:underline"
                  >
                    {ev.name}
                  </Link>
                  <p className="text-sm text-muted">
                    {formatTanggal(ev.event_date)} · {ev.total_foto} foto ·{" "}
                    <span className={accessInfo(ev).open ? "text-ok" : "text-muted"}>
                      {accessInfo(ev).label}
                    </span>
                    <span className="text-muted"> ({accessInfo(ev).detail})</span>
                    {admin && (
                      <>
                        {" "}
                        · Akun mempelai:{" "}
                        <span className="text-fg">{ev.mempelai_username ?? "belum ada"}</span>
                      </>
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {admin && <EventActions id={ev.id} status={ev.status} access={accessInfo(ev)} />}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
