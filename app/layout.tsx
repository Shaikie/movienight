import type { Metadata } from "next";
import "./globals.css";
import PwaInstall from "@/components/pwa-install";

export const metadata: Metadata = {
  title: "MovieNight | One Night. One Screen.",
  description: "A private cinema night for your favourite people. Discover films, vote together and reserve your seat.",
  applicationName: "CoICT MovieNight",
  appleWebApp: { capable: true, title: "MovieNight", statusBarStyle: "black-translucent" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#09090d" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="MovieNight" />
        <link rel="apple-touch-icon" href="/apple-icon" />
      </head>
      <body suppressHydrationWarning>{children}<PwaInstall /></body>
    </html>
  );
}
