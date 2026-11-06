-- Font yang diupload vendor untuk teks frame (satu event bisa punya beberapa).
-- File disimpan lewat lib/storage.js (folder "fonts"); pilihan font dipakai ada di
-- events.frame_text_style (fontTop / fontName), jadi tidak butuh kolom baru di events.
CREATE TABLE IF NOT EXISTS event_fonts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name       VARCHAR(60) NOT NULL,
  url        TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_event_fonts_event ON event_fonts(event_id);
