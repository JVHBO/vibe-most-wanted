"use client";

// neobrutalism applied server-side on <body> in layout.tsx — no Suspense needed
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
