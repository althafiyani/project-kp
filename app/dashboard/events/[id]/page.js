import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import { getSession } from "@/lib/auth";
import { eventScope, isAdmin } from "@/lib/access";
import { query } from "@/lib/db";
import { isUuid } from "@/lib/api";
import { formatTanggal } from "@/lib/format";
import { getBaseUrl } from "@/lib/url";
import { card, btnOutline, warnBox } from "@/lib/ui";
import { accessInfo } from "@/lib/eventWindow";
import CopyButton from "@/components/CopyButton";
import EventActions from "@/components/EventActions";
import EventInfoEditor from "@/components/EventInfoEditor";
import MempelaiAccess from "@/components/MempelaiAccess";
import OpeningUpload from "@/components/OpeningUpload";
import FrameManager from "@/components/FrameManager";
import FrameUpload from "@/components/FrameUpload";
import FrameTextEditor from "@/components/FrameTextEditor";
import Section from "@/components/Section";
import { frameTextFromEvent } from "@/lib/frameTextConfig";

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
            e.opening_design_url, e.mempelai_id,
            e.opening_photo_1, e.opening_frame_1, e.opening_photo_2, e.opening_frame_2, e.opening_title,
            e.frame_text_top, e.frame_text_name, e.frame_text_style
       FROM events e
      WHERE e.id = $1 AND ${sc.clause}`,
    [id, ...sc.params],
  );
  const event = rows[0];
  if (!event) notFound();

  // Font sendiri untuk teks frame (admin dan mempelai pemilik event).
  const fontResult = await query(
    "SELECT id, name, url FROM event_fonts WHERE event_id = $1 ORDER BY created_at",
    [event.id],
  );
  const fonts = fontResult.rows;

  // Bagian khusus admin: daftar frame dan akun mempelai.
  let frames = [];
  let mempelai = null;
  let daftarMempelai = [];
  if (admin) {
    const frameResult = await query(
      "SELECT id, name, image_url FROM frames WHERE event_id = $1 ORDER BY created_at",
      [event.id],
    );
    frames = frameResult.rows;
    const mp = await query("SELECT id, name, username FROM users WHERE role = 'mempelai' ORDER BY username");
    daftarMempelai = mp.rows;
    mempelai = mp.rows.find((m) => m.id === event.mempelai_id) ?? null;
  }

  const baseUrl = await getBaseUrl();
  const link = `${baseUrl}/event/${event.slug}`;
  const qr = await QRCode.toDataURL(link, {
    width: 640,
    margin: 2,
    errorCorrectionLevel: "M",
  });
  const lokal = /localhost|127\.0\.0\.1|192\.168\.|10\./.test(baseUrl);

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

        <section className="space-y-3 border-t border-line pt-5" aria-label="Link dan QR Code">
          <h2 className="font-semibold text-gold">Link dan QR Code</h2>

          <p className="break-all rounded-lg bg-ink px-3 py-2 font-mono text-sm text-fg">{link}</p>

          <div className="flex flex-wrap gap-2">
            <CopyButton text={link} />
            <a href={link} target="_blank" rel="noopener noreferrer" className={btnOutline}>
              Buka halaman tamu
            </a>
            <a href={qr} download={`qr-${event.slug}.png`} className={btnOutline}>
              Unduh QR Code
            </a>
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt={`QR Code untuk ${event.name}`} className="h-64 w-64 rounded-lg bg-white" />

          {lokal && (
            <p className={warnBox}>
              Link ini masih alamat lokal, jadi QR-nya tidak bisa dibuka dari HP. Setelah
              aplikasi di-deploy ke Vercel, link dan QR otomatis memakai alamat Vercel.
            </p>
          )}
        </section>

        {admin && (
          <section className="space-y-3 border-t border-line pt-5" aria-label="Akses Mempelai">
            <h2 className="font-semibold text-gold">Akses Mempelai</h2>
            <MempelaiAccess eventId={event.id} mempelai={mempelai} daftar={daftarMempelai} />
          </section>
        )}
      </div>

      {/* Foto opening dan teks frame: bisa diatur vendor (admin) maupun mempelai pemilik event. */}
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

      {admin && (
        <Section title="Frame Foto">
          <FrameManager eventId={event.id} frames={frames} frameText={frameTextFromEvent(event)} />
          <FrameUpload eventId={event.id} frameText={frameTextFromEvent(event)} />
        </Section>
      )}
    </main>
  );
}
