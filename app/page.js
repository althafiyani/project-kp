import Link from "next/link";
import { btnGold } from "@/lib/ui";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-3xl font-semibold text-gold">Virtual Photobooth MyCard</h1>
      <p className="max-w-md text-muted">
        Pindai QR Code dari penyelenggara acara untuk mulai berfoto.
      </p>
      <Link href="/login" className={`${btnGold} px-5`}>
        Login
      </Link>
    </main>
  );
}
