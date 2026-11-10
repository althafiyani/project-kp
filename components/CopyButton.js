"use client";

import { useState } from "react";
import { btnOutline } from "@/lib/ui";

export default function CopyButton({ text }) {
  const [state, setState] = useState("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("ok");
    } catch {
      setState("gagal");
    }
    setTimeout(() => setState("idle"), 2000);
  }

  return (
    <button onClick={copy} className={btnOutline}>
      {state === "ok" ? "Tersalin!" : state === "gagal" ? "Gagal, salin manual" : "Salin link"}
    </button>
  );
}
