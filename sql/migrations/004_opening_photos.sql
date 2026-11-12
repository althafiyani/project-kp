-- Halaman pembuka tamu: 2 foto yang masing-masing memakai satu frame (1 area foto).
-- opening_photo_N = URL foto, opening_frame_N = kunci frame (mis. 'frame13').
-- Kolom lama opening_design_url (gambar amplop) tetap ada sebagai cadangan.
ALTER TABLE events
  ADD COLUMN opening_photo_1 TEXT,
  ADD COLUMN opening_frame_1 VARCHAR(30),
  ADD COLUMN opening_photo_2 TEXT,
  ADD COLUMN opening_frame_2 VARCHAR(30);
