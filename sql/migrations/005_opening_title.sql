-- Teks judul di halaman pembuka tamu (mis. "LET'S CELEBRATE LOVE"), bisa diedit vendor.
-- NULL = pakai teks bawaan.
ALTER TABLE events ADD COLUMN opening_title VARCHAR(80);
