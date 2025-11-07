# 🎮 Farcaster Mini App Development Guide

**Complete guide to building and deploying Farcaster mini apps**

**Last Updated**: 2025-11-07
**Based on**: Vibe Most Wanted production deployment

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Meta Tags Configuration](#meta-tags-configuration)
4. [Manifest File Setup](#manifest-file-setup)
5. [Asset Requirements](#asset-requirements)
6. [Next.js Configuration](#nextjs-configuration)
7. [Detection & Optimization](#detection--optimization)
8. [Deployment Checklist](#deployment-checklist)
9. [Testing & Validation](#testing--validation)
10. [Troubleshooting](#troubleshooting)
11. [Best Practices](#best-practices)

---

## Overview

Farcaster mini apps allow users to launch web applications directly within the Farcaster/Warpcast client. This guide covers everything you need to make your app discoverable and optimized for the Farcaster ecosystem.

### Key Components

1. **Meta Tags** - HTML tags for app discovery
2. **Manifest File** - JSON configuration at `.well-known/farcaster.json`
3. **Assets** - Icon, splash screen, and preview images
4. **Detection Logic** - Identify when running in Farcaster context
5. **Optimization** - UI/UX adjustments for mobile miniapp experience

---

## Prerequisites

### Required Knowledge

- Next.js 13+ (App Router)
- React Server Components vs Client Components
- TypeScript basics
- Basic understanding of Open Graph tags

### Tech Stack

```json
{
  "framework": "Next.js 15.5.6+",
  "runtime": "Node.js 18+",
  "deployment": "Vercel / any hosting with HTTPS",
  "requirements": [
    "HTTPS enabled (Farcaster requires SSL)",
    "Public domain with DNS configured",
    "Static asset hosting (CDN recommended)"
  ]
}
```

---

## Meta Tags Configuration

### 1. Core Meta Tags

Add to your `app/layout.tsx`:

```typescript
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Your App Name',
  description: 'Your app description',

  // OpenGraph (required for sharing)
  openGraph: {
    title: 'Your App Name',
    description: 'Your app description',
    url: 'https://yourdomain.com',
    siteName: 'Your App Name',
    images: [
      {
        url: 'https://yourdomain.com/screenshot.jpg',
        width: 1200,
        height: 800,
        alt: 'App Preview'
      }
    ],
    locale: 'en_US',
    type: 'website',
  },

  // Twitter Card (recommended)
  twitter: {
    card: 'summary_large_image',
    title: 'Your App Name',
    description: 'Your app description',
    images: ['https://yourdomain.com/screenshot.jpg'],
  },

  // Other meta tags
  other: {
    // CRITICAL: Farcaster Mini App Discovery Tag
    'fc:miniapp': JSON.stringify({
      version: "1",
      imageUrl: "https://yourdomain.com/screenshot.jpg",
      button: {
        title: "🎮 Play Now", // Can customize emoji + text
        action: {
          type: "launch_miniapp",
          name: "Your App Name",
          url: "https://yourdomain.com",
          splashImageUrl: "https://yourdomain.com/splash.png",
          splashBackgroundColor: "#000000" // Hex color
        }
      }
    }),

    // Backward compatibility (optional but recommended)
    'fc:frame': 'vNext',
  }
};
```

### 2. Alternative: Direct HTML Meta Tags

If you prefer adding tags directly in `<head>`:

```tsx
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Farcaster Mini App Tag */}
        <meta
          name="fc:miniapp"
          content='{"version":"1","imageUrl":"https://yourdomain.com/screenshot.jpg","button":{"title":"🎮 Play Now","action":{"type":"launch_miniapp","name":"Your App","url":"https://yourdomain.com","splashImageUrl":"https://yourdomain.com/splash.png","splashBackgroundColor":"#000000"}}}'
        />

        {/* Backward compatibility */}
        <meta property="fc:frame" content="vNext" />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### 3. Meta Tag JSON Schema

The `fc:miniapp` content must be valid JSON with this structure:

```typescript
interface FarcasterMiniAppMetaTag {
  version: "1";
  imageUrl: string; // Full URL to preview image (1200x800px recommended)
  button: {
    title: string; // Button text (max ~20 chars)
    action: {
      type: "launch_miniapp";
      name: string; // App name shown in launcher
      url: string; // Full URL to your app
      splashImageUrl: string; // Full URL to splash screen
      splashBackgroundColor: string; // Hex color code
    }
  }
}
```

---

## Manifest File Setup

### 1. Create Manifest File

Create file at `public/.well-known/farcaster.json`:

```json
{
  "frame": {
    "name": "Your App Name",
    "version": "1",
    "iconUrl": "https://yourdomain.com/icon.png",
    "homeUrl": "https://yourdomain.com",
    "imageUrl": "https://yourdomain.com/screenshot.jpg",
    "splashImageUrl": "https://yourdomain.com/splash.png",
    "splashBackgroundColor": "#000000",
    "webhookUrl": "https://yourdomain.com/api/webhook",
    "subtitle": "Short tagline here",
    "description": "Longer description of what your app does. This appears in app discovery.",
    "primaryCategory": "games"
  }
}
```

### 2. Manifest Field Descriptions

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| `name` | ✅ Yes | App name (short) | "Vibe Most Wanted" |
| `version` | ✅ Yes | Always "1" | "1" |
| `iconUrl` | ✅ Yes | Square app icon | "https://..." |
| `homeUrl` | ✅ Yes | Main app URL | "https://..." |
| `imageUrl` | ✅ Yes | Preview image | "https://..." |
| `splashImageUrl` | ✅ Yes | Loading screen | "https://..." |
| `splashBackgroundColor` | ✅ Yes | Hex color | "#FFD700" |
| `webhookUrl` | ⚠️ Optional | Webhook endpoint | "https://..." |
| `subtitle` | ⚠️ Optional | Tagline | "Battle NFT Cards" |
| `description` | ⚠️ Optional | Full description | "A card battle..." |
| `primaryCategory` | ⚠️ Optional | Category | "games" |

### 3. Available Categories

```typescript
type FarcasterCategory =
  | "games"
  | "social"
  | "utilities"
  | "productivity"
  | "entertainment"
  | "finance"
  | "shopping";
```

---

## Asset Requirements

### 1. Screenshot / Preview Image

**File**: `public/screenshot.jpg` or `public/screenshot.png`

**Specifications**:
```
Aspect Ratio:  3:2 (recommended)
Min Size:      600x400px
Max Size:      3000x2000px
File Size:     < 10MB
Format:        PNG, JPG, GIF, or WebP
Purpose:       Preview when sharing in casts
```

**Tips**:
- Show actual app interface (not just logo)
- Include key features visually
- High contrast for mobile screens
- Text should be legible at small sizes

### 2. Splash Screen

**File**: `public/splash.png`

**Specifications**:
```
Dimensions:    512x512px to 1024x1024px (square)
Format:        PNG with transparency (recommended)
File Size:     < 2MB
Purpose:       Loading screen when launching app
```

**Tips**:
- Use transparent background (PNG)
- Center your logo/branding
- Pair with `splashBackgroundColor` for best look
- Keep design simple (shows briefly)

### 3. App Icon

**File**: `public/icon.png`

**Specifications**:
```
Dimensions:    512x512px (exactly square)
Format:        PNG with transparency
File Size:     < 1MB
Purpose:       App list icon in Farcaster
```

**Tips**:
- High contrast against dark and light backgrounds
- No text (too small to read)
- Simple, recognizable design
- Consistent with brand

---

## Next.js Configuration

### 1. Configure CORS Headers

**File**: `next.config.js`

```javascript
/** @type {import('next').NextConfig} */
module.exports = {
  async headers() {
    return [
      {
        // Allow Farcaster to access manifest
        source: '/.well-known/farcaster.json',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Content-Type',
            value: 'application/json',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600', // Cache for 1 hour
          },
        ],
      },
      {
        // Optimize image caching
        source: '/(icon|splash|screenshot)\\.(png|jpg|jpeg|webp)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};
```

### 2. Environment Detection

Create utility to detect Farcaster context:

**File**: `lib/farcaster-detection.ts`

```typescript
/**
 * Detects if app is running inside Farcaster miniapp
 * Checks user agent and URL parameters
 */
export function isInFarcaster(): boolean {
  if (typeof window === 'undefined') return false;

  const userAgent = window.navigator.userAgent.toLowerCase();
  const urlParams = new URLSearchParams(window.location.search);

  // Check user agent
  const isFarcasterUA = userAgent.includes('farcaster');

  // Check URL parameter (sometimes Farcaster passes this)
  const hasFarcasterParam = urlParams.has('farcaster') ||
                           urlParams.has('fc_miniapp');

  return isFarcasterUA || hasFarcasterParam;
}

/**
 * Hook version for React components
 */
export function useIsInFarcaster(): boolean {
  const [isFC, setIsFC] = React.useState(false);

  React.useEffect(() => {
    setIsFC(isInFarcaster());
  }, []);

  return isFC;
}
```

---

## Detection & Optimization

### 1. Conditional Rendering Based on Context

```tsx
'use client';

import { useIsInFarcaster } from '@/lib/farcaster-detection';

export default function Page() {
  const isInFarcaster = useIsInFarcaster();

  return (
    <div className={`
      ${!isInFarcaster ? 'max-w-7xl mx-auto' : ''}
      ${!isInFarcaster ? 'px-4' : ''}
    `}>
      {/* Content */}

      {/* Show connect wallet only outside Farcaster */}
      {!isInFarcaster && (
        <button>Connect Wallet</button>
      )}

      {/* Different layout for miniapp */}
      {isInFarcaster ? (
        <CompactMobileLayout />
      ) : (
        <DesktopLayout />
      )}
    </div>
  );
}
```

### 2. Farcaster-Specific Optimizations

```tsx
// Hide elements not needed in miniapp
{!isInFarcaster && <Header />}
{!isInFarcaster && <Footer />}
{!isInFarcaster && <NavigationBar />}

// Adjust spacing for mobile-first miniapp
<div className={`
  ${isInFarcaster ? 'p-2' : 'p-8'}
  ${isInFarcaster ? 'text-sm' : 'text-base'}
`}>

// Different behavior in miniapp
const handleShare = () => {
  if (isInFarcaster) {
    // Use Farcaster share intent
    window.location.href = `farcaster://share?text=...`;
  } else {
    // Use web share API
    navigator.share({ ... });
  }
};
```

### 3. Disable Features in Miniapp

Some features may not work or make sense in miniapp context:

```tsx
const isInFarcaster = useIsInFarcaster();

// Disable wallet connection in miniapp
const canConnectWallet = !isInFarcaster;

// Hide notifications system (may not work in iframe)
const showNotifications = !isInFarcaster;

// Adjust max content width
const maxWidth = isInFarcaster ? '100%' : '1280px';
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All meta tags added to `layout.tsx`
- [ ] `farcaster.json` manifest created at `public/.well-known/`
- [ ] All 3 images created (screenshot, splash, icon) in `public/`
- [ ] Image dimensions and file sizes verified
- [ ] CORS headers configured in `next.config.js`
- [ ] Farcaster detection implemented
- [ ] Conditional rendering tested locally

### Deployment

```bash
# 1. Build and test locally first
npm run build
npm start

# 2. Test manifest accessibility
curl http://localhost:3000/.well-known/farcaster.json

# 3. Test images load
curl http://localhost:3000/screenshot.jpg
curl http://localhost:3000/splash.png
curl http://localhost:3000/icon.png

# 4. View source and verify meta tags
# Open http://localhost:3000
# Right-click > View Page Source
# Search for "fc:miniapp"

# 5. Deploy to production
git add .
git commit -m "feat: add Farcaster miniapp support"
git push
```

### Post-Deployment

- [ ] Verify production site loads: `https://yourdomain.com`
- [ ] Check manifest: `curl https://yourdomain.com/.well-known/farcaster.json`
- [ ] Check images load: `curl -I https://yourdomain.com/screenshot.jpg`
- [ ] Verify meta tag in HTML source (View Source)
- [ ] Validate JSON: Copy `fc:miniapp` content to jsonlint.com
- [ ] Test share link in Warpcast cast
- [ ] Wait 1-24 hours for indexing

---

## Testing & Validation

### 1. Local Testing

```bash
# Start dev server
npm run dev

# In browser
# 1. Open http://localhost:3000
# 2. Right-click > View Page Source
# 3. Search for 'fc:miniapp'
# 4. Verify JSON is valid (no syntax errors)

# Test manifest
curl http://localhost:3000/.well-known/farcaster.json | jq

# Test detection
# Add ?farcaster=true to URL to simulate miniapp
# http://localhost:3000?farcaster=true
```

### 2. Production Validation

#### A. Farcaster Frame Validator

1. Go to: https://warpcast.com/~/developers/frames
2. Enter your URL: `https://yourdomain.com`
3. Click "Validate"
4. Check for errors

#### B. Manual Meta Tag Check

```bash
# Fetch and search for meta tag
curl -s https://yourdomain.com | grep -o 'fc:miniapp.*' | head -1

# Should return:
# fc:miniapp" content='{"version":"1",...}'
```

#### C. Manifest Validation

```bash
# Check manifest is accessible
curl https://yourdomain.com/.well-known/farcaster.json

# Should return valid JSON (not 404)
```

#### D. Image Validation

```bash
# Check all images return 200
curl -I https://yourdomain.com/screenshot.jpg
curl -I https://yourdomain.com/splash.png
curl -I https://yourdomain.com/icon.png

# All should return: HTTP/2 200
```

### 3. End-to-End Test

**Test in Warpcast**:

1. Open Warpcast mobile app
2. Create a new cast
3. Paste your URL: `https://yourdomain.com`
4. Verify preview appears with button
5. Click button to launch miniapp
6. Verify splash screen shows
7. Verify app loads correctly

**Expected behavior**:
- ✅ Preview card shows your screenshot
- ✅ Button shows your custom text (e.g., "🎮 Play Now")
- ✅ Clicking opens miniapp in Farcaster
- ✅ Splash screen displays while loading
- ✅ App functions correctly in miniapp context

---

## Troubleshooting

### Issue: Meta Tag Not Appearing

**Symptom**: View Source doesn't show `fc:miniapp` tag

**Solutions**:

```bash
# 1. Clear Next.js cache
rm -rf .next
npm run dev

# 2. Hard refresh browser
# Windows/Linux: Ctrl+Shift+R
# Mac: Cmd+Shift+R

# 3. Verify metadata export
# Check that layout.tsx has correct metadata export
```

### Issue: JSON Invalid Error

**Symptom**: Meta tag exists but has syntax errors

**Solutions**:

1. Copy the content of `fc:miniapp` meta tag
2. Paste into https://jsonlint.com
3. Fix any syntax errors
4. Use `JSON.stringify()` in code (don't manually write JSON string)

```typescript
// ❌ Wrong - manual string
'fc:miniapp': '{"version":"1","imageUrl":"..."}'

// ✅ Correct - JSON.stringify
'fc:miniapp': JSON.stringify({ version: "1", imageUrl: "..." })
```

### Issue: Manifest Returns 404

**Symptom**: `curl` to `/.well-known/farcaster.json` returns 404

**Solutions**:

```bash
# 1. Verify file location
ls -la public/.well-known/farcaster.json

# 2. Verify Next.js serves it
# Add to next.config.js:
async rewrites() {
  return [
    {
      source: '/.well-known/farcaster.json',
      destination: '/api/farcaster-manifest'
    }
  ];
}

# 3. Or create API route that returns the JSON
// app/api/farcaster-manifest/route.ts
export async function GET() {
  return Response.json({
    frame: { ... }
  });
}
```

### Issue: Images Not Loading

**Symptom**: Image URLs return 404 or error

**Solutions**:

```bash
# 1. Check files exist
ls -la public/screenshot.jpg
ls -la public/splash.png
ls -la public/icon.png

# 2. Check file names match manifest exactly
# (case-sensitive on Linux servers)

# 3. Check file permissions
chmod 644 public/*.{jpg,png}

# 4. Use absolute URLs in all configs
# ❌ Wrong: "/screenshot.jpg"
# ✅ Correct: "https://yourdomain.com/screenshot.jpg"
```

### Issue: App Not in Farcaster Search

**Symptom**: Can't find app in Warpcast discovery after 24+ hours

**Possible causes**:

1. **Cache delay** - Wait up to 24-48 hours for indexing
2. **Missing meta tag** - Verify `fc:miniapp` exists in HTML
3. **Invalid JSON** - Validate with jsonlint.com
4. **HTTPS not enabled** - Farcaster requires SSL
5. **Domain not verified** - Check if domain is accessible

**Debug steps**:

```bash
# 1. Verify all requirements met
curl -s https://yourdomain.com | grep "fc:miniapp"
curl https://yourdomain.com/.well-known/farcaster.json
curl -I https://yourdomain.com/screenshot.jpg

# 2. Test sharing in cast (this should work immediately)
# Even if not in search, sharing should show preview

# 3. Check Farcaster Discord
# https://discord.gg/farcaster
# Channel: #miniapps
```

### Issue: Different Behavior in Miniapp

**Symptom**: App works on web but breaks in Farcaster miniapp

**Common causes**:

1. **Wallet connection** - May not work in iframe
2. **localStorage** - May be blocked in some contexts
3. **Popups/redirects** - Blocked in iframe
4. **CORS issues** - API calls may fail

**Solutions**:

```typescript
// Detect and handle gracefully
const isInFarcaster = useIsInFarcaster();

// 1. Disable wallet features
{!isInFarcaster && <ConnectWalletButton />}

// 2. Use sessionStorage instead of localStorage
const storage = isInFarcaster ? sessionStorage : localStorage;

// 3. Avoid popups
if (isInFarcaster) {
  // Use inline modal instead of window.open()
  setShowModal(true);
} else {
  window.open('/external-page');
}
```

---

## Best Practices

### 1. Performance Optimization

```typescript
// Lazy load heavy components when not in miniapp
const HeavyFeature = !isInFarcaster
  ? dynamic(() => import('@/components/HeavyFeature'))
  : () => null;

// Optimize images
import Image from 'next/image';

<Image
  src="/screenshot.jpg"
  alt="Preview"
  width={1200}
  height={800}
  priority={false}
  loading="lazy"
/>
```

### 2. Mobile-First Design

```css
/* Design for mobile (miniapp default) first */
.container {
  padding: 8px;
  font-size: 14px;
}

/* Then enhance for desktop */
@media (min-width: 768px) {
  .container {
    padding: 32px;
    font-size: 16px;
  }
}
```

### 3. Graceful Degradation

```typescript
// Always provide fallbacks
const userFid = useFarcasterUser()?.fid ?? null;

if (!userFid && isInFarcaster) {
  return <div>Please sign in to Farcaster</div>;
}

// Feature detection
const canShare = typeof navigator.share !== 'undefined';
```

### 4. Analytics Tracking

```typescript
// Track miniapp usage separately
useEffect(() => {
  if (isInFarcaster) {
    analytics.track('miniapp_view', {
      page: router.pathname,
      context: 'farcaster_miniapp'
    });
  }
}, [isInFarcaster]);
```

### 5. SEO Considerations

```typescript
// Don't hurt SEO with detection
// Server-render full content, hide client-side
export const metadata = {
  // Full SEO metadata for search engines
  title: 'Full Title',
  description: 'Full Description',
  // ...
};

// Then hide elements client-side if needed
'use client';

{!isInFarcaster && <FullNavigation />}
```

### 6. Security

```typescript
// Validate Farcaster context if doing sensitive operations
async function validateFarcasterUser() {
  if (!isInFarcaster) return null;

  // Verify user via Farcaster SDK
  const user = await farcasterSDK.getCurrentUser();

  if (!user) {
    throw new Error('Invalid Farcaster session');
  }

  return user;
}
```

---

## Additional Resources

### Official Documentation

- **Farcaster Mini Apps**: https://miniapps.farcaster.xyz/docs
- **Sharing Guide**: https://miniapps.farcaster.xyz/docs/guides/sharing
- **Frame Spec**: https://docs.farcaster.xyz/reference/frames/spec
- **Manifest Spec**: https://miniapps.farcaster.xyz/docs/guides/manifest

### Community

- **Discord**: https://discord.gg/farcaster (channel: #miniapps)
- **Warpcast Developers**: https://warpcast.com/~/developers

### Tools

- **Frame Validator**: https://warpcast.com/~/developers/frames
- **JSON Validator**: https://jsonlint.com
- **Image Optimizer**: https://squoosh.app

---

## Quick Reference Checklist

### Essential Files

```
your-app/
├── app/
│   └── layout.tsx          # ✅ Add fc:miniapp meta tag
├── public/
│   ├── .well-known/
│   │   └── farcaster.json  # ✅ Create manifest
│   ├── screenshot.jpg      # ✅ 1200x800px preview
│   ├── splash.png          # ✅ 512x512px loading screen
│   └── icon.png            # ✅ 512x512px app icon
├── lib/
│   └── farcaster-detection.ts  # ✅ Detection utility
└── next.config.js          # ✅ CORS headers
```

### Deployment Validation

```bash
# Run these commands after deployment
curl -s https://yourdomain.com | grep "fc:miniapp"
curl https://yourdomain.com/.well-known/farcaster.json | jq
curl -I https://yourdomain.com/screenshot.jpg | grep "200"
curl -I https://yourdomain.com/splash.png | grep "200"
curl -I https://yourdomain.com/icon.png | grep "200"
```

### Timeline Expectations

| Stage | Timeline | What Happens |
|-------|----------|--------------|
| Deploy | 0 min | Site goes live |
| Meta tags active | 0 min | Immediately in HTML |
| Share preview works | 0-5 min | Cast shows preview + button |
| Farcaster discovery | 1-48 hours | App appears in search |

---

**Last Updated**: 2025-11-07
**Maintained By**: Vibe Most Wanted Team
**Version**: 1.0.0

**Questions?** Check troubleshooting section or ask in Farcaster Discord #miniapps channel.
