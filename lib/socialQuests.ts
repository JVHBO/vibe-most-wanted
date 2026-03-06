/**
 * Social Quests Configuration
 *
 * Define all social quests (follow creators, join channels)
 * Verification is done via Neynar API
 */

export interface SocialQuest {
  id: string;
  type: 'follow' | 'channel' | 'notification' | 'miniapp';
  target: string; // username for follow, channel ID for channel, '' for SDK actions
  targetFid?: number; // FID for follow quests
  displayName: string;
  description: string;
  reward: number;
  icon: string;
  url: string; // Link to complete the quest (empty for SDK actions)
  collection?: string; // Related collection (optional)
  group?: string; // Category group for carousel display
  pfpUrl?: string; // Hardcoded pfp URL (avoids Neynar API call)
  bannerUrl?: string; // Hardcoded banner URL (avoids Neynar API call)
}

// Channel IDs from Farcaster
export const CHANNEL_IDS = {
  'vibe-most-wanted': 'vibe-most-wanted',
  'scum': 'scum', // cu-mi-oh channel
  'fidmfers': 'fidmfers',
} as const;

// Social Quests Pool - HALVED Jan 25 2026 (Vibe Clash is main mode)
// VibeFID holders get 2x rewards (checked in backend)
export const SOCIAL_QUESTS: SocialQuest[] = [
  // 🔔 SDK Actions (Notifications & Miniapp) - 250 VBMS each (halved)
  {
    id: 'enable_notifications',
    type: 'notification',
    target: '',
    displayName: '🔔 Enable Notifications',
    description: 'Get game updates & rewards',
    reward: 250, // was 500
    icon: '🔔',
    url: '',
  },
  {
    id: 'add_miniapp',
    type: 'miniapp',
    target: '',
    displayName: '⭐ Add to Favorites',
    description: 'Add VBMS to your favorites',
    reward: 250, // was 500
    icon: '⭐',
    url: '',
  },

  // $VBMS - 100 follow, 200 channel
  {
    id: 'follow_jvhbo',
    type: 'follow',
    target: 'jvhbo',
    targetFid: 214746,
    displayName: 'Follow @jvhbo',
    description: 'Follow $VBMS creator',
    reward: 50,
    icon: '',
    url: 'https://warpcast.com/jvhbo',
    collection: 'vibe-most-wanted',
    group: 'vbms',
    pfpUrl: 'https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/3a7e672c-8ba9-496e-e651-4a27281a1500/original',
    bannerUrl: 'https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/75f1b780-45f6-4d39-b0f7-eeecc34aed00/original',
  },
  {
    id: 'join_vibe_most_wanted',
    type: 'channel',
    target: 'vibe-most-wanted',
    displayName: 'Join /vibemostwanted',
    description: 'Join the $VBMS channel',
    reward: 50,
    icon: '',
    url: 'https://warpcast.com/~/channel/vibe-most-wanted',
    collection: 'vibe-most-wanted',
    group: 'vbms',
    pfpUrl: 'https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/4bb83ee3-fb9a-4839-77f1-45c6fd30f100/original',
  },

  // Team Pothead
  {
    id: 'follow_betobutter',
    type: 'follow',
    target: 'betobutter',
    targetFid: 1009776,
    displayName: 'Follow @betobutter',
    description: 'Follow Team Pothead creator',
    reward: 50,
    icon: '',
    url: 'https://warpcast.com/betobutter',
    collection: 'team-pothead',
    group: 'vbms',
    pfpUrl: 'https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/fa007fdd-dd4f-4236-ecf5-d316939db200/original',
  },

  // GM VBRS
  {
    id: 'follow_jayabs',
    type: 'follow',
    target: 'jayabs',
    targetFid: 274150,
    displayName: 'Follow @jayabs',
    description: 'Follow GM VBRS creator',
    reward: 50,
    icon: '',
    url: 'https://warpcast.com/jayabs',
    collection: 'gm-vbrs',
    group: 'vbms',
    pfpUrl: 'https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/a95a837d-8589-4b6b-2d99-76e700a61000/rectcrop3',
  },

  // Viberuto - Creator then FID Mfers Channel
  {
    id: 'follow_smolemaru',
    type: 'follow',
    target: 'smolemaru',
    targetFid: 1076846,
    displayName: 'Follow @smolemaru',
    description: 'Follow Viberuto creator',
    reward: 50,
    icon: '',
    url: 'https://warpcast.com/smolemaru',
    collection: 'viberuto',
    group: 'vbms',
    pfpUrl: 'https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/e4678b3c-40b1-4e64-20c3-af626d792f00/original',
    bannerUrl: 'https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/a9c9038f-4f3b-43cf-256a-7a4d4ef3b700/original',
  },
  {
    id: 'join_fidmfers',
    type: 'channel',
    target: 'fidmfers',
    displayName: 'Join /fidmfers',
    description: 'Join the FID Mfers channel',
    reward: 50,
    icon: '',
    url: 'https://warpcast.com/~/channel/fidmfers',
    group: 'vbms',
    pfpUrl: 'https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/4ff0a9e9-0b5f-453f-07cd-567eaad18100/original',
  },

  // Meowverse
  {
    id: 'follow_denkurhq',
    type: 'follow',
    target: 'denkurhq',
    targetFid: 439094,
    displayName: 'Follow @denkurhq',
    description: 'Follow Meowverse creator',
    reward: 50,
    icon: '',
    url: 'https://warpcast.com/denkurhq',
    collection: 'meowverse',
    group: 'vbms',
    pfpUrl: 'https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/ae479d47-547a-4b03-f91b-781639f9a700/original',
  },

  // Poorly Drawn Pepes
  {
    id: 'follow_zazza',
    type: 'follow',
    target: 'zazza',
    targetFid: 16851,
    displayName: 'Follow @zazza',
    description: 'Follow Poorly Drawn Pepes creator',
    reward: 50,
    icon: '',
    url: 'https://warpcast.com/zazza',
    collection: 'poorly-drawn-pepes',
    group: 'vbms',
    pfpUrl: 'https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/92e7f5ba-a6d3-499a-47cc-b19bfd2bda00/original',
    bannerUrl: 'https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/9c712f19-2051-4c23-0836-f4ca201acf00/original',
  },

  // Vibe FX
  {
    id: 'follow_bradenwolf',
    type: 'follow',
    target: 'bradenwolf',
    targetFid: 1012281,
    displayName: 'Follow @bradenwolf',
    description: 'Follow Vibe FX creator',
    reward: 50,
    icon: '',
    url: 'https://warpcast.com/bradenwolf',
    collection: 'vibe-fx',
    group: 'vbms',
    pfpUrl: 'https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/34b3b41e-6717-4653-ba0f-1d4007824600/original',
  },

  // Cumioh
  {
    id: 'follow_degencummunist',
    type: 'follow',
    target: 'degencummunist.eth',
    targetFid: 17355,
    displayName: 'Follow @degencummunist.eth',
    description: 'Follow Cumioh creator',
    reward: 50,
    icon: '',
    url: 'https://warpcast.com/degencummunist.eth',
    group: 'vbms',
    pfpUrl: 'https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/7a30028d-83f9-46d9-1cc8-43b857638d00/original',
    bannerUrl: 'https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/63798561-7d8c-4e2c-5f28-8e4a9995c000/original',
  },

  // --- ARB Creators ---
  {
    id: 'follow_0xanas',
    type: 'follow',
    target: '0xanas.eth',
    targetFid: 249702,
    displayName: 'Follow @0xanas.eth',
    description: 'Follow TaskPay creator',
    reward: 50,
    icon: '',
    url: 'https://warpcast.com/0xanas.eth',
    group: 'arb_creators',
    pfpUrl: 'https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/34bbb7a8-5aa3-45ea-b646-2638342d2300/original',
    bannerUrl: 'https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/1b53b36d-63ae-40e7-752c-f52c1b298600/original',
  },
  {
    id: 'follow_aylaaa',
    type: 'follow',
    target: 'aylaaa.eth',
    targetFid: 947631,
    displayName: 'Follow @aylaaa.eth',
    description: 'Follow The Vinyls creator',
    reward: 50,
    icon: '',
    url: 'https://warpcast.com/aylaaa.eth',
    group: 'arb_creators',
    pfpUrl: 'https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/27ac59b5-8c08-4de4-8e2d-e9ffe4690a00/original',
    bannerUrl: 'https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/ad5219bd-0e1e-4939-7db7-71fb25bd5100/original',
  },
  {
    id: 'follow_dylantale',
    type: 'follow',
    target: 'dylantale',
    targetFid: 816137,
    displayName: 'Follow @dylantale',
    description: 'Follow OnchainDare creator',
    reward: 50,
    icon: '',
    url: 'https://warpcast.com/dylantale',
    group: 'arb_creators',
    pfpUrl: 'https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/2fe25cb7-99a4-4102-94df-67ec202cfe00/rectcrop3',
  },
  {
    id: 'follow_kenny',
    type: 'follow',
    target: 'kenny',
    targetFid: 2210,
    displayName: 'Follow @kenny',
    description: 'Follow Poidh creator',
    reward: 50,
    icon: '',
    url: 'https://warpcast.com/kenny',
    group: 'arb_creators',
    pfpUrl: 'https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/e6f1d0c9-26ff-4701-4bc5-f748256ab900/rectcrop3',
    bannerUrl: 'https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/1463afd7-1798-4c25-7e0c-7f0bcb45f500/original',
  },
  {
    id: 'follow_nezzar',
    type: 'follow',
    target: 'nezzar',
    targetFid: 1733,
    displayName: 'Follow @nezzar',
    description: 'Follow Astroblock creator',
    reward: 50,
    icon: '',
    url: 'https://warpcast.com/nezzar',
    group: 'arb_creators',
    pfpUrl: 'https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/80ade64b-8417-4c74-1df6-8198656dc800/original',
    bannerUrl: 'https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/45f23684-d5d4-4ef1-60a7-c76440ff3c00/original',
  },
  {
    id: 'follow_0xhohenheim',
    type: 'follow',
    target: '0xhohenheim',
    targetFid: 1127682,
    displayName: 'Follow @0xhohenheim',
    description: 'Follow Volt creator',
    reward: 50,
    icon: '',
    url: 'https://warpcast.com/0xhohenheim',
    group: 'arb_creators',
    pfpUrl: 'https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/af9377fc-7a7e-4d21-4af2-5afa9b649200/original',
    bannerUrl: 'https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/5ad86153-2ad8-41ca-5275-fed783a1c100/original',
  },
  {
    id: 'follow_atown',
    type: 'follow',
    target: 'atown',
    targetFid: 191042,
    displayName: 'Follow @atown',
    description: 'Follow Emerge creator',
    reward: 50,
    icon: '',
    url: 'https://warpcast.com/atown',
    group: 'arb_creators',
    pfpUrl: 'https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/f56caf58-c69f-4cea-2b1a-93173ffa6100/original',
    bannerUrl: 'https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/aa07f81e-603d-4bf8-bb41-990c92e63700/original',
  },
];
// Get quests by type
export function getFollowQuests(): SocialQuest[] {
  return SOCIAL_QUESTS.filter(q => q.type === 'follow');
}

export function getChannelQuests(): SocialQuest[] {
  return SOCIAL_QUESTS.filter(q => q.type === 'channel');
}

// Get quest by ID
export function getQuestById(id: string): SocialQuest | undefined {
  return SOCIAL_QUESTS.find(q => q.id === id);
}

// Get quests by collection
export function getQuestsByCollection(collection: string): SocialQuest[] {
  return SOCIAL_QUESTS.filter(q => q.collection === collection);
}
