"use client";

import { useEffect, Suspense } from "react";

function ThemeDetector() {
  useEffect(() => {
    document.body.classList.add("neobrutalism");
    return () => {
      document.body.classList.remove("neobrutalism");
    };
  }, []);

  return null;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <ThemeDetector />
      </Suspense>
      {children}
    </>
  );
}
