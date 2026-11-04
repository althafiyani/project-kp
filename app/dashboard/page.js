import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/access";
import LogoutButton from "@/components/LogoutButton";

export const metadata = { title: "Dashboard | Virtual Photobooth MyCard" };

export default async function DashboardPage() {
  // Penjaga: tanpa login langsung dilempar ke /login
  const session = await getSession();
  if (!session) redirect("/login");
  const admin = isAdmin(session);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gold">
            {admin ? "Dashboard Admin" : "Dashboard Mempelai"}
          </h1>
          <p className="text-sm text-muted">Halo, {session.name}</p>
        </div>
        <LogoutButton />
      </div>
    </main>
  );
}
