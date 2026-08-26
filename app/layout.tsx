import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bond — Serendipity",
  description: "A human encounter engine that helps people meet those they would never have known to look for.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
