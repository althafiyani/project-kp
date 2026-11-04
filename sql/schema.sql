-- Virtual Photobooth MyCard - skema database (PostgreSQL 13+)
-- LANGKAH:
-- 1) Buat database dulu (jalankan SATU baris ini saja, terpisah):
--      CREATE DATABASE photobooth;
-- 2) Konek ke database "photobooth", lalu jalankan SELURUH isi file ini.

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL,
  username      VARCHAR(150) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          VARCHAR(10) NOT NULL DEFAULT 'admin'
                CHECK (role IN ('admin', 'mempelai')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE events (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name               VARCHAR(150) NOT NULL,
  slug               VARCHAR(150) NOT NULL UNIQUE,
  event_date         DATE,
  opening_design_url TEXT,
  qr_code            TEXT,
  mempelai_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  status             VARCHAR(10) NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'inactive')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_events_vendor ON events(vendor_id);
CREATE INDEX idx_events_mempelai ON events(mempelai_id);

CREATE TABLE frames (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name       VARCHAR(100) NOT NULL,
  image_url  TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_frames_event ON frames(event_id);

CREATE TABLE submissions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  frame_id   UUID REFERENCES frames(id) ON DELETE SET NULL,
  photo_url  TEXT NOT NULL,
  audio_url  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_submissions_event ON submissions(event_id, created_at DESC);

-- Untuk rate limiting sederhana (opsional tapi disarankan)
CREATE TABLE upload_logs (
  id         BIGSERIAL PRIMARY KEY,
  ip_hash    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_upload_logs_ip ON upload_logs(ip_hash, created_at DESC);
