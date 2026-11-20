import Link from "next/link";
import { notFound } from "next/navigation";
import GuestShell from "@/components/guest/GuestShell";
import { getGuestEvent } from "@/lib/guest";
import { themeFromEvent } from "@/lib/theme";
import { query } from "@/lib/db";
import { pillButton, pillButtonGhost } from "@/lib/ui";
import InactiveNotice from "@/components/guest/InactiveNotice";
import { formatTanggal } from "@/lib/format";

export const metadata = { title: "Galeri | Virtual Photobooth" };
export const dynamic = "force-dynamic";

export default async function GalleryPage({ params }) {
  const { slug } = await params;
  const event = await getGuestEvent(slug);
  if (!event) notFound();

  // Di luar tanggal acara, halaman tamu (termasuk galeri) tertutup.
  if (event.closed) {
    return (
      <GuestShell className="items-center justify-center text-center" theme={themeFromEvent(event)}>
        <InactiveNotice closed={event.closed} dateText={formatTanggal(event.event_date)} />
      </GuestShell>
    );
  }

  const { rows } = await query(
    `SELECT id, photo_url, audio_url FROM submissions
      WHERE event_id = $1 ORDER BY created_at DESC LIMIT 200`,
    [event.id],
  );

  return (
    <GuestShell className="gap-5 text-center" theme={themeFromEvent(event)}>
      <h1 className="text-lg font-bold leading-6 tracking-[-0.45px] md:text-2xl">GALERI TAMU</h1>
      <p className="text-sm opacity-80">{event.name}</p>

      {rows.length === 0 ? (
        <p className="mx-auto rounded-2xl bg-cream/10 px-5 py-4 text-base font-bold">
          Belum ada foto. Jadilah yang pertama!
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-col items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={r.photo_url}
                alt="Foto tamu"
                loading="lazy"
                className="h-auto max-h-[60dvh] w-full object-contain"
                style={{ filter: "drop-shadow(0 0 12px color-mix(in srgb, var(--gold) 50%, transparent))" }}
              />
              {r.audio_url && <audio src={r.audio_url} controls preload="none" className="w-full" />}
              <a href={r.photo_url} download className="font-sans text-xs font-bold underline">
                Unduh
              </a>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto flex flex-wrap justify-center gap-3 pt-4">
        {event.status === "active" ? (
          <Link href={`/event/${slug}`} className={pillButton}>
            Berfoto Lagi
          </Link>
        ) : (
          <Link href={`/event/${slug}`} className={pillButtonGhost}>
            Kembali
          </Link>
        )}
      </div>
    </GuestShell>
  );
}
