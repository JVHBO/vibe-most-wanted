export interface SocialQuest {
  id: string;
  type: "follow" | "channel" | "notification" | "miniapp";
  target: string;
  targetFid?: number;
  displayName: string;
  description: string;
  reward: number;
  icon: string;
  url: string;
  collection?: string;
  group?: string;
  pfpUrl?: string;
  bannerUrl?: string;
  featured?: boolean;
}

export const CHANNEL_IDS = {} as const;
export const SOCIAL_QUESTS: SocialQuest[] = [];
