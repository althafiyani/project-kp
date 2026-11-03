import { Tai_Heritage_Pro, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const tai = Tai_Heritage_Pro({
  variable: "--font-tai",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "Virtual Photobooth MyCard",
  description: "Virtual photobooth dengan QR Code dan voice note",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={`${tai.variable} ${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
