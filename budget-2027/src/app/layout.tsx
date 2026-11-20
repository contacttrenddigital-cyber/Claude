import { siteUrl } from "@/lib/site-url";
import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource/ibm-plex-mono/cyrillic-400.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "./globals.css";
import { THEME_SCRIPT } from "@/lib/theme";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "Бюджет 2027 — под лупа", template: "%s · Бюджет 2027 — под лупа" },
  description:
    "Независим анализ на бюджета на България за 2027 г.: всяко число с официален източник, версия и дата. Приходи, разходи, дефицит, дълг и мерки по законопроекта.",
  alternates: { canonical: "/" },
  openGraph: { locale: "bg_BG", type: "website", siteName: "Бюджет 2027 — под лупа" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f9fc" },
    { media: "(prefers-color-scheme: dark)", color: "#08111f" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="bg" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-screen antialiased">
        <a href="#main" className="skip-link">
          Към съдържанието
        </a>
        {children}
      </body>
    </html>
  );
}
