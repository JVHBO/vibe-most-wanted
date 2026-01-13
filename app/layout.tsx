import type { Metadata } from "next";
import { Geist, Geist_Mono, Cinzel_Decorative, Playfair_Display_SC, Rajdhani } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { MusicProvider } from "@/contexts/MusicContext";
import { Web3Provider } from "@/contexts/Web3Provider";
import { ConvexClientProvider } from "@/contexts/ConvexClientProvider";
import { PlayerCardsProvider } from "@/contexts/PlayerCardsContext";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { FarcasterNotificationRegistration } from "@/components/FarcasterNotificationRegistration";
import { Analytics } from "@vercel/analytics/react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { NeynarMiniAppProvider } from "@/contexts/NeynarMiniAppProvider";

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
  title: "$VBMS - Meme Card Game",
  description: "Battle with meme cards in PvE and PvP modes. The most wanted meme card game on Base!",
  manifest: "/.well-known/farcaster.json",
  icons: {
    icon: [
      { url: "/favicon-32x32.png?v=xmas2025", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png?v=xmas2025", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "/favicon-32x32.png?v=xmas2025",
    apple: "/apple-touch-icon.png?v=xmas2025",
    other: [
      { rel: "android-chrome-192x192", url: "/android-chrome-192x192.png" },
      { rel: "android-chrome-512x512", url: "/android-chrome-512x512.png" },
    ],
  },
  openGraph: {
    title: "$VBMS - Meme Card Game",
    description: "Battle with meme cards in PvE and PvP modes",
    url: "https://www.vibemostwanted.xyz",
    images: [
      {
        url: "https://www.vibemostwanted.xyz/screenshot.jpg",
        width: 1200,
        height: 800,
        alt: "$VBMS Game"
      }
    ],
    type: "website",
    siteName: "$VBMS",
  },
  twitter: {
    card: "summary_large_image",
    title: "$VBMS - Meme Card Game",
    description: "Battle with meme cards in PvE and PvP modes",
    images: ["https://www.vibemostwanted.xyz/screenshot.jpg"],
  },
  other: {
    // Base.dev App ID (REQUIRED FOR ANALYTICS)
    "base:app_id": "6912770b47fdf84bd17202bc",
    // Farcaster Mini App Meta Tag (REQUIRED FOR DISCOVERY)
    // v=4 cache bust - more cards, removed coquettish/viberuto/baseball
    "fc:miniapp": JSON.stringify({
      "version": "1",
      "imageUrl": "https://www.vibemostwanted.xyz/opengraph-image?v=4",
      "button": {
        "title": "Play Now",
        "action": {
          "type": "launch_miniapp",
          "name": "$VBMS",
          "url": "https://www.vibemostwanted.xyz",
          "splashImageUrl": "https://www.vibemostwanted.xyz/splash.gif",
          "splashBackgroundColor": "#0C0C0C"
        }
      }
    }),
    // Backward compatibility with old frame spec
    "fc:frame": JSON.stringify({
      "version": "1",
      "imageUrl": "https://www.vibemostwanted.xyz/opengraph-image?v=4",
      "button": {
        "title": "Play Now",
        "action": {
          "type": "launch_miniapp",
          "name": "$VBMS",
          "url": "https://www.vibemostwanted.xyz",
          "splashImageUrl": "https://www.vibemostwanted.xyz/splash.gif",
          "splashBackgroundColor": "#0C0C0C"
        }
      }
    }),
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="overflow-x-hidden">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${cinzel.variable} ${playfair.variable} ${rajdhani.variable} antialiased overflow-x-hidden`}
      >
        <ErrorBoundary>
          <NeynarMiniAppProvider>
            <ConvexClientProvider>
              <Web3Provider>
                <ProfileProvider>
                  <PlayerCardsProvider>
                  <LanguageProvider>
                    <MusicProvider>
                      <FarcasterNotificationRegistration />
                      {children}
                    </MusicProvider>
                  </LanguageProvider>
                </PlayerCardsProvider>
                </ProfileProvider>
              </Web3Provider>
            </ConvexClientProvider>
          </NeynarMiniAppProvider>
        </ErrorBoundary>
        <Analytics />
      </body>
    </html>
  );
}
