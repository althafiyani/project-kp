// Menjalankan Cloudflare Quick Tunnel dan mencatat alamat acaknya ke file .tunnel-url.
// Aplikasi (lib/url.js) membaca file itu, jadi link event dan QR Code otomatis memakai
// alamat tunnel yang sekarang, tanpa edit APP_URL dan tanpa restart server.
//
// Pakai (di terminal kedua, saat `npm run dev` sudah jalan):
//   npm run tunnel
//
// Opsional (environment variable):
//   CLOUDFLARED_PATH  lokasi cloudflared.exe kalau bukan di lokasi bawaan
//   PORT              port server lokal (bawaan 3000)
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const exe =
  process.env.CLOUDFLARED_PATH ||
  (process.platform === "win32" ? "C:\\Program Files (x86)\\cloudflared\\cloudflared.exe" : "cloudflared");
const port = process.env.PORT || "3000";
const file = path.join(process.cwd(), ".tunnel-url");

// "api.trycloudflare.com" muncul di log tapi bukan alamat tunnel kita.
const URL_RE = /https:\/\/(?!api\.)[a-z0-9-]+\.trycloudflare\.com/i;

function hapusFile() {
  try {
    fs.rmSync(file, { force: true });
  } catch {
    // tidak apa-apa
  }
}

// File sisa dari tunnel sebelumnya sudah tidak berlaku.
hapusFile();

const child = spawn(exe, ["tunnel", "--protocol", "http2", "--url", `http://localhost:${port}`], {
  stdio: ["ignore", "pipe", "pipe"],
});

let buffer = "";
let ketemu = false;
function onData(chunk) {
  const text = chunk.toString();
  process.stdout.write(text);
  if (ketemu) return;
  buffer = (buffer + text).slice(-4000);
  const m = buffer.match(URL_RE);
  if (m) {
    ketemu = true;
    fs.writeFileSync(file, m[0] + "\n");
    console.log("\n=========================================================");
    console.log(" Alamat tamu sekarang: " + m[0]);
    console.log(" Link event dan QR Code otomatis memakai alamat ini.");
    console.log("=========================================================\n");
  }
}
child.stdout.on("data", onData);
child.stderr.on("data", onData);

child.on("error", (err) => {
  console.error(
    err.code === "ENOENT"
      ? `cloudflared tidak ditemukan di: ${exe}\nSet CLOUDFLARED_PATH ke lokasi cloudflared.exe, lalu jalankan lagi.`
      : `Gagal menjalankan cloudflared: ${err.message}`,
  );
  hapusFile();
  process.exit(1);
});

child.on("exit", (code) => {
  hapusFile();
  process.exit(code ?? 0);
});

function berhenti() {
  hapusFile();
  child.kill();
}
process.on("SIGINT", berhenti);
process.on("SIGTERM", berhenti);
process.on("exit", hapusFile);
