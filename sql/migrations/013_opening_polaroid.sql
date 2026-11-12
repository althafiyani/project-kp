-- Foto opening kini dibingkai polaroid yang warnanya bisa diganti (bukan frame template lagi).
-- opening_frame_N berisi "#rrggbb" atau "#rrggbb,#rrggbb" (gradasi). Nilai lama berupa kunci frame
-- (mis. 'frame13') diganti putih.
UPDATE events SET opening_frame_1 = '#ffffff' WHERE opening_frame_1 IS NOT NULL AND opening_frame_1 !~ '^#';
UPDATE events SET opening_frame_2 = '#ffffff' WHERE opening_frame_2 IS NOT NULL AND opening_frame_2 !~ '^#';
ALTER TABLE events ALTER COLUMN opening_frame_1 TYPE VARCHAR(30), ALTER COLUMN opening_frame_2 TYPE VARCHAR(30);
ALTER TABLE events
  ADD CONSTRAINT events_opening_frame_1_color CHECK (opening_frame_1 IS NULL OR opening_frame_1 ~ '^#[0-9a-f]{6}(,#[0-9a-f]{6})?$'),
  ADD CONSTRAINT events_opening_frame_2_color CHECK (opening_frame_2 IS NULL OR opening_frame_2 ~ '^#[0-9a-f]{6}(,#[0-9a-f]{6})?$');
