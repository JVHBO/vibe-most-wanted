"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";

function ThemeDetector() {
  const searchParams = useSearchParams();
  const theme = searchParams.get("theme");

  useEffect(() => {
    if (theme === "neobrutalism") {
      document.body.classList.add("neobrutalism");
      return () => {
        document.body.classList.remove("neobrutalism");
      };
    } else {
      document.body.classList.remove("neobrutalism");
    }
  }, [theme]);

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
