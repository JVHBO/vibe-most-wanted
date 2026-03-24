"use client";

import { Suspense } from "react";

// neobrutalism is now the default theme — applied directly on <body> in layout.tsx
// ThemeProvider kept as a wrapper for future theme extensions
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      {children}
    </Suspense>
  );
}
