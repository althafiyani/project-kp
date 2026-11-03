/** @type {import('next').NextConfig} */
const nextConfig = {
  // Hostname tunnel (mis. Cloudflare Quick Tunnel) yang boleh membuka server dev.
  // Hanya berlaku saat "npm run dev", tidak berpengaruh di production.
  allowedDevOrigins: [
    "192.168.68.158",
    "192.168.68.160",
    "*.trycloudflare.com",
  ],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
