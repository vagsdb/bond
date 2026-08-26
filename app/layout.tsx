import type { Metadata } from "next";
import PilotMount from "./PilotMount";
import "./globals.css";
import "./profile.css";
import "./tagline.css";
import "./lab/v1.1.css";

export const metadata: Metadata = {
  title: "Bond — The unexpected, with intention",
  description: "Bond is a human encounter engine for finding people who may matter to each other — the unexpected, with intention.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <PilotMount />
      </body>
    </html>
  );
}
