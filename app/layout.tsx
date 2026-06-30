import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Cinzel_Decorative, Playfair_Display_SC, Rajdhani } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { MusicProvider } from "@/contexts/MusicContext";
import { Web3Provider } from "@/contexts/Web3Provider";
import { ConvexClientProvider } from "@/contexts/ConvexClientProvider";
import { PlayerCardsProvider } from "@/contexts/PlayerCardsContext";
import { ProfileProvider } from "@/contexts/ProfileContext";
import ErrorBoundary from "@/components/ErrorBoundary";
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
    "talentapp:project_verification": "5b696287433e72cbb5c551e18e2a464ef5d757a0c20076431c4334b927a6f3a426c8a7aaa5e2bd36e58e9c40d90e806b3fdfc5b5b1a1ba2f718315b9d2aa0662",
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
            <ConvexClientProvider>
              <Web3Provider>
                <ProfileProvider>
                  <PlayerCardsProvider>
                  <LanguageProvider>
                    <MusicProvider>
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
          </ThemeProvider>
        </ErrorBoundary>
      <Analytics />
      </body>
    </html>
  );
}
