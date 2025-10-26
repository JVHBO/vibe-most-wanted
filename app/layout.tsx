import type { Metadata } from "next";
import { Geist, Geist_Mono, Cinzel_Decorative, Playfair_Display_SC, Rajdhani } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { Web3Provider } from "@/contexts/Web3Provider";
import { ConvexClientProvider } from "@/contexts/ConvexClientProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cinzel = Cinzel_Decorative({
  variable: "--font-vintage",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

const playfair = Playfair_Display_SC({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

const rajdhani = Rajdhani({
  variable: "--font-modern",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
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
    <html lang="en" className="overflow-x-hidden">
      <head>
        {/* Farcaster Frame Meta Tags */}
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="https://www.vibemostwanted.xyz/og-placeholder.svg" />
        <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
        <meta property="fc:frame:button:1" content="🎮 Play Game" />
        <meta property="fc:frame:button:1:action" content="link" />
        <meta property="fc:frame:button:1:target" content="https://www.vibemostwanted.xyz" />

        {/* OpenGraph */}
        <meta property="og:title" content="VIBE MOST WANTED - NFT Card Game" />
        <meta property="og:description" content="Battle with your VIBE NFT cards in PvE and PvP modes" />
        <meta property="og:image" content="https://www.vibemostwanted.xyz/og-placeholder.svg" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="VIBE MOST WANTED - NFT Card Game" />
        <meta name="twitter:description" content="Battle with your VIBE NFT cards in PvE and PvP modes" />
        <meta name="twitter:image" content="https://www.vibemostwanted.xyz/og-placeholder.svg" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${cinzel.variable} ${playfair.variable} ${rajdhani.variable} antialiased overflow-x-hidden`}
      >
        <ConvexClientProvider>
          <Web3Provider>
            <LanguageProvider>
              {children}
            </LanguageProvider>
          </Web3Provider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
