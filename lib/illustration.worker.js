// Web Worker untuk filter ilustrasi: menerima piksel RGBA, mengembalikan hasilnya. Lihat illustration.js.
import { runStyle } from "./illustration";

self.onmessage = (e) => {
  const { style, buf, w, h } = e.data;
  const out = runStyle(style, new Uint8ClampedArray(buf), w, h);
  self.postMessage({ buf: out.buffer }, [out.buffer]);
};
