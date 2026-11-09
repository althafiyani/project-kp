import { notFound } from "next/navigation";
import GuestFlow from "@/components/guest/GuestFlow";
import { getGuestEvent } from "@/lib/guest";
import { formatTanggal } from "@/lib/format";
import { query } from "@/lib/db";
import { frameTextFromEvent } from "@/lib/frameTextConfig";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const event = await getGuestEvent(slug);
  return { title: event ? `${event.name} | Virtual Photobooth` : "Virtual Photobooth" };
}

export default async function GuestOpeningPage({ params }) {
  const { slug } = await params;
  const event = await getGuestEvent(slug);
  if (!event) notFound();

  const active = event.status === "active";
  let frames = [];
  if (active) {
    const { rows } = await query(
      "SELECT id, name, image_url FROM frames WHERE event_id = $1 ORDER BY created_at",
      [event.id],
    );
    frames = rows;
  }

  return (
    <GuestFlow
      slug={slug}
      name={event.name}
      dateText={formatTanggal(event.event_date)}
      openingUrl={event.opening_design_url}
      frameText={frameTextFromEvent(event)}
      active={active}
      closed={event.closed}
      frames={frames}
    />
  );
}
