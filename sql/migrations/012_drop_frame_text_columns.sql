-- Membersihkan kolom percobaan dari 010 dan 011 kalau sempat dijalankan.
ALTER TABLE frames DROP COLUMN IF EXISTS text_color, DROP COLUMN IF EXISTS text_tone;
