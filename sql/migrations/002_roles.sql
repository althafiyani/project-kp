-- Peran pengguna: admin (vendor MyCard, melihat & mengelola SEMUA event)
-- dan mempelai (hanya melihat event miliknya sendiri).
-- Akun yang sudah ada otomatis menjadi admin.
ALTER TABLE users
  ADD COLUMN role VARCHAR(10) NOT NULL DEFAULT 'admin'
  CHECK (role IN ('admin', 'mempelai'));

-- Event bisa dihubungkan ke satu akun mempelai.
ALTER TABLE events
  ADD COLUMN mempelai_id UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX idx_events_mempelai ON events(mempelai_id);
