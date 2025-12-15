/**
 * Social Quests Configuration
 *
 * Define all social quests (follow creators, join channels)
 * Verification is done via Neynar API
 */

export interface SocialQuest {
  id: string;
  type: 'follow' | 'channel';
  target: string; // username for follow, channel ID for channel
  targetFid?: number; // FID for follow quests
  displayName: string;
  description: string;
  reward: number;
  icon: string;
  url: string; // Link to complete the quest
  collection?: string; // Related collection (optional)
}

// Channel IDs from Farcaster
export const CHANNEL_IDS = {
  'vibe-most-wanted': 'vibe-most-wanted',
  'scum': 'scum', // cu-mi-oh channel
  'fidmfers': 'fidmfers',
} as const;

// Social Quests Pool - Organized by creator with their channels
export const SOCIAL_QUESTS: SocialQuest[] = [
  // Vibe Most Wanted
  {
    id: 'follow_jvhbo',
    type: 'follow',
    target: 'jvhbo',
    targetFid: 214746,
    displayName: 'Follow @jvhbo',
    description: 'Follow Vibe Most Wanted creator',
    reward: 500,
    icon: '',
    url: 'https://warpcast.com/jvhbo',
    collection: 'vibe-most-wanted',
  },
  {
    id: 'join_vibe_most_wanted',
    type: 'channel',
    target: 'vibe-most-wanted',
    displayName: 'Join /vibemostwanted',
    description: 'Join the Vibe Most Wanted channel',
    reward: 500,
    icon: '',
    url: 'https://warpcast.com/~/channel/vibe-most-wanted',
    collection: 'vibe-most-wanted',
  },

  // Team Pothead
  {
    id: 'follow_betobutter',
    type: 'follow',
    target: 'betobutter',
    targetFid: 1009776,
    displayName: 'Follow @betobutter',
    description: 'Follow Team Pothead creator',
    reward: 500,
    icon: '',
    url: 'https://warpcast.com/betobutter',
    collection: 'team-pothead',
  },

  // Baseball Cabal
  {
    id: 'follow_morlacos',
    type: 'follow',
    target: 'morlacos.base.eth',
    targetFid: 1137158,
    displayName: 'Follow @morlacos',
    description: 'Follow Baseball Cabal creator',
    reward: 500,
    icon: '',
    url: 'https://warpcast.com/morlacos.base.eth',
    collection: 'baseball-cabal',
  },

  // GM VBRS
  {
    id: 'follow_jayabs',
    type: 'follow',
    target: 'jayabs',
    targetFid: 274150,
    displayName: 'Follow @jayabs',
    description: 'Follow GM VBRS creator',
    reward: 500,
    icon: '',
    url: 'https://warpcast.com/jayabs',
    collection: 'gm-vbrs',
  },

  // Cu-mi-oh - Creator then Channel
  {
    id: 'follow_degencummunist',
    type: 'follow',
    target: 'degencummunist.eth',
    targetFid: 17355,
    displayName: 'Follow @degencummunist',
    description: 'Follow Cu-mi-oh creator',
    reward: 500,
    icon: '',
    url: 'https://warpcast.com/degencummunist.eth',
    collection: 'cu-mi-oh',
  },
  {
    id: 'join_cumioh',
    type: 'channel',
    target: 'scum',
    displayName: 'Join /scum',
    description: 'Join the Cu-mi-oh channel',
    reward: 500,
    icon: '',
    url: 'https://warpcast.com/~/channel/scum',
    collection: 'cu-mi-oh',
  },

  // Viberuto - Creator then FID Mfers Channel
  {
    id: 'follow_smolemaru',
    type: 'follow',
    target: 'smolemaru',
    targetFid: 1076846,
    displayName: 'Follow @smolemaru',
    description: 'Follow Viberuto creator',
    reward: 500,
    icon: '',
    url: 'https://warpcast.com/smolemaru',
    collection: 'viberuto',
  },
  {
    id: 'join_fidmfers',
    type: 'channel',
    target: 'fidmfers',
    displayName: 'Join /fidmfers',
    description: 'Join the FID Mfers channel',
    reward: 500,
    icon: '',
    url: 'https://warpcast.com/~/channel/fidmfers',
  },

  // Coquettish
  {
    id: 'follow_satoshinaka',
    type: 'follow',
    target: 'satoshinaka',
    targetFid: 203754,
    displayName: 'Follow @satoshinaka',
    description: 'Follow Coquettish creator',
    reward: 500,
    icon: '',
    url: 'https://warpcast.com/satoshinaka',
    collection: 'coquettish',
  },
  {
    id: 'follow_denkurhq',
    type: 'follow',
    target: 'denkurhq',
    targetFid: 439094,
    displayName: 'Follow @denkurhq',
    description: 'Follow Coquettish co-creator',
    reward: 500,
    icon: '',
    url: 'https://warpcast.com/denkurhq',
    collection: 'coquettish',
  },

  // Poorly Drawn Pepes
  {
    id: 'follow_zazza',
    type: 'follow',
    target: 'zazza',
    targetFid: 16851,
    displayName: 'Follow @zazza',
    description: 'Follow Poorly Drawn Pepes creator',
    reward: 500,
    icon: '',
    url: 'https://warpcast.com/zazza',
    collection: 'poorly-drawn-pepes',
  },

  // Tarot
  {
    id: 'follow_loground',
    type: 'follow',
    target: 'loground',
    targetFid: 320996,
    displayName: 'Follow @loground',
    description: 'Follow Tarot creator',
    reward: 500,
    icon: '',
    url: 'https://warpcast.com/loground',
    collection: 'tarot',
  },

  // History of Computer
  {
    id: 'follow_sartocrates',
    type: 'follow',
    target: 'sartocrates',
    targetFid: 248216,
    displayName: 'Follow @sartocrates',
    description: 'Follow History of Computer creator',
    reward: 500,
    icon: '',
    url: 'https://warpcast.com/sartocrates',
    collection: 'history-of-computer',
  },

  // Vibe FX
  {
    id: 'follow_bradenwolf',
    type: 'follow',
    target: 'bradenwolf',
    targetFid: 1012281,
    displayName: 'Follow @bradenwolf',
    description: 'Follow Vibe FX creator',
    reward: 500,
    icon: '',
    url: 'https://warpcast.com/bradenwolf',
    collection: 'vibe-fx',
  },
  // Vibe Rot Bangers
  {
    id: 'follow_viberotbangers_creator',
    type: 'follow',
    target: 'zk420',
    targetFid: 11124,
    displayName: 'Follow @zk420',
    description: 'Follow Vibe Rot Bangers creator',
    reward: 500,
    icon: '',
    url: 'https://warpcast.com/zk420',
    collection: 'viberotbangers',
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
