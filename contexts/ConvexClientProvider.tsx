"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

// Provide a fallback for build time when env var might not be available
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "https://placeholder.convex.cloud";

if (!process.env.NEXT_PUBLIC_CONVEX_URL && typeof window !== "undefined") {
  console.error("NEXT_PUBLIC_CONVEX_URL is not set. Convex will not work properly.");
}

const convex = new ConvexReactClient(convexUrl);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
