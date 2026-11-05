-- Akses halaman tamu: 3 mode yang diatur vendor (events.status) + zona waktu event.
--   'auto'     (bawaan) : terbuka otomatis di tanggal acara sampai jam tenggang hari berikutnya
--                         (lihat lib/eventWindow.js). Vendor tidak perlu ingat mengaktifkan.
--   'active'            : dibuka paksa (mis. untuk tes), tanpa melihat tanggal.
--   'inactive'          : ditutup paksa.
-- Event lama yang statusnya 'active' menjadi 'auto'; yang 'inactive' tetap ditutup.
DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
     WHERE conrelid = 'events'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE events DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

UPDATE events SET status = 'auto' WHERE status = 'active';
ALTER TABLE events ALTER COLUMN status SET DEFAULT 'auto';
ALTER TABLE events ADD CONSTRAINT events_status_check CHECK (status IN ('auto', 'active', 'inactive'));

ALTER TABLE events ADD COLUMN timezone VARCHAR(20) NOT NULL DEFAULT 'Asia/Jakarta';
ALTER TABLE events ADD CONSTRAINT events_timezone_check
  CHECK (timezone IN ('Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura'));
