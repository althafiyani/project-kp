"use client";

import { useEffect, useMemo, useState } from "react";
import { ensureTextFonts, layoutFrameText } from "@/lib/frameText";

// Layout teks untuk satu frame. null selama font belum siap, frame belum dimuat,
// atau frame itu tidak punya area tulisan.
export function useTextLayout(info, text) {
  // Font yang sudah siap (kunci = font teks atas + nama). Ganti font = tunggu font baru dimuat.
  const fontKey = text ? JSON.stringify([text.fontTop ?? null, text.fontName ?? null]) : "";
  const [ready, setReady] = useState("");
  useEffect(() => {
    let batal = false;
    ensureTextFonts(text).then(() => !batal && setReady(fontKey));
    return () => {
      batal = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontKey]);

  const key = text ? JSON.stringify(text) : "";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => (ready === fontKey && info && text ? layoutFrameText(info, text) : null), [ready, fontKey, info, key]);
}
