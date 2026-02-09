"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

const vibefidConvexUrl =
  process.env.NEXT_PUBLIC_VIBEFID_CONVEX_URL ||
  "https://scintillating-mandrill-101.convex.cloud";

const vibefidConvex = new ConvexReactClient(vibefidConvexUrl);

export function VibeFIDConvexProvider({ children }: { children: ReactNode }) {
  return <ConvexProvider client={vibefidConvex}>{children}</ConvexProvider>;
}

export { vibefidConvex };
