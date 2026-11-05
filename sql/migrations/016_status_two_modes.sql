-- Tombol akses jadi dua: Aktif (events.status = 'active') dan Nonaktif (= 'auto': tertutup sampai tanggal acara,
-- lalu terbuka sendiri). Nilai lama 'inactive' (ditutup paksa) diubah menjadi 'auto'.
UPDATE events SET status = 'auto' WHERE status = 'inactive';
