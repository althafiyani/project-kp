-- Warna halaman tamu per event: hanya dua warna yang bisa diganti,
-- "hitam" (latar halaman) dan "gold" (tombol, teks, aksen). NULL = pakai warna bawaan.
-- Format #rrggbb huruf kecil. Warna turunan (kartu, garis, teks lembut, dll.) dihitung di aplikasi.
ALTER TABLE events
  ADD COLUMN theme_dark TEXT,
  ADD COLUMN theme_gold TEXT,
  ADD CONSTRAINT events_theme_dark_hex CHECK (theme_dark IS NULL OR theme_dark ~ '^#[0-9a-f]{6}$'),
  ADD CONSTRAINT events_theme_gold_hex CHECK (theme_gold IS NULL OR theme_gold ~ '^#[0-9a-f]{6}$');
