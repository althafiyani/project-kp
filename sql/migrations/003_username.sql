-- Login memakai username (bukan email).
-- Kolom email diganti nama menjadi username. Akun lama yang isinya email diubah
-- menjadi bagian sebelum "@" (mis. demo@photobooth.test -> demo), selama hasilnya
-- minimal 3 karakter dan tidak bentrok dengan username lain. Yang tidak memenuhi
-- dibiarkan apa adanya (tetap bisa login dengan email lengkap sebagai username).
ALTER TABLE users RENAME COLUMN email TO username;

WITH cand AS (
  SELECT id,
         lower(split_part(username, '@', 1)) AS nu,
         row_number() OVER (
           PARTITION BY lower(split_part(username, '@', 1))
           ORDER BY created_at, id
         ) AS rn
    FROM users
   WHERE position('@' in username) > 0
     AND length(split_part(username, '@', 1)) >= 3
)
UPDATE users u
   SET username = c.nu
  FROM cand c
 WHERE u.id = c.id
   AND c.rn = 1
   AND NOT EXISTS (SELECT 1 FROM users o WHERE o.id <> u.id AND lower(o.username) = c.nu);

-- Login selalu mengubah huruf besar jadi kecil, jadi username lama pun disamakan.
UPDATE users u
   SET username = lower(u.username)
 WHERE u.username <> lower(u.username)
   AND NOT EXISTS (SELECT 1 FROM users o WHERE o.id <> u.id AND o.username = lower(u.username));
