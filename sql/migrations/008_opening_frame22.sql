-- Frame 14 sekarang berupa strip 2 foto (450 x 1350), bukan frame 1 area foto lagi, jadi tidak
-- bisa dipakai di halaman opening. Event yang memakainya dipindah ke frame 22 (1 area foto, 1080 x 1350).
UPDATE events SET opening_frame_1 = 'frame22' WHERE opening_frame_1 = 'frame14';
UPDATE events SET opening_frame_2 = 'frame22' WHERE opening_frame_2 = 'frame14';
