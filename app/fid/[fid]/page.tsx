'use client';

import { useParams, useRouter } from 'next/navigation';
import { VibeFidMailModal } from '@/components/fid/VibeFidMailModal';
import { useFarcasterContext } from '@/hooks/fid/useFarcasterContext';

export default function FidProfilePage() {
  const params = useParams();
  const router = useRouter();
  const fid = parseInt(params.fid as string);
  const { user } = useFarcasterContext();
  const viewerFid = user?.fid ?? undefined;

  if (!fid || isNaN(fid)) {
    router.push('/');
    return null;
  }

  return (
    <VibeFidMailModal
      fid={fid}
      ownerFid={viewerFid ?? undefined}
      onClose={() => router.push('/')}
    />
  );
}
