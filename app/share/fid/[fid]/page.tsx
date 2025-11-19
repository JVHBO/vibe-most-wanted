'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function FidSharePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to /fid page in miniapp after 2 seconds
    const timeout = setTimeout(() => {
      router.push('/fid');
    }, 2000);

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <div className="min-h-screen bg-vintage-deep-black text-vintage-ice flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-display font-bold text-vintage-gold mb-4">
          VibeFID
        </h1>
        <p className="text-vintage-burnt-gold mb-4">Opening miniapp...</p>
        <div className="animate-pulse text-6xl">🎴</div>
      </div>
    </div>
  );
}
