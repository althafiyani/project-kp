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
import ExportButton from "@/components/ExportButton";
import SubmissionList from "@/components/SubmissionList";
import Section from "@/components/Section";
import OpeningUpload from "@/components/OpeningUpload";
import FrameTextEditor from "@/components/FrameTextEditor";
import { isUuid } from "@/lib/api";

export const metadata = { title: "Dashboard | Virtual Photobooth MyCard" };

export default async function DashboardPage({ searchParams }) {
  // Penjaga: tanpa login langsung dilempar ke /login
  const session = await getSession();
  if (!session) redirect("/login");

  const admin = isAdmin(session);
  // Mempelai langsung melihat total foto, total voice note, dan galeri tamu (tanpa daftar event).
  if (!admin) return <MempelaiDashboard session={session} eventParam={(await searchParams)?.event} />;

  // Admin melihat SEMUA event. Mempelai hanya event yang dihubungkan ke akunnya.
  const sc = eventScope(session, "e", 1);

  const [statResult, eventResult] = await Promise.all([
    query(
      `SELECT
         (SELECT COUNT(*) FROM events e WHERE ${sc.clause})::int AS total_event,
         (SELECT COUNT(*) FROM events e WHERE ${sc.clause} AND ${sqlIsOpen("e")})::int AS event_aktif,
         (SELECT COUNT(*) FROM submissions s JOIN events e ON e.id = s.event_id
            WHERE ${sc.clause})::int AS total_foto,
         (SELECT COUNT(*) FROM submissions s JOIN events e ON e.id = s.event_id
            WHERE ${sc.clause} AND s.audio_url IS NOT NULL)::int AS total_voice`,
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
    ["Total Voice Note", stat.total_voice],
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

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
                  <ExportButton eventId={ev.id} className="px-3 py-1.5" />
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

// Dashboard mempelai: ringkasan dan galeri tamu langsung tampil.
// Kebanyakan mempelai hanya punya satu event. Kalau ada lebih dari satu, ada tombol pilih event.
async function MempelaiDashboard({ session, eventParam }) {
  const sc = eventScope(session, "e", 1);
  const { rows: events } = await query(
    `SELECT e.id, e.name, to_char(e.event_date, 'YYYY-MM-DD') AS event_date, e.status, e.timezone,
            e.opening_design_url, e.opening_title,
            e.opening_photo_1, e.opening_frame_1, e.opening_photo_2, e.opening_frame_2,
            e.frame_text_top, e.frame_text_name, e.frame_text_style
       FROM events e
      WHERE ${sc.clause}
      ORDER BY e.created_at DESC`,
    sc.params,
  );
  const event = (isUuid(eventParam ?? "") && events.find((e) => e.id === eventParam)) || events[0] || null;

  let total = { foto: 0, voice: 0 };
  let items = [];
  let fonts = [];
  if (event) {
    const [t, list, fontResult] = await Promise.all([
      query(
        `SELECT COUNT(*)::int AS foto, COUNT(audio_url)::int AS voice FROM submissions WHERE event_id = $1`,
        [event.id],
      ),
      query(
        `SELECT id, photo_url, audio_url FROM submissions WHERE event_id = $1 ORDER BY created_at DESC LIMIT 200`,
        [event.id],
      ),
      query("SELECT id, name, url FROM event_fonts WHERE event_id = $1 ORDER BY created_at", [event.id]),
    ]);
    fonts = fontResult.rows;
    total = t.rows[0];
    items = list.rows;
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gold">Dashboard Mempelai</h1>
          <p className="text-sm text-muted">
            Halo, {session.name}
            <span className="ml-2 rounded-full border border-gold/40 px-2 py-0.5 text-xs text-gold">Mempelai</span>
          </p>
        </div>
        <LogoutButton />
      </div>

      {!event ? (
        <p className={`${card} text-sm text-muted`}>
          Belum ada event yang dihubungkan ke akunmu. Hubungi penyelenggara.
        </p>
      ) : (
        <>
          {events.length > 1 && (
            <nav aria-label="Pilih event" className="flex flex-wrap gap-2">
              {events.map((ev) => (
                <Link
                  key={ev.id}
                  href={`/dashboard?event=${ev.id}`}
                  aria-current={ev.id === event.id ? "page" : undefined}
                  className={`rounded-full border px-3 py-1 text-sm font-medium ${
                    ev.id === event.id ? "border-gold bg-gold text-ink" : "border-gold/50 text-gold hover:bg-gold/10"
                  }`}
                >
                  {ev.name}
                </Link>
              ))}
            </nav>
          )}

          <p className="text-sm text-muted">
            <span className="font-medium text-fg">{event.name}</span> · {formatTanggal(event.event_date)} ·{" "}
            <span className={accessInfo(event).open ? "text-ok" : "text-muted"}>
              {accessInfo(event).label}
            </span>
            {" · "}
            <Link href={`/dashboard/events/${event.id}`} className="text-gold hover:underline">
              Link dan QR Code
            </Link>
          </p>

          <div className="grid grid-cols-2 gap-4">
            {[
              ["Total Foto", total.foto],
              ["Total Voice Note", total.voice],
            ].map(([label, nilai]) => (
              <div key={label} className={card}>
                <p className="text-sm text-muted">{label}</p>
                <p className="mt-1 text-3xl font-semibold text-gold">{nilai}</p>
              </div>
            ))}
          </div>

          {/* Foto opening dan teks frame: mempelai boleh mengatur sendiri (vendor juga bisa). */}
          <Section title="Upload Foto Opening">
            <OpeningUpload
              eventId={event.id}
              legacyUrl={event.opening_design_url}
              title={event.opening_title ?? ""}
              slots={[1, 2].map((n) =>
                event[`opening_photo_${n}`]
                  ? { photo: event[`opening_photo_${n}`], frame: event[`opening_frame_${n}`] }
                  : null,
              )}
            />
          </Section>

          <Section title="Teks Frame">
            <FrameTextEditor
              eventId={event.id}
              fonts={fonts}
              saved={{ top: event.frame_text_top, name: event.frame_text_name, style: event.frame_text_style }}
            />
          </Section>

          <section className={`space-y-4 ${card}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold text-gold">Galeri Tamu ({total.foto})</h2>
              {total.foto > 0 && <ExportButton eventId={event.id} className="px-3 py-1.5" />}
            </div>
            {total.foto > items.length && (
              <p className="text-sm text-muted">
                Menampilkan {items.length} foto terbaru. Gunakan Export semua (ZIP) untuk mengunduh seluruh {total.foto} foto.
              </p>
            )}
            <SubmissionList items={items} eventId={event.id} readOnly inline />
          </section>
        </>
      )}
    </main>
  );
}
