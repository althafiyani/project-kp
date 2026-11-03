// Dipakai saat dev/build pakai webpack (npm run dev -- --webpack).
// Turbopack tetap memakai @tailwindcss/turbopack dari next.config.mjs.
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
