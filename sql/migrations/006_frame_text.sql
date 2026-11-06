-- Teks di bagian bawah frame: baris atas (mis. 'THE WEDDING OF') + nama pengantin.
-- Font tetap; vendor mengatur isi teks, ukuran font nama, dan jarak antar baris.
-- frame_text_name NULL = frame tampil tanpa teks.
ALTER TABLE events
  ADD COLUMN frame_text_top VARCHAR(40),
  ADD COLUMN frame_text_name VARCHAR(60),
  ADD COLUMN frame_name_size SMALLINT,
  ADD COLUMN frame_text_gap SMALLINT;
