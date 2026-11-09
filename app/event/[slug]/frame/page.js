import { formatTanggal } from "@/lib/format";
import { notFound } from "next/navigation";
import GuestShell from "@/components/guest/GuestShell";
import InactiveNotice from "@/components/guest/InactiveNotice";
import FramePicker from "@/components/guest/FramePicker";
import { getGuestEvent } from "@/lib/guest";
import { query } from "@/lib/db";
import { frameTextFromEvent } from "@/lib/frameTextConfig";

export const metadata = { title: "Pilih Frame | Virtual Photobooth" };

export default async function ChooseFramePage({ params }) {
  const { slug } = await params;
  const event = await getGuestEvent(slug);
  if (!event) notFound();

  let frames = [];
  if (event.status === "active") {
    const { rows } = await query(
      "SELECT id, name, image_url FROM frames WHERE event_id = $1 ORDER BY created_at",
      [event.id],
    );
    frames = rows;
  }

  return (
    <GuestShell className="text-center" fixed>
      <h1 className="text-lg font-bold leading-6 tracking-[-0.45px]">PILIH FRAME</h1>
      {event.status === "active" ? (
        <FramePicker frames={frames} frameText={frameTextFromEvent(event)} />
      ) : (
        <div className="mt-10">
          <InactiveNotice closed={event.closed} dateText={formatTanggal(event.event_date)} />
        </div>
      )}
    </GuestShell>
  );
}
