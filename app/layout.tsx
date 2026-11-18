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
  return <html lang="en"><body suppressHydrationWarning>{children}<PwaInstall /></body></html>;
}
