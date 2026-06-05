import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Workshop Buddy",
  description: "Your shop assistant — track, plan, and price everything in the workshop.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-wb-bg text-wb-ink">{children}</body>
    </html>
  );
}
