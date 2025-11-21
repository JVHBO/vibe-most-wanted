'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SharePageClient({ fid }: { fid: string }) {
  const router = useRouter();

  useEffect(() => {
    // Redirect to specific VibeFID card page after 1 second
    const timeout = setTimeout(() => {
      router.push(`/fid/${fid}`);
    }, 1000);

    return () => clearTimeout(timeout);
  }, [router, fid]);

  return (
    <div className="min-h-screen bg-vintage-deep-black text-vintage-ice flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-display font-bold text-vintage-gold mb-4">
          VibeFID Card #{fid}
        </h1>
        <p className="text-vintage-burnt-gold mb-4">Loading card details...</p>
        <div className="animate-pulse text-6xl mb-4">🎴</div>
        <p className="text-vintage-ice/50 text-sm">
          Redirecting to card page...
        </p>
      </div>
    </div>
  );
}
