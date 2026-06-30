"use client";

interface SocialQuestsPanelProps {
  address: string;
  userFid?: number;
  soundEnabled?: boolean;
  onRewardClaimed?: (amount: number) => void;
  hasVibeBadge?: boolean;
  hasVibeFID?: boolean;
  onOpenFidModal?: () => void;
}

export function SocialQuestsPanel(_props: SocialQuestsPanelProps) {
  return null;
}
