import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jejak Karier — Tracker Lamaran Kerja",
  description: "Catat lowongan, pantau proses seleksi, dan kelola tindak lanjut lamaran kerja dalam satu tempat.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased">{children}</body>
    </html>
  );
}
