"use client";

import { useRouter } from "next/navigation";
import { btnOutline } from "@/lib/ui";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button onClick={handleLogout} className={`${btnOutline} px-4 py-2`}>
      Keluar
    </button>
  );
}
