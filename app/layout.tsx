import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "VIBE MOST WANTED - NFT Card Game",
  description: "Battle with your VIBE NFT cards in PvE and PvP modes. Join the most wanted card game on Base!",
  manifest: "/.well-known/farcaster.json",
  openGraph: {
    title: "VIBE MOST WANTED - NFT Card Game",
    description: "Battle with your VIBE NFT cards in PvE and PvP modes",
    images: [
      {
        url: "https://www.vibemostwanted.xyz/og-image.png",
        width: 1200,
        height: 630,
        alt: "VIBE MOST WANTED Game"
      }
    ],
    type: "website",
    siteName: "VIBE MOST WANTED",
  },
  twitter: {
    card: "summary_large_image",
    title: "VIBE MOST WANTED - NFT Card Game",
    description: "Battle with your VIBE NFT cards in PvE and PvP modes",
    images: ["https://www.vibemostwanted.xyz/og-image.png"],
  },
  other: {
    // Farcaster Frame Meta Tags
    "fc:frame": "vNext",
    "fc:frame:image": "https://www.vibemostwanted.xyz/og-image.png",
    "fc:frame:image:aspect_ratio": "1.91:1",
    "fc:frame:button:1": "🎮 Play Game",
    "fc:frame:button:1:action": "link",
    "fc:frame:button:1:target": "https://www.vibemostwanted.xyz",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
