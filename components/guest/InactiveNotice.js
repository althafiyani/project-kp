import { warnBox } from "@/lib/ui";

// closed: "belum" (sebelum tanggal acara) | "selesai" (lewat tanggal acara) | kosong (event dinonaktifkan vendor).
export default function InactiveNotice({ closed = null, dateText = "" }) {
  if (closed === "belum") {
    return (
      <p role="status" className={`mx-auto text-base font-bold leading-6 ${warnBox}`}>
        Sesi belum dibuka.
        <span className="mt-1 block text-sm font-semibold">
          Halaman ini baru bisa dibuka pada tanggal acara{dateText ? `: ${dateText}` : ""}.
        </span>
      </p>
    );
  }
  if (closed === "selesai") {
    return (
      <p role="status" className={`mx-auto text-base font-bold leading-6 ${warnBox}`}>
        Sesi sudah tidak aktif.
        <span className="mt-1 block text-sm font-semibold">Tanggal acara sudah selesai.</span>
      </p>
    );
  }
  return (
    <p role="status" className={`mx-auto text-base font-bold leading-6 ${warnBox}`}>
      Event ini sudah tidak aktif.
    </p>
  );
}
