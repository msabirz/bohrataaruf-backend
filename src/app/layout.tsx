import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ModeProvider } from "@/lib/context/ModeContext";
import { SITE_URL, SITE_KEYWORDS } from "@/lib/seo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Lets relative canonical and Open Graph addresses resolve to the real domain.
  metadataBase: new URL(SITE_URL),
  title: "Bohra Taaruf",
  description: "Through the right door, together — a privacy-first matrimonial platform for the Dawoodi Bohra community.",
  keywords: SITE_KEYWORDS,
  // Large image card when a link is shared on X / WhatsApp-style previews.
  twitter: { card: "summary_large_image", images: [`${SITE_URL}/opengraph-image`], title: "Bohra Taaruf", description: "A free, private matchmaking platform for Dawoodi Bohra families." },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased scroll-smooth`}
    >
      <body className="min-h-full flex flex-col">
        <ModeProvider>{children}</ModeProvider>
      </body>
    </html>
  );
}
