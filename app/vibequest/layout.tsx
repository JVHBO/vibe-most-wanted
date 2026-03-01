import { VibeFIDConvexProvider } from '@/contexts/VibeFIDConvexProvider';

export default function VibeQuestLayout({ children }: { children: React.ReactNode }) {
  return <VibeFIDConvexProvider>{children}</VibeFIDConvexProvider>;
}
