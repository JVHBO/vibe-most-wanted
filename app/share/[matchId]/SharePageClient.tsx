'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SharePageClient() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home page after 2 seconds
    const timeout = setTimeout(() => {
      router.push('/');
    }, 2000);

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <div className="min-h-screen bg-vintage-deep-black text-vintage-ice flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-display font-bold text-vintage-gold mb-4">
          VIBE MOST WANTED
        </h1>
        <p className="text-vintage-burnt-gold mb-4">Redirecting to game...</p>
        <div className="animate-pulse text-6xl">🎮</div>
      </div>
    </div>
  );
}
