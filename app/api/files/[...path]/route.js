import { readStoredFile } from "@/lib/storage";

// Publik: tamu harus bisa melihat frame dan foto. Aman karena nama file berupa
// UUID acak dan path divalidasi ketat di readStoredFile.
// Mendukung header Range, karena Safari/iOS meminta audio per potongan.
export async function GET(request, { params }) {
  const { path: parts } = await params;
  const file = await readStoredFile(parts.join("/"));
  if (!file) return new Response("Tidak ditemukan", { status: 404 });

  const headers = {
    "Content-Type": file.contentType,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "public, max-age=31536000, immutable",
    "Accept-Ranges": "bytes",
  };
  const size = file.data.length;

  const range = request.headers.get("range");
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (m && (m[1] !== "" || m[2] !== "")) {
      let start;
      let end;
      if (m[1] === "") {
        start = Math.max(size - Number(m[2]), 0); // "bytes=-500" = 500 byte terakhir
        end = size - 1;
      } else {
        start = Number(m[1]);
        end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1);
      }
      if (start >= size || start > end) {
        return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
      }
      return new Response(file.data.subarray(start, end + 1), {
        status: 206,
        headers: {
          ...headers,
          "Content-Range": `bytes ${start}-${end}/${size}`,
          "Content-Length": String(end - start + 1),
        },
      });
    }
  }
  return new Response(file.data, { headers: { ...headers, "Content-Length": String(size) } });
}
