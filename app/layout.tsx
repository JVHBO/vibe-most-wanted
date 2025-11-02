import type { Metadata } from "next";
import { Geist, Geist_Mono, Cinzel_Decorative, Playfair_Display_SC, Rajdhani } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { Web3Provider } from "@/contexts/Web3Provider";
import { ConvexClientProvider } from "@/contexts/ConvexClientProvider";
import { FarcasterNotificationRegistration } from "@/components/FarcasterNotificationRegistration";

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
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "/favicon-32x32.png",
    apple: "/apple-touch-icon.png",
    other: [
      { rel: "android-chrome-192x192", url: "/android-chrome-192x192.png" },
      { rel: "android-chrome-512x512", url: "/android-chrome-512x512.png" },
    ],
  },
  openGraph: {
    title: "VIBE MOST WANTED - NFT Card Game",
    description: "Battle with your VIBE NFT cards in PvE and PvP modes",
    url: "https://www.vibemostwanted.xyz",
    images: [
      {
        url: "https://www.vibemostwanted.xyz/screenshot.jpg",
        width: 1200,
        height: 800,
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
    images: ["https://www.vibemostwanted.xyz/screenshot.jpg"],
  },
  other: {
    // Farcaster Mini App Meta Tag (NEW - REQUIRED FOR DISCOVERY)
    "fc:miniapp": JSON.stringify({
      "version": "1",
      "imageUrl": "https://www.vibemostwanted.xyz/screenshot.jpg",
      "button": {
        "title": "🎮 Play Now",
        "action": {
          "type": "launch_miniapp",
          "name": "VIBE MOST WANTED",
          "url": "https://www.vibemostwanted.xyz",
          "splashImageUrl": "https://www.vibemostwanted.xyz/splash.png",
          "splashBackgroundColor": "#FFD700"
        }
      }
    }),
    // Backward compatibility with old frame spec
    "fc:frame": JSON.stringify({
      "version": "1",
      "imageUrl": "https://www.vibemostwanted.xyz/screenshot.jpg",
      "button": {
        "title": "🎮 Play Now",
        "action": {
          "type": "launch_frame",
          "name": "VIBE MOST WANTED",
          "url": "https://www.vibemostwanted.xyz",
          "splashImageUrl": "https://www.vibemostwanted.xyz/splash.png",
          "splashBackgroundColor": "#FFD700"
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
      <head>
        {/* Farcaster Mini App Meta Tag - REQUIRED FOR DISCOVERY */}
        <meta name="fc:miniapp" content={JSON.stringify({
          version: "1",
          imageUrl: "https://www.vibemostwanted.xyz/screenshot.jpg",
          button: {
            title: "🎮 Play Now",
            action: {
              type: "launch_miniapp",
              name: "VIBE MOST WANTED",
              url: "https://www.vibemostwanted.xyz",
              splashImageUrl: "https://www.vibemostwanted.xyz/splash.png",
              splashBackgroundColor: "#FFD700"
            }
          }
        })} />

        {/* Backward compatibility */}
        <meta name="fc:frame" content={JSON.stringify({
          version: "1",
          imageUrl: "https://www.vibemostwanted.xyz/screenshot.jpg",
          button: {
            title: "🎮 Play Now",
            action: {
              type: "launch_frame",
              name: "VIBE MOST WANTED",
              url: "https://www.vibemostwanted.xyz",
              splashImageUrl: "https://www.vibemostwanted.xyz/splash.png",
              splashBackgroundColor: "#FFD700"
            }
          }
        })} />

        {/* OpenGraph */}
        <meta property="og:title" content="VIBE MOST WANTED - NFT Card Game" />
        <meta property="og:description" content="Battle with your VIBE NFT cards in PvE and PvP modes" />
        <meta property="og:image" content="https://www.vibemostwanted.xyz/screenshot.jpg" />
        <meta property="og:url" content="https://www.vibemostwanted.xyz" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="VIBE MOST WANTED" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="VIBE MOST WANTED - NFT Card Game" />
        <meta name="twitter:description" content="Battle with your VIBE NFT cards in PvE and PvP modes" />
        <meta name="twitter:image" content="https://www.vibemostwanted.xyz/screenshot.jpg" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${cinzel.variable} ${playfair.variable} ${rajdhani.variable} antialiased overflow-x-hidden`}
      >
        <ConvexClientProvider>
          <Web3Provider>
            <LanguageProvider>
              <FarcasterNotificationRegistration />
              {children}
            </LanguageProvider>
          </Web3Provider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
