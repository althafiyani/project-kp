import { formatTanggal } from "@/lib/format";
import { notFound, redirect } from "next/navigation";
import GuestShell from "@/components/guest/GuestShell";
import InactiveNotice from "@/components/guest/InactiveNotice";
import PhotoBooth from "@/components/guest/PhotoBooth";
import { getGuestEvent } from "@/lib/guest";
import { themeFromEvent } from "@/lib/theme";
import { isUuid } from "@/lib/api";
import { query } from "@/lib/db";
import { frameTextFromEvent } from "@/lib/frameTextConfig";

export const metadata = { title: "Berfoto | Virtual Photobooth" };

export default async function CameraPage({ params, searchParams }) {
  const { slug } = await params;
  const { frame: frameId } = await searchParams;
  const event = await getGuestEvent(slug);
  if (!event) notFound();

  if (event.status !== "active") {
    return (
      <GuestShell className="items-center justify-center text-center" theme={themeFromEvent(event)}>
        <InactiveNotice closed={event.closed} dateText={formatTanggal(event.event_date)} />
      </GuestShell>
    );
  }

  if (typeof frameId !== "string" || !isUuid(frameId)) redirect(`/event/${slug}/frame`);

  // Frame harus milik event ini (mencegah memakai frame event lain).
  const { rows } = await query(
    "SELECT id, name, image_url FROM frames WHERE id = $1 AND event_id = $2",
    [frameId, event.id],
  );
  if (!rows[0]) redirect(`/event/${slug}/frame`);

  return (
    <GuestShell theme={themeFromEvent(event)}>
      <PhotoBooth slug={slug} frame={rows[0]} frameText={frameTextFromEvent(event)} />
    </GuestShell>
  );
}
