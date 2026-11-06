-- Ukuran teks frame jadi terpisah untuk frame sempit (450x1350) dan frame lebar (1080x1350),
-- ditambah ukuran teks atas dan warna teks untuk frame gelap / cerah. Semuanya disimpan
-- dalam satu kolom JSONB: {"narrow":{name,top,gap},"wide":{name,top,gap},"onDark":"#hex","onLight":"#hex"}.
-- Nilai lama (kolom frame_name_size / frame_text_gap dari migrasi 006) dipindah ke "wide".
ALTER TABLE events ADD COLUMN frame_text_style JSONB;

UPDATE events
   SET frame_text_style = jsonb_build_object(
         'wide', jsonb_strip_nulls(jsonb_build_object('name', frame_name_size, 'gap', frame_text_gap))
       )
 WHERE frame_name_size IS NOT NULL OR frame_text_gap IS NOT NULL;

ALTER TABLE events
  DROP COLUMN frame_name_size,
  DROP COLUMN frame_text_gap;
