import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MovieNight | One Night. One Screen.",
  description: "A private cinema night for your favourite people. Discover films, vote together and reserve your seat.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
