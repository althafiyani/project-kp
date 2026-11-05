import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { eventScope, isAdmin } from "@/lib/access";
import { query } from "@/lib/db";
import { isUuid } from "@/lib/api";
import { formatTanggal } from "@/lib/format";
import { card } from "@/lib/ui";
import { accessInfo } from "@/lib/eventWindow";
import EventActions from "@/components/EventActions";
import EventInfoEditor from "@/components/EventInfoEditor";
import MempelaiAccess from "@/components/MempelaiAccess";

export const metadata = { title: "Detail Event | Virtual Photobooth MyCard" };

export default async function EventDetailPage({ params }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const admin = isAdmin(session);

  const { id } = await params;
  if (!isUuid(id)) notFound();

  // Admin boleh membuka event mana saja. Mempelai hanya event miliknya:
  // event orang lain tampil sebagai "tidak ditemukan".
  const sc = eventScope(session, "e", 2);
  const { rows } = await query(
    `SELECT e.id, e.name, e.slug, to_char(e.event_date, 'YYYY-MM-DD') AS event_date, e.status, e.timezone,
            e.mempelai_id
       FROM events e
      WHERE e.id = $1 AND ${sc.clause}`,
    [id, ...sc.params],
  );
  const event = rows[0];
  if (!event) notFound();

  // Bagian khusus admin: akun mempelai.
  let mempelai = null;
  let daftarMempelai = [];
  if (admin) {
    const mp = await query("SELECT id, name, username FROM users WHERE role = 'mempelai' ORDER BY username");
    daftarMempelai = mp.rows;
    mempelai = mp.rows.find((m) => m.id === event.mempelai_id) ?? null;
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-10 sm:px-6">
      <Link href="/dashboard" className="text-sm text-muted hover:text-gold hover:underline">
        &larr; Kembali ke dashboard
      </Link>

      <div className={`space-y-5 ${card}`}>
        {admin ? (
          <>
            <EventInfoEditor
              id={event.id}
              name={event.name}
              slug={event.slug}
              eventDate={event.event_date}
              timezone={event.timezone}
              access={accessInfo(event)}
            />
            <EventActions id={event.id} status={event.status} access={accessInfo(event)} afterDeleteGoTo="/dashboard" />
          </>
        ) : (
          <div>
            <h1 className="text-2xl font-semibold text-gold">{event.name}</h1>
            <p className="mt-1 text-sm text-muted">
              {formatTanggal(event.event_date)} · {accessInfo(event).label}
            </p>
          </div>
        )}

        {admin && (
          <section className="space-y-3 border-t border-line pt-5" aria-label="Akses Mempelai">
            <h2 className="font-semibold text-gold">Akses Mempelai</h2>
            <MempelaiAccess eventId={event.id} mempelai={mempelai} daftar={daftarMempelai} />
          </section>
        )}
      </div>
    </main>
  );
}
