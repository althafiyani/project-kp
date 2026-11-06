"use client";

import { useEffect, useState } from "react";
import { loadFrame } from "@/lib/photoStrip";

// Memuat frame + mendeteksi lubang fotonya. Mengembalikan null selama belum siap
// (atau kalau gambarnya gagal dimuat).
export function useFrame(url) {
  const [state, setState] = useState({ url: null, info: null });

  useEffect(() => {
    let batal = false;
    loadFrame(url)
      .then((info) => !batal && setState({ url, info }))
      .catch(() => !batal && setState({ url, info: null }));
    return () => {
      batal = true;
    };
  }, [url]);

  return state.url === url ? state.info : null;
}
