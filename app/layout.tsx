import type { Metadata } from "next";
import "./globals.css";
import "./profile.css";
import "./lab/v1.1.css";

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
