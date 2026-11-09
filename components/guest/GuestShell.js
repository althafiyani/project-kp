// Pembungkus halaman tamu: latar abu-abu gelap, kolom selebar layar HP.
// fixed = tinggi pas satu layar dan halamannya tidak ikut ter-scroll; bagian di dalamnya
// yang boleh di-scroll sendiri (mis. daftar frame) memakai overflow-y-auto.
export default function GuestShell({ children, className = "", fixed = false }) {
  const tinggi = fixed ? "h-dvh" : "min-h-dvh";
  return (
    <div className={`guest-bg ${tinggi} ${fixed ? "overflow-hidden" : ""} font-heritage text-cream`}>
      <main
        className={`mx-auto flex ${tinggi} w-full max-w-[520px] flex-col px-5 py-6 md:py-10 ${className}`}
      >
        {children}
      </main>
    </div>
  );
}
