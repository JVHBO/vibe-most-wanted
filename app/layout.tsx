import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Cinzel_Decorative, Playfair_Display_SC, Rajdhani } from "next/font/google";
import "./globals.css";
import "./neobrutalism.css";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { MusicProvider } from "@/contexts/MusicContext";
import { Web3Provider } from "@/contexts/Web3Provider";
import { ConvexClientProvider } from "@/contexts/ConvexClientProvider";
import { PlayerCardsProvider } from "@/contexts/PlayerCardsContext";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { FarcasterNotificationRegistration } from "@/components/FarcasterNotificationRegistration";
import { BrowserNotifications } from "@/components/BrowserNotifications";
import ErrorBoundary from "@/components/ErrorBoundary";
import { NeynarMiniAppProvider } from "@/contexts/NeynarMiniAppProvider";
import { MiniappFrame } from "@/components/MiniappFrame";
import GlobalBanGuard from "@/components/GlobalBanGuard";
import { GlobalProfileInit } from "@/components/GlobalProfileInit";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const cinzel = Cinzel_Decorative({
  variable: "--font-vintage",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  display: "swap",
});

const playfair = Playfair_Display_SC({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  display: "swap",
});

const rajdhani = Rajdhani({
  variable: "--font-modern",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

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
    url: "https://vibemostwanted.xyz",
    images: [
      {
        url: "https://vibemostwanted.xyz/screenshot.jpg",
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
    images: ["https://vibemostwanted.xyz/screenshot.jpg"],
  },
  other: {
    // Base.dev App ID (REQUIRED FOR ANALYTICS)
    "base:app_id": "6912770b47fdf84bd17202bc",
    "talentapp:project_verification": "5b696287433e72cbb5c551e18e2a464ef5d757a0c20076431c4334b927a6f3a426c8a7aaa5e2bd36e58e9c40d90e806b3fdfc5b5b1a1ba2f718315b9d2aa0662",
    // Farcaster Mini App Meta Tag (REQUIRED FOR DISCOVERY)
    // v=4 cache bust - more cards, removed coquettish/viberuto/baseball
    "fc:miniapp": JSON.stringify({
      "version": "1",
      "imageUrl": "https://vibemostwanted.xyz/opengraph-image?v=4",
      "button": {
        "title": "Play Now",
        "action": {
          "type": "launch_miniapp",
          "name": "$VBMS",
          "url": "https://vibemostwanted.xyz",
          "splashImageUrl": "https://vibemostwanted.xyz/splash-new.png",
          "splashBackgroundColor": "#0C0C0C"
        }
      }
    }),
    // Backward compatibility with old frame spec
    "fc:frame": JSON.stringify({
      "version": "1",
      "imageUrl": "https://vibemostwanted.xyz/opengraph-image?v=4",
      "button": {
        "title": "Play Now",
        "action": {
          "type": "launch_miniapp",
          "name": "$VBMS",
          "url": "https://vibemostwanted.xyz",
          "splashImageUrl": "https://vibemostwanted.xyz/splash-new.png",
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
    <html lang="en" style={{ overflowX: 'clip' }}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${cinzel.variable} ${playfair.variable} ${rajdhani.variable} antialiased`}
      >
        <ErrorBoundary>
          <ThemeProvider>
          <NeynarMiniAppProvider>
            <ConvexClientProvider>
              <Web3Provider>
                <ProfileProvider>
                  <PlayerCardsProvider>
                  <LanguageProvider>
                    <MusicProvider>
                      <FarcasterNotificationRegistration />
                      <BrowserNotifications />
                      <GlobalProfileInit />
                      <GlobalBanGuard>
                      <MiniappFrame>
                        {children}
                      </MiniappFrame>
                    </GlobalBanGuard>
                    </MusicProvider>
                  </LanguageProvider>
                </PlayerCardsProvider>
                </ProfileProvider>
              </Web3Provider>
            </ConvexClientProvider>
          </NeynarMiniAppProvider>
          </ThemeProvider>
        <link rel="stylesheet" href="https://api.openads.world/api/v1/serve/dynamic-css?publisher=0x2a9585da40de004d6ff0f5f12cfe726bd2f98b52" />
        <iframe className="openads-popup" src="https://api.openads.world/serve?publisher=0x2a9585da40de004d6ff0f5f12cfe726bd2f98b52&placement=300x250-0x2a9585da40de004d6ff0f5f12cfe726bd2f98b52&position=popup&parent_url=https%3A%2F%2Fvibemostwanted.xyz&app_id=c28f0313-c888-4d31-a8cc-c59fe2666177" title="Advertisement" width="300" height="250" style={{ border: "none" }} frameBorder="0" scrolling="no" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" allow="clipboard-write"></iframe>
        <iframe className="openads-floating" src="https://api.openads.world/serve?publisher=0x2a9585da40de004d6ff0f5f12cfe726bd2f98b52&placement=64x64-0x2a9585da40de004d6ff0f5f12cfe726bd2f98b52&position=floating&parent_url=https%3A%2F%2Fvibemostwanted.xyz&app_id=c28f0313-c888-4d31-a8cc-c59fe2666177" title="Advertisement" width="64" height="64" style={{ position: "fixed", top: "20px", right: "20px", width: "64px", height: "64px", border: "none", borderRadius: "50%", zIndex: 999999 }} frameBorder="0" scrolling="no" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" allow="clipboard-write"></iframe>
        <iframe className="openads-top-banner" src="https://api.openads.world/serve?publisher=0x2a9585da40de004d6ff0f5f12cfe726bd2f98b52&placement=320x50_top-0x2a9585da40de004d6ff0f5f12cfe726bd2f98b52&position=top&parent_url=https%3A%2F%2Fvibemostwanted.xyz&app_id=c28f0313-c888-4d31-a8cc-c59fe2666177" title="Advertisement" width="320" height="50" style={{ border: "none" }} frameBorder="0" scrolling="no" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" allow="clipboard-write"></iframe>
        <iframe className="openads-banner" src="https://api.openads.world/serve?publisher=0x2a9585da40de004d6ff0f5f12cfe726bd2f98b52&placement=320x50-0x2a9585da40de004d6ff0f5f12cfe726bd2f98b52&position=bottom&parent_url=https%3A%2F%2Fvibemostwanted.xyz&app_id=c28f0313-c888-4d31-a8cc-c59fe2666177" title="Advertisement" width="320" height="50" style={{ border: "none" }} frameBorder="0" scrolling="no" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" allow="clipboard-write"></iframe>
        </ErrorBoundary>
      </body>
    </html>
  );
}
