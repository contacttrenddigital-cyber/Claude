import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Бюджет 2027",
  description: "Анализ на държавния бюджет на България за 2027 г. по официални източници.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="bg">
      <body className="antialiased">{children}</body>
    </html>
  );
}
