'use client';

import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useConvex, useAction } from 'convex/react';
import { api } from "@/lib/fid/convex-generated/api";
import { Id } from "@/lib/fid/convex-generated/dataModel";
import { AudioManager } from '@/lib/audio-manager';
import { useLanguage } from '@/contexts/LanguageContext';
import { fidTranslations } from "@/lib/fid/fidTranslations";
import { translations } from "@/lib/translations";
import { sdk } from '@farcaster/miniapp-sdk';
import { useTransferVBMS, useVBMSBalance, useClaimVBMS } from "@/hooks/fid/useVBMSContracts";
import { useSwitchChain } from 'wagmi';
import { useFarcasterContext } from "@/hooks/fid/useFarcasterContext";
import { CONTRACTS, ERC20_ABI, POOL_ABI } from "@/lib/fid/contracts";
import { encodeFunctionData, parseEther } from 'viem';
import haptics from "@/lib/fid/haptics";
import { AudioRecorder } from './AudioRecorder';
import { useMusic } from '@/contexts/MusicContext';
import { openMarketplace } from "@/lib/fid/marketplace-utils";
import { VibeDexModal } from './VibeDexModal';
import { CastPreview } from './CastPreview';
import { MiniappPreview } from './MiniappPreview';
import { useArbValidator, ARB_CLAIM_TYPE } from '@/lib/hooks/useArbValidator';
import { translateText } from '@/lib/fid/translateRotator';
import { LanguageSelect } from '@/components/SettingsModal';

// Translation cache helpers (localStorage, keyed by messageId + lang)
function getTranslationCache(msgId: string, targetLang: string): string | null {
  try { return localStorage.getItem(`vm_tr_${msgId}_${targetLang}`) || null; } catch { return null; }
}
function setTranslationCache(msgId: string, targetLang: string, text: string): void {
  try { localStorage.setItem(`vm_tr_${msgId}_${targetLang}`, text); } catch {}
}
function stripMediaCommands(text: string): string {
  return text.split('\n')
    .filter(line => !/^\/(?:img|sound|video|url|cast|follow|miniapp|channel|clear|link|b)[=\s]/i.test(line.trim()) && line.trim() !== '/clear')
    .join('\n')
    .trim();
}

const VIBEMAIL_COST_VBMS = "1000"; // Cost for paid "Just a Message" (no quests)
const VIBEMAIL_RECIPIENT_VBMS = 500; // VBMS recipient earns per message
const QUEST_BASE_VBMS = 500; // Base for quest mails (goes to recipient claim button)
const QUEST_PER_VBMS = 200; // Per quest reward (recipient claims each quest)

const QUEST_PURPOSES = [
  { id: 'follow', icon: '👤', label: 'Follow Quest', shortDesc: 'Ask to follow your profile', questType: 'follow_me', needsCast: false,
    template: 'Follow my Farcaster profile and earn coins! 👤\n\n✅ How to claim:\n1. Follow @[your-username] on Farcaster\n2. Come back to the Quests tab → Claim\n\n⏰ Limited slots!',
    hint: 'Replace @[your-username] with yours. Create the quest first in the Quests tab to set the reward.' },
  { id: 'channel', icon: '📢', label: 'Channel Quest', shortDesc: 'Ask to join your channel', questType: 'join_channel', needsCast: false,
    template: 'Join my Farcaster channel and earn coins! 📢\n\n✅ How to claim:\n1. Search and join /[channel-name]\n2. Come back to Quests tab → Claim\n\n⏰ Limited slots!',
    hint: 'Replace /[channel-name] with your channel. Create the quest in the Quests tab first.' },
  { id: 'cast_engage', icon: '🔁', label: 'Cast Quest', shortDesc: 'Recast + like your cast', questType: 'rt_cast', needsCast: true,
    template: 'Recast and Like my cast to earn coins! 🔁❤️\n\n✅ How to claim:\n1. Open the cast below 👇\n2. Recast it 🔁\n3. Like it ❤️\n4. Come back to Quests tab → Claim\n\n⏰ Limited slots!',
    hint: 'Paste your Warpcast cast URL in the "Embed cast" field so recipients can find it easily.' },
  { id: 'miniapp', icon: '🎮', label: 'Miniapp Quest', shortDesc: 'Ask to use your miniapp', questType: 'use_miniapp', needsCast: false,
    template: 'Try my miniapp and earn coins! 🎮\n\n✅ How to claim:\n1. Open the Quests tab\n2. Find this quest → tap "Do it"\n3. Use the miniapp for a moment\n4. Tap "Claim" — done!',
    hint: 'Set your miniapp URL when creating the quest in the Quests tab.' },
];

// Slash commands for the general composer (media + formatting only)
const SLASH_COMMANDS = [
  { cmd: '/b', icon: 'B', label: 'Bold text' },
  { cmd: '/i', icon: 'I', label: 'Italic text' },
  { cmd: '/link', icon: '🔗', label: 'Insert link' },
  { cmd: '/img', icon: '📷', label: 'Attach image' },
  { cmd: '/sound', icon: '🔊', label: 'Attach sound' },
  { cmd: '/clear', icon: '🗑️', label: 'Clear message' },
] as const;

// Parse quest banner marker from message text
// Uses brace-counting instead of greedy regex to handle VDESIGN co-existing in same message
function parseQuestBanner(message: string): { questData: any; cleanMessage: string } | null {
  const markerStart = message.indexOf('[VQUEST:{');
  if (markerStart === -1) return null;
  const jsonStart = markerStart + 8; // position of opening '{'
  let depth = 0, pos = jsonStart;
  for (; pos < message.length; pos++) {
    if (message[pos] === '{') depth++;
    else if (message[pos] === '}') { depth--; if (depth === 0) break; }
  }
  if (depth !== 0 || message[pos + 1] !== ']') return null;
  const jsonStr = message.slice(jsonStart, pos + 1);
  const fullMatch = message.slice(markerStart, pos + 2); // [VQUEST:{...}]
  try {
    return { questData: JSON.parse(jsonStr), cleanMessage: message.replace(fullMatch, '').trim() };
  } catch { return null; }
}

function parseDesignManifest(message: string): Record<string, any> | null {
  const match = message.match(/\[VDESIGN:(\{.*?\})\]/s);
  if (!match) return null;
  try { return JSON.parse(match[1]); } catch { return null; }
}

function stripDesignManifest(message: string): string {
  return message.replace(/\n?\[VDESIGN:\{.*?\}\]/s, '').trim();
}

function parseVStyle(message: string): { font?: string; color?: string } | null {
  const match = message.match(/\[VSTYLE:(\{[^}]*\})\]/);
  if (!match) return null;
  try { return JSON.parse(match[1]); } catch { return null; }
}

function stripVStyle(message: string): string {
  return message.replace(/\n?\[VSTYLE:\{[^}]*\}\]/g, '').trim();
}

function parseCommandChips(message: string): Array<{ type: 'img' | 'sound'; label: string; fullMatch: string }> {
  const chips: Array<{ type: 'img' | 'sound'; label: string; fullMatch: string }> = [];
  for (const m of message.matchAll(/\/img=(\S+)/gi)) {
    const name = decodeURIComponent(m[1].split('/').pop()?.split('?')[0] || 'image').replace(/[-_%+]/g, ' ').trim();
    chips.push({ type: 'img', label: name.length > 18 ? name.slice(0, 15) + '...' : name, fullMatch: m[0] });
  }
  for (const m of message.matchAll(/\/sound=(\S+)(\s+volume=[\d.]+)?/gi)) {
    const name = decodeURIComponent(m[1].split('/').pop()?.split('?')[0] || 'sound').replace(/[-_%+]/g, ' ').replace(/\.[^.]+$/, '').trim();
    chips.push({ type: 'sound', label: name.length > 18 ? name.slice(0, 15) + '...' : name, fullMatch: m[0] + (m[2] || '') });
  }
  return chips;
}



// Check if message is a welcome message and return translated version
function getTranslatedMessage(message: string, lang: string = "en", username?: string): string {
  if (!message) return message;

  // Detect welcome message by pattern (starts with 🎉 and contains VibeFID)
  if (message.startsWith('🎉') && message.includes('VibeFID')) {
    const displayName = username || 'User';

    // Extract rarity from the original message - look for **Word** after carta/card
    const rarityMatch = message.match(/(?:carta|card)\s*\*\*([A-Za-z]+)\*\*/i);
    const rarity = rarityMatch ? rarityMatch[1] : 'Rare';

    // Get translated welcome message
    const t = (translations[lang as keyof typeof translations] || translations['en']) as Record<string, string>;
    if (t.vibemailWelcomeMessage) {
      return t.vibemailWelcomeMessage
        .replace('{username}', displayName)
        .replace('{rarity}', rarity);
    }
  }

  return message;
}

// Check if message is a welcome message
function isWelcomeMessage(message: string): boolean {
  return message?.startsWith('🎉') && message?.includes('VibeFID');
}

// Storage URL for custom uploaded images (VibeFID Convex storage)
const VIBEFID_STORAGE_URL_INLINE = 'https://scintillating-mandrill-101.convex.cloud/api/storage';

// Render message with media (image/video) support using /vibe command
function renderMessageWithMedia(
  message: string,
  imageId: string | undefined,
  lang: string = "en",
  username?: string
): React.ReactNode {
  if (!message && !imageId) return null;

  // Handle custom uploaded images
  const isCustomImage = imageId?.startsWith('img:');
  const customImageUrl = isCustomImage ? `${VIBEFID_STORAGE_URL_INLINE}/${imageId!.slice(4)}` : null;
  const imageData = imageId && !isCustomImage ? getImageFile(imageId) : null;

  // Check if message contains /vibe command
  const vibeMatch = message?.match(/\/vibe/i);
  const hasVibeCommand = !!vibeMatch;

  // Remove /vibe from the message for display
  const cleanMessage = message?.replace(/\/vibe/gi, '').trim() || '';

  // Render the media element - compact size
  const renderMedia = () => {
    if (customImageUrl) {
      return (
        <img
          src={customImageUrl}
          alt="VibeMail"
          className="max-w-[150px] max-h-[150px] object-cover rounded-lg my-2 border border-vintage-gold/30"
        />
      );
    }
    if (!imageData) return null;
    return imageData.isVideo ? (
      <video
        src={imageData.file}
        className="max-w-[150px] max-h-[150px] rounded-lg my-2 border border-vintage-gold/30"
        autoPlay
        loop
        muted
        playsInline
      />
    ) : (
      <img
        src={imageData.file}
        alt="VibeMail"
        className="max-w-[150px] max-h-[150px] object-cover rounded-lg my-2 border border-vintage-gold/30"
      />
    );
  };

  if (hasVibeCommand && (imageData || customImageUrl)) {
    // Split message at /vibe position and put media in the middle
    const parts = message.split(/\/vibe/i);
    const beforeVibe = parts[0]?.trim() || '';
    const afterVibe = parts.slice(1).join('').trim() || '';

    return (
      <>
        {beforeVibe && <span>{beforeVibe}</span>}
        {renderMedia()}
        {afterVibe && <span>{afterVibe}</span>}
      </>
    );
  }

  // No /vibe command - put media at the end
  return (
    <>
      {cleanMessage && <span>{cleanMessage}</span>}
      {renderMedia()}
    </>
  );
}

// Render formatted message with **bold** and [link](url) support
function renderFormattedMessage(message: string, lang: string = "en", username?: string): React.ReactNode {
  if (!message) return null;

  // Translate welcome messages
  const translatedMessage = getTranslatedMessage(message, lang, username);

  // Handle both real newlines and literal backslash-n (escaped in JSON)
  const normalizedMessage = translatedMessage.replace(/\\n/g, '\n');

  // Pre-process: strip slash media commands that were stored as raw text
  // These are displayed as separate media elements; don't show raw command text
  const strippedMessage = normalizedMessage
    .split('\n')
    .filter(line => {
      const t = line.trim();
      // Skip lines that are slash commands for media/navigation (not text formatting)
      return !/^\/(cast|sound|img|follow|miniapp|channel|clear)[=\s]/i.test(t);
    })
    .join('\n')
    .trim();

  const lines = strippedMessage.split('\n');

  // Check if this is a welcome message - we'll insert image in the middle
  const isWelcome = isWelcomeMessage(message);
  const vibefidLineIdx = isWelcome ? lines.findIndex(l => l.includes('📱')) : -1;

  const renderLine = (line: string, lineIdx: number, isLast: boolean) => {
    const parts: React.ReactNode[] = [];
    let remaining = line;
    let keyIdx = 0;

    while (remaining.length > 0) {
      const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);
      const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
      const colorMatch = remaining.match(/\{c:(#[0-9a-fA-F]{3,8})\}([\s\S]*?)\{\/c\}/);

      const linkIdx = linkMatch ? remaining.indexOf(linkMatch[0]) : -1;
      const boldIdx = boldMatch ? remaining.indexOf(boldMatch[0]) : -1;
      const colorIdx = colorMatch ? remaining.indexOf(colorMatch[0]) : -1;

      if (linkIdx === -1 && boldIdx === -1 && colorIdx === -1) {
        if (remaining) parts.push(<span key={`${lineIdx}-${keyIdx++}`}>{remaining}</span>);
        break;
      }

      // Find earliest match
      const earliest = [
        linkIdx !== -1 ? linkIdx : Infinity,
        boldIdx !== -1 ? boldIdx : Infinity,
        colorIdx !== -1 ? colorIdx : Infinity,
      ].indexOf(Math.min(
        linkIdx !== -1 ? linkIdx : Infinity,
        boldIdx !== -1 ? boldIdx : Infinity,
        colorIdx !== -1 ? colorIdx : Infinity,
      ));

      if (earliest === 0 && linkIdx !== -1) {
        if (linkIdx > 0) parts.push(<span key={`${lineIdx}-${keyIdx++}`}>{remaining.slice(0, linkIdx)}</span>);
        const [, linkText, linkUrl] = linkMatch!;
        parts.push(
          <button
            key={`${lineIdx}-${keyIdx++}`}
            onClick={async (e) => {
              e.stopPropagation();
              try {
                if (sdk?.actions?.openMiniApp) { await sdk.actions.openMiniApp({ url: linkUrl }); } else { window.open(linkUrl, '_blank'); }
              } catch { window.open(linkUrl, '_blank'); }
            }}
            className="text-vintage-gold underline hover:text-yellow-400 font-bold transition-colors"
          >{linkText}</button>
        );
        remaining = remaining.slice(linkIdx + linkMatch![0].length);
      } else if (earliest === 1 && boldIdx !== -1) {
        if (boldIdx > 0) parts.push(<span key={`${lineIdx}-${keyIdx++}`}>{remaining.slice(0, boldIdx)}</span>);
        const [, boldText] = boldMatch!;
        parts.push(<strong key={`${lineIdx}-${keyIdx++}`} className="text-vintage-gold">{boldText}</strong>);
        remaining = remaining.slice(boldIdx + boldMatch![0].length);
      } else if (colorIdx !== -1) {
        if (colorIdx > 0) parts.push(<span key={`${lineIdx}-${keyIdx++}`}>{remaining.slice(0, colorIdx)}</span>);
        const [, colorHex, colorText] = colorMatch!;
        parts.push(<span key={`${lineIdx}-${keyIdx++}`} style={{ color: colorHex }}>{colorText}</span>);
        remaining = remaining.slice(colorIdx + colorMatch![0].length);
      } else {
        if (remaining) parts.push(<span key={`${lineIdx}-${keyIdx++}`}>{remaining}</span>);
        break;
      }
    }

    return (
      <span key={`line-${lineIdx}`}>
        {parts}
        {!isLast && <br />}
      </span>
    );
  };

  // Build the result with image in the middle for welcome messages
  const result: React.ReactNode[] = [];
  lines.forEach((line, lineIdx) => {
    result.push(renderLine(line, lineIdx, lineIdx === lines.length - 1));

    // Insert image after the VibeFID description line (📱)
    if (isWelcome && lineIdx === vibefidLineIdx) {
      result.push(
        <img
          key="welcome-image"
          src="/bom.jpg"
          alt="Welcome"
          className="w-full rounded-lg my-4"
        />
      );
    }
  });

  return <>{result}</>;
}

// VibeMail card body dimensions — fixed for consistent look across all devices
export const VIBEMAIL_CARD_HEIGHT = 400;
export const VIBEMAIL_CARD_WIDTH = 390;

// Electronic Secretaries - intercept messages randomly
export const VIBEMAIL_SECRETARIES = [
  { id: 'john-pork', name: 'John Pork', image: '/john-pork.jpg' },
  { id: 'goofy-romero', name: 'Goofy Romero', image: '/goofy-romero.png' },
  { id: 'linda-xied', name: 'Linda Xied', image: '/linda-xied.png' },
] as const;

// Get secretary based on message ID (deterministic random)
export function getSecretaryForMessage(messageId: string): typeof VIBEMAIL_SECRETARIES[number] {
  let hash = 0;
  for (let i = 0; i < messageId.length; i++) {
    hash = ((hash << 5) - hash) + messageId.charCodeAt(i);
    hash = hash & hash;
  }
  return VIBEMAIL_SECRETARIES[Math.abs(hash) % VIBEMAIL_SECRETARIES.length];
}

// Available meme sounds for VibeMail
export const VIBEMAIL_SOUNDS = [
  { id: 'corteze', name: 'Corteze', file: '/sounds/corteze.MP3' },
  { id: 'dry-fart', name: 'Dry Fart', file: '/sounds/dry-fart.mp3' },
  { id: 'receba', name: 'Receba!', file: '/sounds/receba-luva.mp3' },
  { id: 'ringtone', name: 'John Pork', file: '/john-pork-ringtone.mp3' },
] as const;

// Available meme images/GIFs for VibeMail
export const VIBEMAIL_IMAGES = [
  { id: 'arthur', name: 'Arthur', file: '/vibemail/arthur.jpg', isVideo: false },
  { id: 'john-pork', name: 'John Pork', file: '/vibemail/john-pork.jpg', isVideo: false },
  { id: 'john-porn', name: 'John Porn', file: '/vibemail/john-porn.jpg', isVideo: false },
  { id: 'dan-buttero', name: 'Dan Buttero', file: '/vibemail/dan-buttero.png', isVideo: false },
  { id: 'lula', name: 'Lula', file: '/vibemail/lula.png', isVideo: false },
  { id: 'vegetan', name: 'Vegetan', file: '/vibemail/vegetan.jpg', isVideo: false },
  { id: 'neymar', name: 'Neymar', file: '/vibemail/neymar.png', isVideo: false },
] as const;

// Check if audio is a custom recording (vs predefined sound)
export function isCustomAudio(audioId: string | undefined): boolean {
  return audioId?.startsWith('custom:') || false;
}

// Myinstants helpers — format: "mi:Name|https://..."
export function isMiAudio(audioId: string | undefined): boolean {
  return audioId?.startsWith('mi:') || false;
}
export function getMiUrl(audioId: string): string {
  const rest = audioId.slice(3);
  const pipe = rest.indexOf('|');
  return pipe !== -1 ? rest.slice(pipe + 1) : rest;
}
export function getMiName(audioId: string): string {
  const rest = audioId.slice(3);
  const pipe = rest.indexOf('|');
  if (pipe !== -1) return rest.slice(0, pipe);
  return rest.split('/').pop()?.replace(/\.[^.]+$/, '').replace(/-/g, ' ') || 'Sound';
}

const CONVEX_SITE_URL = 'https://agile-orca-761.convex.site';

// Proxy myinstants audio through Convex to bypass CORS restrictions
export function proxyAudioUrl(url: string): string {
  if (url.includes('myinstants.com')) {
    return `${CONVEX_SITE_URL}/audio-proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

// Get Vibe Market URL for a collection name
const COLLECTION_MARKETPLACE_URLS: Record<string, string> = {
  'Vibe Most Wanted': 'https://vibechain.com/market/vibe-most-wanted?ref=XCLR1DJ6LQTT',
  'GM VBRS': 'https://vibechain.com/market/gm-vbrs?ref=XCLR1DJ6LQTT',
  'Viberuto': 'https://vibechain.com/market/viberuto-packs?ref=XCLR1DJ6LQTT',
  'Meowverse': 'https://vibechain.com/market/meowverse?ref=XCLR1DJ6LQTT',
  'Poorly Drawn Pepes': 'https://vibechain.com/market/poorly-drawn-pepes?ref=XCLR1DJ6LQTT',
  'Team Pothead': 'https://vibechain.com/market/team-pothead?ref=XCLR1DJ6LQTT',
  'Tarot': 'https://vibechain.com/market/tarot?ref=XCLR1DJ6LQTT',
  'Baseball Cabal': 'https://vibechain.com/market/base-ball-cabal?ref=XCLR1DJ6LQTT',
  'Vibe FX': 'https://vibechain.com/market/vibe-fx?ref=XCLR1DJ6LQTT',
  'History of Computer': 'https://vibechain.com/market/historyofcomputer?ref=XCLR1DJ6LQTT',
  '$CU-MI-OH!': 'https://vibechain.com/market/cu-mi-oh?ref=XCLR1DJ6LQTT',
  'Vibe Rot Bangers': 'https://vibechain.com/market/vibe-rot-bangers?ref=XCLR1DJ6LQTT',
};

export function getMarketplaceUrl(collectionName: string | undefined): string | null {
  if (!collectionName) return null;
  return COLLECTION_MARKETPLACE_URLS[collectionName] || 'https://vibechain.com/market/vibe-most-wanted?ref=XCLR1DJ6LQTT';
}

// Get storage ID from custom audio ID
export function getCustomAudioStorageId(audioId: string): string | null {
  if (!isCustomAudio(audioId)) return null;
  return audioId.replace('custom:', '');
}

// Play audio helper - handles both predefined and custom audio
export async function playAudioById(
  audioId: string,
  audioRef: React.RefObject<HTMLAudioElement | null>,
  convex: any,
  setPlayingAudio: (id: string | null) => void
): Promise<void> {
  if (!audioRef.current) return;

  // Try predefined sound first
  const soundFile = getSoundFile(audioId);
  if (soundFile) {
    audioRef.current.src = soundFile;
    audioRef.current.play().catch(console.error);
    setPlayingAudio(audioId);
    return;
  }

  // Try custom audio
  const storageId = getCustomAudioStorageId(audioId);
  if (storageId) {
    try {
      const url = await convex.query(api.audioStorage.getAudioUrl, {
        storageId: storageId as any
      });
      if (url && audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play().catch(console.error);
        setPlayingAudio(audioId);
      }
    } catch (err) {
      console.error('Failed to fetch custom audio:', err);
    }
  }
}

// Get sound file from ID (only for predefined sounds)
export function getSoundFile(audioId: string): string | null {
  if (isCustomAudio(audioId)) return null;
  if (isMiAudio(audioId)) return proxyAudioUrl(getMiUrl(audioId));
  const sound = VIBEMAIL_SOUNDS.find(s => s.id === audioId);
  return sound?.file || null;
}

// Extract inline /sound=URL and optional volume from message text
export function extractInlineSoundUrl(message: string): { url: string; volume: number; name?: string } | null {
  const match = message.match(/^\/sound=(\S+?)(?:\s+volume=([\d.]+))?$/im);
  if (!match) return null;
  const url = match[1];
  const volume = match[2] ? Math.min(1, Math.max(0, parseFloat(match[2]))) : 0.2;
  const namePart = url.split('/').pop()?.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ') || 'Audio';
  return { url, volume, name: namePart };
}

// Get image file from ID
export function getImageFile(imageId: string): { file: string; isVideo: boolean } | null {
  const image = VIBEMAIL_IMAGES.find(i => i.id === imageId);
  return image ? { file: image.file, isVideo: image.isVideo } : null;
}

// Get image URL for display - handles both meme images and custom uploaded images
const VIBEFID_STORAGE_URL = 'https://scintillating-mandrill-101.convex.cloud/api/storage';
export function getImageUrl(imageId: string | undefined): string | null {
  if (!imageId) return null;
  if (imageId.startsWith('img:')) return `${VIBEFID_STORAGE_URL}/${imageId.slice(4)}`;
  const img = VIBEMAIL_IMAGES.find(i => i.id === imageId);
  return img ? img.file : null;
}

interface VibeMailMessage {
  _id: Id<'cardVotes'>;
  message?: string;
  audioId?: string;
  imageId?: string;
  castUrl?: string;
  miniappUrl?: string;
  isRead?: boolean;
  createdAt: number;
  voteCount: number;
  isPaid: boolean;
  voterFid?: number;
  voterUsername?: string;
  voterPfpUrl?: string;
  isSent?: boolean;
  recipientFid?: number;
  recipientUsername?: string;
  recipientPfpUrl?: string;
  // NFT Gift
  giftNftName?: string;
  giftNftImageUrl?: string;
  giftNftCollection?: string;
}

interface VibeMailInboxProps {
  cardFid: number;
  username?: string;
  onClose: () => void;
  asPage?: boolean;
  hideClose?: boolean;
  inline?: boolean;
}

function getInboxPreview(msg: VibeMailMessage): { text: string; hasGif: boolean; hasImage: boolean; hasSoundCmd: boolean; hasQuest: boolean } {
  let text = msg.message || '';
  const hasGif = /\/img=https?:\/\/(media\.giphy|media[0-9]*\.giphy|giphy\.com)/i.test(text) || /\/img=\S+\.gif/i.test(text);
  const hasImage = /\/img=/i.test(text) && !hasGif;
  const hasSoundCmd = /\/sound=/i.test(text);
  const hasQuest = !!msg.miniappUrl;
  text = text.replace(/\/img=\S+/gi, '').replace(/\/sound=\S+(\s+volume=[\d.]+)?/gi, '').trim();
  return { text, hasGif, hasImage, hasSoundCmd, hasQuest };
}

// Module-level rich message renderer — commands become media inline
// /sound=URL → audio player, /img=URL → image/video, other commands → hidden
function renderRichMessageFn(
  text: string,
  playingAudio: string | null,
  audioRef: React.RefObject<HTMLAudioElement | null>,
  setPlayingAudio: (id: string | null) => void,
  lang: string = 'en',
  username?: string
): React.ReactNode {
  if (!text) return null;
  const normalizedText = text.replace(/\\n/g, '\n');
  const lines = normalizedText.split('\n');
  const nodes: React.ReactNode[] = [];
  const pendingText: string[] = [];

  const flushText = () => {
    const t = pendingText.join('\n').trim();
    if (t) {
      nodes.push(
        <span key={`txt-${nodes.length}`} className="whitespace-pre-wrap leading-relaxed">
          {renderFormattedMessage(t, lang, username)}
        </span>
      );
    }
    pendingText.length = 0;
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip [VQUEST:...] and [VSTYLE:...] lines — should be stripped before calling but guard here too
    if (trimmed.startsWith('[VQUEST:')) continue;
    if (trimmed.startsWith('[VSTYLE:')) continue;

    // /sound=URL [volume=X]
    const soundM = trimmed.match(/^\/sound=(\S+?)(?:\s+volume=([\d.]+))?$/i);
    if (soundM) {
      flushText();
      const url = proxyAudioUrl(soundM[1]);
      const volume = soundM[2] ? Math.min(1, Math.max(0, parseFloat(soundM[2]))) : 0.2;
      const name = soundM[1].split('/').pop()?.replace(/\.[^.]+$/, '').replace(/[-_%+]/g, ' ').replace(/\s+/g, ' ').trim() || 'Audio';
      const pid = `inline:${url}`;
      const isPlaying = playingAudio === pid;
      const isErr = playingAudio === `err:${pid}`;
      nodes.push(
        <div key={`snd-${nodes.length}`} className="my-1.5 flex items-center gap-2.5 px-3 py-0" style={{ height: 52, background: 'linear-gradient(135deg, #1c0900 0%, #0d0d0d 100%)', borderLeft: '3px solid #F97316', position: 'relative', overflow: 'hidden' }}>
          {/* Glow behind play btn when playing */}
          {isPlaying && <div style={{ position:'absolute', left:0, top:0, bottom:0, width:60, background:'radial-gradient(ellipse at 20% 50%, rgba(249,115,22,0.18) 0%, transparent 70%)', pointerEvents:'none' }} />}
          {/* Play/Stop button */}
          <button
            onClick={() => {
              if (isPlaying) { audioRef.current?.pause(); setPlayingAudio(null); }
              else if (audioRef.current) {
                audioRef.current.src = url; audioRef.current.volume = volume;
                audioRef.current.play().catch(() => setPlayingAudio(`err:${pid}`));
                setPlayingAudio(pid);
              }
            }}
            className="flex items-center justify-center flex-shrink-0 transition-transform active:scale-90"
            style={{ width: 34, height: 34, background: isErr ? '#7f1d1d' : '#F97316', boxShadow: isPlaying ? '0 0 14px rgba(249,115,22,0.6)' : undefined, zIndex: 1 }}
          >
            {isErr
              ? <span className="text-red-300 font-black text-sm">!</span>
              : isPlaying
                ? <svg width="11" height="11" viewBox="0 0 24 24" fill="#000"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                : <svg width="11" height="11" viewBox="0 0 24 24" fill="#000"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            }
          </button>
          {/* Waveform bars */}
          <div className="flex items-center gap-px flex-shrink-0" style={{ zIndex: 1 }}>
            {[3,6,4,8,5,9,4,7,3,6,8,5].map((h, i) => (
              <div key={i} style={{ width: 2, height: h * 2.2, background: isPlaying ? (i % 2 === 0 ? '#F97316' : 'rgba(249,115,22,0.5)') : (i < 5 ? '#F97316' : 'rgba(249,115,22,0.25)'), borderRadius: 1, transition: 'height 0.15s ease' }} />
            ))}
          </div>
          {/* Label */}
          <div className="flex-1 min-w-0" style={{ zIndex: 1 }}>
            <p className="text-white font-bold text-xs capitalize truncate leading-tight">{name}</p>
            <p className={`text-[9px] uppercase tracking-widest ${isErr ? 'text-red-400' : isPlaying ? 'text-[#F97316]' : 'text-white/30'}`}>
              {isErr ? 'unavailable' : isPlaying ? 'Playing…' : `Sound · ${Math.round(volume * 100)}% vol`}
            </p>
          </div>
          <span className="text-[#F97316]/15 text-xl flex-shrink-0" style={{ zIndex: 1 }}>♪</span>
        </div>
      );
      continue;
    }

    // /img=URL
    const imgM = trimmed.match(/^\/img=(\S+)$/i);
    if (imgM) {
      flushText();
      const url = imgM[1];
      const isVid = /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
      const mediaKey = `img-${nodes.length}`;
      nodes.push(isVid
        ? <video key={mediaKey} src={url} className="w-full max-h-72 object-contain border border-[#FFD700]/30 my-1 rounded" autoPlay loop muted playsInline
            onError={(e) => { const el = e.currentTarget; el.style.display='none'; const err = document.createElement('div'); err.className='text-red-400 text-xs py-2 px-3 bg-red-900/30 border border-red-500/30 rounded my-1'; err.textContent='Video unavailable — check URL'; el.parentNode?.insertBefore(err, el.nextSibling); }} />
        : <img key={mediaKey} src={url} alt="" loading="lazy" className="w-full max-h-72 object-contain border border-[#FFD700]/30 my-1 rounded bg-[#1a1a1a]"
            style={{ minHeight: 80 }}
            onLoad={(e) => { (e.currentTarget as HTMLImageElement).style.minHeight = ''; }}
            onError={(e) => { const el = e.currentTarget; el.style.display='none'; el.style.minHeight=''; const err = document.createElement('div'); err.className='text-red-400 text-xs py-2 px-3 bg-red-900/30 border border-red-500/30 rounded my-1'; err.textContent='Image unavailable'; el.parentNode?.insertBefore(err, el.nextSibling); }} />
      );
      continue;
    }

    // Other slash commands — hide
    if (/^\/(cast|follow|miniapp|channel|clear|link|b)[=\s]/i.test(trimmed) || trimmed === '/clear') {
      flushText();
      continue;
    }

    pendingText.push(line);
  }

  flushText();
  return nodes.length > 0 ? <>{nodes}</> : null;
}

// Reusable sound row for the picker
function SoundRow({ name, isSelected, isPreviewing, onPlay, onUse }: {
  name: string; isSelected: boolean; isPreviewing: boolean;
  onPlay: () => void; onUse: () => void;
}) {
  return (
    <div className={`flex items-center gap-2 px-2 py-1.5 border transition-all ${
      isSelected ? 'bg-[#F97316]/20 border-[#F97316] text-[#F97316]' : 'bg-[#111] border-[#2a2a2a] text-white/70 hover:border-[#F97316]/40'
    }`}>
      <button onClick={onPlay} className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#F97316]/10 border border-[#F97316]/30 hover:bg-[#F97316]/30 transition-all text-[#F97316]">
        {isPreviewing
          ? <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
          : <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        }
      </button>
      <span className="flex-1 text-[10px] font-bold truncate">{name}</span>
      <button onClick={onUse} className={`flex-shrink-0 px-2 py-0.5 text-[9px] font-black uppercase border transition-all ${
        isSelected ? 'bg-[#F97316] border-[#F97316] text-black' : 'bg-transparent border-[#F97316]/40 text-[#F97316]/60 hover:border-[#F97316] hover:text-[#F97316]'
      }`}>{isSelected ? 'Selected' : 'Use'}</button>
    </div>
  );
}

// VibeMail Inbox Component - Shows all messages for a card
const INBOX_PAGE_SIZE = 8;

export function VibeMailInbox({ cardFid, username, onClose, asPage, hideClose = false, inline = false }: VibeMailInboxProps) {
  const { lang } = useLanguage();
  const t = fidTranslations[lang];
  const { isMusicEnabled, setIsMusicEnabled } = useMusic();
  const messages = useQuery(api.cardVotes.getMessagesForCard, { cardFid, limit: 50 });
  const markAsRead = useMutation(api.cardVotes.markMessageAsRead);
  const [selectedMessage, setSelectedMessage] = useState<VibeMailMessage | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const convex = useConvex();
  const [inboxPage, setInboxPage] = useState(0);
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  // Get secretary for selected message
  const secretary = selectedMessage ? getSecretaryForMessage(selectedMessage._id) : VIBEMAIL_SECRETARIES[0];

  const handleOpenMessage = async (msg: VibeMailMessage) => {
    AudioManager.buttonClick();
    setSelectedMessage(msg);
    setTranslatedContent(null);

    // Mark as read if not already
    if (!msg.isRead) {
      await markAsRead({ messageId: msg._id });
    }

    // Auto-play audio if exists (both predefined and custom)
    if (msg.audioId) {
      playAudioById(msg.audioId, audioRef, convex, setPlayingAudio);
    } else if (msg.message) {
      // Auto-play first /sound=URL from text
      const soundMatch = msg.message.match(/\/sound=(\S+?)(?:\s+volume=([\d.]+))?/i);
      if (soundMatch && audioRef.current) {
        const url = proxyAudioUrl(soundMatch[1]);
        const volume = soundMatch[2] ? Math.min(1, Math.max(0, parseFloat(soundMatch[2]))) : 0.2;
        const pid = `inline:${url}`;
        audioRef.current.src = url;
        audioRef.current.volume = volume;
        audioRef.current.play().catch(() => {});
        setPlayingAudio(pid);
      }
    }
  };

  // Auto-translate when lang changes or message opens
  useEffect(() => {
    if (!selectedMessage?.message) { setTranslatedContent(null); return; }
    const parsedQ = parseQuestBanner(selectedMessage.message);
    const msgForTranslation = (parsedQ ? parsedQ.cleanMessage : selectedMessage.message).trim();
    const stripped = stripMediaCommands(msgForTranslation);
    if (!stripped) return;
    const cached = getTranslationCache(selectedMessage._id, lang);
    if (cached) { setTranslatedContent(cached); return; }
    setIsTranslating(true);
    translateText(stripped, lang)
      .then(result => {
        if (result) { setTranslatedContent(result); setTranslationCache(selectedMessage._id, lang, result); }
        else setTranslatedContent(null);
      })
      .catch(() => setTranslatedContent(null))
      .finally(() => setIsTranslating(false));
  }, [lang, selectedMessage?._id]);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlayingAudio(null);
  };

  useEffect(() => {
    return () => {
      // Cleanup audio on unmount
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  return (
    <div className={inline
      ? "flex flex-col h-full"
      : asPage
        ? "min-h-screen bg-vintage-dark"
        : "fixed inset-0 z-[350] flex items-center justify-center bg-black/90 p-4"
    }>
      <audio ref={audioRef} onEnded={() => setPlayingAudio(null)} />

      <div className={inline
        ? "bg-vintage-charcoal p-4 flex flex-col flex-1 overflow-y-auto"
        : asPage
          ? "bg-vintage-charcoal p-4 w-full h-full flex flex-col"
          : "bg-vintage-charcoal border-2 border-vintage-gold rounded-2xl p-4 w-full max-w-md max-h-[calc(100vh-120px)] overflow-hidden flex flex-col"
      }>
        {!hideClose && (
          <div className="flex justify-end mb-2">
            <button
              onClick={() => { stopAudio(); onClose(); }}
              className="w-8 h-8 bg-vintage-black/50 border border-vintage-gold/30 rounded-full text-vintage-gold hover:bg-vintage-gold/20 transition-all"
            >X</button>
          </div>
        )}

        {/* Selected Message View */}
        {selectedMessage ? (
          <div className="flex-1 flex flex-col">
            {/* John Pork Header - Compact */}
            <div className="bg-[#111] border border-[#333] p-2 mb-2 flex items-center gap-2">
              <img
                src={secretary.image}
                alt={secretary.name}
                className="w-10 h-10 rounded-full border-2 border-vintage-gold animate-pulse"
              />
              <p className="text-vintage-gold font-bold text-xs">
                {secretary.name} {t.secretaryInterceptedMessage}
              </p>
            </div>

            {/* Message Content */}
            <div className="bg-gradient-to-b from-vintage-black/80 to-vintage-charcoal rounded-lg p-3 flex-1 overflow-y-auto min-h-0">
              <div className="mb-3">
                <div className="text-white text-sm leading-relaxed flex-1">
                  {isTranslating ? (
                    <span className="text-white/40 text-xs">...</span>
                  ) : translatedContent ? (
                    <>
                      <span>{translatedContent.replace(/\[VQUEST:\{.*?\}\]/gs, '').trim()}</span>
                      <span className="text-white/30 text-[10px] ml-1">({(t as any).translatedLabel || 'translated'})</span>
                      {renderRichMessageFn(
                        (selectedMessage.message || '').split('\n').filter((l: string) => /^\/(?:img|sound|video)=/i.test(l.trim())).join('\n'),
                        playingAudio, audioRef, setPlayingAudio, lang, username
                      )}
                    </>
                  ) : (
                    renderRichMessageFn(
                      (() => { const p = parseQuestBanner(selectedMessage.message || ''); return p ? p.cleanMessage : (selectedMessage.message || ''); })(),
                      playingAudio, audioRef, setPlayingAudio, lang, username
                    )
                  )}
                  {selectedMessage.imageId && (() => {
                    const isCustom = selectedMessage.imageId!.startsWith('img:');
                    const customUrl = isCustom ? `${VIBEFID_STORAGE_URL_INLINE}/${selectedMessage.imageId!.slice(4)}` : null;
                    const imgData = !isCustom ? getImageFile(selectedMessage.imageId!) : null;
                    if (customUrl) return <img src={customUrl} alt="VibeMail" className="max-w-[150px] max-h-[150px] object-cover rounded-lg mt-1 border border-vintage-gold/30" />;
                    if (!imgData) return null;
                    return imgData.isVideo
                      ? <video src={imgData.file} className="max-w-[150px] max-h-[150px] rounded-lg mt-1 border border-vintage-gold/30" autoPlay loop muted playsInline />
                      : <img src={imgData.file} alt="VibeMail" className="max-w-[150px] max-h-[150px] object-cover rounded-lg mt-1 border border-vintage-gold/30" />;
                  })()}
                </div>
              </div>

              {/* Audio Player - Compact */}
              {selectedMessage.audioId && (
                <div className="bg-vintage-gold/10 border border-vintage-gold/30 rounded-lg p-2 flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (playingAudio === selectedMessage.audioId) {
                        stopAudio();
                      } else {
                        playAudioById(selectedMessage.audioId!, audioRef, convex, setPlayingAudio);
                      }
                    }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                      playingAudio === selectedMessage.audioId
                        ? 'bg-red-500 text-white animate-pulse'
                        : 'bg-vintage-gold text-black'
                    }`}
                  >
                    {playingAudio === selectedMessage.audioId ? '■' : '▶'}
                  </button>
                  <div className="flex-1">
                    <p className="text-vintage-gold font-bold text-sm">
                      {isCustomAudio(selectedMessage.audioId) ? <span className="flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg> Voice message</span> : (isMiAudio(selectedMessage.audioId) ? getMiName(selectedMessage.audioId!) : (VIBEMAIL_SOUNDS.find(s => s.id === selectedMessage.audioId)?.name || t.memeSound))}
                    </p>
                    <p className="text-white/60 text-xs">
                      {playingAudio === selectedMessage.audioId ? t.playing : t.tapToPlay}
                    </p>
                  </div>
                </div>
              )}



              {/* NFT Gift Display */}
              {selectedMessage.giftNftImageUrl && (
                <div
                  onClick={() => {
                    const url = getMarketplaceUrl(selectedMessage.giftNftCollection);
                    if (url) openMarketplace(url, sdk, true);
                  }}
                  className="mt-3 bg-gradient-to-r from-vintage-gold/10 to-yellow-500/10 border border-vintage-gold/40 rounded-lg p-2 flex items-center gap-3 hover:border-vintage-gold/70 hover:from-vintage-gold/20 transition-all cursor-pointer"
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={selectedMessage.giftNftImageUrl}
                      alt={selectedMessage.giftNftName || 'NFT Gift'}
                      className="w-12 h-12 object-cover rounded-lg border border-vintage-gold/50"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder.png';
                      }}
                    />
                    <span className="absolute -top-1 -right-1 bg-vintage-gold rounded-full p-0.5"><svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg></span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-vintage-gold font-bold text-xs truncate">{selectedMessage.giftNftName}</p>
                    <p className="text-white/60 text-[10px]">{selectedMessage.giftNftCollection}</p>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-vintage-gold flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                </div>
              )}

            </div>

            {/* Quest Banner (view-only) */}
            {(() => {
              const parsed = parseQuestBanner(selectedMessage.message || '');
              if (!parsed) return null;
              const { questData } = parsed;
              return (
                <div className="mt-3 border-2 border-black shadow-[4px_4px_0px_#000] overflow-hidden">
                  <div className="bg-[#FFD700] px-3 py-2 flex items-center gap-2 border-b-2 border-black">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#000"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    <span className="font-black text-black text-xs uppercase tracking-widest flex-1">Quest VibeMail</span>
                    <span className="text-black/50 text-[9px] font-bold">{(questData.quests || []).length} quest{(questData.quests || []).length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="bg-[#111] divide-y divide-[#222]">
                    {(questData.quests || []).map((q: any, i: number) => (
                      <div key={i} className="px-3 py-2 flex items-center gap-2">
                        {q.type === 'follow_farcaster' && <div className="w-2 h-2 rounded-full bg-[#8B5CF6] flex-shrink-0" />}
                        {q.type === 'use_miniapp' && <div className="w-2 h-2 rounded-full bg-[#22C55E] flex-shrink-0" />}
                        {q.type === 'join_channel' && <div className="w-2 h-2 rounded-full bg-[#FF9F0A] flex-shrink-0" />}
                        <span className="text-white/70 text-xs truncate">
                          {q.type === 'follow_farcaster' ? `Follow @${q.username}` : q.type === 'use_miniapp' ? `Open: ${q.name || q.url}` : q.type === 'join_channel' ? `Join /${q.channelName || q.channelId}` : q.type}
                        </span>
                        <span className="ml-auto text-[#FFD700] text-[10px] font-black flex-shrink-0">+200 VBMS</span>
                      </div>
                    ))}
                  </div>
                  <div className="px-3 py-2 bg-[#0d0d0d] border-t-2 border-black flex items-center justify-between">
                    <span className="text-[#FFD700] text-[10px] font-black uppercase">{t.questRewardLabel || 'Reward'}</span>
                    <span className="text-white/50 text-[10px]">100 VBMS for receiving</span>
                  </div>
                </div>
              );
            })()}

            {/* Back Button */}
            <button
              onClick={() => {
                stopAudio();
                setSelectedMessage(null);
              }}
              className="mt-3 w-full py-2 bg-vintage-black border-2 border-vintage-gold text-vintage-gold rounded-lg hover:bg-vintage-gold/10"
              style={{ color: '#FFD400', borderColor: '#FFD400' }}
            >
              {t.backToInbox || 'Back to Inbox'}
            </button>
          </div>
        ) : (
          /* Message List */
          <div className="flex-1 flex flex-col overflow-hidden">
            {!messages || messages.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-white/60 text-sm">{t.noMessagesYet}</p>
                <p className="text-white/40 text-xs mt-1">
                  {t.messagesWillAppear}
                </p>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto space-y-2">
                  {messages.slice(inboxPage * INBOX_PAGE_SIZE, (inboxPage + 1) * INBOX_PAGE_SIZE).map((msg: VibeMailMessage) => (
                    <button
                      key={msg._id}
                      onClick={() => handleOpenMessage(msg)}
                      className={`w-full text-left px-3 py-2 rounded-lg border transition-all ${
                        msg.isRead
                          ? 'bg-[#141414] border-[#2a2a2a] hover:border-[#444]'
                          : 'bg-[#1a1400] border-vintage-gold/50 hover:bg-[#211900]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {/* Avatar */}
                        {msg.voterPfpUrl ? (
                          <img src={msg.voterPfpUrl} alt={msg.voterUsername || ''} className="w-8 h-8 rounded-full flex-shrink-0 object-cover border border-white/10" />
                        ) : (
                          <div className="w-8 h-8 rounded-full flex-shrink-0 bg-vintage-gold/20 border border-vintage-gold/30 flex items-center justify-center">
                            <span className="text-vintage-gold text-xs font-bold">{(msg.voterUsername || '?')[0].toUpperCase()}</span>
                          </div>
                        )}
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                            <span className={`text-xs font-bold truncate ${msg.isRead ? 'text-white/50' : 'text-vintage-gold'}`}>
                              {msg.voterUsername ? `@${msg.voterUsername}` : 'Anonymous'}
                            </span>
                            {!msg.isRead && <span className="w-1.5 h-1.5 rounded-full bg-vintage-gold flex-shrink-0" />}
                            {msg.isPaid && <span className="text-[9px] text-yellow-400 font-bold flex-shrink-0">PAID</span>}
                            {msg.audioId && <span className="text-[9px] text-vintage-burnt-gold flex-shrink-0">♪</span>}
                            {msg.giftNftImageUrl && <span className="text-[9px] text-purple-400 flex-shrink-0">NFT</span>}
                            {(() => { const p = getInboxPreview(msg); return (<>
                              {p.hasGif && <span className="text-[9px] px-1 bg-purple-900/50 text-purple-300 border border-purple-500/40 rounded flex-shrink-0">gif</span>}
                              {p.hasImage && <span className="text-[9px] px-1 bg-blue-900/50 text-blue-300 border border-blue-500/40 rounded flex-shrink-0">img</span>}
                              {p.hasSoundCmd && !msg.audioId && <span className="text-[9px] text-vintage-burnt-gold flex-shrink-0">♪</span>}
                              {p.hasQuest && <span className="text-[9px] px-1 bg-green-900/50 text-green-300 border border-green-500/40 rounded flex-shrink-0">quest</span>}
                              {msg.castUrl && <span className="text-[9px] px-1 bg-orange-900/50 text-orange-300 border border-orange-500/40 rounded flex-shrink-0">cast</span>}
                            </>); })()}
                          </div>
                          <p className={`text-xs truncate leading-tight ${msg.isRead ? 'text-white/40' : 'text-white/80'}`}>
                            {(() => { const p = getInboxPreview(msg); return p.text || (msg.audioId ? 'Voice message' : msg.giftNftName || '...'); })()}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                {/* Pagination */}
                {messages.length > INBOX_PAGE_SIZE && (
                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-vintage-gold/20 flex-shrink-0">
                    <button
                      onClick={() => setInboxPage(p => Math.max(0, p - 1))}
                      disabled={inboxPage === 0}
                      className="px-3 py-1 text-xs font-bold border border-vintage-gold/30 text-vintage-gold/70 rounded disabled:opacity-30 hover:bg-vintage-gold/10 transition-colors"
                    >← Prev</button>
                    <span className="text-[10px] text-vintage-ice/40">
                      {inboxPage + 1} / {Math.ceil(messages.length / INBOX_PAGE_SIZE)}
                      <span className="ml-1 text-vintage-ice/25">({messages.length} total)</span>
                    </span>
                    <button
                      onClick={() => setInboxPage(p => Math.min(Math.ceil(messages.length / INBOX_PAGE_SIZE) - 1, p + 1))}
                      disabled={(inboxPage + 1) * INBOX_PAGE_SIZE >= messages.length}
                      className="px-3 py-1 text-xs font-bold border border-vintage-gold/30 text-vintage-gold/70 rounded disabled:opacity-30 hover:bg-vintage-gold/10 transition-colors"
                    >Next →</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// VibeMail Inbox WITH Claim button (for home page)
interface VibeMailInboxWithClaimProps {
  cardFid: number;
  username?: string;
  userPfpUrl?: string;
  onClose: () => void;
  pendingVbms: number;
  address?: string;
  isClaimingRewards: boolean;
  isClaimTxPending: boolean;
  onClaim: () => Promise<void>;
  myFid?: number;
  myAddress?: string;
  asPage?: boolean;
  inline?: boolean; // Render inline inside page (no modal/overlay)
}

export function VibeMailInboxWithClaim({
  cardFid,
  username,
  userPfpUrl,
  onClose,
  pendingVbms,
  address,
  isClaimingRewards,
  isClaimTxPending,
  onClaim,
  myFid,
  myAddress,
  asPage = false,
  inline = false,
}: VibeMailInboxWithClaimProps) {
  const { lang } = useLanguage();
  const t = fidTranslations[lang];
  const { isMusicEnabled, setIsMusicEnabled } = useMusic();
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent' | 'quests'>('inbox');
  const [activeQuests, setActiveQuests] = useState<any[]>([]);
  const [questsLoading, setQuestsLoading] = useState(false);
  const [claimingQuestId, setClaimingQuestId] = useState<string | null>(null);
  const [questClaimResult, setQuestClaimResult] = useState<{ questId: string; success: boolean; error?: string } | null>(null);
  const [claimedQuestItems, setClaimedQuestItems] = useState<Set<string>>(new Set());
  const [claimingQuest, setClaimingQuest] = useState<string | null>(null);
  const [claimedMailVbms, setClaimedMailVbms] = useState<Set<string>>(new Set());
  const [claimingMailId, setClaimingMailId] = useState<string | null>(null);
  const [questCarouselIdx, setQuestCarouselIdx] = useState(0);
  const contentScrollRef = useRef<HTMLDivElement | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [sendNetwork, setSendNetwork] = useState<'arb' | 'base'>('arb');
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const skipNetworkModalRef = useRef(false);
  const sendNetworkRef = useRef<'arb' | 'base'>('arb');
  const sendBtnRef = useRef<HTMLButtonElement>(null);
  const [openAppConfirm, setOpenAppConfirm] = useState<{ url: string; name: string } | null>(null);
  const [miniappPreviewCache, setMiniappPreviewCache] = useState<Record<string, any>>({});
  const [msgPage, setMsgPage] = useState(0);
  const [showPurposeModal, setShowPurposeModal] = useState(false);
  const [composerQuestType, setComposerQuestType] = useState<string | null>(null);
  const [composerQuestData, setComposerQuestData] = useState<{ quests: any[] } | null>(null); // quest banner stored separately
  const [showQuestEditModal, setShowQuestEditModal] = useState(false);
  const [showCostInfo, setShowCostInfo] = useState(false);
  const [questEditText, setQuestEditText] = useState('');
  const [composerFollowTarget, setComposerFollowTarget] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewQuestIdx, setPreviewQuestIdx] = useState(0);
  // Design editor state
  const [showDesign, setShowDesign] = useState(false);
  const [editTool, setEditTool] = useState<'select' | 'draw'>('select');
  const [drawColor, setDrawColor] = useState('#FFD700');
  const [drawSize, setDrawSize] = useState(4);
  // elementPositions: x/y/w/h in px + optional rotation degrees
  const [elementPositions, setElementPositions] = useState<Record<string, {x:number,y:number,w:number,h:number,r?:number,z?:number}>>({});
  const [selectedEl, setSelectedEl] = useState<string | null>(null);
  // Drawing elements — each completed stroke becomes an image element
  const [drawingImages, setDrawingImages] = useState<Record<string, string>>({}); // id → dataUrl
  const [drawnIds, setDrawnIds] = useState<string[]>([]); // ordered for undo
  const designAreaRef = useRef<HTMLDivElement | null>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  // Refs for hot-path — zero re-renders during drag / resize / draw
  const dragRef = useRef<{id:string,origX:number,origY:number,startMX:number,startMY:number,groupOrigins?:Record<string,{x:number,y:number}>}|null>(null);
  const [groupDraw, setGroupDraw] = useState(false);
  const resizeRef = useRef<{id:string,origW:number,origH:number,startMX:number,startMY:number}|null>(null);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<{x:number,y:number}[]>([]);
  const designInitRef = useRef(false);
  const drawingIdRef = useRef(0);
  const [isSavingDesign, setIsSavingDesign] = useState(false);
  const [hiddenElements, setHiddenElements] = useState<Set<string>>(new Set());
  const designUndoStack = useRef<Array<{
    positions: Record<string, {x:number,y:number,w:number,h:number,r?:number,z?:number}>;
    hidden: Set<string>;
    drawIds: string[];
    drawImgs: Record<string, string>;
  }>>([]);
  // Capture current design state onto undo stack (call BEFORE making changes)
  const pushDesignUndo = () => {
    designUndoStack.current = [...designUndoStack.current.slice(-29), {
      positions: JSON.parse(JSON.stringify(elementPositions)),
      hidden: new Set(hiddenElements),
      drawIds: [...drawnIds],
      drawImgs: { ...drawingImages },
    }];
  };
  const popDesignUndo = () => {
    const snap = designUndoStack.current.pop();
    if (!snap) return;
    setElementPositions(snap.positions);
    setHiddenElements(snap.hidden);
    setDrawnIds(snap.drawIds);
    setDrawingImages(snap.drawImgs);
    setSelectedEl(null);
    designUndoStack.current = [...designUndoStack.current]; // trigger re-render check
  };

  // Auto-advance carousel every 3s when preview is open and has multiple quests
  useEffect(() => {
    const count = composerQuestData?.quests?.length ?? 0;
    if (!showPreview || count < 2) return;
    const t = setInterval(() => setPreviewQuestIdx(p => (p + 1) % count), 6000);
    return () => clearInterval(t);
  }, [showPreview, composerQuestData?.quests?.length]);

  // Init design editor: default element positions + canvas size
  useEffect(() => {
    if (!showDesign) { designInitRef.current = false; setHiddenElements(new Set()); return; }
    if (designInitRef.current) return;
    designInitRef.current = true;
    requestAnimationFrame(() => {
      const area = designAreaRef.current;
      const canvas = drawCanvasRef.current;
      if (canvas) { canvas.width = VIBEMAIL_CARD_WIDTH; canvas.height = VIBEMAIL_CARD_HEIGHT; }
      const W = VIBEMAIL_CARD_WIDTH - 24;
      setElementPositions(prev => {
        const next = { ...prev };
        let y = 40;
        const textOnly = composerMessage.replace(/\/sound=\S+(\s+volume=[\d.]+)?/gi, '').replace(/\/img=\S+/gi, '').trim();
        if (textOnly && !prev['text']) { next['text'] = { x: 12, y, w: W, h: 64 }; y += 76; }
        if (composerMessage.match(/\/sound=/i) && !prev['audio']) { next['audio'] = { x: 12, y, w: W, h: 56 }; y += 68; }
        const imgMatches = [...composerMessage.matchAll(/\/img=(\S+)/gi)];
        imgMatches.forEach((_, idx) => {
          const key = `img_${idx}`;
          if (!prev[key]) { next[key] = { x: 12, y, w: W, h: 150 }; y += 162; }
        });
        if (composerImageId && !prev['img_upload']) { next['img_upload'] = { x: 12, y, w: W, h: 150 }; }
        return next;
      });
    });
  }, [showDesign]); // eslint-disable-line react-hooks/exhaustive-deps

  const messages = useQuery(api.cardVotes.getMessagesForCard, { cardFid, limit: 50 });
  const sentMessages = useQuery(
    api.cardVotes.getSentMessages,
    myFid ? { voterFid: myFid, limit: 50 } : 'skip'
  );
  const markAsRead = useMutation(api.cardVotes.markMessageAsRead);
  const [selectedMessage, setSelectedMessage] = useState<VibeMailMessage | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const convex = useConvex();
  const [showComposer, setShowComposer] = useState(false);
  const [showDexModal, setShowDexModal] = useState(false);
  const [replyToMessageId, setReplyToMessageId] = useState<Id<'cardVotes'> | null>(null);
  const [replyToFid, setReplyToFid] = useState<number | null>(null); // FID of user we're replying to
  const [composerMessage, setComposerMessage] = useState('');
  const [composerFont, setComposerFont] = useState('');
  const [composerColor, setComposerColor] = useState('');
  const [composerAudioId, setComposerAudioId] = useState<string | null>(null);
  const [recipientFid, setRecipientFid] = useState<number | null>(null);
  const [recipientUsername, setRecipientUsername] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showSoundPicker, setShowSoundPicker] = useState(false);
  const [previewSound, setPreviewSound] = useState<string | null>(null);
  const [miSearch, setMiSearch] = useState('');
  const [miResults, setMiResults] = useState<{ name: string; url: string }[]>([]);
  const [miLoading, setMiLoading] = useState(false);
  const miSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [composerImageId, setComposerImageId] = useState<string | null>(null);
  const [composerDrawingId, setComposerDrawingId] = useState<string | null>(null); // Drawing saved from design editor (separate from imageId)
  const [composerDesignManifest, setComposerDesignManifest] = useState<Record<string, any> | null>(null);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearch, setGifSearch] = useState('');
  const [gifResults, setGifResults] = useState<Array<{ id: string; title: string; url: string; preview: string }>>([]);
  const [gifLoading, setGifLoading] = useState(false);
  const gifSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaUploadRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [showImgInput, setShowImgInput] = useState(false);
  const [imgInputUrl, setImgInputUrl] = useState('');
  const [soundUrlInput, setSoundUrlInput] = useState('');
  const [soundUrlLoading, setSoundUrlLoading] = useState(false);
  const [soundUrlError, setSoundUrlError] = useState('');
  const [composerCastUrl, setComposerCastUrl] = useState<string | null>(null);
  const [showCastInput, setShowCastInput] = useState(false);
  const [castInputValue, setCastInputValue] = useState('');
  const [composerMiniappUrl, setComposerMiniappUrl] = useState<string | null>(null);
  const [showMiniappInput, setShowMiniappInput] = useState(false);
  const [miniappInputValue, setMiniappInputValue] = useState('');
  const composerAudioRef = useRef<HTMLAudioElement | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const sendDirectMutation = useMutation(api.cardVotes.sendDirectVibeMail);
  const replyMutation = useMutation(api.cardVotes.replyToMessage);
  const broadcastMutation = useMutation(api.cardVotes.broadcastVibeMail);
  const deleteMessagesMutation = useMutation(api.cardVotes.deleteMessages);
  const markVibemailSentMutation = useMutation(api.missions.markVibemailSent);
  const logVibemailActivityMutation = useMutation(api.missions.logVibemailActivity);

  // Fetch myinstants sounds (always fresh, no stale-check complexity)
  const doFetchMi = async (search: string) => {
    setMiLoading(true);
    try {
      const res = await fetch(`${CONVEX_SITE_URL}/myinstants?search=${encodeURIComponent(search)}`, { cache: 'no-store' });
      const data = await res.json();
      setMiResults(data.results ?? []);
    } catch { setMiResults([]); }
    finally { setMiLoading(false); }
  };

  // openSoundPicker: opens picker and loads sounds
  const openSoundPicker = (initialSearch = '') => {
    setShowSoundPicker(true); setShowImagePicker(false); setShowGifPicker(false); setShowCastInput(false); setShowMiniappInput(false); setShowImgInput(false);
    setMiSearch(initialSearch);
    doFetchMi(initialSearch);
  };

  // GIF search via Tenor
  const doFetchGifs = async (search: string) => {
    setGifLoading(true);
    try {
      const res = await fetch(`/api/tenor?search=${encodeURIComponent(search)}`, { cache: 'no-store' });
      const data = await res.json();
      setGifResults(data.results ?? []);
    } catch { setGifResults([]); }
    finally { setGifLoading(false); }
  };

  const openGifPicker = () => {
    setShowGifPicker(true); setShowSoundPicker(false); setShowImagePicker(false); setShowCastInput(false); setShowMiniappInput(false); setShowImgInput(false);
    setGifSearch('');
    doFetchGifs('');
  };

  // Media upload: detect type and set audioId or imageId accordingly
  const handleMediaUpload = async (file: File) => {
    const isAudio = file.type.startsWith('audio/');
    setIsUploadingMedia(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': file.type }, body: file });
      if (!res.ok) throw new Error('Upload failed');
      const { storageId } = await res.json();
      if (isAudio) {
        setComposerAudioId(`custom:${storageId}`);
      } else {
        setComposerImageId(`img:${storageId}`);
        setComposerCustomImagePreview(URL.createObjectURL(file));
      }
    } catch (e) { console.error('Media upload error:', e); }
    finally { setIsUploadingMedia(false); }
  };

  // VibeMail Stats
  const vibeMailStats = useQuery(
    api.cardVotes.getVibeMailStats,
    myFid ? { fid: myFid } : 'skip'
  );

  // Debug: Log VibeMail stats
  console.log('[VibeMail] myFid:', myFid, 'stats:', vibeMailStats);

  // VBMS Balance for Need More button
  const { balance: vbmsBalance } = useVBMSBalance(myAddress as `0x${string}` | undefined);
  const { validateOnArb } = useArbValidator();
  const farcasterContext = useFarcasterContext();

  // Success feedback state
  const [sendSuccess, setSendSuccess] = useState<{ recipient: string; timestamp: number } | null>(null);

  // Send mode: 'single' | 'broadcast' | 'random'
  const [sendMode, setSendMode] = useState<'single' | 'broadcast' | 'random'>('single');
  const [broadcastRecipients, setBroadcastRecipients] = useState<Array<{ fid: number; username: string }>>([]);

  // Broadcast result feedback
  const [broadcastResult, setBroadcastResult] = useState<{ success: boolean; sent: number; total: number; failed: number } | null>(null);

  // Delete mode state
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<Set<string>>(new Set());

  // Quest VibeMail settings state
  const [settingsFarcaster, setSettingsFarcaster] = useState('');
  const [settingsFarcasterFid, setSettingsFarcasterFid] = useState<number | null>(null);
  const [settingsFarcasterPfp, setSettingsFarcasterPfp] = useState('');
  const [settingsFarcasterBanner, setSettingsFarcasterBanner] = useState('');
  const [settingsMiniapp, setSettingsMiniapp] = useState('');
  const [settingsMiniappName, setSettingsMiniappName] = useState('');
  const [settingsMiniappIcon, setSettingsMiniappIcon] = useState('');
  const [settingsTwitter, setSettingsTwitter] = useState('');
  const [settingsChannel, setSettingsChannel] = useState('');
  const [settingsChannelName, setSettingsChannelName] = useState('');
  const [settingsChannelImg, setSettingsChannelImg] = useState('');
  const [settingsSaved, setSettingsSaved] = useState(false);
  // Holder search state (replaces Neynar - searches VibeFID holders only)
  const [fcSearchQ, setFcSearchQ] = useState('');
  const [chSearchQ, setChSearchQ] = useState('');
  const [chSearchResults, setChSearchResults] = useState<any[]>([]);
  const [chSearching, setChSearching] = useState(false);
  const [maSearchQ, setMaSearchQ] = useState('');
  const [maSearchResults, setMaSearchResults] = useState<any[]>([]);
  const [maSearching, setMaSearching] = useState(false);

  // Load saved settings + auto-fill Farcaster from profile
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = `vm_settings_${cardFid}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const p = JSON.parse(saved);
        if (p.farcaster) { setSettingsFarcaster(p.farcaster); setFcSearchQ(p.farcaster); }
        if (p.farcasterFid) setSettingsFarcasterFid(p.farcasterFid);
        if (p.farcasterPfp) setSettingsFarcasterPfp(p.farcasterPfp);
        if (p.farcasterBanner) setSettingsFarcasterBanner(p.farcasterBanner);
        if (p.miniapp) { setSettingsMiniapp(p.miniapp); setMaSearchQ(p.miniappName || p.miniapp); }
        if (p.miniappName) setSettingsMiniappName(p.miniappName);
        if (p.miniappIcon) setSettingsMiniappIcon(p.miniappIcon);
        if (p.twitter) setSettingsTwitter(p.twitter);
        if (p.channel) { setSettingsChannel(p.channel); setChSearchQ(p.channelName || p.channel); }
        if (p.channelName) setSettingsChannelName(p.channelName);
        if (p.channelImg) setSettingsChannelImg(p.channelImg);
        return;
      } catch {}
    }
    if (username) { setSettingsFarcaster(username); setFcSearchQ(username); }
  }, [cardFid, username]);


  // Fetch Farcaster profile banner for follow quest settings
  useEffect(() => {
    if (!settingsFarcasterFid || settingsFarcasterBanner) return;
    fetch(`/api/fid/user-profile?fid=${settingsFarcasterFid}`)
      .then(r => r.json())
      .then(d => {
        if (d.banner_url) {
          setSettingsFarcasterBanner(d.banner_url);
          // Persist to localStorage
          try {
            const key = `vm_settings_${cardFid}`;
            const saved = JSON.parse(localStorage.getItem(key) || '{}');
            localStorage.setItem(key, JSON.stringify({ ...saved, farcasterBanner: d.banner_url }));
          } catch {}
        }
      })
      .catch(() => {});
  }, [settingsFarcasterFid]);

  // Fetch miniapp previews for quest banners (moved out of render)
  useEffect(() => {
    const msgs = [...(messages || []), ...(sentMessages || [])];
    for (const msg of msgs) {
      const parsed = parseQuestBanner(msg.message || '');
      if (!parsed) continue;
      for (const q of parsed.questData.quests || []) {
        if (q.type === 'use_miniapp' && q.url && !miniappPreviewCache[q.url]) {
          const cacheKey = `miniapp_preview_${q.url}`;
          try {
            const cached = sessionStorage.getItem(cacheKey);
            if (cached) {
              const d = JSON.parse(cached);
              setMiniappPreviewCache(prev => ({ ...prev, [q.url]: d }));
              continue;
            }
          } catch {}
          fetch(`/api/fid/miniapp-preview?url=${encodeURIComponent(q.url)}`)
            .then(r => r.json())
            .then(data => {
              const app = data?.mini_app ?? data?.miniApp ?? null;
              if (app) {
                setMiniappPreviewCache(prev => ({ ...prev, [q.url]: app }));
                try { sessionStorage.setItem(cacheKey, JSON.stringify(app)); } catch {}
              }
            }).catch(() => {});
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, sentMessages]);

  // Fetch miniapp previews for composer quest banners when preview opens
  useEffect(() => {
    if (!showPreview || !composerQuestData?.quests?.length) return;
    for (const q of composerQuestData.quests) {
      if (q.type === 'use_miniapp' && q.url && !miniappPreviewCache[q.url]) {
        const cacheKey = `miniapp_preview_${q.url}`;
        try {
          const cached = sessionStorage.getItem(cacheKey);
          if (cached) { setMiniappPreviewCache(prev => ({ ...prev, [q.url]: JSON.parse(cached) })); continue; }
        } catch {}
        fetch(`/api/fid/miniapp-preview?url=${encodeURIComponent(q.url)}`)
          .then(r => r.json())
          .then(data => {
            const app = data?.mini_app ?? data?.miniApp ?? null;
            if (app) {
              setMiniappPreviewCache(prev => ({ ...prev, [q.url]: app }));
              try { sessionStorage.setItem(cacheKey, JSON.stringify(app)); } catch {}
            }
          }).catch(() => {});
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPreview, composerQuestData]);

  // Neynar channel search debounce
  useEffect(() => {
    if (!chSearchQ || chSearchQ.length < 2 || chSearchQ === settingsChannelName) { setChSearchResults([]); return; }
    const t = setTimeout(async () => {
      setChSearching(true);
      try {
        const r = await fetch(`/api/fid/neynar-channel-search?q=${encodeURIComponent(chSearchQ)}`);
        const d = await r.json();
        setChSearchResults(d.channels || []);
      } catch {} finally { setChSearching(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [chSearchQ]);

  // Fetch channel image when channelName changes and no image yet
  useEffect(() => {
    if (!settingsChannelName || settingsChannelImg) return;
    fetch(`/api/fid/neynar-channel-search?q=${encodeURIComponent(settingsChannelName)}`)
      .then(r => r.json())
      .then(d => {
        const ch = (d.channels || []).find((c: any) => c.id === settingsChannelName || c.name?.toLowerCase() === settingsChannelName.toLowerCase());
        if (ch?.image_url) setSettingsChannelImg(ch.image_url);
      }).catch(() => {});
  }, [settingsChannelName]);

  // Patch channelImg into composerQuestData when settingsChannelImg loads late
  useEffect(() => {
    if (!settingsChannelImg || !composerQuestData?.quests?.length) return;
    const needs = composerQuestData.quests.some((q: any) => q.type === 'join_channel' && !q.channelImg);
    if (!needs) return;
    setComposerQuestData((prev: any) => ({
      ...prev,
      quests: prev.quests.map((q: any) =>
        q.type === 'join_channel' && !q.channelImg ? { ...q, channelImg: settingsChannelImg } : q
      ),
    }));
  }, [settingsChannelImg]);

  // Neynar miniapp search debounce
  useEffect(() => {
    if (!maSearchQ || maSearchQ.length < 2 || maSearchQ === settingsMiniappName) { setMaSearchResults([]); return; }
    const t = setTimeout(async () => {
      setMaSearching(true);
      try {
        const r = await fetch(`/api/fid/neynar-miniapp-search?q=${encodeURIComponent(maSearchQ)}`);
        const d = await r.json();
        setMaSearchResults(d.miniapps || []);
      } catch {} finally { setMaSearching(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [maSearchQ]);

  // LIMIT: max 100 recipients for broadcast
  const MAX_BROADCAST_RECIPIENTS = 100;

  // Random card state and mutation
  const [randomCard, setRandomCard] = useState<{ fid: number; username: string; pfpUrl?: string; displayName?: string; address?: string } | null>(null);
  const getRandomCardMutation = useMutation(api.cardVotes.getRandomCardMutation);
  const getRandomCardsMutation = useMutation(api.cardVotes.getRandomCardsMutation);

  // Random list mode (multiple random cards)
  const [randomList, setRandomList] = useState<Array<{ fid: number; username: string; pfpUrl?: string }>>([]);

  // Random quantity selector
  const [randomQuantity, setRandomQuantity] = useState<number>(10);
  const [isLoadingRandom, setIsLoadingRandom] = useState(false);

  // Fetch random card when entering random mode
  useEffect(() => {
    if (sendMode === 'random' && myFid && !randomCard) {
      getRandomCardMutation({ excludeFid: myFid }).then(setRandomCard);
    }
  }, [sendMode, myFid]);

  // Shuffle function
  const shuffleRandomCard = async () => {
    if (myFid) {
      const newCard = await getRandomCardMutation({ excludeFid: myFid });
      setRandomCard(newCard);
    }
  };

  // Add current random card to list
  const addRandomToList = () => {
    if (randomCard && !randomList.some(c => c.fid === randomCard.fid)) {
      setRandomList(prev => [...prev, { fid: randomCard.fid, username: randomCard.username, pfpUrl: randomCard.pfpUrl }]);
      shuffleRandomCard(); // Get new random card
    }
  };

  // Auto-fill random list with specified quantity
  const autoFillRandomList = async () => {
    if (!myFid || isLoadingRandom) return;
    setIsLoadingRandom(true);
    try {
      const cards = await getRandomCardsMutation({
        count: randomQuantity,
        excludeFid: myFid,
      });
      if (cards && cards.length > 0) {
        setRandomList(cards.map((c: { fid: number; username: string; pfpUrl?: string }) => ({ fid: c.fid, username: c.username, pfpUrl: c.pfpUrl })));
      }
    } catch (err) {
      console.error('Error fetching random cards:', err);
    } finally {
      setIsLoadingRandom(false);
    }
  };

  // NFT Gift modal state (kept for TypeScript compat, no longer used in send flow)
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [giftRecipientFid, setGiftRecipientFid] = useState<number | null>(null);
  const [giftRecipientAddress, setGiftRecipientAddress] = useState<string>('');
  const [giftRecipientUsername, setGiftRecipientUsername] = useState<string>('');

  // Custom image upload state
  const imageUploadRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [composerCustomImagePreview, setComposerCustomImagePreview] = useState<string | null>(null);
  // Revoke blob URLs when preview changes to prevent memory leaks
  const prevCustomPreviewRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevCustomPreviewRef.current;
    prevCustomPreviewRef.current = composerCustomImagePreview;
    if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
  }, [composerCustomImagePreview]);

  // Slash command picker state
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const composerOverlayRef = useRef<HTMLDivElement | null>(null);
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashFilter, setSlashFilter] = useState('');

  // Generate upload URL for custom images (same storage as AudioRecorder)
  const generateUploadUrl = useMutation(api.audioStorage.generateUploadUrl);
  // Claims are stored in VMW Convex (agile-orca) — must use vmwClient, not VibeFID api
  const [questMailClaims, setQuestMailClaims] = useState<any[] | null>(null);
  useEffect(() => {
    if (!selectedMessage?._id || !myFid) { setQuestMailClaims(null); return; }
    const msgId = selectedMessage._id;
    const fid = myFid;
    (async () => {
      try {
        const { ConvexHttpClient } = await import('convex/browser');
        const { api: vmwApi } = await import('@/convex/_generated/api');
        const vmwClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
        const claims = await vmwClient.query(vmwApi.cardVotes.getQuestMailClaims, { messageId: msgId as any, claimerFid: fid });
        setQuestMailClaims(claims);
      } catch { setQuestMailClaims([]); }
    })();
  }, [selectedMessage?._id, myFid]);

  // Query to get recipient address (kept for compat)
  const targetFidForGift = recipientFid || replyToFid;
  const recipientCard = useQuery(
    api.farcasterCards.getFarcasterCardByFid,
    targetFidForGift ? { fid: targetFidForGift } : 'skip'
  );

  // TX hook for VibeMail (free mail = 0 VBMS, no quest, 1 per day limit)
  const { transfer: transferVBMS, isPending: isTransferPending } = useTransferVBMS();
  const { switchChainAsync } = useSwitchChain();

  // Free VibeMail limit (uses same system as voting)
  const freeVotesRemaining = useQuery(
    api.cardVotes.getUserFreeVotesRemaining,
    myFid ? { voterFid: myFid } : 'skip'
  );
  const hasFreemail = (freeVotesRemaining?.remaining ?? 0) > 0 && !composerQuestData;

  const questCount = composerQuestData?.quests?.length ?? 0;
  const questMailCost = QUEST_BASE_VBMS + questCount * QUEST_PER_VBMS;

  const searchResults = useQuery(
    api.cardVotes.searchCardsForVibeMail,
    searchQuery.length >= 2 ? { searchTerm: searchQuery, limit: 5 } : 'skip'
  );

  // Search VibeFID holders for quest settings (replaces Neynar user search)
  const fcHolderSearchResults = useQuery(
    api.cardVotes.searchCardsForVibeMail,
    fcSearchQ.length >= 2 && fcSearchQ !== settingsFarcaster ? { searchTerm: fcSearchQ, limit: 5 } : 'skip'
  );

  // Get current messages based on active tab
  const currentMessages = activeTab === 'inbox' ? messages : sentMessages;

  // Pagination
  const MSG_PAGE_SIZE = 5;
  const totalMsgPages = currentMessages ? Math.ceil(currentMessages.length / MSG_PAGE_SIZE) : 0;
  const pagedMessages = currentMessages ? currentMessages.slice(msgPage * MSG_PAGE_SIZE, (msgPage + 1) * MSG_PAGE_SIZE) : [];

  // Reset page when switching tabs
  useEffect(() => { setMsgPage(0); }, [activeTab]);

  // Get secretary for selected message
  const secretary = selectedMessage ? getSecretaryForMessage(selectedMessage._id) : VIBEMAIL_SECRETARIES[0];

  const handleOpenMessage = async (msg: VibeMailMessage) => {
    AudioManager.buttonClick();
    setSelectedMessage(msg);
    setTranslatedContent(null);
    // Check scroll after content renders
    setTimeout(() => {
      const el = contentScrollRef.current;
      if (el) setShowScrollDown(el.scrollHeight > el.clientHeight + 24);
    }, 100);

    if (!msg.isRead) {
      await markAsRead({ messageId: msg._id });
    }

    if (msg.audioId) {
      playAudioById(msg.audioId, audioRef, convex, setPlayingAudio);
    } else if (msg.message) {
      // Auto-play first /sound=URL from text (including VDESIGN mails)
      const soundMatch = msg.message.match(/\/sound=(\S+?)(?:\s+volume=([\d.]+))?/i);
      if (soundMatch && audioRef.current) {
        const url = proxyAudioUrl(soundMatch[1]);
        const volume = soundMatch[2] ? Math.min(1, Math.max(0, parseFloat(soundMatch[2]))) : 0.2;
        const pid = `inline:${url}`;
        audioRef.current.src = url;
        audioRef.current.volume = volume;
        audioRef.current.play().catch(() => {});
        setPlayingAudio(pid);
      }
    }
  };

  // Auto-translate when lang changes or message opens
  useEffect(() => {
    if (!selectedMessage?.message) { setTranslatedContent(null); return; }
    const parsed = parseQuestBanner(selectedMessage.message);
    const msg = (parsed ? parsed.cleanMessage : selectedMessage.message).trim();
    const stripped = stripMediaCommands(msg);
    if (!stripped) return;
    const cached = getTranslationCache(selectedMessage._id, lang);
    if (cached) { setTranslatedContent(cached); return; }
    setIsTranslating(true);
    translateText(stripped, lang)
      .then(result => {
        if (result) { setTranslatedContent(result); setTranslationCache(selectedMessage._id, lang, result); }
        else setTranslatedContent(null);
      })
      .catch(() => setTranslatedContent(null))
      .finally(() => setIsTranslating(false));
  }, [lang, selectedMessage?._id]);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlayingAudio(null);
  };

  useEffect(() => { setQuestCarouselIdx(0); }, [selectedMessage?._id]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Fetch active quests when Quests tab is opened
  useEffect(() => {
    if (activeTab !== 'quests' || !myFid) return;
    setQuestsLoading(true);
    fetch(`/api/fid/quests?fid=${myFid}`)
      .then((r) => r.json())
      .then((data) => { setActiveQuests(data.quests || []); })
      .catch(() => { setActiveQuests([]); })
      .finally(() => setQuestsLoading(false));
  }, [activeTab, myFid]);

  const handleClaimQuest = async (quest: any) => {
    if (!myFid || !myAddress) return;
    setClaimingQuestId(quest._id);
    setQuestClaimResult(null);
    try {
      const resp = await fetch('/api/fid/quest-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questId: quest._id,
          completerAddress: myAddress,
          completerFid: myFid,
          questType: quest.questType,
          targetUrl: quest.targetUrl,
        }),
      });
      const data = await resp.json();
      if (data.success) {
        setQuestClaimResult({ questId: quest._id, success: true });
        setActiveQuests((prev) => prev.filter((q) => q._id !== quest._id));
      } else {
        setQuestClaimResult({ questId: quest._id, success: false, error: data.error || 'Verification failed' });
      }
    } catch {
      setQuestClaimResult({ questId: quest._id, success: false, error: 'Network error' });
    } finally {
      setClaimingQuestId(null);
    }
  };

  const handleDirectSend = async (recipFid: number, recipUsername: string, isReply: boolean, origMsgId?: any) => {
    if (!myFid || !myAddress) return;
    setIsSending(true);
    // Build final message: prepend quest banner + append design manifest if set
    const finalMessage = (() => {
      let msg = composerQuestData ? `[VQUEST:${JSON.stringify(composerQuestData)}]\n${composerMessage}` : composerMessage;
      if (composerDesignManifest) msg += `\n[VDESIGN:${JSON.stringify(composerDesignManifest)}]`;
      if (composerFont || composerColor) msg += `\n[VSTYLE:${JSON.stringify({ ...(composerFont ? { font: composerFont } : {}), ...(composerColor ? { color: composerColor } : {}) })}]`;
      return msg;
    })();
    try {
      // On-chain ARB validation only for free mails on ARB network
      // Paid mails use VBMS transfer as proof — no ARB validation needed
      if (hasFreemail && sendNetworkRef.current === 'arb') {
        await validateOnArb(100, ARB_CLAIM_TYPE.VIBEMAIL);
      }

      if (!hasFreemail) {
        const cost = composerQuestData ? String(questMailCost) : VIBEMAIL_COST_VBMS;
        // Switch to Base before VBMS transfer (wallet may be on ARB after free mail)
        await switchChainAsync({ chainId: CONTRACTS.CHAIN_ID });
        await transferVBMS(CONTRACTS.VBMSPoolTroll as `0x${string}`, parseEther(cost));
      }
      if (isReply && origMsgId) {
        await replyMutation({
          originalMessageId: origMsgId,
          senderFid: myFid,
          senderAddress: myAddress,
          senderUsername: username || undefined,
          senderPfpUrl: userPfpUrl || undefined,
          message: finalMessage,
          audioId: composerAudioId || undefined,
          imageId: composerDrawingId || composerImageId || undefined,
          miniappUrl: composerMiniappUrl || undefined,
        });
      } else {
        await sendDirectMutation({
          recipientFid: recipFid,
          senderFid: myFid,
          senderAddress: myAddress,
          senderUsername: username || undefined,
          senderPfpUrl: userPfpUrl || undefined,
          message: finalMessage,
          audioId: composerAudioId || undefined,
          imageId: composerDrawingId || composerImageId || undefined,
          castUrl: composerCastUrl || undefined,
          miniappUrl: composerMiniappUrl || undefined,
        });
      }
      haptics.send();
      // Log activity + mark daily mission (fire-and-forget, don't block UX)
      if (myAddress) {
        markVibemailSentMutation({ playerAddress: myAddress }).catch(() => {});
        logVibemailActivityMutation({ playerAddress: myAddress, recipientUsername: recipUsername, isPaid: !hasFreemail }).catch(() => {});
      }
      setSendSuccess({ recipient: recipUsername, timestamp: Date.now() });
      setTimeout(() => setSendSuccess(null), 3000);
      setShowComposer(false);
      setComposerMessage('');
      setComposerFont('');
      setComposerColor('');
      setComposerQuestData(null);
      setComposerQuestType(null);
      setComposerAudioId(null);
      setComposerImageId(null);
      setComposerDrawingId(null);
      setComposerCustomImagePreview(null);
      setComposerCastUrl(null);
      setComposerMiniappUrl(null);
      setCastInputValue('');
      setMiniappInputValue('');
      setShowSoundPicker(false);
      setShowImagePicker(false);
      setShowCastInput(false);
      setShowMiniappInput(false);
      setComposerFollowTarget('');
      setRecipientFid(null);
      setRecipientUsername('');
      setSearchQuery('');
      setReplyToMessageId(null);
      setReplyToFid(null);
    } catch (err: any) {
      console.error('Send failed:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Handle textarea change with slash command detection
  // Count only non-command lines toward the char limit
  const countVisibleChars = (text: string) =>
    text.split('\n').filter(l => !l.match(/^\/(img|sound|gif|video|url)=/i)).join('\n').length;

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const raw = e.target.value;
    // Only block if visible (non-command) text exceeds 200
    if (countVisibleChars(raw) > 200) return;
    const val = raw;
    setComposerMessage(val);
    const cursorPos = e.target.selectionStart ?? val.length;
    const textBeforeCursor = val.slice(0, cursorPos);

    // Detect /sound= command
    const soundMatch = textBeforeCursor.match(/\/sound=(.*)$/i);
    if (soundMatch) {
      setSlashMenuOpen(false);
      if (!showSoundPicker) openSoundPicker('');
      return;
    }

    const slashMatch = textBeforeCursor.match(/\/(\w*)$/);
    if (slashMatch !== null) {
      setSlashMenuOpen(true);
      setSlashFilter(slashMatch[1].toLowerCase());
    } else {
      setSlashMenuOpen(false);
    }
  };

  // Execute a slash command
  const handleSlashSelect = (cmd: string) => {
    const textarea = textareaRef.current;
    if (!textarea) { setSlashMenuOpen(false); return; }
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = composerMessage.slice(0, cursorPos);
    const slashStart = textBeforeCursor.search(/\/\w*$/);
    if (slashStart === -1) { setSlashMenuOpen(false); return; }
    const before = composerMessage.slice(0, slashStart);
    const after = composerMessage.slice(cursorPos);
    switch (cmd) {
      case '/b':
        setComposerMessage((before + '**text**' + after).slice(0, 200));
        setTimeout(() => { if (textareaRef.current) { textareaRef.current.focus(); textareaRef.current.setSelectionRange(slashStart + 2, slashStart + 6); } }, 10);
        break;
      case '/i':
        setComposerMessage((before + '*text*' + after).slice(0, 200));
        setTimeout(() => { if (textareaRef.current) { textareaRef.current.focus(); textareaRef.current.setSelectionRange(slashStart + 1, slashStart + 5); } }, 10);
        break;
      case '/link':
        setComposerMessage((before + '[text](url)' + after).slice(0, 200));
        setTimeout(() => { if (textareaRef.current) { textareaRef.current.focus(); textareaRef.current.setSelectionRange(slashStart + 1, slashStart + 5); } }, 10);
        break;
      case '/clear':
        setComposerMessage('');
        setTimeout(() => { if (textareaRef.current) { textareaRef.current.focus(); } }, 10);
        break;
      case '/img':
        setComposerMessage((before + '/img=' + after));
        setShowImgInput(true); setShowSoundPicker(false); setShowGifPicker(false); setShowCastInput(false); setShowMiniappInput(false);
        break;
      case '/sound':
        setComposerMessage((before + '/sound=' + after).slice(0, 200));
        openSoundPicker();
        break;
      case '/cast':
        setComposerMessage((before + after).slice(0, 200));
        setShowCastInput(true); setShowSoundPicker(false); setShowImagePicker(false); setShowMiniappInput(false);
        break;
    }
    setSlashMenuOpen(false);
  };

  // Insert a slash command at cursor position, placing cursor after the prefix so user can complete it
  const insertCommand = (cmd: string, placeholder: string) => {
    const textarea = textareaRef.current;
    const pos = textarea ? textarea.selectionStart : composerMessage.length;
    // Add newline before command if not at start of line
    const before = composerMessage.slice(0, pos);
    const after = composerMessage.slice(pos);
    const needsNewline = before.length > 0 && !before.endsWith('\n');
    const prefix = needsNewline ? '\n' + cmd + '=' : cmd + '=';
    const newMsg = (before + prefix + placeholder + after).slice(0, 500);
    setComposerMessage(newMsg);
    const newCursor = before.length + prefix.length;
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursor, newCursor + placeholder.length);
      }
    }, 10);
  };

  // Validate a slash command — val is the part after `=`
  const validateCmd = (cmd: string, val: string): boolean => {
    const v = val.trim();
    switch (cmd) {
      case '/b': case '/i': case '/clear': return true;
      case '/link': return v.length > 3 && v.includes('(') && v.includes(')');
      case '/img': return v.length > 0;
      case '/sound': return v.startsWith('http') || v.startsWith('/');
      case '/cast': return v.startsWith('http');
      case '/follow': return v.length > 0;
      case '/miniapp': return v.startsWith('http') || v.startsWith('farcaster');
      case '/channel': return v.length > 0;
      default: return false;
    }
  };

  // Per-command colors (syntax highlighting like a programming language)
  const CMD_COLORS: Record<string, { cmd: string; arg: string; param: string }> = {
    '/sound':   { cmd: '#F97316', arg: '#FED7AA', param: '#FDE68A' }, // orange — audio
    '/img':     { cmd: '#A855F7', arg: '#DDD6FE', param: '#E9D5FF' }, // purple — image
    '/b':       { cmd: '#06B6D4', arg: '#CFFAFE', param: '#CFFAFE' }, // cyan — bold
    '/i':       { cmd: '#06B6D4', arg: '#CFFAFE', param: '#CFFAFE' }, // cyan — italic
    '/link':    { cmd: '#3B82F6', arg: '#BFDBFE', param: '#BAE6FD' }, // blue — link
    '/cast':    { cmd: '#EAB308', arg: '#FEF08A', param: '#FEF9C3' }, // yellow — cast
    '/clear':   { cmd: '#EF4444', arg: '#FCA5A5', param: '#FECACA' }, // red — clear
    '/follow':  { cmd: '#14B8A6', arg: '#99F6E4', param: '#CCFBF1' }, // teal — follow
    '/miniapp': { cmd: '#10B981', arg: '#A7F3D0', param: '#D1FAE5' }, // green — miniapp
    '/channel': { cmd: '#14B8A6', arg: '#99F6E4', param: '#CCFBF1' }, // teal — channel
  };
  const UNKNOWN_COLOR = { cmd: '#EF4444', arg: '#FCA5A5', param: '#FECACA' };

  // Render syntax-highlighted composer text (for overlay)
  // Format: /command=value param=value2   e.g.  /sound=https://... volume=0.2
  const renderColoredComposer = (text: string): React.ReactNode => {
    const KNOWN = new Set(Object.keys(CMD_COLORS));
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const isLast = idx === lines.length - 1;
      // Match: /cmd (=value)? (space param=val)*  OR  /cmd space (for inline like /b /i)
      const m = line.match(/^(\/[a-zA-Z]+)(=?)([^\s]*)((?:\s+[a-zA-Z_]+=\S+)*)(.*)$/);
      if (m) {
        const [, cmd, eq, val, params, trailing] = m;
        const known = KNOWN.has(cmd);
        const palette = known ? CMD_COLORS[cmd] : UNKNOWN_COLOR;
        const valid = known && validateCmd(cmd, val);
        const cmdColor = valid ? palette.cmd : '#EF4444';
        const valColor = valid ? palette.arg : '#FCA5A5';
        // Parse param tokens: name=value
        const paramTokens = (params || '').match(/\s+[a-zA-Z_]+=\S+/g) || [];
        return (
          <span key={idx}>
            <span style={{ color: cmdColor, fontWeight: 800 }}>{cmd}</span>
            {eq && <span style={{ color: '#6b7280' }}>{eq}</span>}
            {val && <span style={{ color: valColor }}>{val}</span>}
            {paramTokens.map((token, i) => {
              const eqIdx = token.indexOf('=');
              const pName = token.slice(0, eqIdx + 1); // includes = and leading space
              const pVal = token.slice(eqIdx + 1);
              return (
                <span key={i}>
                  <span style={{ color: '#6b7280' }}>{pName.slice(0, pName.indexOf(pName.trimStart()[0]))}</span>
                  <span style={{ color: '#FDE68A', fontStyle: 'italic' }}>{pName.trimStart().slice(0, -1)}</span>
                  <span style={{ color: '#6b7280' }}>=</span>
                  <span style={{ color: '#67e8f9' }}>{pVal}</span>
                </span>
              );
            })}
            {trailing && <span style={{ color: '#9ca3af' }}>{trailing}</span>}
            {!isLast && '\n'}
          </span>
        );
      }
      return <span key={idx} style={{ color: '#e5e7eb' }}>{line}{!isLast && '\n'}</span>;
    });
  };

  // Apply color to selected text or whole message
  const applyColorToText = (color: string) => {
    const textarea = textareaRef.current;
    if (!textarea) { setComposerColor(color); return; }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    if (start === end) {
      // No selection → whole-message color
      setComposerColor(color);
      return;
    }
    const selected = composerMessage.slice(start, end);
    // If color is '' (default), strip any {c:...} tags from selection
    const newPart = color === ''
      ? selected.replace(/\{c:#[0-9a-fA-F]{3,8}\}/g, '').replace(/\{\/c\}/g, '')
      : `{c:${color}}${selected}{/c}`;
    setComposerMessage(composerMessage.slice(0, start) + newPart + composerMessage.slice(end));
    // Restore focus
    requestAnimationFrame(() => { textarea.focus(); textarea.setSelectionRange(start, start + newPart.length); });
  };

  // Render composer overlay with inline colors + muted commands
  const renderComposerOverlay = (text: string): React.ReactNode => {
    const baseColor = composerColor || '#e5e7eb';
    const lines = text.split('\n');
    return lines.map((line, lineIdx) => {
      const isLast = lineIdx === lines.length - 1;
      // Mute command lines
      if (/^\/(?:img|sound)=/i.test(line.trim())) {
        return <span key={lineIdx}><span style={{ color: '#3a3a3a', fontStyle: 'italic' }}>{line}</span>{!isLast && '\n'}</span>;
      }
      // Parse inline {c:#COLOR}text{/c} — while+indexOf
      const segs: React.ReactNode[] = [];
      let rem = line;
      let cur = baseColor;
      let si = 0;
      while (rem.length > 0) {
        const om = rem.match(/\{c:(#[0-9a-fA-F]{3,8})\}/);
        const oi = om ? rem.indexOf(om[0]) : -1;
        const ci = rem.indexOf('{/c}');
        if (oi === -1 && ci === -1) { segs.push(<span key={si++} style={{ color: cur }}>{rem}</span>); break; }
        const useOpen = oi !== -1 && (ci === -1 || oi <= ci);
        const ni = useOpen ? oi : ci;
        if (ni > 0) segs.push(<span key={si++} style={{ color: cur }}>{rem.slice(0, ni)}</span>);
        if (useOpen) { cur = om![1]; rem = rem.slice(oi + om![0].length); }
        else { cur = baseColor; rem = rem.slice(ci + 5); }
      }
      return <span key={lineIdx}>{segs}{!isLast && '\n'}</span>;
    });
  };

  // renderRichMessage is a module-level function (see below VibeMailInboxWithClaim)
  const renderRichMessage = (text: string, lang_?: string, username_?: string) =>
    renderRichMessageFn(text, playingAudio, audioRef, setPlayingAudio, lang_ || lang, username_ || username);

  // Format selected text as bold
  const handleFormatBold = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = composerMessage.slice(start, end);
    let newMsg: string;
    let newStart: number, newEnd: number;
    if (selected) {
      newMsg = composerMessage.slice(0, start) + '**' + selected + '**' + composerMessage.slice(end);
      newStart = start + 2; newEnd = end + 2;
    } else {
      newMsg = composerMessage.slice(0, start) + '**bold**' + composerMessage.slice(start);
      newStart = start + 2; newEnd = start + 6;
    }
    setComposerMessage(newMsg.slice(0, 200));
    setTimeout(() => { if (textareaRef.current) { textareaRef.current.focus(); textareaRef.current.setSelectionRange(newStart, newEnd); } }, 10);
  };

  return (
    <div className={
      inline ? "flex-1 flex flex-col overflow-hidden bg-[#111]"
      : asPage ? "min-h-screen bg-vintage-dark"
      : "fixed inset-0 z-[350] flex items-center justify-center bg-black/90 p-4"
    }>
      <audio ref={audioRef} onEnded={() => setPlayingAudio(null)} />

      <div
        style={{ colorScheme: 'dark' }}
        className={
          inline ? "bg-[#111] flex-1 flex flex-col p-2 overflow-hidden"
          : asPage ? "bg-vintage-charcoal h-screen w-full flex flex-col"
          : "bg-vintage-charcoal border-2 border-black shadow-[4px_4px_0px_#000] p-4 w-full max-w-md max-h-[calc(100vh-120px)] overflow-hidden flex flex-col"
        }
      >
        {/* Success Feedback Toast */}
        {sendSuccess && (
          <div className="mb-3 p-3 bg-green-500/20 border border-green-500/50 rounded-lg flex items-center gap-2 animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-green-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <p className="text-green-400 text-sm font-bold">
              VibeMail sent to @{sendSuccess.recipient}!
            </p>
            <button
              onClick={() => setSendSuccess(null)}
              className="ml-auto text-green-400/70 hover:text-green-400"
            ><svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
        )}

        {/* Broadcast Result Feedback (outside composer) */}
        {!showComposer && broadcastResult && (
          <div className={`mb-3 p-3 rounded-lg flex items-center gap-2 ${
            broadcastResult.failed === 0
              ? 'bg-green-500/20 border border-green-500/50'
              : broadcastResult.sent > 0
                ? 'bg-yellow-500/20 border border-yellow-500/50'
                : 'bg-red-500/20 border border-red-500/50'
          }`}>
            <span className="flex-shrink-0">
              {broadcastResult.failed === 0
                ? <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                : broadcastResult.sent > 0
                  ? <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-yellow-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  : <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              }
            </span>
            <p className={`text-sm font-bold ${
              broadcastResult.failed === 0 ? 'text-green-400' : broadcastResult.sent > 0 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {broadcastResult.failed === 0
                ? `Sent to ${broadcastResult.sent} recipients!`
                : broadcastResult.sent > 0
                  ? `Sent ${broadcastResult.sent}/${broadcastResult.total} (failed: ${broadcastResult.failed})`
                  : 'Failed to send VibeMail'
              }
            </p>
            <button
              onClick={() => setBroadcastResult(null)}
              className="ml-auto text-vintage-ice/70 hover:text-vintage-ice"
            ><svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
        )}



        {/* Purpose Chooser Modal */}
        {showPurposeModal && !showComposer && myFid && myAddress && (
          <div className="fixed inset-0 z-[500] bg-[#0a0a0a] flex flex-col" style={{ colorScheme: 'dark' }}>
            {/* Header */}
            <div className="px-4 py-3 border-b-2 border-black flex items-center justify-between flex-shrink-0 bg-[#111]">
              <button onClick={() => setShowPurposeModal(false)} className="w-8 h-8 bg-[#DC2626] border-2 border-black shadow-[2px_2px_0px_#000] text-white font-black flex items-center justify-center">X</button>
              <h3 className="text-[#FFD700] font-black text-sm uppercase tracking-widest">New VibeMail</h3>
              <div className="w-8" />
            </div>
            <div className="flex-1 flex flex-col gap-3 p-4">
              <p className="text-white/30 text-[10px] text-center uppercase tracking-widest">Choose the type of message</p>

              {/* Option 1: Just a Message */}
              <button
                onClick={() => {
                  AudioManager.buttonClick();
                  setComposerMessage('');
                  setComposerQuestType(null);
                  setShowPurposeModal(false);
                  setShowComposer(true);
                }}
                className="vm-btn-recv flex-1 border-2 border-[#8B5CF6]/40 shadow-[4px_4px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all text-left flex flex-col justify-between overflow-hidden relative"
                style={{ minHeight: 120 }}
              >
                <img src="/vibemail-free-bg.png" alt="" className="vm-bg-recv absolute top-0 left-0 h-full w-[50%] object-contain pointer-events-none select-none" />
                <div className="relative z-10 p-4 flex flex-col justify-between h-full">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-[#8B5CF6] border-2 border-black flex items-center justify-center flex-shrink-0 overflow-hidden">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className=""><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-black text-base">Just a Message</p>
                    <p className="text-white/50 text-xs mt-0.5">Free-form, no quest attached</p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-[#22C55E]/20 border border-[#22C55E]/50 text-[#22C55E] font-black text-[9px] uppercase tracking-wide">FREE</span>
                  <span className="text-white/30 text-[9px]">Limit: 1 per recipient per day</span>
                </div>
                </div>{/* end z-10 wrapper */}
              </button>

              {/* Option 2: With Social Quest */}
              <button
                onClick={() => {
                  AudioManager.buttonClick();
                  // Read saved settings from localStorage
                  const key = `vm_settings_${cardFid}`;
                  let settings: any = {};
                  try { settings = JSON.parse(localStorage.getItem(key) || '{}'); } catch {}
                  const quests: any[] = [];
                  if (settings.farcaster && settings.farcasterFid) quests.push({ type: 'follow_farcaster', username: settings.farcaster, fid: settings.farcasterFid, pfp: settings.farcasterPfp || '', banner: settings.farcasterBanner || '' });
                  if (settings.miniapp && settings.miniappName) quests.push({ type: 'use_miniapp', url: settings.miniapp, name: settings.miniappName, icon: settings.miniappIcon || '' });
                  if (settings.channel && settings.channelName) quests.push({ type: 'join_channel', channelId: settings.channelName, channelName: settings.channelName, channelUrl: settings.channel, channelImg: settings.channelImg || '' });
                  if (quests.length === 0) {
                    // No quests configured — open quest settings first
                    setShowPurposeModal(false);
                    setShowQuestEditModal(true);
                    return;
                  }
                  setComposerMessage('');
                  setComposerQuestData({ quests });
                  setComposerQuestType('social_quest');
                  setShowPurposeModal(false);
                  setShowComposer(true);
                }}
                className="vm-btn-send flex-1 border-2 border-[#FFD700]/40 shadow-[4px_4px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all text-left flex flex-col justify-between overflow-hidden relative"
                style={{ minHeight: 120 }}
              >
                {/* Background image */}
                <img src="/vibemail-quest-bg.png" alt="" className="vm-bg-send absolute top-0 left-0 h-full w-[50%] object-contain pointer-events-none select-none" />
                <div className="relative z-10 p-4 flex flex-col justify-between h-full">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-[#FFD700] border-2 border-black flex items-center justify-center flex-shrink-0 overflow-hidden">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#000" stroke="#000" strokeWidth="0" className=""><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-black text-base">With Social Quest</p>
                    <p className="text-white/50 text-xs mt-0.5">Follow · Miniapp · Channel — from your settings</p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
                {/* Preview configured quests */}
                {(() => {
                  const key = `vm_settings_${cardFid}`;
                  let s: any = {};
                  try { s = JSON.parse(localStorage.getItem(key) || '{}'); } catch {}
                  const configured = [
                    s.farcaster && `@${s.farcaster}`,
                    s.miniappName,
                    s.channelName,
                  ].filter(Boolean);
                  return configured.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {configured.map((label, i) => (
                        <span key={i} className="px-2 py-0.5 bg-[#FFD700]/15 border border-[#FFD700]/40 text-[#FFD700] font-bold text-[9px]">{label}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-white/20 text-[9px]">{(t as any).vibemailConfigureSettings || 'Configure in the Settings tab before using'}</p>
                  );
                })()}
                </div>{/* end z-10 wrapper */}
              </button>
            </div>
          </div>
        )}

        {/* VibeMail Composer Modal - FULL SCREEN OVERLAY */}
        {showComposer && myFid && myAddress && (
          <div className="fixed inset-0 z-[500] bg-[#0a0a0a] overflow-y-auto" style={{ colorScheme: 'dark', color: 'white' }}>
            <div className="bg-[#111] min-h-full p-3 flex flex-col">
            {/* HEADER */}
            <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-black">
              <button
                onClick={() => {
                  setShowComposer(false);
                  setReplyToMessageId(null);
                  setReplyToFid(null);
                  setRecipientFid(null);
                  setRecipientUsername('');
                  setSearchQuery('');
                  setComposerMessage('');
                  setComposerAudioId(null);
                  setShowSoundPicker(false);
                  setPreviewSound(null);
                  setComposerImageId(null);
                  setComposerDrawingId(null);
                  setShowImagePicker(false);
                  setComposerCastUrl(null);
                  setShowCastInput(false);
                  setCastInputValue('');
                  setComposerMiniappUrl(null);
                  setShowMiniappInput(false);
                  setMiniappInputValue('');
                  if (composerAudioRef.current) {
                    composerAudioRef.current.pause();
                  }
                }}
                className="w-8 h-8 bg-[#DC2626] border-2 border-black shadow-[2px_2px_0px_#000] text-white font-bold hover:bg-[#B91C1C] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center"
              >X</button>
              <h3 className="text-vintage-gold font-bold text-lg uppercase tracking-wide">
                {replyToMessageId ? 'Reply' : 'New Message'}
              </h3>
              <div className="w-10" />
            </div>

            {/* VBMS Balance */}
            <div className="bg-[#0a0a0a] border-2 border-black shadow-[2px_2px_0px_#000] p-2 mb-2 flex items-center justify-between">
              <div>
                <p className="text-white/50 text-[10px]">{(t as any).yourVbmsBalance || 'VBMS Balance'}</p>
                <p className="text-[#FFD700] font-bold text-sm">
                  {vbmsBalance ? parseFloat(vbmsBalance).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0'} VBMS
                </p>
              </div>
              <button
                onClick={() => { AudioManager.buttonClick(); setShowDexModal(true); }}
                className="text-[#FFD700]/70 text-[10px] hover:text-[#FFD700] transition-colors border border-[#FFD700]/30 px-2 py-1"
              >
                Get VBMS
              </button>
            </div>

            {/* Reply indicator */}
            {replyToMessageId && (
              <div className="mb-2 bg-[#0a0a0a] border-2 border-black p-2 flex items-center gap-2">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>
                <p className="text-white/70 text-xs">Replying to message</p>
              </div>
            )}

            {/* Mode Selector (only for new message, not reply) */}
            {!replyToMessageId && (
              <div className="mb-2 flex gap-1">
                <button
                  onClick={() => { setSendMode('single'); setRecipientFid(null); setRecipientUsername(''); setBroadcastRecipients([]); }}
                  className={`flex-1 py-2 px-2 border-2 border-black text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                    sendMode === 'single'
                      ? 'bg-vintage-gold text-black shadow-[2px_2px_0px_#000]'
                      : 'bg-[#1a1a1a] text-white shadow-[2px_2px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000]'
                  }`}
                  style={{ WebkitTextFillColor: 'currentColor' }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  {t.vibemailModeSingle}
                </button>
                <button
                  onClick={() => { setSendMode('broadcast'); setRecipientFid(null); setRecipientUsername(''); }}
                  className={`flex-1 py-2 px-2 border-2 border-black text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                    sendMode === 'broadcast'
                      ? 'bg-vintage-gold text-black shadow-[2px_2px_0px_#000]'
                      : 'bg-[#1a1a1a] text-white shadow-[2px_2px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000]'
                  }`}
                  style={{ WebkitTextFillColor: 'currentColor' }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.42 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.82a16 16 0 0 0 6.29 6.29l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  {t.vibemailModeBroadcast}
                </button>
                <button
                  onClick={() => { setSendMode('random'); setRecipientFid(null); setRecipientUsername(''); setBroadcastRecipients([]); }}
                  className={`flex-1 py-2 px-2 border-2 border-black text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                    sendMode === 'random'
                      ? 'bg-vintage-gold text-black shadow-[2px_2px_0px_#000]'
                      : 'bg-[#1a1a1a] text-white shadow-[2px_2px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000]'
                  }`}
                  style={{ WebkitTextFillColor: 'currentColor' }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>
                  {t.vibemailModeRandom}
                </button>
              </div>
            )}

            {/* Quest type badge + hint */}
            {composerQuestType && (() => {
              const purpose = QUEST_PURPOSES.find(p => p.questType === composerQuestType);
              return purpose ? (
                <div className="mb-2 p-2 bg-[#0a0a0a] border-2 border-[#FFD700] flex items-start gap-2">
                  <span className="text-base flex-shrink-0">{purpose.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#FFD700] font-black text-[10px] uppercase tracking-wide">{purpose.label}</p>
                    <p className="text-white/60 text-[10px] mt-0.5 leading-relaxed">{purpose.hint}</p>
                  </div>
                  <button onClick={() => setComposerQuestType(null)} className="text-white/40 hover:text-white flex-shrink-0">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ) : null;
            })()}

            {/* Follow target input — shown only for follow_me quest */}
            {composerQuestType === 'follow_me' && (
              <div className="mb-2 flex items-center gap-2 bg-[#0a0a0a] border-2 border-[#444] px-3 py-2 focus-within:border-[#FFD700]">
                <span className="text-white/40 text-xs flex-shrink-0">Follow target:</span>
                <span className="text-[#FFD700] text-xs font-bold flex-shrink-0">@</span>
                <input
                  type="text"
                  value={composerFollowTarget}
                  onChange={(e) => {
                    const newTarget = e.target.value.replace(/^@/, '');
                    setComposerMessage(prev =>
                      prev.replace(new RegExp(`@${composerFollowTarget.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'), `@${newTarget}`)
                    );
                    setComposerFollowTarget(newTarget);
                  }}
                  placeholder={username || 'username'}
                  className="flex-1 bg-transparent text-white text-xs focus:outline-none min-w-0"
                  style={{ colorScheme: 'dark', WebkitTextFillColor: 'white' }}
                />
              </div>
            )}

            {/* Random Recipient Display */}
            {sendMode === 'random' && !replyToMessageId && (
              <div className="mb-3">
                {/* Quick Select Quantity */}
                <div className="mb-3 bg-[#1E1E1E] border-2 border-black shadow-[3px_3px_0px_#000] rounded-sm p-3">
                  <p className="text-vintage-gold text-xs font-bold mb-2 flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2"/><circle cx="8" cy="8" r="1" fill="currentColor"/><circle cx="16" cy="8" r="1" fill="currentColor"/><circle cx="8" cy="16" r="1" fill="currentColor"/><circle cx="16" cy="16" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg> {t.vibemailQuickRandom || 'Quick Random Select'}</p>
                  <div className="flex items-center gap-2">
                    <select
                      value={randomQuantity}
                      onChange={(e) => setRandomQuantity(Number(e.target.value))}
                      className="flex-1 bg-[#111] border-2 border-[#444] px-2 py-2 text-white text-sm focus:outline-none focus:border-[#FFD700]"
                      style={{ colorScheme: 'dark' }}
                    >
                      <option value={5}>5 {t.vibemailPeople || 'people'}</option>
                      <option value={10}>10 {t.vibemailPeople || 'people'}</option>
                      <option value={25}>25 {t.vibemailPeople || 'people'}</option>
                      <option value={50}>50 {t.vibemailPeople || 'people'}</option>
                      <option value={100}>100 {t.vibemailPeople || 'people'}</option>
                      <option value={250}>250 {t.vibemailPeople || 'people'}</option>
                      <option value={500}>500 {t.vibemailPeople || 'people'}</option>
                    </select>
                    <button
                      onClick={autoFillRandomList}
                      disabled={isLoadingRandom}
                      className="px-4 py-2 bg-[#FFD700] text-black font-bold rounded-sm border-2 border-black shadow-[3px_3px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-none disabled:opacity-50 text-sm"
                    >
                      {isLoadingRandom
                        ? <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 inline animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                        : <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2"/><circle cx="8" cy="8" r="1" fill="currentColor"/><circle cx="16" cy="8" r="1" fill="currentColor"/><circle cx="8" cy="16" r="1" fill="currentColor"/><circle cx="16" cy="16" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>
                      } {t.vibemailAutoSelect || 'Select'}
                    </button>
                  </div>
                  <p className="text-white/60 text-[10px] mt-1 text-center">
                    {randomQuantity * 1000} VBMS ({randomQuantity} × 1000)
                  </p>
                </div>

                {/* Random List - Cards already added */}
                {randomList.length > 0 && (
                  <div className="mb-2 bg-[#111] border-2 border-black shadow-[2px_2px_0px_#000] p-2">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-white font-bold text-xs flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                        {(t.vibemailRandomListCount || '{count} in list').replace('{count}', String(randomList.length))}
                      </p>
                      <button
                        onClick={() => setRandomList([])}
                        className="text-xs bg-red-600 text-white font-bold px-2 py-0.5 border border-black hover:bg-red-700"
                      >
                        {t.vibemailClearList || 'Clear List'}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                      {randomList.map(r => (
                        <span key={r.fid} className="inline-flex items-center gap-1 bg-[#FFD700] border border-black px-2 py-0.5 text-xs text-black font-bold">
                          @{r.username}
                          <button
                            onClick={() => setRandomList(prev => prev.filter(p => p.fid !== r.fid))}
                            className="text-black/70 hover:text-black font-black"
                          >×</button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Manual Add - Current Random Card + Shuffle/Add buttons */}
                <div className="bg-[#111] border border-[#333] p-2">
                  <p className="text-white/60 text-[10px] mb-1">{t.vibemailOrManual || 'Or add manually:'}</p>
                  {randomCard ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2"/><circle cx="8" cy="8" r="1" fill="currentColor"/><circle cx="16" cy="8" r="1" fill="currentColor"/><circle cx="8" cy="16" r="1" fill="currentColor"/><circle cx="16" cy="16" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>
                          <div>
                          <p className="text-[#FFD700] font-bold text-xs">@{randomCard.username}</p>
                          <p className="text-white/60 text-[10px]">FID: {randomCard.fid}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={addRandomToList}
                          disabled={randomList.some(c => c.fid === randomCard.fid)}
                          className="px-2 py-1 bg-green-500/20 border border-green-500/50 rounded text-green-400 text-[10px] hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        </button>
                        <button
                          onClick={shuffleRandomCard}
                          className="px-2 py-1 bg-vintage-gold/20 border border-vintage-gold/50 rounded text-vintage-gold text-[10px] hover:bg-vintage-gold/30"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.4"/></svg>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-white/50 text-xs text-center">Loading...</p>
                  )}
                </div>

                {randomList.length > 0 && (
                  <p className="text-green-400 text-xs mt-2 text-center font-bold">
                    <span className="flex items-center justify-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> {(t.vibemailReadyToSend || 'Ready to send to {count} people').replace('{count}', String(randomList.length))} = {randomList.length * (composerQuestData ? questMailCost : Number(VIBEMAIL_COST_VBMS))} VBMS</span>
                  </p>
                )}
              </div>
            )}

            {/* Broadcast Recipients (multiple selection) */}
            {sendMode === 'broadcast' && !replyToMessageId && (
              <div className="mb-3">
                <div className="flex flex-wrap gap-1 mb-2 max-h-24 overflow-y-auto">
                  {broadcastRecipients.map(r => (
                    <span key={r.fid} className="inline-flex items-center gap-1 bg-[#FFD700] border border-black px-2 py-1 text-xs text-black font-bold">
                      @{r.username}
                      <button
                        onClick={() => setBroadcastRecipients(prev => prev.filter(p => p.fid !== r.fid))}
                        className="text-black/70 hover:text-black font-black"
                      >×</button>
                    </span>
                  ))}
                </div>
                <div className="flex justify-between items-center mb-1">
                  <p className={`text-xs ${broadcastRecipients.length >= MAX_BROADCAST_RECIPIENTS ? 'text-red-400' : 'text-white/60'}`}>
                    <span className="flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg> {broadcastRecipients.length}/{MAX_BROADCAST_RECIPIENTS} {t.vibemailBroadcastLimit || `max ${MAX_BROADCAST_RECIPIENTS}`}</span>
                  </p>
                  {broadcastRecipients.length > 0 && (
                    <button
                      onClick={() => setBroadcastRecipients([])}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      {t.vibemailClearList || 'Clear'}
                    </button>
                  )}
                </div>
                {broadcastRecipients.length < MAX_BROADCAST_RECIPIENTS && (
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search VibeFID holders..."
                      className="w-full bg-[#111] border-2 border-[#444] px-3 py-2 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-[#FFD700]"
                      style={{ colorScheme: 'dark', WebkitTextFillColor: 'white' }}
                    />
                    {searchResults && searchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-vintage-charcoal border border-vintage-gold/50 rounded-lg overflow-hidden z-30 max-h-40 overflow-y-auto">
                        {searchResults.filter((card: { fid: number }) => !broadcastRecipients.some(r => r.fid === card.fid)).map((card: { fid: number; username: string }) => (
                          <button
                            key={card.fid}
                            onClick={() => {
                              if (broadcastRecipients.length < MAX_BROADCAST_RECIPIENTS) {
                                setBroadcastRecipients(prev => [...prev, { fid: card.fid, username: card.username }]);
                                setSearchQuery('');
                              }
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-[#FFD700]/20 text-white text-sm border-b border-white/10 last:border-0"
                          >
                            <strong>{card.username}</strong>
                            <span className="text-white/50 ml-2">FID: {card.fid}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {/* Broadcast Result Feedback */}
                {broadcastResult && (
                  <div className={`mt-2 p-2 rounded-lg text-xs ${
                    broadcastResult.failed === 0
                      ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                      : broadcastResult.sent > 0
                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                        : 'bg-red-500/20 text-red-400 border border-red-500/50'
                  }`}>
                    {broadcastResult.failed === 0
                      ? (t.vibemailBroadcastSuccess || 'Broadcast sent!').replace('{sent}', String(broadcastResult.sent)).replace('{total}', String(broadcastResult.total))
                      : broadcastResult.sent > 0
                        ? (t.vibemailBroadcastPartial || 'Partial').replace('{sent}', String(broadcastResult.sent)).replace('{total}', String(broadcastResult.total)).replace('{failed}', String(broadcastResult.failed))
                        : (t.vibemailBroadcastError || 'Error: All messages failed').replace('{error}', 'All messages failed')
                    }
                    <button onClick={() => setBroadcastResult(null)} className="ml-2 text-vintage-ice/50 hover:text-vintage-ice"><svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                  </div>
                )}
              </div>
            )}

            {/* Recipient Search (only for new message, not reply - SINGLE MODE) */}
            {sendMode === 'single' && !replyToMessageId && (
              <div className="mb-3 relative">
                {recipientFid ? (
                  <div className="flex items-center justify-between bg-vintage-gold/20 border border-vintage-gold/50 rounded-lg p-2">
                    <span className="text-vintage-gold text-sm flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                      To: <strong>{recipientUsername}</strong> (FID: {recipientFid})
                    </span>
                    <button
                      onClick={() => {
                        setRecipientFid(null);
                        setRecipientUsername('');
                        setSearchQuery('');
                      }}
                      className="text-vintage-ice/60 hover:text-red-400 text-sm"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                ) : (
                  <div className="relative flex items-center gap-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search VibeFID holders..."
                      className="flex-1 bg-[#111] border-2 border-[#444] px-3 py-2 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-[#FFD700]"
                      style={{ colorScheme: 'dark', WebkitTextFillColor: 'white' }}
                    />
                    {/* Cost info button */}
                    <button
                      onClick={() => setShowCostInfo(v => !v)}
                      className="w-7 h-7 flex-shrink-0 flex items-center justify-center border-2 border-[#444] bg-[#111] text-white/50 hover:border-[#FFD700] hover:text-[#FFD700] font-black text-xs transition-all"
                    >?</button>
                    {/* Cost info popover */}
                    {showCostInfo && (
                      <div className="absolute top-full right-0 mt-1 w-64 bg-[#0d0d0d] border-2 border-black shadow-[6px_6px_0px_#000] z-50">
                        <div className="bg-[#FFD700] px-3 py-1.5 flex items-center justify-between border-b-2 border-black">
                          <span className="font-black text-black text-[10px] uppercase tracking-widest">{t.vibemailCostsTitle || 'VibeMail Costs'}</span>
                          <button onClick={() => setShowCostInfo(false)} className="text-black/60 hover:text-black font-bold text-xs">✕</button>
                        </div>
                        <div className="divide-y divide-[#1a1a1a]">
                          {/* Free Mail */}
                          <div className="px-3 py-2">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="bg-[#22C55E] text-black font-black text-[9px] px-1.5 py-0.5 uppercase tracking-wide">FREE MAIL</span>
                              <span className="text-[#22C55E] font-black text-xs">0 VBMS</span>
                            </div>
                            <p className="text-white text-xs font-bold">{t.vibemailFreeMailTitle || 'Just a Message'}</p>
                            <p className="text-white/40 text-[10px]">{t.vibemailFreeMailDesc || 'No quest · limit 1 per recipient per day'}</p>
                          </div>
                          {/* Quest VibeMail */}
                          <div className="px-3 py-2">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="bg-[#FFD700] text-black font-black text-[9px] px-1.5 py-0.5 uppercase tracking-wide">QUEST MAIL</span>
                              <span className="text-[#FFD700] font-black text-xs">1.000 VBMS</span>
                            </div>
                            <p className="text-white text-xs font-bold">{t.vibemailQuestMailTitle || 'With Social Quest'}</p>
                            <p className="text-white/40 text-[10px]">{t.vibemailQuestMailDesc || 'Per recipient · recipient earns VBMS upon completing quests'}</p>
                          </div>
                          {/* Broadcast */}
                          <div className="px-3 py-2">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="bg-[#2563EB] text-white font-black text-[9px] px-1.5 py-0.5 uppercase tracking-wide">BROADCAST</span>
                              <span className="text-[#60a5fa] font-black text-xs">1.000 × N VBMS</span>
                            </div>
                            <p className="text-white text-xs font-bold">{t.vibemailBroadcastTitleFull || 'Broadcast / Random'}</p>
                            <p className="text-white/40 text-[10px]">{t.vibemailBroadcastDescCost || '1,000 VBMS multiplied by number of recipients'}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {searchResults && searchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-vintage-charcoal border border-vintage-gold/50 rounded-lg overflow-hidden z-30 max-h-40 overflow-y-auto">
                        {searchResults.map((card: { fid: number; username: string }) => (
                          <button
                            key={card.fid}
                            onClick={() => {
                              setRecipientFid(card.fid);
                              setRecipientUsername(card.username);
                              setSearchQuery('');
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-[#FFD700]/20 text-white text-sm border-b border-white/10 last:border-0"
                          >
                            <strong>{card.username}</strong>
                            <span className="text-white/50 ml-2">FID: {card.fid}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Message Input */}
            <div className="relative">
              {/* Slash command picker - Discord-like */}
              {slashMenuOpen && (() => {
                const filtered = SLASH_COMMANDS.filter(c =>
                  c.cmd.slice(1).startsWith(slashFilter) || c.label.toLowerCase().includes(slashFilter)
                );
                return filtered.length > 0 ? (
                  <div className="absolute bottom-full left-0 right-0 mb-1 bg-[#1a1a1a] border-2 border-[#FFD700]/60 z-50 shadow-[4px_4px_0px_#000]">
                    <div className="px-2 py-1 border-b border-[#333] flex items-center gap-1">
                      <span className="text-[#FFD700] text-[10px] font-bold uppercase tracking-wider">Commands</span>
                    </div>
                    {filtered.map((cmd) => (
                      <button
                        key={cmd.cmd}
                        onMouseDown={(e) => { e.preventDefault(); handleSlashSelect(cmd.cmd); }}
                        className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-[#FFD700]/10 border-b border-[#333] last:border-0 transition-colors"
                        style={{ WebkitTextFillColor: 'white', color: 'white' }}
                      >
                        <span className="w-5 text-center text-sm">{cmd.icon}</span>
                        <span className="text-[#FFD700] text-sm font-mono font-bold">{cmd.cmd}</span>
                        <span className="text-white/50 text-xs">{cmd.label}</span>
                      </button>
                    ))}
                  </div>
                ) : null;
              })()}
              {/* Quest banner card chip - shown separately from textarea */}
              {composerQuestData && composerQuestData.quests.length > 0 && (
                <div className="mb-2 border-2 border-[#FFD700] bg-[#0d0d0d] shadow-[3px_3px_0px_#000]">
                  <div className="bg-[#FFD700] px-3 py-1.5 flex items-center gap-2">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#000"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    <span className="font-black text-black text-[10px] uppercase tracking-widest flex-1">Quest VibeMail · {composerQuestData.quests.length} quest{composerQuestData.quests.length > 1 ? 's' : ''}</span>
                    <button
                      onClick={() => {
                        const lines = (composerQuestData?.quests || []).map((q: any) => {
                          if (q.type === 'follow_farcaster') return `/follow farcaster.xyz/${q.username}`;
                          if (q.type === 'use_miniapp') return `/miniapp ${q.url}`;
                          if (q.type === 'join_channel') return `/channel ${q.channelUrl || `farcaster.xyz/~/channel/${q.channelId}`}`;
                          return '';
                        }).filter(Boolean);
                        setQuestEditText(lines.join('\n'));
                        setShowQuestEditModal(true);
                      }}
                      className="bg-black text-[#FFD700] font-black text-[9px] uppercase tracking-wide px-2 py-0.5 border border-black hover:bg-[#111] transition-colors"
                    >Edit</button>
                  </div>
                  <div className="px-3 py-2 flex flex-wrap gap-2">
                    {composerQuestData.quests.map((q: any, i: number) => (
                      <span key={i} className={`text-[10px] font-bold px-2 py-0.5 border border-black ${
                        q.type === 'follow_farcaster' ? 'bg-[#8B5CF6]/20 text-[#8B5CF6] border-[#8B5CF6]/40' :
                        q.type === 'use_miniapp' ? 'bg-[#22C55E]/20 text-[#22C55E] border-[#22C55E]/40' :
                        'bg-[#FF9F0A]/20 text-[#FF9F0A] border-[#FF9F0A]/40'
                      }`}>
                        {q.type === 'follow_farcaster' ? `@${q.username}` : q.type === 'use_miniapp' ? q.name : q.channelName}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {/* Open App Confirmation Modal */}
              {openAppConfirm && (
                <div className="fixed inset-0 z-[800] flex items-center justify-center bg-black/80 p-4">
                  <div className="bg-vintage-charcoal border-2 border-vintage-gold rounded-2xl p-4 w-full max-w-sm">
                    <h3 className="text-vintage-gold font-display font-bold text-lg mb-3 text-center">
                      Open {openAppConfirm.name}?
                    </h3>
                    <p className="text-vintage-ice/80 text-sm text-center mb-4">
                      You will leave VibeMail and open this miniapp.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setOpenAppConfirm(null)}
                        className="flex-1 py-2 bg-vintage-burnt-gold/30 hover:bg-vintage-burnt-gold/50 text-vintage-gold font-display font-bold rounded-xl transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          const { url } = openAppConfirm;
                          setOpenAppConfirm(null);
                          try { await sdk.actions?.openMiniApp?.({ url }); } catch { window.open(url, '_blank'); }
                        }}
                        className="flex-1 py-2 bg-vintage-gold hover:bg-yellow-500 text-vintage-black font-display font-bold rounded-xl transition-all"
                      >
                        Open
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Quest Edit Modal */}
              {showQuestEditModal && (
                <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/80 p-4">
                  <div className="bg-[#0d0d0d] border-2 border-black shadow-[6px_6px_0px_#000] w-full max-w-sm flex flex-col">
                    {/* Header */}
                    <div className="bg-[#FFD700] px-3 py-2 flex items-center gap-2 border-b-2 border-black">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="#000"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                      <span className="font-black text-black text-xs uppercase tracking-widest flex-1">Edit Quests</span>
                      <button onClick={() => setShowQuestEditModal(false)} className="text-black/60 hover:text-black font-bold text-sm">✕</button>
                    </div>
                    {/* Help */}
                    <div className="px-3 py-2 border-b border-[#222] bg-[#111]">
                      <p className="text-white/40 text-[10px] leading-relaxed font-mono">
                        /follow farcaster.xyz/username<br/>
                        /miniapp https://farcaster.xyz/miniapps/...<br/>
                        /channel farcaster.xyz/~/channel/name
                      </p>
                    </div>
                    {/* Textarea */}
                    <textarea
                      value={questEditText}
                      onChange={e => setQuestEditText(e.target.value)}
                      className="w-full bg-[#0a0a0a] px-3 py-3 text-white text-sm font-mono placeholder:text-white/20 focus:outline-none resize-none h-32"
                      style={{ colorScheme: 'dark', WebkitTextFillColor: 'white', color: 'white' }}
                      placeholder={'/follow farcaster.xyz/yourname\n/miniapp https://...\n/channel farcaster.xyz/~/channel/...'}
                      spellCheck={false}
                    />
                    {/* Actions */}
                    <div className="flex gap-2 p-3 border-t-2 border-black">
                      <button
                        onClick={() => setShowQuestEditModal(false)}
                        className="flex-1 py-2 bg-[#1a1a1a] border-2 border-black text-white/60 font-bold text-xs hover:text-white transition-colors"
                      >Cancel</button>
                      <button
                        onClick={() => {
                          // Parse command text → quest data
                          const quests: any[] = [];
                          questEditText.split('\n').forEach(line => {
                            const l = line.trim();
                            if (!l) return;
                            if (l.startsWith('/follow ')) {
                              const raw = l.slice(8).trim().replace(/^farcaster\.xyz\//, '').replace(/^@/, '');
                              const username = raw.split('/').pop() || raw;
                              // Keep existing fid/pfp if username unchanged
                              const existing = composerQuestData?.quests.find((q: any) => q.type === 'follow_farcaster' && q.username === username);
                              quests.push({ type: 'follow_farcaster', username, fid: existing?.fid || 0, pfp: existing?.pfp || '', banner: existing?.banner || settingsFarcasterBanner || '' });
                            } else if (l.startsWith('/miniapp ')) {
                              const url = l.slice(9).trim();
                              const existing = composerQuestData?.quests.find((q: any) => q.type === 'use_miniapp' && q.url === url);
                              const domain = url.replace(/^https?:\/\//, '').split('/')[0];
                              quests.push({ type: 'use_miniapp', url, name: existing?.name || domain, icon: existing?.icon || '' });
                            } else if (l.startsWith('/channel ')) {
                              const raw = l.slice(9).trim().replace(/^farcaster\.xyz/, 'https://farcaster.xyz');
                              const channelId = raw.match(/\/channel\/([^/?]+)/)?.[1] || raw.split('/').pop() || raw;
                              const existing = composerQuestData?.quests.find((q: any) => q.type === 'join_channel' && q.channelId === channelId);
                              quests.push({ type: 'join_channel', channelId, channelName: existing?.channelName || channelId, channelUrl: raw, channelImg: existing?.channelImg || settingsChannelImg || '' });
                            }
                          });
                          if (quests.length > 0) {
                            setComposerQuestData({ quests });
                            setComposerQuestType('social_quest');
                          } else {
                            setComposerQuestData(null);
                            setComposerQuestType(null);
                          }
                          setShowQuestEditModal(false);
                        }}
                        className="flex-1 py-2 bg-[#FFD700] border-2 border-black text-black font-black text-xs shadow-[3px_3px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000] transition-all"
                      >Save</button>
                    </div>
                  </div>
                </div>
              )}
              {/* Font + Color toolbar */}
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <select
                  value={composerFont}
                  onChange={e => setComposerFont(e.target.value)}
                  className="bg-[#111] border border-[#333] text-white text-[10px] px-1.5 py-1 focus:outline-none focus:border-[#555] cursor-pointer"
                  style={{ fontFamily: composerFont || 'inherit' }}
                >
                  <option value="">Font: Default</option>
                  <option value="Arial, sans-serif" style={{ fontFamily: 'Arial' }}>Arial</option>
                  <option value="Georgia, serif" style={{ fontFamily: 'Georgia' }}>Georgia</option>
                  <option value="'Courier New', monospace" style={{ fontFamily: 'Courier New' }}>Courier New</option>
                  <option value="Verdana, sans-serif" style={{ fontFamily: 'Verdana' }}>Verdana</option>
                  <option value="'Trebuchet MS', sans-serif" style={{ fontFamily: 'Trebuchet MS' }}>Trebuchet MS</option>
                  <option value="'Times New Roman', serif" style={{ fontFamily: 'Times New Roman' }}>Times New Roman</option>
                  <option value="Impact, sans-serif" style={{ fontFamily: 'Impact' }}>Impact</option>
                  <option value="'Comic Sans MS', cursive" style={{ fontFamily: 'Comic Sans MS' }}>Comic Sans</option>
                </select>
                <div className="flex items-center gap-1" title="Click to change whole-message color, or select text first to color only that part">
                  {['', '#FFFFFF', '#FFD700', '#F97316', '#22C55E', '#8B5CF6', '#3B82F6', '#EC4899', '#EF4444'].map(c => (
                    <button
                      key={c || 'default'}
                      onMouseDown={e => { e.preventDefault(); applyColorToText(c); }}
                      title={c ? c : 'Default / Remove color'}
                      className="w-4 h-4 flex-shrink-0 transition-transform hover:scale-110"
                      style={{
                        background: c || '#555',
                        border: composerColor === c ? '2px solid #fff' : '2px solid transparent',
                        outline: composerColor === c ? '1px solid #000' : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>
              {/* Textarea with color overlay */}
              <div className="relative border-2 border-[#444] bg-[#0a0a0a] focus-within:border-[#666] h-36 min-h-[144px]">
                {/* Overlay: renders colors, pointer-events-none */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 px-3 py-2 text-xs leading-relaxed pointer-events-none overflow-hidden whitespace-pre-wrap break-words select-none"
                  style={{ fontFamily: composerFont || undefined, wordBreak: 'break-word' }}
                >
                  {composerMessage ? renderComposerOverlay(composerMessage) : <span style={{ color: 'transparent' }}>placeholder</span>}
                </div>
                <textarea
                  ref={textareaRef}
                  value={composerMessage}
                  onChange={handleMessageChange}
                  onKeyDown={(e) => { if (e.key === 'Escape') setSlashMenuOpen(false); }}
                  placeholder="Write your message... (type / for commands)"
                  className="vibemail-input absolute inset-0 w-full h-full px-3 py-2 text-xs bg-transparent focus:outline-none resize-none leading-relaxed placeholder:text-white/30"
                  style={{ colorScheme: 'dark', fontFamily: composerFont || undefined, color: 'transparent', caretColor: composerColor || '#FFFFFF' }}
                />
              </div>
              {/* Command chips */}
              {parseCommandChips(composerMessage).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {parseCommandChips(composerMessage).map((chip, i) => (
                    <div key={i} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#111] border border-[#333] text-[9px] font-bold">
                      {chip.type === 'img' ? (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                      ) : (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                      )}
                      <span className="text-white/60 max-w-[100px] truncate">{chip.label}</span>
                      <button
                        onClick={() => setComposerMessage(prev => prev.replace(chip.fullMatch, '').replace(/\n{2,}/g, '\n').trim())}
                        className="text-white/30 hover:text-red-400 ml-0.5 leading-none text-[11px]"
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* IMG panel */}
            {showImgInput && (
              <div className="mt-1 mb-1 bg-[#0a1a0a] border-2 border-[#059669] p-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#059669] text-[10px] font-black uppercase tracking-widest">Image / Video</span>
                  <button onClick={() => { setShowImgInput(false); setImgInputUrl(''); }} className="text-white/30 hover:text-white text-xs">✕</button>
                </div>
                {/* URL input row */}
                <div className="flex gap-2 mb-2">
                  <input
                    type="url"
                    value={imgInputUrl}
                    onChange={e => setImgInputUrl(e.target.value)}
                    onPaste={e => {
                      const pasted = e.clipboardData.getData('text').trim();
                      if (pasted) { e.preventDefault(); setImgInputUrl(pasted); }
                    }}
                    placeholder="Paste image or video URL..."
                    className="flex-1 bg-[#111] border border-[#059669]/50 text-white text-xs px-2 py-1.5 placeholder:text-white/30 focus:outline-none focus:border-[#059669] min-w-0"
                    style={{ colorScheme: 'dark' }}
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter' && imgInputUrl.trim()) {
                        const line = `/img=${imgInputUrl.trim()}`;
                        const cur = composerMessage.trim();
                        setComposerMessage(cur ? cur + '\n' + line : line);
                        setImgInputUrl(''); setShowImgInput(false);
                      }
                      if (e.key === 'Escape') { setShowImgInput(false); setImgInputUrl(''); }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (!imgInputUrl.trim()) return;
                      const line = `/img=${imgInputUrl.trim()}`;
                      const cur = composerMessage.trim();
                      setComposerMessage(cur ? cur + '\n' + line : line);
                      setImgInputUrl(''); setShowImgInput(false);
                    }}
                    disabled={!imgInputUrl.trim()}
                    className="px-3 py-1 bg-[#059669] border-2 border-black text-white font-black text-xs disabled:opacity-40 hover:bg-[#065F46] transition-all flex-shrink-0"
                  >
                    Add
                  </button>
                </div>
                {/* Preset images grid */}
                <div className="grid grid-cols-4 gap-1.5">
                  {VIBEMAIL_IMAGES.map((img) => (
                    <button
                      key={img.id}
                      onClick={() => {
                        const line = `/img=${img.file}`;
                        const cur = composerMessage.trim();
                        setComposerMessage(cur ? cur + '\n' + line : line);
                        setShowImgInput(false);
                      }}
                      className="border border-[#059669]/30 hover:border-[#059669] transition-all overflow-hidden"
                    >
                      {img.isVideo
                        ? <video src={img.file} className="w-full h-12 object-cover" muted loop autoPlay playsInline />
                        : <img src={img.file} alt={img.name} className="w-full h-12 object-cover" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className="text-[#FFD700]/50 text-[10px] mb-1">/img=URL · /sound=URL · Use PREVIEW to check before sending</p>

            {/* Inline /sound volume control — shown when message has /sound URL volume=X */}
            {(() => {
              const inlineSound = extractInlineSoundUrl(composerMessage);
              if (!inlineSound) return null;
              return (
                <div className="mt-1 flex items-center gap-2 px-2 py-1.5 bg-[#1a0a00] border border-[#F97316]/40">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                  <span className="text-[#F97316] text-[9px] font-black uppercase tracking-widest flex-shrink-0">Volume</span>
                  <input
                    type="range"
                    min="0" max="1" step="0.05"
                    value={inlineSound.volume}
                    onChange={e => {
                      const v = parseFloat(e.target.value).toFixed(2);
                      const updated = composerMessage.replace(
                        /^(\/sound=\S+)(?:\s+volume=[\d.]+)?/im,
                        `$1 volume=${v}`
                      );
                      setComposerMessage(updated);
                    }}
                    className="flex-1 accent-[#F97316] h-1"
                  />
                  <span className="text-[#FED7AA] text-[9px] font-mono w-8 text-right">{Math.round(inlineSound.volume * 100)}%</span>
                  <button
                    onClick={() => setComposerMessage(composerMessage.replace(/\n?\/sound=[^\n]*/i, '').trim())}
                    className="text-[#F97316]/50 hover:text-red-400 text-[9px] flex-shrink-0"
                  >✕</button>
                </div>
              );
            })()}

            {/* Attachment panels - shown above toolbar when active */}
            <audio ref={composerAudioRef} onEnded={() => setPreviewSound(null)} />

            {showSoundPicker && !isCustomAudio(composerAudioId || undefined) && (
              <div className="mt-2 bg-[#0d0d0d] border-2 border-[#F97316]/50 p-2">
                {/* Header + close */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#F97316] text-[10px] font-black uppercase tracking-widest">Audios ({(composerMessage.match(/\/sound=/gi) || []).length}/3)</span>
                  <button onClick={() => setShowSoundPicker(false)} className="text-white/30 hover:text-white text-xs">✕</button>
                </div>
                {/* Direct URL input */}
                <div className="flex gap-1 mb-2">
                  <input
                    type="url"
                    value={soundUrlInput}
                    onChange={e => { setSoundUrlInput(e.target.value); setSoundUrlError(''); }}
                    placeholder="Paste .mp3 URL or myinstants.com/instant/..."
                    className="flex-1 px-2 py-1.5 bg-[#111] border border-[#F97316]/30 text-white text-xs placeholder-white/20 outline-none focus:border-[#F97316]/60 min-w-0"
                    style={{ colorScheme: 'dark' }}
                    onKeyDown={async e => {
                      if (e.key !== 'Enter' || !soundUrlInput.trim()) return;
                      setSoundUrlLoading(true); setSoundUrlError('');
                      let finalUrl = soundUrlInput.trim();
                      const miMatch = finalUrl.match(/myinstants\.com\/instant\/([^/?#]+)/i);
                      if (miMatch) {
                        try {
                          const r = await fetch(`${CONVEX_SITE_URL}/myinstants?search=${encodeURIComponent(miMatch[1])}`);
                          const d = await r.json();
                          if (d.results?.[0]?.url) { finalUrl = d.results[0].url; }
                          else { setSoundUrlError('Not found'); setSoundUrlLoading(false); return; }
                        } catch { setSoundUrlError('Error'); setSoundUrlLoading(false); return; }
                      }
                      if (!finalUrl.match(/\.(mp3|ogg|wav|aac|m4a)(\?|$)/i) && !finalUrl.includes('myinstants.com/media/')) {
                        setSoundUrlError('Need direct .mp3 URL');
                        setSoundUrlLoading(false); return;
                      }
                      const soundLine = `/sound=${finalUrl} volume=0.2`;
                      const soundCount = (composerMessage.match(/\/sound=/gi) || []).length;
                      if (soundCount >= 3) { setSoundUrlError('Max 3 audios'); setSoundUrlLoading(false); return; }
                      const cur = composerMessage.trim();
                      setComposerMessage(cur ? cur + '\n' + soundLine : soundLine);
                      setShowSoundPicker(false); setSoundUrlLoading(false); setSoundUrlInput(''); setSoundUrlError('');
                    }}
                  />
                  {soundUrlLoading
                    ? <span className="text-[#F97316]/60 text-xs flex items-center px-2">...</span>
                    : soundUrlError
                    ? <span className="text-red-400 text-[9px] flex items-center px-1 leading-tight max-w-[70px]">{soundUrlError}</span>
                    : null}
                </div>
                {/* Search */}
                <input
                  type="text"
                  value={miSearch}
                  onChange={e => {
                    const val = e.target.value;
                    setMiSearch(val);
                    if (val) setMiLoading(true);
                    if (miSearchTimeout.current) clearTimeout(miSearchTimeout.current);
                    miSearchTimeout.current = setTimeout(() => doFetchMi(val), val ? 500 : 0);
                  }}
                  placeholder="Search myinstants..."
                  className="w-full mb-2 px-2 py-1.5 bg-[#1a1a1a] border border-[#F97316]/30 text-[#F97316] text-xs placeholder-[#F97316]/30 outline-none focus:border-[#F97316]/60"
                  style={{ colorScheme: 'dark' }}
                />
                {/* Results — local sounds + myinstants in one list */}
                <div className="flex flex-col gap-1 max-h-56 overflow-y-auto">
                  {/* Local miniapp sounds (always shown, filtered locally) */}
                  {VIBEMAIL_SOUNDS.filter(s => !miSearch || s.name.toLowerCase().includes(miSearch.toLowerCase())).map(sound => {
                    const soundLine = `/sound=${sound.file} volume=0.2`;
                    const isSelected = composerMessage.includes(`/sound=${sound.file}`);
                    const isPreviewing = previewSound === sound.file;
                    return (
                      <SoundRow key={sound.id} name={sound.name} isSelected={isSelected} isPreviewing={isPreviewing}
                        onPlay={() => {
                          if (composerAudioRef.current) {
                            if (isPreviewing) { composerAudioRef.current.pause(); setPreviewSound(null); }
                            else { composerAudioRef.current.src = sound.file; composerAudioRef.current.volume = 0.2; composerAudioRef.current.play().catch(console.error); setPreviewSound(sound.file); }
                          }
                        }}
                        onUse={() => {
                          const soundCount = (composerMessage.match(/\/sound=/gi) || []).length;
                          if (soundCount >= 3) return;
                          const newText = composerMessage.trim() ? `${composerMessage.trim()}\n${soundLine}` : soundLine;
                          setComposerMessage(newText); setShowSoundPicker(false);
                        }}
                      />
                    );
                  })}

                  {/* Myinstants results (from API) */}
                  {miSearch && <div className="text-[#F97316]/40 text-[9px] uppercase tracking-widest pt-1 pb-0.5 border-t border-[#F97316]/10">Myinstants</div>}
                  {miLoading
                    ? <div className="text-center text-[#F97316]/40 text-xs py-3">Searching...</div>
                    : miResults.length === 0 && miSearch
                    ? <div className="text-center text-white/30 text-xs py-2">No results</div>
                    : miResults.map(sound => {
                        const isSelected = composerMessage.includes(`/sound=${sound.url}`);
                        const isPreviewing = previewSound === sound.url;
                        return (
                          <SoundRow key={sound.url} name={sound.name} isSelected={isSelected} isPreviewing={isPreviewing}
                            onPlay={() => {
                              if (composerAudioRef.current) {
                                if (isPreviewing) { composerAudioRef.current.pause(); setPreviewSound(null); }
                                else { composerAudioRef.current.src = proxyAudioUrl(sound.url); composerAudioRef.current.volume = 0.2; composerAudioRef.current.play().catch(console.error); setPreviewSound(sound.url); }
                              }
                            }}
                            onUse={() => {
                              const soundLine = `/sound=${sound.url} volume=0.2`;
                              const soundCount = (composerMessage.match(/\/sound=/gi) || []).length;
                              if (soundCount >= 3) return;
                              const newText = composerMessage.trim() ? `${composerMessage.trim()}\n${soundLine}` : soundLine;
                              setComposerMessage(newText); setShowSoundPicker(false);
                            }}
                          />
                        );
                      })
                  }
                </div>
              </div>
            )}

            {/* GIF Picker - Tenor */}
            {showGifPicker && (
              <div className="mt-2 bg-[#0d0d0d] border border-[#7C3AED]/40 p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[#7C3AED] text-[10px] font-black uppercase tracking-widest">GIF</span>
                  <button onClick={() => setShowGifPicker(false)} className="text-white/30 hover:text-white text-xs">✕</button>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={gifSearch}
                    onChange={(e) => {
                      const val = e.target.value;
                      setGifSearch(val);
                      if (gifSearchTimeout.current) clearTimeout(gifSearchTimeout.current);
                      gifSearchTimeout.current = setTimeout(() => doFetchGifs(val), 500);
                    }}
                    placeholder="Search GIFs..."
                    className="vibemail-input flex-1 bg-[#0a0a0a] border border-[#7C3AED]/40 text-white px-2 py-1 text-xs focus:outline-none focus:border-[#7C3AED]"
                    style={{ colorScheme: 'dark', WebkitTextFillColor: 'white' }}
                  />
                  <button onClick={() => setShowGifPicker(false)} className="text-white/40 hover:text-white text-xs px-1">✕</button>
                </div>
                {gifLoading ? (
                  <p className="text-white/40 text-[10px] text-center py-2">Loading...</p>
                ) : gifResults.length === 0 ? (
                  <p className="text-white/40 text-[10px] text-center py-2">No results</p>
                ) : (
                  <div className="grid grid-cols-3 gap-1 max-h-48 overflow-y-auto">
                    {gifResults.map((gif) => (
                      <button
                        key={gif.id}
                        onClick={() => {
                          // Insert /img=URL command at cursor or end
                          const gifLine = `/img=${gif.url}`;
                          const current = composerMessage.trim();
                          setComposerMessage(current ? current + '\n' + gifLine : gifLine);
                          setShowGifPicker(false);
                        }}
                        className="relative border border-[#7C3AED]/20 hover:border-[#7C3AED] transition-all overflow-hidden"
                      >
                        <img src={gif.preview} alt={gif.title} className="w-full h-16 object-cover" loading="lazy" />
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-white/20 text-[8px] text-right mt-1">Powered by Tenor</p>
              </div>
            )}



            {showMiniappInput && (
              <div className="mt-2 bg-[#1a1a1a] border border-[#FFD700]/20 p-2">
                <p className="text-white/40 text-[10px] mb-1">Paste miniapp URL</p>
                <input
                  type="text"
                  value={miniappInputValue}
                  onChange={(e) => {
                    setMiniappInputValue(e.target.value);
                    const val = e.target.value.trim();
                    if (val.startsWith('https://')) {
                      setComposerMiniappUrl(val);
                    } else {
                      setComposerMiniappUrl(null);
                    }
                  }}
                  placeholder="https://..."
                  className="vibemail-input w-full bg-[#0A0A0A] border-2 border-[#444] text-white px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-[#22C55E]"
                  style={{ colorScheme: 'dark', WebkitTextFillColor: 'white', color: 'white' }}
                />
                {composerMiniappUrl && (
                  <MiniappPreview url={composerMiniappUrl} />
                )}
              </div>
            )}

            {/* Bottom toolbar */}
            <div className="flex items-center gap-1 border-t-2 border-[#333] pt-2 mt-2">
              {/* Som - LARANJA */}
              {!isCustomAudio(composerAudioId || undefined) && (
                <button
                  onClick={() => openSoundPicker()}
                  className="w-9 h-9 flex items-center justify-center border-2 border-[#EA580C] bg-[#EA580C] text-white hover:bg-[#C2410C] transition-all"
                  style={{ WebkitTextFillColor: 'white' }}
                  title="/sound"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                </button>
              )}

              {/* GIF - VIOLETA */}
              <button
                onClick={openGifPicker}
                className={`w-9 h-9 flex items-center justify-center border-2 transition-all ${showGifPicker ? 'border-[#5B21B6] bg-[#5B21B6]' : 'border-[#7C3AED] bg-[#7C3AED] hover:bg-[#5B21B6]'} text-white`}
                style={{ WebkitTextFillColor: 'white' }}
                title="GIF search"
              >
                <span className="font-black text-[10px] leading-none">GIF</span>
              </button>

              {/* IMG - VERDE */}
              <button
                onClick={() => { setShowImgInput(v => !v); setShowGifPicker(false); setShowSoundPicker(false); }}
                className={`w-9 h-9 flex items-center justify-center border-2 transition-all ${showImgInput ? 'border-[#065F46] bg-[#065F46]' : 'border-[#059669] bg-[#059669] hover:bg-[#065F46]'} text-white`}
                style={{ WebkitTextFillColor: 'white' }}
                title="Insert image/video URL"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              </button>

              {/* hidden input kept for handleMediaUpload (used by other paths) */}
              <input ref={mediaUploadRef} type="file" accept="audio/*,image/*,video/mp4,video/webm,.gif" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleMediaUpload(f); e.target.value = ''; }} />

              {/* Voice recorder (mic only, no upload) */}
              <AudioRecorder
                toolbar
                onAudioReady={(id) => setComposerAudioId(id)}
                onClear={() => setComposerAudioId(null)}
                currentAudioId={isCustomAudio(composerAudioId || undefined) ? composerAudioId : null}
              />

              {/* Preview button — Edit Design lives inside the preview overlay */}
              {(composerMessage.trim() || composerImageId || composerDrawingId || composerQuestData) && (
                <button
                  onClick={() => setShowPreview(true)}
                  className="h-9 px-3 flex items-center gap-1.5 border-2 border-[#DB2777] bg-[#DB2777] text-white hover:bg-[#BE185D] transition-all"
                  style={{ WebkitTextFillColor: 'white' }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  <span className="font-black text-xs uppercase tracking-wide">Preview</span>
                </button>
              )}

              {/* Spacer */}
              <div className="flex-1" />

              {/* Character count */}
              <span className="text-white/30 text-[10px] mr-1">{countVisibleChars(composerMessage)}/200</span>
            </div>


            {/* Preview - full-screen overlay */}
            {showPreview && (
              <div className="fixed inset-0 z-[600] bg-[#0a0a0a] flex flex-col" style={{ colorScheme: 'dark', color: 'white' }}>
                {/* Header - Tab bar */}
                <div className="flex items-stretch border-b-2 border-[#FFD700]">
                  <div className="flex-1 flex items-center justify-center py-3 border-r border-[#FFD700]/30 bg-[#FFD700]/10">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2.5" className="mr-1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    <span className="text-[#FFD700] font-black text-xs uppercase tracking-widest">Preview</span>
                  </div>
                  <button
                    onClick={() => { setShowPreview(false); setShowDesign(true); }}
                    className="flex-1 flex items-center justify-center py-3 hover:bg-[#8B5CF6]/10 transition-all group"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="mr-1.5 text-white/40 group-hover:text-[#8B5CF6]"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                    <span className="text-white/40 group-hover:text-[#8B5CF6] font-black text-xs uppercase tracking-widest transition-all">Edit Design</span>
                  </button>
                  <button onClick={() => setShowPreview(false)} className="px-4 text-white/30 hover:text-white/80 text-lg border-l border-[#FFD700]/30">✕</button>
                </div>
                {/* Content - scrollable */}
                <div className="flex-1 overflow-y-auto p-3">
                  <div className="bg-[#111] border-2 border-[#FFD700]/40">
                    <div className="flex items-center gap-2 mb-3 px-4 pt-4">
                      <div className="w-2 h-2 rounded-full bg-[#FFD700] animate-pulse flex-shrink-0" />
                      <p className="text-white font-bold text-sm truncate">@{username || 'you'}</p>
                      <span className="ml-auto text-white/40 text-xs">Just now</span>
                    </div>
                    {/* Quest banner card in preview - carousel */}
                    {composerQuestData && composerQuestData.quests.length > 0 && (() => {
                      const quests = composerQuestData.quests;
                      const idx = Math.min(previewQuestIdx, quests.length - 1);
                      const q = quests[idx];
                      return (
                      <div className="mx-4 mb-3 border-2 border-black shadow-[4px_4px_0px_#000] overflow-hidden">
                        <div className="bg-[#FFD700] px-3 py-2 flex items-center gap-2 border-b-2 border-black">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="#000"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                          <span className="font-black text-black text-xs uppercase tracking-widest flex-1">Quest VibeMail</span>
                          {quests.length > 1 && (
                            <div className="flex items-center gap-1">
                              <button onClick={() => setPreviewQuestIdx(p => (p - 1 + quests.length) % quests.length)} className="w-5 h-5 bg-black border border-black flex items-center justify-center font-black text-[#FFD700] text-xs hover:bg-[#111] transition-colors">‹</button>
                              <span className="text-black font-black text-[9px]">{idx + 1}/{quests.length}</span>
                              <button onClick={() => setPreviewQuestIdx(p => (p + 1) % quests.length)} className="w-5 h-5 bg-black border border-black flex items-center justify-center font-black text-[#FFD700] text-xs hover:bg-[#111] transition-colors">›</button>
                            </div>
                          )}
                        </div>
                        <div className="bg-[#0d0d0d]">
                          {(() => {
                            const splashImg = miniappPreviewCache[q.url]?.splash_image_url || miniappPreviewCache[q.url]?.screenshot_urls?.[0] || '';
                            if (q.type === 'follow_farcaster') return (
                              <div>
                                <div className="relative h-28 bg-[#1a0a2e] overflow-hidden flex items-center justify-center">
                                  {(q.banner || settingsFarcasterBanner) && <img src={q.banner || settingsFarcasterBanner} className="absolute inset-0 w-full h-full object-cover opacity-70" alt="" />}
                                  {!q.banner && !settingsFarcasterBanner && q.pfp && <img src={q.pfp} className="absolute inset-0 w-full h-full object-cover opacity-20" alt="" />}
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                                  {q.pfp ? <img src={q.pfp} className="w-14 h-14 rounded-full border-2 border-[#8B5CF6] object-cover z-10 relative" alt="" /> : <div className="w-14 h-14 rounded-full border-2 border-[#8B5CF6] bg-[#8B5CF6]/20 z-10 relative" />}
                                  <div className="absolute top-1.5 right-2 px-1.5 py-0.5 bg-[#8B5CF6] border border-black/50"><span className="text-white font-black text-[8px] uppercase tracking-widest">Follow</span></div>
                                </div>
                                <div className="flex items-center gap-2 px-3 pt-2 pb-1">
                                  {q.pfp && <img src={q.pfp} className="w-7 h-7 rounded-full border border-[#8B5CF6] object-cover flex-shrink-0" alt="" />}
                                  <div className="flex-1 min-w-0"><p className="text-white font-black text-sm truncate">@{q.username}</p><p className="text-[#8B5CF6] text-[8px] uppercase tracking-widest">VibeFID Holder</p></div>
                                </div>
                                <div className="flex gap-1.5 px-2 pb-2">
                                  <button onClick={() => { try { sdk.actions?.openUrl?.(`https://warpcast.com/${q.username}`); } catch { window.open(`https://warpcast.com/${q.username}`, '_blank'); } }} className="flex-1 py-1.5 bg-[#8B5CF6] border-2 border-black text-white font-black text-[10px] text-center uppercase tracking-wide shadow-[2px_2px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">Go to Profile</button>
                                  <div className="flex-1 py-1.5 bg-[#444] border-2 border-black text-white/60 font-black text-[10px] text-center uppercase tracking-wide shadow-[2px_2px_0px_#000] flex items-center justify-center gap-1"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>Claim</div>
                                </div>
                              </div>
                            );
                            if (q.type === 'use_miniapp') return (
                              <div>
                                {splashImg ? (
                                  <div className="relative h-28 overflow-hidden">
                                    <img src={splashImg} alt="" className="w-full h-full object-cover" />
                                    <div className="absolute top-1.5 right-2 px-1.5 py-0.5 bg-[#22C55E] border border-black/50"><span className="text-black font-black text-[8px] uppercase tracking-widest">Miniapp</span></div>
                                  </div>
                                ) : (
                                  <div className="relative h-28 bg-[#0a1a0a] overflow-hidden flex items-center justify-center">
                                    {q.icon && <img src={q.icon} className="absolute inset-0 w-full h-full object-cover opacity-20" alt="" />}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                                    {q.icon ? <img src={q.icon} className="w-14 h-14 rounded-xl border-2 border-[#22C55E] object-cover z-10 relative" alt="" /> : <div className="w-14 h-14 rounded-xl border-2 border-[#22C55E] bg-[#22C55E]/20" />}
                                    <div className="absolute top-1.5 right-2 px-1.5 py-0.5 bg-[#22C55E] border border-black/50"><span className="text-black font-black text-[8px] uppercase tracking-widest">Miniapp</span></div>
                                  </div>
                                )}
                                <div className="flex items-center gap-2 px-3 pt-2 pb-1">
                                  {q.icon && <img src={q.icon} className="w-7 h-7 rounded-lg border border-[#22C55E] object-cover flex-shrink-0" alt="" />}
                                  <div className="flex-1 min-w-0"><p className="text-white font-black text-sm truncate">{q.name}</p><p className="text-[#22C55E] text-[8px] uppercase tracking-widest">Farcaster Miniapp</p></div>
                                </div>
                                <div className="flex gap-1.5 px-2 pb-2">
                                  <button onClick={() => { try { sdk.actions?.openMiniApp?.({ url: q.url }); } catch { window.open(q.url, '_blank'); } }} className="flex-1 py-1.5 bg-[#22C55E] border-2 border-black text-black font-black text-[10px] text-center uppercase tracking-wide shadow-[2px_2px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">Open App &amp; Add</button>
                                  <div className="flex-1 py-1.5 bg-[#444] border-2 border-black text-white/60 font-black text-[10px] text-center uppercase tracking-wide shadow-[2px_2px_0px_#000] flex items-center justify-center gap-1"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>Claim</div>
                                </div>
                              </div>
                            );
                            if (q.type === 'join_channel') return (
                              <div>
                                {(() => { const chImg = q.channelImg || settingsChannelImg; return (
                                <div className="relative h-28 bg-[#1a0e00] overflow-hidden flex items-center justify-center">
                                  {chImg && <img src={chImg} className="absolute inset-0 w-full h-full object-cover opacity-60" alt="" />}
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                                  {chImg
                                    ? <img src={chImg} className="w-14 h-14 rounded-xl border-2 border-[#FF9F0A] object-cover z-10 relative" alt="" />
                                    : <div className="w-14 h-14 border-2 border-[#FF9F0A] bg-[#FF9F0A]/20 flex items-center justify-center z-10 relative"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF9F0A" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
                                  }
                                  <div className="absolute top-1.5 right-2 px-1.5 py-0.5 bg-[#FF9F0A] border border-black/50"><span className="text-black font-black text-[8px] uppercase tracking-widest">Channel</span></div>
                                </div>
                                ); })()}
                                <div className="px-3 pt-2 pb-1"><p className="text-white font-black text-sm truncate">/{q.channelName || q.channelId}</p><p className="text-[#FF9F0A] text-[8px] uppercase tracking-widest">Farcaster Channel</p></div>
                                <div className="flex gap-1.5 px-2 pb-2">
                                  <button onClick={() => { const url = q.channelUrl || `https://warpcast.com/~/channel/${q.channelId}`; try { sdk.actions?.openUrl?.(url); } catch { window.open(url, '_blank'); } }} className="flex-1 py-1.5 bg-[#FF9F0A] border-2 border-black text-black font-black text-[10px] text-center uppercase tracking-wide shadow-[2px_2px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">Join Channel</button>
                                  <div className="flex-1 py-1.5 bg-[#444] border-2 border-black text-white/60 font-black text-[10px] text-center uppercase tracking-wide shadow-[2px_2px_0px_#000] flex items-center justify-center gap-1"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>Claim</div>
                                </div>
                              </div>
                            );
                            return null;
                          })()}
                        </div>
                      </div>
                    ); })()}
                    {/* Body — designed layout if positions set, else flow layout */}
                    {(() => {
                      const hasDesign = Object.keys(elementPositions).length > 0 || drawnIds.length > 0;
                      const pvTextOnly = composerMessage.replace(/\/sound=\S+(\s+volume=[\d.]+)?/gi, '').replace(/\/img=\S+/gi, '').trim();
                      const pvAudioMatch = composerMessage.match(/\/sound=(\S+)/i);
                      // Multi-image preview: one slot per /img= in message + optional upload
                      const pvAllImgSrcs: { key: string; src: string }[] = [
                        ...[...composerMessage.matchAll(/\/img=(\S+)/gi)].map((m, i) => ({ key: `img_${i}`, src: m[1] })),
                        ...(composerImageId ? [{ key: 'img_upload', src: composerImageId.startsWith('img:') ? (composerCustomImagePreview || '') : (getImageFile(composerImageId)?.file || '') }] : []),
                      ];

                      // Both flow and designed layouts use the same fixed-height container
                      const claimVbms = hasFreemail ? 0 : QUEST_BASE_VBMS;
                      const claimBtn = (
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 9999, pointerEvents: 'none' }}>
                          <div className="flex items-center justify-between px-3 py-2 border-t border-[#FFD700]/30 bg-[#0a0a0a]/95">
                            <span className="text-[#FFD700]/50 text-[9px] uppercase tracking-widest font-black">VibeMail</span>
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-[#FFD700] border border-black">
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                              <span className="text-black font-black text-[10px] uppercase tracking-widest">+{claimVbms} VBMS</span>
                            </div>
                          </div>
                        </div>
                      );
                      // Scroll indicator arrow — fixed to viewport bottom so it always shows where screen ends
                      const scrollArrow = (
                        <div style={{ position: 'fixed', bottom: 64, right: 16, zIndex: 9100, pointerEvents: 'none' }}>
                          <div className="animate-bounce select-none" style={{ opacity: 0.7 }}>
                            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                              <circle cx="18" cy="18" r="17" fill="rgba(0,0,0,0.7)" stroke="#FFD700" strokeWidth="2"/>
                              <polyline points="11,14 18,23 25,14" stroke="#FFD700" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                            </svg>
                          </div>
                        </div>
                      );

                      if (!hasDesign) return (
                        <div style={{ position: 'relative', height: VIBEMAIL_CARD_HEIGHT, width: VIBEMAIL_CARD_WIDTH, maxWidth: '100%', margin: '0 auto', overflow: 'clip' }}>
                          <div className="px-4 pt-1 pb-12">
                            <div className="text-sm leading-relaxed" style={{ color: '#e5e7eb' }}>
                              {composerMessage ? renderRichMessage(composerMessage) : <span style={{ color: 'rgba(255,255,255,0.3)' }}>(no text)</span>}
                            </div>
                            {composerCastUrl && <p className="text-[#9945FF] text-xs mt-2 truncate">Cast: {composerCastUrl}</p>}
                            {composerMiniappUrl && (
                              <div className="mt-2 bg-[#0d1f0d] border border-[#22C55E]/50 rounded px-2 py-1.5 flex items-center gap-1.5">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6v6H9z"/></svg>
                                <span className="text-[#22C55E] text-xs truncate">{composerMiniappUrl}</span>
                              </div>
                            )}
                            {composerImageId && (
                              <div className="mt-2">
                                {composerImageId.startsWith('img:') ? (
                                  composerCustomImagePreview ? (
                                    <img src={composerCustomImagePreview} alt="Custom" className="max-w-full max-h-48 object-contain border border-[#FFD700]/30" />
                                  ) : (
                                    <p className="text-[#FFD700]/70 text-xs">Custom image attached</p>
                                  )
                                ) : (() => {
                                  const imgData = getImageFile(composerImageId);
                                  return imgData ? (
                                    imgData.isVideo ? (
                                      <video src={imgData.file} className="max-w-full max-h-48 object-contain border border-[#FFD700]/30" autoPlay loop muted playsInline />
                                    ) : (
                                      <img src={imgData.file} alt="Attachment" className="max-w-full max-h-48 object-contain border border-[#FFD700]/30" />
                                    )
                                  ) : (
                                    <p className="text-[#FFD700]/70 text-xs">Image attached</p>
                                  );
                                })()}
                              </div>
                            )}
                            {composerDrawingId && (
                              <div className="mt-2 flex items-center gap-1.5 px-2 py-1 bg-[#1a0a2e] border border-[#A78BFA]/40">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                                <span className="text-[#A78BFA] text-[10px] font-bold">Drawing overlay attached</span>
                              </div>
                            )}
                          </div>
                          {scrollArrow}
                          {claimBtn}
                        </div>
                      );

                      // Designed layout — elements at their custom absolute positions
                      return (
                        <div style={{ position: 'relative', height: VIBEMAIL_CARD_HEIGHT, width: VIBEMAIL_CARD_WIDTH, maxWidth: '100%', margin: '0 auto', overflow: 'clip' }}>
                          {(() => {
                            type PvItem = { key: string; z: number; node: React.ReactNode };
                            const pvItems: PvItem[] = [];
                            if (pvTextOnly && elementPositions['text']) {
                              const pos = elementPositions['text'];
                              pvItems.push({ key: 'pvtext', z: pos.z ?? 0, node: (
                                <div key="pvtext" style={{ position:'absolute', left:pos.x, top:pos.y, width:pos.w, height:pos.h, transform:`rotate(${pos.r??0}deg)`, transformOrigin:'center center', overflow:'hidden', boxSizing:'border-box', background:'#000', padding:'8px', zIndex: ((pos.z ?? 0) + 1) * 10 }}>
                                  <div className="text-sm leading-relaxed" style={{ color: '#e5e7eb', fontSize: Math.max(8, Math.min(15, pos.h * 0.2)) }}>{renderRichMessage(composerMessage)}</div>
                                </div>
                              )});
                            }
                            if (pvAudioMatch && elementPositions['audio']) {
                              const pos = elementPositions['audio'];
                              const rawUrl = pvAudioMatch[1];
                              const audioUrl = proxyAudioUrl(rawUrl);
                              const volMatch = composerMessage.match(/\/sound=\S+\s+volume=([\d.]+)/i);
                              const vol = volMatch ? Math.min(1, Math.max(0, parseFloat(volMatch[1]))) : 0.2;
                              const aName = rawUrl.split('/').pop()?.replace(/\.[^.]+$/, '').replace(/[-_%+]/g, ' ').trim() || 'Audio';
                              const pid = `preview:${audioUrl}`;
                              const isPlaying = playingAudio === pid;
                              pvItems.push({ key: 'pvaudio', z: pos.z ?? 0, node: (
                                <div key="pvaudio" style={{ position:'absolute', left:pos.x, top:pos.y, width:pos.w, height:pos.h, transform:`rotate(${pos.r??0}deg)`, transformOrigin:'center center', overflow:'hidden', boxSizing:'border-box', zIndex: ((pos.z ?? 0) + 1) * 10 }}>
                                  <button
                                    className="w-full h-full flex items-center gap-2.5 px-3 active:opacity-80 transition-opacity"
                                    style={{ background: 'linear-gradient(135deg, #1c0900 0%, #0d0d0d 100%)', borderLeft: `3px solid ${isPlaying ? '#ff6b00' : '#F97316'}` }}
                                    onClick={() => {
                                      if (isPlaying) { audioRef.current?.pause(); setPlayingAudio(null); }
                                      else if (audioRef.current) {
                                        audioRef.current.src = audioUrl; audioRef.current.volume = vol;
                                        audioRef.current.play().catch(() => setPlayingAudio(null));
                                        setPlayingAudio(pid);
                                      }
                                    }}
                                  >
                                    <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 transition-all" style={{ background: '#F97316', boxShadow: isPlaying ? '0 0 16px rgba(249,115,22,0.7)' : '0 0 10px rgba(249,115,22,0.45)' }}>
                                      {isPlaying
                                        ? <svg width="11" height="11" viewBox="0 0 24 24" fill="#000"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                                        : <svg width="11" height="11" viewBox="0 0 24 24" fill="#000"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                      }
                                    </div>
                                    <div className="flex items-center gap-px flex-shrink-0">
                                      {[3,6,4,8,5,9,4,7,3,6,8,5].map((h, i) => (
                                        <div key={i} style={{ width: 2, height: h * 2.2, background: isPlaying ? (i % 2 === 0 ? '#F97316' : 'rgba(249,115,22,0.5)') : (i < 5 ? '#F97316' : 'rgba(249,115,22,0.25)'), borderRadius: 1 }} />
                                      ))}
                                    </div>
                                    <div className="flex-1 min-w-0 text-left">
                                      <p className="text-white font-bold text-[11px] capitalize truncate leading-tight">{aName}</p>
                                      <p className="text-[#F97316]/50 text-[8px] uppercase tracking-widest">{isPlaying ? 'Playing…' : 'Sound'}</p>
                                    </div>
                                    <span className="text-[#F97316]/15 text-base flex-shrink-0">♪</span>
                                  </button>
                                </div>
                              )});
                            }
                            for (const { key, src } of pvAllImgSrcs) {
                              if (!src || !elementPositions[key]) continue;
                              const pos = elementPositions[key];
                              const isVid = /\.(mp4|webm|mov|ogg)(\?|$)/i.test(src);
                              pvItems.push({ key, z: pos.z ?? 0, node: (
                                <div key={key} style={{ position:'absolute', left:pos.x, top:pos.y, width:pos.w, height:pos.h, transform:`rotate(${pos.r??0}deg)`, transformOrigin:'center center', overflow:'hidden', boxSizing:'border-box', zIndex: ((pos.z ?? 0) + 1) * 10 }}>
                                  {isVid
                                    ? <video src={src} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                                    : <img src={src} alt="Image" className="w-full h-full object-cover" />}
                                </div>
                              )});
                            }
                            for (const id of drawnIds) {
                              const src = drawingImages[id];
                              const pos = elementPositions[id];
                              if (!src || !pos) continue;
                              pvItems.push({ key: id, z: pos.z ?? 0, node: (
                                <div key={id} style={{ position:'absolute', left:pos.x, top:pos.y, width:pos.w, height:pos.h, transform:`rotate(${pos.r??0}deg)`, transformOrigin:'center center', overflow:'hidden', boxSizing:'border-box', zIndex: ((pos.z ?? 0) + 1) * 10 }}>
                                  <img src={src} alt="" className="w-full h-full" />
                                </div>
                              )});
                            }
                            pvItems.sort((a, b) => a.z - b.z);
                            return pvItems.map(item => item.node);
                          })()}
                          {/* Drawing overlay from saved design manifest */}
                          {composerDesignManifest?.draw?.src && (
                            <img src={composerDesignManifest.draw.src} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9990 }} />
                          )}
                          {scrollArrow}
                          {claimBtn}
                        </div>
                      );
                    })()}
                  </div>
                </div>
                {/* Bottom */}
                <div className="p-3 border-t-2 border-[#333] flex gap-2">
                  <button
                    onClick={() => { setShowPreview(false); setShowDesign(true); }}
                    className="flex-1 py-2.5 bg-[#8B5CF6] border-2 border-[#8B5CF6] text-white font-bold text-xs uppercase tracking-wide hover:bg-[#7C3AED] transition-all flex items-center justify-center gap-1.5"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                    Edit Design
                  </button>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="flex-1 py-2.5 bg-[#1a1a1a] border-2 border-[#444] text-white font-bold text-xs uppercase tracking-wide hover:border-[#FFD700] transition-all"
                  >Back to Compose</button>
                </div>
              </div>
            )}

            {/* Design Editor - full-screen canvas */}
            {showDesign && (() => {
              const textOnly = composerMessage.replace(/\/sound=\S+(\s+volume=[\d.]+)?/gi, '').replace(/\/img=\S+/gi, '').trim();
              const audioMatch = composerMessage.match(/\/sound=(\S+)/i);
              const audioName = audioMatch ? audioMatch[1].split('/').pop()?.replace(/\.[^.]+$/, '').replace(/[-_%+]/g, ' ').trim() || 'Audio' : 'Audio';
              // Multi-image: one slot per /img= in message + optional upload slot
              const allImgSrcs: { key: string; src: string; label: string }[] = [
                ...[...composerMessage.matchAll(/\/img=(\S+)/gi)].map((m, i) => ({ key: `img_${i}`, src: m[1], label: `Img #${i + 1}` })),
                ...(composerImageId ? [{ key: 'img_upload', src: composerImageId.startsWith('img:') ? (composerCustomImagePreview || '') : (getImageFile(composerImageId)?.file || ''), label: 'Upload' }] : []),
              ];
              // Legacy: imgSrc for hint condition only
              const imgSrc = allImgSrcs.length > 0 ? allImgSrcs[0].src : '';

              // Default position for each element (fallback when pos not yet set by useEffect)
              const getDefaultPos = (id: string) => {
                const W = VIBEMAIL_CARD_WIDTH - 24;
                const isImg = id.startsWith('img_') || id === 'img_upload';
                const imgIdx = isImg ? (id === 'img_upload' ? allImgSrcs.length - 1 : parseInt(id.split('_')[1]) || 0) : 0;
                const baseY = 8 + (textOnly ? 76 : 0) + (audioMatch ? 68 : 0) + imgIdx * 162;
                if (isImg) return { x: 12, y: baseY, w: W, h: 150, r: 0 };
                const els = ['text', 'audio'].filter(e => (e === 'text' && textOnly) || (e === 'audio' && audioMatch));
                const idx = els.indexOf(id);
                const y = 8 + Math.max(0, idx) * 72;
                return { x: 12, y, w: W, h: 56, r: 0 };
              };

              // renderEl: plain function returning JSX (NOT a React component — avoids remount on state change)
              type ElPos = {x:number,y:number,w:number,h:number,r?:number,z?:number};
              const renderEl = (id: string, accentColor: string, content: React.ReactNode | ((pos: ElPos) => React.ReactNode)) => {
                const pos = elementPositions[id] || getDefaultPos(id);
                const isDrawEl = id.startsWith('draw_');
                const isSel = selectedEl === id;
                return (
                  <div
                    key={id}
                    id={`vmd-${id}`}
                    style={{
                      position: 'absolute',
                      left: pos.x, top: pos.y,
                      width: pos.w, height: pos.h,
                      transform: `rotate(${pos.r ?? 0}deg)`,
                      transformOrigin: 'center center',
                      touchAction: 'none', userSelect: 'none',
                      cursor: 'grab',
                      outline: isSel ? `2px solid ${accentColor}` : (groupDraw && isDrawEl ? '1px dashed rgba(167,139,250,0.4)' : 'none'),
                      boxSizing: 'border-box', overflow: 'visible',
                      zIndex: ((pos.z ?? 0) + 1) * 10,
                    }}
                    onPointerDown={(e) => {
                      if ((e.target as HTMLElement).closest('[data-action]')) return;
                      e.stopPropagation();
                      setSelectedEl(id);
                      const origins = groupDraw && isDrawEl
                        ? Object.fromEntries(drawnIds.map(did => [did, { x: elementPositions[did]?.x ?? 0, y: elementPositions[did]?.y ?? 0 }]))
                        : undefined;
                      dragRef.current = { id, origX: pos.x, origY: pos.y, startMX: e.clientX, startMY: e.clientY, groupOrigins: origins };
                      e.currentTarget.setPointerCapture(e.pointerId);
                    }}
                    onPointerMove={(e) => {
                      const drag = dragRef.current;
                      if (!drag || drag.id !== id) return;
                      e.stopPropagation();
                      const dx = e.clientX - drag.startMX;
                      const dy = e.clientY - drag.startMY;
                      if (drag.groupOrigins) {
                        Object.entries(drag.groupOrigins).forEach(([did, orig]) => {
                          const el = document.getElementById(`vmd-${did}`);
                          if (el) { el.style.left = `${orig.x + dx}px`; el.style.top = `${orig.y + dy}px`; }
                        });
                      } else {
                        const el = document.getElementById(`vmd-${id}`);
                        if (el) { el.style.left = `${drag.origX + dx}px`; el.style.top = `${drag.origY + dy}px`; }
                      }
                    }}
                    onPointerUp={(e) => {
                      const drag = dragRef.current;
                      if (!drag || drag.id !== id) return;
                      e.stopPropagation();
                      if (drag.groupOrigins) {
                        setElementPositions(p => {
                          const n = { ...p };
                          Object.keys(drag.groupOrigins!).forEach(did => {
                            const el = document.getElementById(`vmd-${did}`);
                            if (el) n[did] = { ...(p[did] || pos), x: parseFloat(el.style.left) || 0, y: parseFloat(el.style.top) || 0 };
                          });
                          return n;
                        });
                      } else {
                        const el = document.getElementById(`vmd-${id}`);
                        if (el) {
                          setElementPositions(p => ({
                            ...p,
                            [id]: { ...(p[id] || pos), x: parseFloat(el.style.left) || drag.origX, y: parseFloat(el.style.top) || drag.origY }
                          }));
                        }
                      }
                      pushDesignUndo();
                      dragRef.current = null;
                      e.currentTarget.releasePointerCapture(e.pointerId);
                    }}
                  >
                    {/* Action bar when selected */}
                    {isSel && (
                      <div
                        data-action="true"
                        className="absolute -top-7 left-0 flex items-center gap-0.5"
                        style={{ zIndex: 99999 }}
                        onClick={e => e.stopPropagation()}
                      >
                        <span className="px-1 py-0.5 text-[8px] font-black text-black" style={{ background: accentColor }}>
                          {isDrawEl ? 'DRAW' : id === 'img_upload' ? 'UPLOAD' : id.startsWith('img_') ? `IMG #${parseInt(id.split('_')[1]) + 1}` : id.toUpperCase()} {pos.z ? `L${pos.z}` : 'L0'}
                        </span>
                        <button className="w-6 h-6 bg-[#1a1a1a] border border-[#555] text-white text-xs hover:bg-[#333] flex items-center justify-center" title="Rotate CCW"
                          onClick={() => { pushDesignUndo(); setElementPositions(p => ({ ...p, [id]: { ...(p[id] || pos), r: ((p[id]?.r ?? 0) - 15 + 360) % 360 } })); }}>↺</button>
                        <button className="w-6 h-6 bg-[#1a1a1a] border border-[#555] text-white text-xs hover:bg-[#333] flex items-center justify-center" title="Rotate CW"
                          onClick={() => { pushDesignUndo(); setElementPositions(p => ({ ...p, [id]: { ...(p[id] || pos), r: ((p[id]?.r ?? 0) + 15) % 360 } })); }}>↻</button>
                        <button className="w-6 h-6 bg-[#1a1a1a] border border-[#555] text-white text-xs hover:bg-[#333] flex items-center justify-center" title="Smaller"
                          onClick={() => { pushDesignUndo(); setElementPositions(p => { const e = p[id] || pos; return { ...p, [id]: { ...e, w: Math.max(40, e.w * 0.82), h: Math.max(20, e.h * 0.82) } }; }); }}>−</button>
                        <button className="w-6 h-6 bg-[#1a1a1a] border border-[#555] text-white text-xs hover:bg-[#333] flex items-center justify-center" title="Bigger"
                          onClick={() => { pushDesignUndo(); setElementPositions(p => { const e = p[id] || pos; return { ...p, [id]: { ...e, w: e.w * 1.18, h: e.h * 1.18 } }; }); }}>+</button>
                        <button className="w-6 h-6 bg-[#1a1a1a] border border-[#334] text-blue-300 text-xs hover:bg-[#223] flex items-center justify-center" title="Layer up — bring forward"
                          onClick={() => { pushDesignUndo(); setElementPositions(p => ({ ...p, [id]: { ...(p[id] || pos), z: Math.min(20, (p[id]?.z ?? 0) + 1) } })); }}>▲</button>
                        <button className="w-6 h-6 bg-[#1a1a1a] border border-[#334] text-blue-300 text-xs hover:bg-[#223] flex items-center justify-center" title="Layer down — send back"
                          onClick={() => { pushDesignUndo(); setElementPositions(p => ({ ...p, [id]: { ...(p[id] || pos), z: Math.max(0, (p[id]?.z ?? 0) - 1) } })); }}>▼</button>
                        <button className="w-6 h-6 bg-red-900 border border-red-700 text-red-400 text-xs hover:bg-red-800 flex items-center justify-center" title="Delete (Ctrl+Z to undo)"
                          onClick={() => {
                            pushDesignUndo();
                            setElementPositions(p => { const n = { ...p }; delete n[id]; return n; });
                            if (isDrawEl) {
                              setDrawingImages(p => { const n = { ...p }; delete n[id]; return n; });
                              setDrawnIds(p => p.filter(x => x !== id));
                            } else {
                              setHiddenElements(p => new Set([...p, id]));
                            }
                            setSelectedEl(null);
                          }}>🗑</button>
                      </div>
                    )}
                    {/* Content fills the box */}
                    <div className="w-full h-full overflow-hidden">{typeof content === 'function' ? content(pos) : content}</div>
                    {/* Resize handle — bottom-right corner */}
                    {isSel && (
                      <div
                        data-resize="true"
                        className="absolute bottom-0 right-0 w-6 h-6 flex items-center justify-center text-[10px] font-black"
                        style={{ background: accentColor, color: '#000', cursor: 'se-resize', touchAction: 'none', zIndex: 99999 }}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          e.currentTarget.setPointerCapture(e.pointerId);
                          resizeRef.current = { id, origW: pos.w, origH: pos.h, startMX: e.clientX, startMY: e.clientY };
                        }}
                        onPointerMove={(e) => {
                          const resize = resizeRef.current;
                          if (!resize || resize.id !== id) return;
                          e.stopPropagation();
                          const el = document.getElementById(`vmd-${id}`);
                          if (el) {
                            el.style.width = `${Math.max(60, resize.origW + (e.clientX - resize.startMX))}px`;
                            el.style.height = `${Math.max(28, resize.origH + (e.clientY - resize.startMY))}px`;
                          }
                        }}
                        onPointerUp={(e) => {
                          const resize = resizeRef.current;
                          if (!resize || resize.id !== id) return;
                          e.stopPropagation();
                          const el = document.getElementById(`vmd-${id}`);
                          if (el) {
                            setElementPositions(p => ({
                              ...p,
                              [id]: { ...(p[id] || pos), w: parseFloat(el.style.width) || pos.w, h: parseFloat(el.style.height) || pos.h }
                            }));
                          }
                          pushDesignUndo();
                          resizeRef.current = null;
                          e.currentTarget.releasePointerCapture(e.pointerId);
                        }}
                      >↘</div>
                    )}
                  </div>
                );
              };

              return (
                <div className="fixed inset-0 z-[600] bg-[#0a0a0a] flex flex-col" style={{ colorScheme: 'dark', color: 'white' }}>
                  {/* Toolbar */}
                  <div className="flex items-center gap-1.5 px-2 py-2 border-b-2 border-[#8B5CF6] bg-[#111] flex-wrap">
                    <span className="text-[#8B5CF6] font-black text-[10px] uppercase tracking-wider">Edit</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditTool('select')}
                        className={`px-2 py-1 text-[10px] font-bold border-2 uppercase transition-all ${editTool === 'select' ? 'border-[#FFD700] bg-[#FFD700] text-black' : 'border-[#444] text-white/50 hover:border-white/50'}`}
                      >↖ Move</button>
                    </div>
                    {editTool === 'draw' && (
                      <div className="flex items-center gap-1.5">
                        <input type="color" value={drawColor} onChange={e => setDrawColor(e.target.value)}
                          className="w-6 h-6 border border-[#444] p-0 bg-transparent cursor-pointer" />
                        <input type="range" min="1" max="24" value={drawSize} onChange={e => setDrawSize(parseInt(e.target.value))}
                          className="w-14 accent-[#FFD700]" style={{ height: 4 }} />
                        <span className="text-white/30 text-[9px]">{drawSize}px</span>
                      </div>
                    )}
                    <div className="flex-1" />
                    {/* Draw-mode-only controls */}
                    {editTool === 'draw' && drawnIds.length >= 2 && (
                      <button
                        onClick={() => { setGroupDraw(p => !p); setSelectedEl(null); }}
                        className={`px-2 py-1 text-[10px] border-2 transition-all ${groupDraw ? 'border-[#A78BFA] bg-[#A78BFA]/20 text-[#A78BFA]' : 'border-[#555] text-white/40 hover:border-[#A78BFA] hover:text-[#A78BFA]'}`}
                        title={groupDraw ? 'Deselect group — go back to individual strokes' : 'Select all strokes to move together'}
                      >{groupDraw ? '☑ Grouped' : '☐ Group'}</button>
                    )}
                    {/* Undo — works for all actions */}
                    <button
                      onClick={popDesignUndo}
                      disabled={designUndoStack.current.length === 0}
                      className="px-2 py-1 text-[10px] border border-[#444] text-white/50 hover:border-white/70 disabled:opacity-25 transition-all"
                      title="Undo last action"
                    >↩ Undo</button>
                    {/* Reset layout */}
                    <button
                      onClick={() => {
                        pushDesignUndo();
                        setElementPositions({});
                        setDrawingImages({});
                        setDrawnIds([]);
                        setSelectedEl(null);
                        setHiddenElements(new Set());
                        designInitRef.current = false;
                        // re-trigger init
                        requestAnimationFrame(() => {
                          const W = VIBEMAIL_CARD_WIDTH - 24;
                          setElementPositions(() => {
                            const next: Record<string, {x:number,y:number,w:number,h:number,r?:number}> = {};
                            let y = 8;
                            if (textOnly) { next['text'] = { x: 12, y, w: W, h: 64 }; y += 76; }
                            if (audioMatch) { next['audio'] = { x: 12, y, w: W, h: 56 }; y += 68; }
                            if (imgSrc) { next['image'] = { x: 12, y, w: W, h: 150 }; }
                            return next;
                          });
                        });
                      }}
                      className="px-2 py-1 text-[10px] border border-[#555] text-white/40 hover:border-white/60 hover:text-white/70 transition-all"
                    >↺ Reset</button>
                  </div>

                  {/* Quest banner — locked preview above design area */}
                  {composerQuestData && composerQuestData.quests.length > 0 && (() => {
                    const quests = composerQuestData.quests;
                    const qidx = Math.min(previewQuestIdx, quests.length - 1);
                    const q = quests[qidx];
                    const splashImgEdit = miniappPreviewCache[q.url]?.splash_image_url || miniappPreviewCache[q.url]?.screenshot_urls?.[0] || '';
                    return (
                      <div className="border-b-2 border-[#333] bg-[#0d0d0d] flex-shrink-0">
                        <div className="bg-[#FFD700]/10 px-3 py-1.5 flex items-center gap-2 border-b border-[#FFD700]/20">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="#FFD700" opacity="0.7"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                          <span className="text-[#FFD700]/70 font-black text-[9px] uppercase tracking-widest flex-1">Quest VibeMail</span>
                          {quests.length > 1 && (
                            <div className="flex items-center gap-1">
                              <button onClick={() => setPreviewQuestIdx(p => (p - 1 + quests.length) % quests.length)} className="w-5 h-5 bg-[#FFD700]/20 border border-[#FFD700]/30 flex items-center justify-center font-black text-[#FFD700] text-xs hover:bg-[#FFD700]/30">‹</button>
                              <span className="text-[#FFD700]/50 font-black text-[9px]">{qidx + 1}/{quests.length}</span>
                              <button onClick={() => setPreviewQuestIdx(p => (p + 1) % quests.length)} className="w-5 h-5 bg-[#FFD700]/20 border border-[#FFD700]/30 flex items-center justify-center font-black text-[#FFD700] text-xs hover:bg-[#FFD700]/30">›</button>
                            </div>
                          )}
                          <span className="text-white/30 font-black text-[7px] border border-white/20 px-1 py-0.5 ml-1">LOCKED</span>
                        </div>
                        <div className="pointer-events-none opacity-80">
                          {q.type === 'follow_farcaster' && (
                            <div className="relative h-20 overflow-hidden bg-[#1a0a2e]">
                              {(q.banner || settingsFarcasterBanner) && <img src={q.banner || settingsFarcasterBanner} className="absolute inset-0 w-full h-full object-cover opacity-60" alt="" />}
                              {!q.banner && !settingsFarcasterBanner && q.pfp && <img src={q.pfp} className="absolute inset-0 w-full h-full object-cover opacity-20" alt="" />}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                              <div className="absolute inset-0 flex items-center px-3 gap-2">
                                {q.pfp ? <img src={q.pfp} className="w-10 h-10 rounded-full border-2 border-[#8B5CF6] flex-shrink-0" alt="" /> : <div className="w-10 h-10 rounded-full border-2 border-[#8B5CF6] bg-[#8B5CF6]/20 flex-shrink-0" />}
                                <div><p className="text-white font-black text-sm drop-shadow">@{q.username}</p><p className="text-[#8B5CF6] text-[8px] uppercase tracking-widest">Follow Quest</p></div>
                              </div>
                            </div>
                          )}
                          {q.type === 'use_miniapp' && (
                            <div className="relative h-20 overflow-hidden bg-[#0a1a0a]">
                              {splashImgEdit ? <img src={splashImgEdit} className="absolute inset-0 w-full h-full object-cover opacity-60" alt="" /> : q.icon ? <img src={q.icon} className="absolute inset-0 w-full h-full object-cover opacity-20" alt="" /> : null}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                              <div className="absolute inset-0 flex items-center px-3 gap-2">
                                {q.icon ? <img src={q.icon} className="w-10 h-10 rounded-xl border-2 border-[#22C55E] flex-shrink-0" alt="" /> : <div className="w-10 h-10 rounded-xl border-2 border-[#22C55E] bg-[#22C55E]/20 flex-shrink-0" />}
                                <div><p className="text-white font-black text-sm drop-shadow">{q.name}</p><p className="text-[#22C55E] text-[8px] uppercase tracking-widest">Miniapp Quest</p></div>
                              </div>
                            </div>
                          )}
                          {q.type === 'join_channel' && (
                            <div className="relative h-20 overflow-hidden bg-[#1a0e00]">
                              {(q.channelImg || settingsChannelImg) && <img src={q.channelImg || settingsChannelImg} className="absolute inset-0 w-full h-full object-cover opacity-60" alt="" />}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                              <div className="absolute inset-0 flex items-center px-3 gap-2">
                                {(q.channelImg || settingsChannelImg) ? <img src={q.channelImg || settingsChannelImg} className="w-10 h-10 rounded-xl border-2 border-[#FF9F0A] flex-shrink-0" alt="" /> : <div className="w-10 h-10 rounded-xl border-2 border-[#FF9F0A] bg-[#FF9F0A]/20 flex-shrink-0" />}
                                <div><p className="text-white font-black text-sm drop-shadow">/{q.channelName || q.channelId}</p><p className="text-[#FF9F0A] text-[8px] uppercase tracking-widest">Channel Quest</p></div>
                              </div>
                            </div>
                          )}
                          <div className="px-2 py-1.5 flex gap-1.5">
                            <div className="flex-1 py-1 bg-[#1a1a1a] border border-[#333] text-white/25 font-black text-[9px] text-center uppercase tracking-wide">Action</div>
                            <div className="flex-1 py-1 bg-[#1a1a1a] border border-[#333] text-white/25 font-black text-[9px] text-center uppercase tracking-wide flex items-center justify-center gap-1">
                              <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                              Claim +{q.reward || (composerQuestData as any).rewardPerQuest || 200} VBMS
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Design canvas + elements — wrapped in mail-card container matching preview exactly */}
                  <div className="flex-1 overflow-y-auto bg-[#0a0a0a]" style={{ padding: '12px 12px 0', display: 'flex', justifyContent: 'center' }}>
                  <div
                    ref={designAreaRef}
                    className="relative bg-[#111]"
                    style={{ height: VIBEMAIL_CARD_HEIGHT, width: VIBEMAIL_CARD_WIDTH, maxWidth: '100%', flexShrink: 0, border: '2px solid rgba(255,215,0,0.3)', padding: '0 16px', overflow: 'hidden' }}
                    onClick={(e) => { if (e.target === e.currentTarget) setSelectedEl(null); }}
                  >
                    {/* Canvas — draw layer on top */}
                    <canvas
                      ref={el => { drawCanvasRef.current = el; }}
                      className="absolute inset-0 z-30"
                      style={{
                        pointerEvents: editTool === 'draw' ? 'auto' : 'none',
                        touchAction: 'none',
                        cursor: 'crosshair',
                      }}
                      onPointerDown={(e) => {
                        e.currentTarget.setPointerCapture(e.pointerId);
                        const canvas = e.currentTarget;
                        const rect = canvas.getBoundingClientRect();
                        const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
                        const x = (e.clientX - rect.left) * scaleX, y = (e.clientY - rect.top) * scaleY;
                        currentStrokeRef.current = [{ x, y }];
                        isDrawingRef.current = true;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                          ctx.globalCompositeOperation = 'source-over';
                          ctx.fillStyle = drawColor;
                          ctx.beginPath();
                          ctx.arc(x, y, drawSize / 2, 0, Math.PI * 2);
                          ctx.fill();
                        }
                      }}
                      onPointerMove={(e) => {
                        if (!isDrawingRef.current) return;
                        const canvas = drawCanvasRef.current;
                        const ctx = canvas?.getContext('2d');
                        if (!ctx || !canvas) return;
                        const rect = canvas.getBoundingClientRect();
                        const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
                        const x = (e.clientX - rect.left) * scaleX, y = (e.clientY - rect.top) * scaleY;
                        const pts = currentStrokeRef.current;
                        if (pts.length > 0) {
                          ctx.beginPath();
                          ctx.globalCompositeOperation = 'source-over';
                          ctx.strokeStyle = drawColor;
                          ctx.lineWidth = drawSize;
                          ctx.lineCap = 'round'; ctx.lineJoin = 'round';
                          ctx.moveTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
                          ctx.lineTo(x, y);
                          ctx.stroke();
                        }
                        currentStrokeRef.current = [...pts, { x, y }];
                      }}
                      onPointerUp={() => {
                        if (!isDrawingRef.current) return;
                        isDrawingRef.current = false;
                        const canvas = drawCanvasRef.current;
                        const pts = currentStrokeRef.current;
                        if (!canvas || pts.length === 0) { currentStrokeRef.current = []; return; }
                        // Compute bounding box
                        const margin = Math.max(drawSize * 2, 6);
                        const minCX = Math.max(0, Math.min(...pts.map(p => p.x)) - margin);
                        const minCY = Math.max(0, Math.min(...pts.map(p => p.y)) - margin);
                        const maxCX = Math.min(canvas.width, Math.max(...pts.map(p => p.x)) + margin);
                        const maxCY = Math.min(canvas.height, Math.max(...pts.map(p => p.y)) + margin);
                        const cW = maxCX - minCX, cH = maxCY - minCY;
                        if (cW > 0 && cH > 0) {
                          const off = document.createElement('canvas');
                          off.width = cW; off.height = cH;
                          off.getContext('2d')?.drawImage(canvas, minCX, minCY, cW, cH, 0, 0, cW, cH);
                          const dataUrl = off.toDataURL('image/png');
                          // Convert canvas coords to screen element coords
                          const rect = canvas.getBoundingClientRect();
                          const sX = rect.width / canvas.width, sY = rect.height / canvas.height;
                          const id = `draw_${drawingIdRef.current++}`;
                          setDrawingImages(p => ({ ...p, [id]: dataUrl }));
                          setElementPositions(p => {
                            const maxZ = Object.values(p).reduce((m, v) => Math.max(m, v.z ?? 0), 0);
                            return { ...p, [id]: { x: minCX * sX, y: minCY * sY, w: cW * sX, h: cH * sY, z: maxZ + 1 } };
                          });
                          setDrawnIds(p => [...p, id]);
                          canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
                        }
                        currentStrokeRef.current = [];
                      }}
                    />

                    {/* Hint overlay when no elements */}
                    {!textOnly && !audioMatch && !imgSrc && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-5">
                        <p className="text-white/20 text-xs text-center">No content yet.<br/>Add text, sound or image in composer.</p>
                      </div>
                    )}

                    {/* Draggable elements — sorted by z-value so DOM order matches layer order */}
                    <div className="absolute inset-0 z-10" style={{ pointerEvents: editTool === 'select' ? 'auto' : 'none' }}
                      onClick={e => { if (e.target === e.currentTarget) setSelectedEl(null); }}>
                      {(() => {
                        type EditItem = { id: string; z: number; node: React.ReactNode };
                        const editItems: EditItem[] = [];
                        if (textOnly && !hiddenElements.has('text')) {
                          const p = elementPositions['text'] || getDefaultPos('text');
                          editItems.push({ id: 'text', z: p.z ?? 0, node: renderEl('text', '#FFD700', (pos) =>
                            <div className="w-full h-full p-2 text-white/90 leading-relaxed overflow-hidden" style={{ background: '#000', fontSize: Math.max(8, Math.min(15, pos.h * 0.2)) }}>{textOnly}</div>
                          )});
                        }
                        if (audioMatch && !hiddenElements.has('audio')) {
                          const p = elementPositions['audio'] || getDefaultPos('audio');
                          editItems.push({ id: 'audio', z: p.z ?? 0, node: renderEl('audio', '#F97316',
                            <div className="w-full h-full flex items-center gap-2.5 px-3" style={{ background: 'linear-gradient(135deg, #1c0900 0%, #0d0d0d 100%)', borderLeft: '3px solid #F97316', pointerEvents: 'none' }}>
                              <div className="w-8 h-8 flex items-center justify-center flex-shrink-0" style={{ background: '#F97316', boxShadow: '0 0 10px rgba(249,115,22,0.45)' }}>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="#000"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                              </div>
                              <div className="flex items-center gap-px flex-shrink-0">
                                {[3,6,4,8,5,9,4,7,3,6,8,5].map((h, i) => (
                                  <div key={i} style={{ width: 2, height: h * 2.2, background: i < 5 ? '#F97316' : 'rgba(249,115,22,0.3)', borderRadius: 1 }} />
                                ))}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-white font-bold text-[11px] capitalize truncate leading-tight">{audioName}</p>
                                <p className="text-[#F97316]/50 text-[8px] uppercase tracking-widest">Sound</p>
                              </div>
                              <span className="text-[#F97316]/20 text-base flex-shrink-0">♪</span>
                            </div>
                          )});
                        }
                        for (const { key, src, label } of allImgSrcs) {
                          if (!src || hiddenElements.has(key)) continue;
                          const p = elementPositions[key] || getDefaultPos(key);
                          const isVid = /\.(mp4|webm|mov|ogg)(\?|$)/i.test(src);
                          editItems.push({ id: key, z: p.z ?? 0, node: renderEl(key, '#22C55E',
                            isVid
                              ? <video src={src} className="w-full h-full object-cover" autoPlay loop muted playsInline style={{ pointerEvents: 'none' }} />
                              : <img src={src} alt={label} className="w-full h-full object-cover" draggable={false} style={{ pointerEvents: 'none', userSelect: 'none' }} />
                          )});
                        }
                        for (const id of drawnIds) {
                          if (drawingImages[id]) {
                            const p = elementPositions[id] || getDefaultPos(id);
                            editItems.push({ id, z: p.z ?? 0, node: renderEl(id, '#A78BFA',
                              <img src={drawingImages[id]} alt="" className="w-full h-full object-contain pointer-events-none" style={{ imageRendering: 'pixelated' }} />
                            )});
                          }
                        }
                        editItems.sort((a, b) => a.z - b.z);
                        return editItems.map(item => item.node);
                      })()}
                    </div>

                    {/* Locked footer */}
                    <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ zIndex: 99999 }}>
                      <div className="flex items-center justify-between px-3 py-2 border-t border-[#FFD700]/30 bg-[#0a0a0a]/95">
                        <span className="text-[#FFD700]/30 text-[9px] uppercase tracking-widest font-black">VibeMail · locked</span>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-[#FFD700]/20 border border-[#FFD700]/30">
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="3" opacity="0.4"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                          <span className="text-[#FFD700]/40 font-black text-[10px] uppercase tracking-widest">+{hasFreemail ? 0 : ((composerQuestData as any)?.baseReward ?? 100)} VBMS</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  </div>{/* end mail-card wrapper */}

                  {/* Footer buttons */}
                  <div className="p-2.5 border-t-2 border-[#333] flex flex-col gap-2">
                    {/* Save all drawings composited as single image attachment */}
                    {(drawnIds.length > 0 || allImgSrcs.length > 0) && (
                      <button
                        disabled={isSavingDesign}
                        onClick={async () => {
                          const area = designAreaRef.current;
                          if (!area) return;
                          setIsSavingDesign(true);
                          try {
                            const W = VIBEMAIL_CARD_WIDTH, H = VIBEMAIL_CARD_HEIGHT;
                            const dpr = window.devicePixelRatio || 1;

                            // 1. Upload drawing strokes as transparent PNG (only the drawing layer — no composite)
                            let drawUrl: string | null = null;
                            if (drawnIds.length > 0) {
                              const drawCanvas = document.createElement('canvas');
                              drawCanvas.width = W * dpr; drawCanvas.height = H * dpr;
                              const dCtx = drawCanvas.getContext('2d')!;
                              dCtx.scale(dpr, dpr);
                              const sortedIds = [...drawnIds].sort((a, b) => (elementPositions[a]?.z ?? 0) - (elementPositions[b]?.z ?? 0));
                              for (const id of sortedIds) {
                                const src = drawingImages[id];
                                const p = elementPositions[id];
                                if (!src || !p) continue;
                                await new Promise<void>(resolve => {
                                  const img = new Image();
                                  img.onload = () => {
                                    dCtx.save();
                                    dCtx.translate(p.x + p.w / 2, p.y + p.h / 2);
                                    if (p.r) dCtx.rotate((p.r * Math.PI) / 180);
                                    try { dCtx.drawImage(img, -p.w / 2, -p.h / 2, p.w, p.h); } catch {}
                                    dCtx.restore(); resolve();
                                  };
                                  img.onerror = () => resolve();
                                  img.src = src; // data: URL — no CORS issue
                                });
                              }
                              const drawBlob = await new Promise<Blob | null>(res => drawCanvas.toBlob(res, 'image/png'));
                              if (drawBlob) {
                                const uploadUrl = await generateUploadUrl();
                                const uploadRes = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: drawBlob });
                                if (!uploadRes.ok) throw new Error('upload failed');
                                const { storageId } = await uploadRes.json();
                                drawUrl = `${VIBEFID_STORAGE_URL}/${storageId}`;
                              }
                            }

                            // 2. Build VDESIGN manifest — positions only, GIFs/videos stay as live URLs
                            const manifest: Record<string, any> = {};
                            if (elementPositions['text'] && !hiddenElements.has('text')) manifest.text = elementPositions['text'];
                            if (elementPositions['audio'] && !hiddenElements.has('audio')) manifest.audio = elementPositions['audio'];
                            const imgPos: Record<string, any> = {};
                            for (const { key } of allImgSrcs) {
                              if (!elementPositions[key] || hiddenElements.has(key)) continue;
                              imgPos[key] = elementPositions[key];
                              // img_upload needs explicit src since it's not in the message text
                              if (key === 'img_upload' && composerImageId?.startsWith('img:')) {
                                imgPos[key] = { ...imgPos[key], src: `${VIBEFID_STORAGE_URL}/${composerImageId.slice(4)}` };
                              }
                            }
                            if (Object.keys(imgPos).length > 0) manifest.imgs = imgPos;
                            if (drawUrl) manifest.draw = { src: drawUrl, x: 0, y: 0, w: W, h: H, r: 0, z: 99 };

                            // 3. Store manifest, clear draw state, keep element positions for PREVIEW
                            setComposerDesignManifest(Object.keys(manifest).length > 0 ? manifest : null);
                            for (const v of Object.values(drawingImages)) { if (v.startsWith('blob:')) URL.revokeObjectURL(v); }
                            setDrawingImages({});
                            setDrawnIds([]);
                            setComposerDrawingId(null);
                            setShowDesign(false);
                          } catch (e) {
                            console.error('Design save error:', e);
                          } finally {
                            setIsSavingDesign(false);
                          }
                        }}
                        className="w-full py-2.5 bg-[#22C55E] border-2 border-[#22C55E] text-black font-black text-xs uppercase tracking-wide hover:bg-[#16A34A] disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        {isSavingDesign ? 'Uploading…' : 'Save Design to Mail'}
                      </button>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setShowDesign(false); setShowPreview(true); }}
                        className="flex-1 py-2.5 bg-[#DB2777] border-2 border-[#DB2777] text-white font-bold text-xs uppercase tracking-wide hover:bg-[#BE185D] transition-all"
                      >Preview</button>
                      <button
                        onClick={() => setShowDesign(false)}
                        className="flex-1 py-2.5 bg-[#1a1a1a] border-2 border-[#444] text-white font-bold text-xs uppercase tracking-wide hover:border-[#8B5CF6] transition-all"
                      >← Compose</button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Network Modal — appears as bottom sheet after clicking Send */}
            {showNetworkModal && (
              <div className="fixed inset-0 z-[700] bg-black/80 flex items-end justify-center pb-6 px-4" onClick={() => setShowNetworkModal(false)}>
                <div className="w-full max-w-sm bg-[#111] border-2 border-[#FFD700] shadow-[6px_6px_0px_#FFD700]" onClick={e => e.stopPropagation()}>
                  <div className="px-4 py-3 border-b-2 border-black">
                    <p className="text-[#FFD700] font-black text-sm uppercase tracking-widest">Choose Network</p>
                    <p className="text-white/40 text-xs mt-0.5">Free VibeMail · No VBMS required</p>
                  </div>
                  <div className="flex divide-x-2 divide-black">
                    <button
                      onClick={() => {
                        sendNetworkRef.current = 'arb';
                        setSendNetwork('arb');
                        setShowNetworkModal(false);
                        skipNetworkModalRef.current = true;
                        requestAnimationFrame(() => sendBtnRef.current?.click());
                      }}
                      className="flex-1 py-5 flex flex-col items-center gap-1.5 bg-[#1a1a1a] hover:bg-[#9B6DFF]/20 active:bg-[#9B6DFF]/30 transition-all"
                    >
                      <span className="text-[#9B6DFF] font-black text-2xl">ARB</span>
                      <span className="text-white/50 text-[10px] uppercase tracking-wider">Arbitrum</span>
                      <span className="text-white/30 text-[9px]">On-chain confirmation</span>
                    </button>
                    <button
                      onClick={() => {
                        sendNetworkRef.current = 'base';
                        setSendNetwork('base');
                        setShowNetworkModal(false);
                        skipNetworkModalRef.current = true;
                        requestAnimationFrame(() => sendBtnRef.current?.click());
                      }}
                      className="flex-1 py-5 flex flex-col items-center gap-1.5 bg-[#1a1a1a] hover:bg-[#0052FF]/20 active:bg-[#0052FF]/30 transition-all"
                    >
                      <span className="text-[#0052FF] font-black text-2xl">BASE</span>
                      <span className="text-white/50 text-[10px] uppercase tracking-wider">Base Chain</span>
                      <span className="text-white/30 text-[9px]">No on-chain fee</span>
                    </button>
                  </div>
                  <button
                    onClick={() => setShowNetworkModal(false)}
                    className="w-full py-3 bg-[#0a0a0a] text-white/40 text-xs font-bold uppercase tracking-widest border-t-2 border-black hover:text-white/70 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Next Button - Opens gift modal first, then sends everything */}
            <button
              ref={sendBtnRef}
              onClick={async () => {
                if (isSending || isTransferPending) return;
                if (!composerMessage.trim() && !composerImageId && !composerDrawingId) return;
                if (!myAddress || !myFid) return;

                // Free mail: show network modal first (skip if coming from modal)
                if (hasFreemail && !skipNetworkModalRef.current) {
                  setShowNetworkModal(true);
                  return;
                }
                skipNetworkModalRef.current = false;

                // For replies - send directly
                if (replyToMessageId && replyToFid) {
                  await handleDirectSend(replyToFid, 'sender', true, replyToMessageId);
                  return;
                }

                // BROADCAST MODE - send to multiple recipients (costs 100 VBMS per recipient)
                if (sendMode === 'broadcast' && broadcastRecipients.length > 0) {
                  const costPerRecipient = composerQuestData ? BigInt(questMailCost) : BigInt(Number(VIBEMAIL_COST_VBMS));
                  const totalCost = BigInt(broadcastRecipients.length) * parseEther(String(costPerRecipient));
                  setIsSending(true);
                  setBroadcastResult(null);
                  try {
                    // Transfer VBMS to contract (payment for broadcast — no ARB validation needed)
                    const txHash = await transferVBMS(CONTRACTS.VBMSPoolTroll, totalCost);
                    if (!txHash) {
                      console.error('Broadcast payment failed');
                      setBroadcastResult({ success: false, sent: 0, total: broadcastRecipients.length, failed: broadcastRecipients.length });
                      setIsSending(false);
                      return;
                    }
                    console.log('Broadcast payment TX:', txHash);

                    // Build final message with quest banner + design manifest
                    const broadcastMessage = (() => {
                      let msg = composerQuestData ? `[VQUEST:${JSON.stringify(composerQuestData)}]\n${composerMessage}` : composerMessage;
                      if (composerDesignManifest) msg += `\n[VDESIGN:${JSON.stringify(composerDesignManifest)}]`;
                      if (composerFont || composerColor) msg += `\n[VSTYLE:${JSON.stringify({ ...(composerFont ? { font: composerFont } : {}), ...(composerColor ? { color: composerColor } : {}) })}]`;
                      return msg;
                    })();
                    // Send broadcast after payment
                    const result = await broadcastMutation({
                      recipientFids: broadcastRecipients.map(r => r.fid),
                      message: broadcastMessage,
                      audioId: composerAudioId || undefined,
                      imageId: composerDrawingId || composerImageId || undefined,
                      senderAddress: myAddress,
                      senderFid: myFid,
                    });
                    // Mark daily mission (fire-and-forget)
                    if (myAddress) markVibemailSentMutation({ playerAddress: myAddress }).catch(() => {});
                    // Save result for feedback display
                    setBroadcastResult({
                      success: result.success,
                      sent: result.sent,
                      total: result.total,
                      failed: result.failed,
                    });
                    // Reset composer but keep result visible
                    setShowComposer(false);
                    setSendMode('single');
                    setBroadcastRecipients([]);
                    setComposerMessage('');
                    setComposerAudioId(null);
                    setComposerImageId(null);
                    setComposerDrawingId(null);
                  } catch (err) {
                    console.error('Broadcast error:', err);
                    setBroadcastResult({ success: false, sent: 0, total: broadcastRecipients.length, failed: broadcastRecipients.length });
                  } finally {
                    setIsSending(false);
                  }
                  return;
                }

                // RANDOM LIST MODE - send to random list (like broadcast)
                if (sendMode === 'random' && randomList.length > 0) {
                  const totalCost = BigInt(randomList.length) * parseEther(VIBEMAIL_COST_VBMS);
                  setIsSending(true);
                  setBroadcastResult(null);
                  try {
                    const txHash = await transferVBMS(CONTRACTS.VBMSPoolTroll, totalCost);
                    if (!txHash) {
                      setBroadcastResult({ success: false, sent: 0, total: randomList.length, failed: randomList.length });
                      setIsSending(false);
                      return;
                    }
                    const result = await broadcastMutation({
                      recipientFids: randomList.map(r => r.fid),
                      message: composerMessage,
                      audioId: composerAudioId || undefined,
                      imageId: composerDrawingId || composerImageId || undefined,
                      senderAddress: myAddress,
                      senderFid: myFid,
                    });
                    setBroadcastResult({ success: result.success, sent: result.sent, total: result.total, failed: result.failed });
                    if (myAddress) markVibemailSentMutation({ playerAddress: myAddress }).catch(() => {});
                    setShowComposer(false);
                    setSendMode('single');
                    setRandomList([]);
                    setComposerMessage('');
                    setComposerAudioId(null);
                    setComposerImageId(null);
                    setComposerDrawingId(null);
                  } catch (err) {
                    console.error('Random list error:', err);
                    setBroadcastResult({ success: false, sent: 0, total: randomList.length, failed: randomList.length });
                  } finally {
                    setIsSending(false);
                  }
                  return;
                }

                // RANDOM MODE - send directly to single random card
                if (sendMode === 'random' && randomCard) {
                  await handleDirectSend(randomCard.fid, randomCard.username, false);
                  return;
                }

                // SINGLE MODE - send directly
                if (sendMode === 'single' && recipientFid) {
                  await handleDirectSend(recipientFid, recipientUsername, false);
                }
              }}
              disabled={isSending || isTransferPending || (!composerMessage.trim() && !composerImageId && !composerDrawingId && !composerQuestData) || (!replyToMessageId && sendMode === 'single' && !recipientFid) || (sendMode === 'broadcast' && broadcastRecipients.length === 0) || (sendMode === 'random' && !randomCard && randomList.length === 0)}
              className="mt-3 w-full py-3 bg-vintage-gold text-black font-bold border-2 border-black shadow-[4px_4px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 disabled:shadow-[4px_4px_0px_#000] flex items-center justify-center gap-2"
            >
              {isSending || isTransferPending ? (
                <span className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
                  {t.vibemailSending}
                </span>
              ) : replyToMessageId ? (
                <span className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>
                  {t.vibemailReply}
                </span>
              ) : sendMode === 'broadcast' ? (
                <span className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  {t.vibemailSendTo.replace('{count}', String(broadcastRecipients.length)).replace('{cost}', String(broadcastRecipients.length * (composerQuestData ? questMailCost : Number(VIBEMAIL_COST_VBMS))))}
                </span>
              ) : sendMode === 'random' ? (
                <span className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>
                  {randomList.length > 0
                    ? `${(t.vibemailSendToList || 'Send to List ({count})').replace('{count}', String(randomList.length))} (${randomList.length * (composerQuestData ? questMailCost : Number(VIBEMAIL_COST_VBMS))} VBMS)`
                    : t.vibemailRandomCost}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  {hasFreemail
                    ? `${t.vibemailSend || 'Send'} · ${t.vibemailFreeLabel || 'Free'} (${freeVotesRemaining?.remaining ?? 0}/${freeVotesRemaining?.max ?? 1})`
                    : composerQuestData
                      ? `${t.vibemailSend || 'Send'} · ${questMailCost.toLocaleString()} VBMS`
                      : `${t.vibemailSend || 'Send'} · ${Number(VIBEMAIL_COST_VBMS).toLocaleString()} VBMS`}
                </span>
              )}
            </button>
            </div>
          </div>
        )}

        {/* Selected Message View */}
        {selectedMessage ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Twitter-style header */}
            <div className="flex items-center gap-2 px-2 py-2 bg-[#111] border-b-2 border-black flex-shrink-0">
              <button
                onClick={() => { stopAudio(); setSelectedMessage(null); }}
                className="w-8 h-8 flex items-center justify-center border-2 border-black bg-[#1a1a1a] text-white/60 hover:text-white hover:bg-[#222] transition-all flex-shrink-0"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              {selectedMessage.voterPfpUrl ? (
                <img src={selectedMessage.voterPfpUrl} alt={selectedMessage.voterUsername || ''} className="w-10 h-10 rounded-full border-2 border-black flex-shrink-0 object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#FFD700]/20 border-2 border-[#FFD700]/40 flex items-center justify-center flex-shrink-0">
                  <span className="text-[#FFD700] font-black text-sm">{(selectedMessage.voterUsername || '?')[0].toUpperCase()}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm truncate">
                  {selectedMessage.voterUsername ? `@${selectedMessage.voterUsername}` : 'Anonymous'}
                </p>
                <p className="text-white/40 text-[10px]">{new Date(selectedMessage.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <LanguageSelect />
                <span className={`text-[9px] font-bold px-1.5 py-0.5 border border-black ${selectedMessage.isPaid ? 'bg-yellow-500/20 text-yellow-400' : 'bg-[#FFD700]/10 text-[#FFD700]/60'}`}>
                  {selectedMessage.isPaid ? 'PAID' : 'FREE'}
                </span>
              </div>
            </div>

            {/* Scrollable content + scroll indicator */}
            <div className="relative flex-1 overflow-hidden">
              <div
                ref={contentScrollRef}
                className="h-full overflow-y-auto"
                onScroll={() => {
                  const el = contentScrollRef.current;
                  if (!el) return;
                  setShowScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 24);
                }}
              >
            <div className="bg-[#0a0a0a] pb-6">
              {/* Quest Banner CAROUSEL - TOP */}
              {(() => {
                if (selectedMessage.voterFid === myFid) return null;
                const isSender = activeTab === 'sent';
                const parsed = parseQuestBanner(selectedMessage.message || '');
                if (!parsed) return null;
                const { questData } = parsed;
                const quests = questData.quests || [];
                if (quests.length === 0) return null;
                const idx = Math.min(questCarouselIdx, quests.length - 1);
                const q = quests[idx];
                const claimKey = `${selectedMessage._id}_${idx}`;
                const isClaimedFromDB = questMailClaims?.some((c: any) => c.questIndex === idx) ?? false;
                const isClaimed = isClaimedFromDB || claimedQuestItems.has(claimKey);
                const markClaimed = async () => {
                  if (isSender || claimingQuest === claimKey || !myFid || !myAddress || !selectedMessage._id) return;
                  setClaimingQuest(claimKey);
                  try {
                    const { ConvexHttpClient } = await import('convex/browser');
                    const { api: vmwApi } = await import('@/convex/_generated/api');
                    const vmwClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
                    const questReward = q.reward || questData.rewardPerQuest || 200;
                    const result = await vmwClient.action(vmwApi.vbmsClaim.claimQuestMailVBMS, {
                      messageId: selectedMessage._id as any,
                      claimerFid: myFid,
                      claimerAddress: myAddress,
                      questIndex: idx,
                      amount: questReward,
                    });
                    const data = encodeFunctionData({
                      abi: POOL_ABI,
                      functionName: 'claimVBMS',
                      args: [parseEther(result.amount.toString()), result.nonce as `0x${string}`, result.signature as `0x${string}`],
                    });
                    const provider = await sdk.wallet.getEthereumProvider();
                    await provider!.request({
                      method: 'eth_sendTransaction',
                      params: [{ from: myAddress as `0x${string}`, to: CONTRACTS.VBMSPoolTroll as `0x${string}`, data }],
                    });
                    setClaimedQuestItems(prev => new Set([...prev, claimKey]));
                    // Refresh DB claims so state survives re-renders
                    setQuestMailClaims(prev => [...(prev || []), { questIndex: idx, claimerFid: myFid }]);
                  } catch (e) {
                    console.error('Quest claim failed:', e);
                  } finally {
                    setClaimingQuest(null);
                  }
                };
                return (
                  <div className="border-b-2 border-black overflow-hidden">
                    {/* Carousel header */}
                    <div className="bg-[#FFD700] px-3 py-2 flex items-center gap-2 border-b-2 border-black">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#000" stroke="#000" strokeWidth="0"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                      <span className="font-black text-black text-xs uppercase tracking-widest flex-1">{t.questVibemailHeader || 'Quest VibeMail'}</span>
                      {quests.length > 1 && (
                        <div className="flex items-center gap-1">
                          <button onClick={() => setQuestCarouselIdx(i => Math.max(0, i - 1))} disabled={idx === 0}
                            className="w-6 h-6 flex items-center justify-center border-2 border-black/40 bg-black/20 disabled:opacity-30 font-black text-black text-sm leading-none">‹</button>
                          <span className="text-black/60 text-[9px] font-bold w-8 text-center">{idx + 1}/{quests.length}</span>
                          <button onClick={() => setQuestCarouselIdx(i => Math.min(quests.length - 1, i + 1))} disabled={idx === quests.length - 1}
                            className="w-6 h-6 flex items-center justify-center border-2 border-black/40 bg-black/20 disabled:opacity-30 font-black text-black text-sm leading-none">›</button>
                        </div>
                      )}
                    </div>
                    {/* Single quest item */}
                    <div className="bg-[#0d0d0d]">
                      {q.type === 'follow_farcaster' && (() => {
                        const profileUrl = `https://warpcast.com/${q.username}`;
                        return (
                          <div className="overflow-hidden">
                            <div className="relative h-28 overflow-hidden bg-[#1a0a2e]">
                              {q.banner && <img src={q.banner} className="absolute inset-0 w-full h-full object-cover opacity-70" alt="" />}
                              {!q.banner && q.pfp && <img src={q.pfp} className="absolute inset-0 w-full h-full object-cover opacity-60" alt="" />}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                              <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-[#8B5CF6] border border-black/50">
                                <span className="text-white font-black text-[8px] uppercase tracking-widest">{t.questFollowBadge || 'Follow'}</span>
                              </div>
                              <div className="absolute bottom-2 left-3 flex items-center gap-2">
                                {q.pfp ? <img src={q.pfp} className="w-10 h-10 rounded-full border-2 border-[#8B5CF6] shadow-lg flex-shrink-0" alt="" /> : <div className="w-10 h-10 rounded-full border-2 border-[#8B5CF6] bg-[#8B5CF6]/20 flex items-center justify-center flex-shrink-0"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>}
                                <div>
                                  <p className="text-white font-black text-sm drop-shadow">@{q.username}</p>
                                  <p className="text-[#8B5CF6] text-[9px] uppercase tracking-widest font-bold">{t.questVibefidHolder || 'VibeFID Holder'}</p>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-1.5 p-2">
                              <button onClick={async () => { try { await sdk.actions?.openUrl?.(profileUrl); } catch { window.open(profileUrl, '_blank'); } }}
                                className="flex-1 py-1.5 bg-[#8B5CF6] border-2 border-black text-white font-black text-[10px] shadow-[2px_2px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all uppercase tracking-wide">{t.questGoToProfile || 'Go to Profile'}</button>
                              <button onClick={markClaimed} disabled={isSender || isClaimed || claimingQuest === claimKey}
                                className={`flex-1 py-1.5 border-2 border-black font-black text-[10px] shadow-[2px_2px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all uppercase tracking-wide disabled:opacity-60 ${isClaimed ? 'bg-[#222] text-[#22C55E]' : claimingQuest === claimKey ? 'bg-[#444] text-white' : 'bg-[#FFD700] text-black'}`}>
                                {isClaimed ? (t.questClaimed || '✓ Claimed') : claimingQuest === claimKey ? '...' : (t.questClaimVbms || 'Claim +{amount} VBMS').replace('{amount}', String(q.reward || questData.rewardPerQuest || 200))}
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                      {q.type === 'use_miniapp' && (() => {
                        const previewData = miniappPreviewCache[q.url];
                        const splashImg = previewData?.splash_image_url || previewData?.screenshot_urls?.[0] || '';
                        const appDesc = previewData?.description || '';
                        if (!previewData && q.url) {
                          const cacheKey = `miniapp_preview_${q.url}`;
                          try {
                            const cached = sessionStorage.getItem(cacheKey);
                            if (cached) { setMiniappPreviewCache(prev => ({ ...prev, [q.url]: JSON.parse(cached) })); }
                            else { fetch(`/api/fid/miniapp-preview?url=${encodeURIComponent(q.url)}`).then(r => r.json()).then(data => { const app = data?.mini_app ?? data?.miniApp ?? null; if (app) { setMiniappPreviewCache(prev => ({ ...prev, [q.url]: app })); try { sessionStorage.setItem(cacheKey, JSON.stringify(app)); } catch {} } }).catch(() => {}); }
                          } catch {}
                        }
                        return (
                          <div className="overflow-hidden">
                            <div className="flex items-center gap-2 px-3 pt-3 pb-2">
                              {q.icon ? <img src={q.icon} className="w-10 h-10 rounded-xl border-2 border-[#22C55E] object-cover flex-shrink-0" alt="" onError={(e: any) => e.target.style.display='none'} /> : <div className="w-10 h-10 rounded-xl border-2 border-[#22C55E] bg-[#22C55E]/20 flex items-center justify-center flex-shrink-0"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6v6H9z"/></svg></div>}
                              <div className="flex-1 min-w-0"><p className="text-white font-black text-sm truncate">{q.name}</p><p className="text-[#22C55E] text-[9px] uppercase tracking-widest font-bold">{t.questMiniAppLabel || 'Mini App'}</p></div>
                              <div className="px-2 py-0.5 bg-[#22C55E] border border-black/50 flex-shrink-0"><span className="text-black font-black text-[9px] uppercase tracking-widest">{t.questMiniAppLabel || 'Miniapp'}</span></div>
                            </div>
                            {appDesc ? <p className="text-white/60 text-[10px] px-3 pb-2 line-clamp-2">{appDesc}</p> : null}
                            {splashImg ? <div className="overflow-hidden h-28"><img src={splashImg} alt="" className="w-full h-full object-cover" /></div> : <div className="h-1 bg-[#22C55E]/20 mx-3 mb-3" />}
                            <div className="flex gap-2 px-3 pb-3">
                              <button onClick={() => setOpenAppConfirm({ url: q.url, name: q.name })}
                                className="flex-1 py-2 bg-[#22C55E] border-2 border-black text-black font-black text-xs shadow-[3px_3px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all uppercase tracking-wide">{t.questOpenApp || 'Open App'}</button>
                              <button onClick={markClaimed} disabled={isSender || isClaimed || claimingQuest === claimKey}
                                className={`flex-1 py-2 border-2 border-black font-black text-xs shadow-[3px_3px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all uppercase tracking-wide disabled:opacity-60 disabled:cursor-not-allowed ${isClaimed ? 'bg-[#222] text-[#22C55E]' : claimingQuest === claimKey ? 'bg-[#444] text-white' : 'bg-[#FFD700] text-black'}`}>
                                {isClaimed ? (t.questClaimed || '✓ Claimed') : claimingQuest === claimKey ? '...' : (t.questClaimVbms || 'Claim +{amount} VBMS').replace('{amount}', String(q.reward || questData.rewardPerQuest || 200))}
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                      {q.type === 'join_channel' && (() => {
                        const channelUrl = q.channelUrl || `https://warpcast.com/~/channel/${q.channelId}`;
                        return (
                          <div className="overflow-hidden">
                            <div className="relative h-28 overflow-hidden bg-[#1a0e00]">
                              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0d0d0d]" />
                              <div className="absolute bottom-0 left-4 translate-y-1/2 z-10">
                                <div className="w-14 h-14 border-[3px] border-[#FF9F0A] bg-[#FF9F0A]/20 flex items-center justify-center shadow-lg">
                                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FF9F0A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                                </div>
                              </div>
                              <div className="absolute top-2 right-2 px-2 py-0.5 bg-[#FF9F0A] border border-black/50"><span className="text-black font-black text-[9px] uppercase tracking-widest">Channel</span></div>
                            </div>
                            <div className="pt-9 px-4 pb-3">
                              <p className="text-white font-black text-sm truncate">/{q.channelName || q.channelId}</p>
                              <p className="text-[#FF9F0A] text-[10px] uppercase tracking-widest">{t.questFarcasterChannel || 'Farcaster Channel'}</p>
                              <div className="flex gap-2 mt-2.5">
                                <button onClick={async () => { try { await sdk.actions?.openUrl?.(channelUrl); } catch { window.open(channelUrl, '_blank'); } }}
                                  className="flex-1 py-2 bg-[#FF9F0A] border-2 border-black text-black font-black text-xs shadow-[3px_3px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all uppercase tracking-wide">{t.questJoinChannel || 'Join Channel'}</button>
                                <button onClick={markClaimed} disabled={isSender || isClaimed || claimingQuest === claimKey}
                                  className={`flex-1 py-2 border-2 border-black font-black text-xs shadow-[3px_3px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all uppercase tracking-wide disabled:opacity-60 disabled:cursor-not-allowed ${isClaimed ? 'bg-[#222] text-[#22C55E]' : claimingQuest === claimKey ? 'bg-[#444] text-white' : 'bg-[#FFD700] text-black'}`}>
                                  {isClaimed ? (t.questClaimed || '✓ Claimed') : claimingQuest === claimKey ? '...' : (t.questClaimVbms || 'Claim +{amount} VBMS').replace('{amount}', String(q.reward || questData.rewardPerQuest || 200))}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    {/* Dot indicators */}
                    {quests.length > 1 && (
                      <div className="flex justify-center gap-1.5 py-2 bg-[#0d0d0d] border-t border-black/40">
                        {quests.map((_: any, dotIdx: number) => (
                          <button key={dotIdx} onClick={() => setQuestCarouselIdx(dotIdx)}
                            className={`w-1.5 h-1.5 rounded-full transition-all ${dotIdx === idx ? 'bg-[#FFD700]' : 'bg-white/20'}`} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Message text + media */}
              <div className="p-3 space-y-3" style={{ width: VIBEMAIL_CARD_WIDTH, maxWidth: '100%', margin: '0 auto', minHeight: VIBEMAIL_CARD_HEIGHT, background: '#111' }}>
                {/* VDESIGN - animated layout (GIFs, videos stay live) */}
                {(() => {
                  const dm = parseDesignManifest(selectedMessage.message || '');
                  if (!dm) return null;
                  const rawMsg = selectedMessage.message || '';
                  const qParsed = parseQuestBanner(rawMsg);
                  const baseMsg = qParsed ? qParsed.cleanMessage : rawMsg;
                  const vstyle = parseVStyle(baseMsg);
                  const cleanMsg = stripVStyle(stripDesignManifest(baseMsg).replace(/\[VQUEST:\{[\s\S]*?\}\]/g, '').trim());
                  const textOnly = cleanMsg.replace(/\/sound=\S+(\s+volume=[\d.]+)?/gi, '').replace(/\/img=\S+/gi, '').trim();
                  const audioMatch = cleanMsg.match(/\/sound=(\S+)/i);
                  const imgUrls = [...cleanMsg.matchAll(/\/img=(\S+)/gi)].map((m: RegExpMatchArray) => m[1]);
                  const volMatch = cleanMsg.match(/\/sound=\S+\s+volume=([\d.]+)/i);
                  const vol = volMatch ? Math.min(1, Math.max(0, parseFloat(volMatch[1]))) : 0.2;
                  const imgUploadUrl = selectedMessage.imageId?.startsWith('img:') ? `${VIBEFID_STORAGE_URL_INLINE}/${selectedMessage.imageId.slice(4)}` : null;
                  return (
                    <div style={{ position: 'relative', height: VIBEMAIL_CARD_HEIGHT, width: VIBEMAIL_CARD_WIDTH, maxWidth: '100%', margin: '0 auto', background: '#111', overflow: 'hidden' }}>
                      {/* Text */}
                      {textOnly && dm.text && (() => { const p = dm.text; return (
                        <div style={{ position:'absolute', left:p.x, top:p.y, width:p.w, height:p.h, transform:`rotate(${p.r??0}deg)`, transformOrigin:'center center', overflow:'hidden', background:'#000', padding:8, boxSizing:'border-box', zIndex:((p.z??0)+1)*10 }}>
                          <div className="text-white/90 text-sm leading-relaxed" style={{ fontSize: Math.max(8, Math.min(15, p.h * 0.2)), fontFamily: vstyle?.font || undefined, color: vstyle?.color || undefined }}>{textOnly}</div>
                        </div>
                      ); })()}
                      {/* Audio */}
                      {audioMatch && dm.audio && (() => {
                        const rawUrl = audioMatch[1];
                        const audioUrl = proxyAudioUrl(rawUrl);
                        const aName = rawUrl.split('/').pop()?.replace(/\.[^.]+$/, '').replace(/[-_%+]/g, ' ').trim() || 'Audio';
                        const pid = `vd:${audioUrl}`;
                        const isPlaying = playingAudio === pid;
                        const p = dm.audio;
                        return (
                          <div style={{ position:'absolute', left:p.x, top:p.y, width:p.w, height:p.h, transform:`rotate(${p.r??0}deg)`, transformOrigin:'center center', overflow:'hidden', boxSizing:'border-box', zIndex: Math.max(500, ((p.z??0)+1)*10) }}>
                            <div className="w-full h-full flex items-center justify-center p-1.5">
                              <button className="flex items-center gap-2 px-2.5 py-1.5 rounded-full"
                                style={{ background:'#000', border:`2px solid ${isPlaying?'#ff6b00':'#F97316'}`, boxShadow:`0 0 12px rgba(249,115,22,${isPlaying?'0.6':'0.3'})`, maxWidth:'100%', minWidth:0 }}
                                onClick={() => { if (isPlaying) { audioRef.current?.pause(); setPlayingAudio(null); } else if (audioRef.current) { audioRef.current.src=audioUrl; audioRef.current.volume=vol; audioRef.current.play().catch(()=>setPlayingAudio(null)); setPlayingAudio(pid); } }}>
                                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background:'#F97316', boxShadow:'0 0 8px rgba(249,115,22,0.6)' }}>
                                  {isPlaying ? <svg width="9" height="9" viewBox="0 0 24 24" fill="#000"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> : <svg width="9" height="9" viewBox="0 0 24 24" fill="#000"><polygon points="5 3 19 12 5 21 5 3"/></svg>}
                                </div>
                                <div className="flex items-center gap-px flex-shrink-0">
                                  {[3,5,8,5,9,6,8,4,7,5].map((h, i) => (
                                    <div key={i} style={{ width:2, height: isPlaying ? h*2 : h*1.3, background: isPlaying ? '#F97316' : (i < 5 ? '#F97316' : 'rgba(249,115,22,0.35)'), borderRadius:1, transition:'height 0.15s ease' }} />
                                  ))}
                                </div>
                                <div className="min-w-0" style={{ maxWidth: 120 }}>
                                  <p className="text-white font-bold text-[10px] capitalize truncate leading-tight">{aName}</p>
                                  <p className="text-[#F97316] text-[8px] uppercase tracking-widest leading-tight">sound</p>
                                </div>
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                      {/* Images — GIFs and videos stay animated */}
                      {dm.imgs && Object.entries(dm.imgs as Record<string, any>).map(([key, pos]: [string, any]) => {
                        const src = pos.src || (key === 'img_upload' ? imgUploadUrl : imgUrls[parseInt(key.replace('img_', '')) || 0]) || '';
                        if (!src) return null;
                        const isVid = /\.(mp4|webm|mov|ogg)(\?|$)/i.test(src);
                        return (
                          <div key={key} style={{ position:'absolute', left:pos.x, top:pos.y, width:pos.w, height:pos.h, transform:`rotate(${pos.r??0}deg)`, transformOrigin:'center center', overflow:'hidden', boxSizing:'border-box', zIndex:((pos.z??0)+1)*10 }}>
                            {isVid ? <video src={src} className="w-full h-full object-cover" autoPlay loop muted playsInline /> : <img src={src} alt="" className="w-full h-full object-cover" />}
                          </div>
                        );
                      })}
                      {/* Drawing overlay (transparent PNG) */}
                      {dm.draw?.src && (
                        <img src={dm.draw.src} alt="" style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', zIndex:9990 }} />
                      )}
                    </div>
                  );
                })()}

                {/* Message text + inline media commands (hidden when VDESIGN present) */}
                {(() => {
                  const hasDm = !!parseDesignManifest(selectedMessage.message || '');
                  const parsed = parseQuestBanner(selectedMessage.message || '');
                  const rawMsg = parsed ? parsed.cleanMessage : (selectedMessage.message || '');
                  const vstyle = parseVStyle(rawMsg);
                  const msg = stripVStyle(stripDesignManifest(rawMsg));
                  if (hasDm) return null; // VDESIGN renders everything
                  const mediaOnlyMsg = msg.split('\n').filter((l: string) => /^\/(?:img|sound|video)=/i.test(l.trim())).join('\n');
                  return msg ? (
                    <div className="text-white text-sm leading-relaxed" style={{ ...(vstyle?.font ? { fontFamily: vstyle.font } : {}), ...(vstyle?.color ? { color: vstyle.color } : {}) }}>
                      {translatedContent ? (
                        <>
                          <span>{translatedContent.replace(/\[VQUEST:\{.*?\}\]/gs, '').replace(/\[VDESIGN:\{.*?\}\]/gs, '').replace(/\[VSTYLE:\{[^}]*\}\]/g, '').trim()}</span>
                          <span className="text-white/30 text-[10px] ml-1">({(t as any).translatedLabel || 'translated'})</span>
                          {mediaOnlyMsg && renderRichMessageFn(mediaOnlyMsg, playingAudio, audioRef, setPlayingAudio, lang, username)}
                        </>
                      ) : (
                        renderRichMessageFn(msg, playingAudio, audioRef, setPlayingAudio, lang, username)
                      )}
                    </div>
                  ) : null;
                })()}

                {/* Legacy imageId attachment — hidden when VDESIGN handles the layout */}
                {selectedMessage.imageId && !parseDesignManifest(selectedMessage.message || '') && (() => {
                  const isCustom = selectedMessage.imageId.startsWith('img:');
                  const customUrl = isCustom ? `${VIBEFID_STORAGE_URL_INLINE}/${selectedMessage.imageId.slice(4)}` : null;
                  const imgData = !isCustom ? getImageFile(selectedMessage.imageId) : null;
                  if (customUrl) return <img src={customUrl} alt="VibeMail" className="w-full rounded border-2 border-black" />;
                  if (!imgData) return null;
                  return imgData.isVideo
                    ? <video src={imgData.file} className="w-full rounded border-2 border-black" autoPlay loop muted playsInline />
                    : <img src={imgData.file} alt="VibeMail" className="w-full rounded border-2 border-black" />;
                })()}

                {/* Legacy audioId player */}
                {selectedMessage.audioId && (
                  <div className="border-2 border-black shadow-[2px_2px_0px_#000] p-3 flex items-center gap-3 bg-[#1a0e00]">
                    <button
                      onClick={() => {
                        if (playingAudio === selectedMessage.audioId) { stopAudio(); }
                        else { playAudioById(selectedMessage.audioId!, audioRef, convex, setPlayingAudio); }
                      }}
                      className={`w-10 h-10 border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center flex-shrink-0 transition-all ${playingAudio === selectedMessage.audioId ? 'bg-red-500 text-white animate-pulse' : 'bg-vintage-gold text-black hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000]'}`}
                    >
                      {playingAudio === selectedMessage.audioId
                        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                        : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#F97316] font-bold text-sm truncate flex items-center gap-1">
                        {isCustomAudio(selectedMessage.audioId) ? (<><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>Voice message</>) : (isMiAudio(selectedMessage.audioId) ? getMiName(selectedMessage.audioId!) : (VIBEMAIL_SOUNDS.find(s => s.id === selectedMessage.audioId)?.name || t.memeSound))}
                      </p>
                      <p className="text-white/50 text-xs">{playingAudio === selectedMessage.audioId ? t.playing : t.tapToPlay}</p>
                    </div>
                  </div>
                )}

                {/* Miniapp preview */}
                {selectedMessage.miniappUrl && <MiniappPreview url={selectedMessage.miniappUrl} />}

                {/* NFT Gift */}
                {selectedMessage.giftNftImageUrl && (
                  <div onClick={() => { const url = getMarketplaceUrl(selectedMessage.giftNftCollection); if (url) openMarketplace(url, sdk, true); }}
                    className="bg-[#111] border-2 border-black shadow-[2px_2px_0px_#000] p-3 flex items-center gap-3 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000] transition-all cursor-pointer">
                    <div className="relative flex-shrink-0">
                      <img src={selectedMessage.giftNftImageUrl} alt={selectedMessage.giftNftName || 'NFT Gift'} className="w-14 h-14 object-cover border-2 border-black" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png'; }} />
                      <div className="absolute -top-1 -right-1 bg-vintage-gold border border-black w-4 h-4 flex items-center justify-center">
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-vintage-gold font-bold text-sm truncate">{selectedMessage.giftNftName}</p>
                      <p className="text-white/50 text-xs">{selectedMessage.giftNftCollection}</p>
                    </div>
                  </div>
                )}

              </div>

              {/* Receipt Reward - BOTTOM (recipient only) */}
              {(() => {
                if (activeTab === 'sent') return null;
                const parsed = parseQuestBanner(selectedMessage.message || '');
                if (!parsed) return null;
                const { questData } = parsed;
                const mailId = String(selectedMessage._id);
                const isClaimed = claimedMailVbms.has(mailId);
                const isClaiming = claimingMailId === mailId;
                return (
                  <div className="border-t-2 border-black p-3 bg-[#111] flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[#FFD700] font-black text-xs uppercase tracking-wide">Reward</p>
                      <p className="text-white/60 text-[10px]">{questData.baseReward || 100} VBMS for receiving this Quest</p>
                    </div>
                    <button
                      onClick={async () => {
                        if (!myAddress || isClaimed || isClaiming) return;
                        setClaimingMailId(mailId);
                        try {
                          const { ConvexHttpClient } = await import('convex/browser');
                          const { api: vmwApi } = await import('@/convex/_generated/api');
                          const vmwClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
                          const receiptReward = questData.baseReward || 100;
                          const result = await vmwClient.action(vmwApi.vbmsClaim.claimQuestReceiptVBMS, {
                            messageId: selectedMessage._id as any,
                            claimerAddress: myAddress,
                            amount: receiptReward,
                          });
                          const txData = encodeFunctionData({
                            abi: POOL_ABI,
                            functionName: 'claimVBMS',
                            args: [parseEther(result.amount.toString()), result.nonce as `0x${string}`, result.signature as `0x${string}`],
                          });
                          const provider = await sdk.wallet.getEthereumProvider();
                          await provider!.request({
                            method: 'eth_sendTransaction',
                            params: [{ from: myAddress as `0x${string}`, to: CONTRACTS.VBMSPoolTroll as `0x${string}`, data: txData }],
                          });
                          setClaimedMailVbms(prev => new Set([...prev, mailId]));
                        } catch (e) {
                          console.error('Receipt claim failed:', e);
                        } finally {
                          setClaimingMailId(null);
                        }
                      }}
                      disabled={isClaimed || isClaiming || !myAddress}
                      className={`px-4 py-2 border-2 border-black font-black text-xs uppercase tracking-wide shadow-[3px_3px_0px_#000] flex-shrink-0 transition-all ${
                        isClaimed
                          ? 'bg-[#222] text-[#22C55E] shadow-none cursor-default'
                          : isClaiming
                          ? 'bg-[#FFD700]/50 text-black cursor-wait'
                          : 'bg-[#FFD700] text-black hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none'
                      }`}
                    >
                      {isClaimed ? (t.questClaimedMail || 'Claimed!') : isClaiming ? '...' : (t.questClaimMailVbms || 'Claim VBMS')}
                    </button>
                  </div>
                );
              })()}

              {/* Date footer - always last */}
              <div className="px-3 pt-2 pb-1 border-t border-white/10 flex items-center justify-between text-[10px]">
                <span className="text-white/40">{new Date(selectedMessage.createdAt).toLocaleDateString()}</span>
              </div>
            </div>{/* end content padding */}
            </div>{/* end scroll container */}

            {/* Scroll down indicator */}
            {showScrollDown && (
              <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-1 pointer-events-none">
                <div className="bg-black/80 border border-white/20 rounded-full px-3 py-1 flex items-center gap-1 animate-bounce">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                  <span className="text-white/60 text-[9px]">more</span>
                </div>
              </div>
            )}
            </div>{/* end relative scroll wrapper */}

            {/* Reply button */}
            {myFid && myAddress && selectedMessage.voterFid && selectedMessage.voterFid !== myFid && (
              <button
                onClick={() => {
                  AudioManager.buttonClick();
                  const msgId = selectedMessage._id;
                  const senderFid = selectedMessage.voterFid;
                  setSelectedMessage(null);
                  setReplyToMessageId(msgId);
                  setReplyToFid(senderFid || null);
                  setShowComposer(true);
                }}
                className="mt-2 w-full py-2 bg-vintage-gold text-black font-bold border-2 border-black shadow-[3px_3px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>
                Reply
              </button>
            )}
          </div>
        ) : (
          /* Message List */
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Delete Mode Controls */}
            {activeTab === 'inbox' && currentMessages && currentMessages.length > 0 && (
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-vintage-gold/20">
                <button
                  onClick={() => {
                    setDeleteMode(!deleteMode);
                    setSelectedForDelete(new Set());
                  }}
                  className={`text-xs px-2 py-1 border-2 border-black font-bold shadow-[2px_2px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000] transition-all ${
                    deleteMode
                      ? 'bg-red-500 text-white'
                      : 'bg-vintage-black text-vintage-gold'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    {deleteMode ? (
                      <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        Cancel
                      </>
                    ) : (
                      <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                        {t.vibemailDeleteMode || 'Select'}
                      </>
                    )}
                  </span>
                </button>
                {deleteMode && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (selectedForDelete.size === currentMessages.length) {
                          setSelectedForDelete(new Set());
                        } else {
                          setSelectedForDelete(new Set(currentMessages.map((m: VibeMailMessage) => m._id)));
                        }
                      }}
                      className="text-xs px-2 py-1 bg-vintage-gold/20 border border-vintage-gold/30 text-vintage-gold rounded-lg"
                    >
                      {selectedForDelete.size === currentMessages.length
                        ? (t.vibemailDeselectAll || 'Deselect All')
                        : (t.vibemailSelectAll || 'Select All')}
                    </button>
                    {selectedForDelete.size > 0 && (
                      <button
                        onClick={async () => {
                          if (!cardFid) return;
                          try {
                            const result = await deleteMessagesMutation({
                              messageIds: Array.from(selectedForDelete) as Id<'cardVotes'>[],
                              ownerFid: cardFid,
                            });
                            console.log('Deleted:', result.deleted, 'messages');
                            setSelectedForDelete(new Set());
                            setDeleteMode(false);
                          } catch (err) {
                            console.error('Delete error:', err);
                          }
                        }}
                        className="text-xs px-2 py-1 bg-red-500/30 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/40"
                      >
                        <span className="flex items-center gap-1">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                          {(t.vibemailDeleteSelected || 'Delete ({count})').replace('{count}', String(selectedForDelete.size))}
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Quest VibeMail Builder Tab */}
            {activeTab === 'quests' && (
              <div className="flex-1 flex flex-col gap-2 p-2 min-h-0 overflow-visible">

                {/* Follow Farcaster card */}
                <div className="border-2 border-black shadow-[3px_3px_0px_#000] bg-[#0d0d0d] flex flex-col flex-1 min-h-[110px]">
                  {/* Card header */}
                  <div className="bg-[#8B5CF6] px-3 py-1.5 flex items-center justify-between border-b-2 border-black">
                    <span className="font-black text-[10px] uppercase tracking-widest text-black flex items-center gap-1.5">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      Follow Farcaster
                    </span>
                    {settingsFarcaster && settingsFarcasterFid && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    )}
                  </div>
                  {/* Card body */}
                  <div className="p-2 flex-1 flex flex-col justify-center">
                    {settingsFarcaster && settingsFarcasterFid ? (
                      <div className="flex items-center gap-2 bg-[#8B5CF6]/10 border border-[#8B5CF6]/40 px-2 py-2">
                        {settingsFarcasterPfp && <img src={settingsFarcasterPfp} className="w-8 h-8 rounded-full border-2 border-[#8B5CF6]/60 flex-shrink-0" alt="" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-bold text-xs truncate">@{settingsFarcaster}</p>
                          <p className="text-white/40 text-[9px]">FID: {settingsFarcasterFid}</p>
                        </div>
                        <button onClick={() => { setSettingsFarcaster(''); setSettingsFarcasterFid(null); setSettingsFarcasterPfp(''); setFcSearchQ(''); }} className="text-white/30 hover:text-red-400 flex-shrink-0">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="flex items-center border-2 border-[#2a2a2a] focus-within:border-[#8B5CF6] bg-[#0a0a0a]">
                          <span className="pl-2 pr-1 text-[#8B5CF6] font-black text-sm select-none">@</span>
                          <input
                            type="text"
                            value={fcSearchQ}
                            onChange={e => setFcSearchQ(e.target.value.replace(/^@/, ''))}
                            placeholder={t.searchByUsernameOrFid || 'Search by username or FID...'}
                            className="flex-1 bg-transparent text-white text-xs py-2 pl-2 focus:outline-none placeholder:text-white/20"
                            style={{ colorScheme: 'dark', WebkitTextFillColor: 'white' }}
                          />
                          {fcHolderSearchResults === undefined && fcSearchQ.length >= 2 && <svg className="animate-spin mr-2 w-3 h-3 text-[#8B5CF6]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>}
                        </div>
                        {(fcHolderSearchResults?.length ?? 0) > 0 && (
                          <div className="absolute top-full left-0 right-0 z-[100] bg-[#111] border-2 border-black shadow-[6px_6px_0px_#000] max-h-44 overflow-y-auto mt-0.5">
                            <div className="h-0.5 bg-[#8B5CF6]" />
                            {fcHolderSearchResults!.map((u: { fid: number; username: string; pfpUrl: string }) => (
                              <button key={u.fid} onClick={() => { setSettingsFarcaster(u.username); setSettingsFarcasterFid(u.fid); setSettingsFarcasterPfp(u.pfpUrl || ''); setFcSearchQ(u.username); }}
                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#8B5CF6]/15 border-b border-white/5 last:border-0 text-left">
                                {u.pfpUrl && <img src={u.pfpUrl} className="w-7 h-7 rounded-full flex-shrink-0 border border-white/20" alt="" />}
                                <div className="flex-1 min-w-0">
                                  <p className="text-white text-xs font-bold truncate">@{u.username}</p>
                                  <p className="text-white/40 text-[9px]">FID {u.fid} · VibeFID holder</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Miniapp card */}
                <div className="border-2 border-black shadow-[3px_3px_0px_#000] bg-[#0d0d0d] flex flex-col flex-1 min-h-[110px]">
                  <div className="bg-[#22C55E] px-3 py-1.5 flex items-center justify-between border-b-2 border-black">
                    <span className="font-black text-[10px] uppercase tracking-widest text-black flex items-center gap-1.5">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6v6H9z"/></svg>
                      Miniapp
                    </span>
                    {settingsMiniapp && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    )}
                  </div>
                  <div className="p-2 flex-1 flex flex-col justify-center">
                    {settingsMiniapp ? (
                      <div className="flex items-center gap-2 bg-[#22C55E]/10 border border-[#22C55E]/40 px-2 py-2">
                        {settingsMiniappIcon && <img src={settingsMiniappIcon} className="w-8 h-8 rounded border-2 border-[#22C55E]/60 object-cover flex-shrink-0" alt="" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-bold text-xs truncate">{settingsMiniappName || settingsMiniapp}</p>
                          <p className="text-white/40 text-[9px] truncate">{settingsMiniapp}</p>
                        </div>
                        <button onClick={() => { setSettingsMiniapp(''); setSettingsMiniappName(''); setSettingsMiniappIcon(''); setMaSearchQ(''); }} className="text-white/30 hover:text-red-400 flex-shrink-0">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {/* Quick select: VBMS */}
                        <button
                          onClick={() => { setSettingsMiniapp('https://vibemostwanted.xyz'); setSettingsMiniappName('VBMS - Game and Wanted Cast'); setSettingsMiniappIcon('https://vibemostwanted.xyz/icon.gif'); setMaSearchQ(''); setMaSearchResults([]); }}
                          className="flex items-center gap-2 px-2 py-1.5 bg-[#FFD700]/10 border border-[#FFD700]/40 hover:bg-[#FFD700]/20 text-left transition-colors"
                        >
                          <img src="https://vibemostwanted.xyz/icon.gif" className="w-7 h-7 rounded border border-[#FFD700]/50 flex-shrink-0" alt="" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[#FFD700] font-black text-[10px] uppercase tracking-wide">VBMS — Game &amp; Wanted Cast</p>
                            <p className="text-white/30 text-[9px]">vibemostwanted.xyz</p>
                          </div>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>
                        {/* Search input */}
                        <div className="relative">
                          <div className="flex items-center border-2 border-[#2a2a2a] focus-within:border-[#22C55E] bg-[#0a0a0a]">
                            <span className="pl-2 pr-1 text-[#22C55E] font-black text-[10px] select-none">app</span>
                            <input
                              type="text"
                              value={maSearchQ}
                              onChange={e => setMaSearchQ(e.target.value)}
                              placeholder={t.vibemailSearchOrPasteUrl || 'Search or paste URL...'}
                              className="flex-1 bg-transparent text-white text-xs py-2 pl-2 focus:outline-none placeholder:text-white/20"
                              style={{ colorScheme: 'dark', WebkitTextFillColor: 'white' }}
                              onBlur={e => {
                                const v = e.target.value.trim();
                                if (!v.startsWith('http')) return;
                                const fcMatch = v.match(/farcaster\.xyz\/miniapps\/[^/]+\/([^/?]+)/);
                                const name = fcMatch
                                  ? fcMatch[1].replace(/-+/g, ' ').trim().replace(/\b\w/g, c => c.toUpperCase())
                                  : v;
                                setSettingsMiniapp(v);
                                setSettingsMiniappName(name);
                                setMaSearchResults([]);
                              }}
                            />
                            {maSearching && <svg className="animate-spin mr-2 w-3 h-3 text-[#22C55E]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>}
                          </div>
                          {maSearchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 z-[100] bg-[#111] border-2 border-black shadow-[6px_6px_0px_#000] max-h-44 overflow-y-auto mt-0.5">
                              <div className="h-0.5 bg-[#22C55E]" />
                              {maSearchResults.map(m => (
                                <button key={m.url} onClick={() => { setSettingsMiniapp(m.url); setSettingsMiniappName(m.name); setSettingsMiniappIcon(m.icon_url || ''); setMaSearchQ(m.name); setMaSearchResults([]); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#22C55E]/15 border-b border-white/5 last:border-0 text-left">
                                  {m.icon_url && <img src={m.icon_url} className="w-7 h-7 rounded flex-shrink-0 object-cover border border-white/20" alt="" onError={(e: any) => e.target.style.display='none'} />}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-white text-xs font-bold truncate">{m.name}</p>
                                    <p className="text-white/40 text-[9px] truncate">{m.domain}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                          {maSearchQ.length >= 2 && !maSearching && maSearchResults.length === 0 && (
                            <p className="text-white/20 text-[9px] mt-1 px-1">Sem resultados — cole a URL do farcaster.xyz/miniapps/...</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Join Channel card */}
                <div className="border-2 border-black shadow-[3px_3px_0px_#000] bg-[#0d0d0d] flex flex-col flex-1 min-h-[110px]">
                  <div className="bg-[#FF9F0A] px-3 py-1.5 flex items-center justify-between border-b-2 border-black">
                    <span className="font-black text-[10px] uppercase tracking-widest text-black flex items-center gap-1.5">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                      Join Channel
                    </span>
                    {settingsChannel && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    )}
                  </div>
                  <div className="p-2 flex-1 flex flex-col justify-center gap-2">
                    {settingsChannel ? (
                      <div className="flex items-center gap-2 bg-[#FF9F0A]/10 border border-[#FF9F0A]/40 px-2 py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-bold text-xs truncate">{settingsChannelName || settingsChannel}</p>
                          <p className="text-white/40 text-[9px] truncate">{settingsChannel}</p>
                        </div>
                        <button onClick={() => { setSettingsChannel(''); setSettingsChannelName(''); setSettingsChannelImg(''); setChSearchQ(''); }} className="text-white/30 hover:text-red-400 flex-shrink-0">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center border-2 border-[#2a2a2a] focus-within:border-[#FF9F0A] bg-[#0a0a0a]">
                          <input
                            type="text"
                            value={chSearchQ}
                            onChange={e => setChSearchQ(e.target.value)}
                            placeholder="https://farcaster.xyz/~/channel/..."
                            className="flex-1 bg-transparent text-white text-xs py-2 px-3 focus:outline-none placeholder:text-white/20"
                            style={{ colorScheme: 'dark', WebkitTextFillColor: 'white' }}
                            onBlur={e => {
                              const v = e.target.value.trim();
                              if (!v) return;
                              const match = v.match(/\/channel\/([^/?]+)/);
                              const channelId = match ? match[1] : v;
                              setSettingsChannel(v);
                              setSettingsChannelName(channelId);
                            }}
                          />
                        </div>
                        <p className="text-white/20 text-[9px] mt-1 px-1">Cole o link de convite do channel</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Save button */}
                <button
                  onClick={() => {
                    AudioManager.buttonClick();
                    const key = `vm_settings_${cardFid}`;
                    localStorage.setItem(key, JSON.stringify({
                      farcaster: settingsFarcaster, farcasterFid: settingsFarcasterFid, farcasterPfp: settingsFarcasterPfp, farcasterBanner: settingsFarcasterBanner,
                      miniapp: settingsMiniapp, miniappName: settingsMiniappName, miniappIcon: settingsMiniappIcon,
                      twitter: settingsTwitter,
                      channel: settingsChannel, channelName: settingsChannelName, channelImg: settingsChannelImg,
                    }));
                    setSettingsSaved(true);
                    setTimeout(() => setSettingsSaved(false), 2000);
                  }}
                  className={`w-full py-2.5 font-black text-sm uppercase tracking-widest border-2 border-black transition-all flex-shrink-0 ${
                    settingsSaved
                      ? 'bg-[#22C55E] text-black shadow-none translate-x-[3px] translate-y-[3px]'
                      : 'bg-[#FFD700] text-black shadow-[4px_4px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none'
                  }`}
                >
                  {settingsSaved ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      Salvo!
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                      Salvar
                    </span>
                  )}
                </button>
              </div>
            )}

            {activeTab === 'sent' && (
            <div className="space-y-3">
              {/* Sent Analytics Panel */}
              {!sentMessages || sentMessages.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-white/60 text-sm">No messages sent yet</p>
                  <p className="text-white/40 text-xs mt-1">Your sent messages will appear here</p>
                </div>
              ) : (() => {
                const total = sentMessages.length;
                const opened = sentMessages.filter((m: VibeMailMessage) => m.isRead).length;
                const withMedia = sentMessages.filter((m: VibeMailMessage) => m.imageId || m.audioId || m.castUrl).length;
                const openRate = total > 0 ? Math.round((opened / total) * 100) : 0;
                return (
                  <>
                    {/* Stats cards */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-[#111] border-2 border-black shadow-[2px_2px_0px_#000] p-2 text-center">
                        <p className="text-[#FFD700] font-black text-xl">{total}</p>
                        <p className="text-white/50 text-[10px] uppercase font-bold">Sent</p>
                      </div>
                      <div className="bg-[#111] border-2 border-black shadow-[2px_2px_0px_#000] p-2 text-center">
                        <p className="text-[#22C55E] font-black text-xl">{opened}</p>
                        <p className="text-white/50 text-[10px] uppercase font-bold">Opened</p>
                      </div>
                      <div className="bg-[#111] border-2 border-black shadow-[2px_2px_0px_#000] p-2 text-center">
                        <p className={`font-black text-xl ${openRate >= 50 ? 'text-[#22C55E]' : openRate >= 20 ? 'text-[#FFD700]' : 'text-white/50'}`}>{openRate}%</p>
                        <p className="text-white/50 text-[10px] uppercase font-bold">Open Rate</p>
                      </div>
                    </div>
                    {/* Open rate bar */}
                    <div className="bg-[#111] border-2 border-black p-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white/60 text-[10px] uppercase font-bold">Engagement</span>
                        <span className="text-white/40 text-[10px]">{withMedia} with media</span>
                      </div>
                      <div className="h-2 bg-[#222] border border-black">
                        <div className="h-full bg-[#FFD700] transition-all" style={{ width: `${openRate}%` }} />
                      </div>
                    </div>
                    {/* Per-message list */}
                    <div className="space-y-1">
                      <p className="text-white/40 text-[10px] uppercase font-bold px-1">Recent Messages</p>
                      {pagedMessages.map((msg: VibeMailMessage) => (
                        <div key={msg._id} onClick={() => setSelectedMessage(msg)} className="bg-[#111] border-2 border-black p-2 flex items-center gap-2 cursor-pointer hover:bg-[#1a1a1a] active:bg-[#222] transition-colors">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${msg.isRead ? 'bg-[#22C55E]' : 'bg-white/20'}`} />
                          <div className="flex-1 min-w-0">
                            {msg.recipientUsername && (
                              <p className="text-[#FFD700] text-[10px] font-bold truncate">@{msg.recipientUsername}</p>
                            )}
                            <p className="text-white/70 text-xs truncate">{(msg.message || '').slice(0, 40)}{(msg.message || '').length > 40 ? '...' : ''}</p>
                          </div>
                          <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                            <span className={`text-[10px] font-bold px-1 border ${msg.isRead ? 'text-[#22C55E] border-[#22C55E]/40 bg-[#22C55E]/10' : 'text-white/30 border-white/10 bg-transparent'}`}>
                              {msg.isRead ? 'OPENED' : 'SENT'}
                            </span>
                            <span className="text-white/30 text-[9px]">{new Date(msg.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
              {/* Pagination for sent */}
              {totalMsgPages > 1 && (
                <div className="flex items-center justify-between pt-2 mt-2 border-t border-vintage-gold/30">
                  <button onClick={() => setMsgPage(p => Math.max(0, p - 1))} disabled={msgPage === 0}
                    className="px-4 py-1.5 bg-vintage-gold text-black border-2 border-black font-black text-sm disabled:opacity-30 disabled:bg-vintage-gold/30 shadow-[2px_2px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000] transition-all">
                    &lt;
                  </button>
                  <span className="text-vintage-gold font-bold text-sm">{msgPage + 1} / {totalMsgPages}</span>
                  <button onClick={() => setMsgPage(p => Math.min(totalMsgPages - 1, p + 1))} disabled={msgPage >= totalMsgPages - 1}
                    className="px-4 py-1.5 bg-vintage-gold text-black border-2 border-black font-black text-sm disabled:opacity-30 disabled:bg-vintage-gold/30 shadow-[2px_2px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000] transition-all">
                    &gt;
                  </button>
                </div>
              )}
            </div>
            )}

            {activeTab === 'inbox' && (
            <div className="flex-1 overflow-y-auto min-h-0 space-y-2">
            {!currentMessages || currentMessages.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-white/60 text-sm">{t.noMessagesYet}</p>
                <p className="text-white/40 text-xs mt-1">
                  {t.messagesWillAppear}
                </p>
              </div>
            ) : (
              pagedMessages.map((msg: VibeMailMessage, idx: number) => (
                <div key={msg._id} className="flex items-center gap-2">
                  {/* Checkbox for delete mode */}
                  {deleteMode && activeTab === 'inbox' && (
                    <button
                      onClick={() => {
                        const newSelected = new Set(selectedForDelete);
                        if (newSelected.has(msg._id)) {
                          newSelected.delete(msg._id);
                        } else {
                          newSelected.add(msg._id);
                        }
                        setSelectedForDelete(newSelected);
                      }}
                      className={`w-6 h-6 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                        selectedForDelete.has(msg._id)
                          ? 'bg-red-500 border-red-500 text-white'
                          : 'border-vintage-gold/50 hover:border-vintage-gold'
                      }`}
                    >
                      {selectedForDelete.has(msg._id) && <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                    </button>
                  )}
                <button
                  onClick={() => !deleteMode && handleOpenMessage(msg)}
                  disabled={deleteMode}
                  className={`flex-1 text-left px-3 py-2 border-2 shadow-[2px_2px_0px_#000] transition-all ${
                    msg.isRead
                      ? `${idx % 2 === 0 ? 'bg-[#141414]' : 'bg-[#1a1a1a]'} border-[#2a2a2a] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000]`
                      : 'bg-[#1a1400] border-vintage-gold/50 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000]'
                  } ${deleteMode ? 'opacity-80' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    {/* Avatar */}
                    {msg.voterPfpUrl ? (
                      <img src={msg.voterPfpUrl} alt={msg.voterUsername || ''} className="w-8 h-8 rounded-full flex-shrink-0 object-cover border border-white/10" />
                    ) : (
                      <div className="w-8 h-8 rounded-full flex-shrink-0 bg-vintage-gold/20 border border-vintage-gold/30 flex items-center justify-center">
                        <span className="text-vintage-gold text-xs font-bold">{(msg.voterUsername || '?')[0].toUpperCase()}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`text-xs font-bold truncate ${msg.isRead ? 'text-white/50' : 'text-vintage-gold'}`}>
                          {msg.voterUsername ? `@${msg.voterUsername}` : `FID #${msg.voterFid || '?'}`}
                        </span>
                        {!msg.isRead && <span className="w-1.5 h-1.5 rounded-full bg-vintage-gold flex-shrink-0" />}
                        {msg.isPaid && <span className="text-[9px] text-yellow-400 font-bold flex-shrink-0">PAID</span>}
                      </div>
                      {/* Message preview text */}
                      <p className={`text-xs truncate leading-tight ${msg.isRead ? 'text-white/40' : 'text-white/80'}`}>
                        {(() => {
                          const raw = msg.message || '';
                          const clean = raw.replace(/\[VQUEST:\{.*?\}\]/s, '').replace(/\/img=\S+/gi, '').replace(/\/sound=\S+(\s+volume=[\d.]+)?/gi, '').trim();
                          return clean.slice(0, 60) || (msg.audioId ? '' : msg.giftNftName || '...');
                        })()}
                      </p>
                      {/* Attachment / quest chips */}
                      {(() => {
                        const msgText = msg.message || '';
                        const hasGifInText = /\/img=https?:\/\/(media\.giphy|media[0-9]*\.giphy|giphy\.com)/i.test(msgText) || /\/img=\S+\.gif/i.test(msgText);
                        const hasImgInText = /\/img=/i.test(msgText) && !hasGifInText;
                        const hasSoundInText = /\/sound=/i.test(msgText);
                        return (msg.imageId || msg.audioId || msg.castUrl || msg.giftNftImageUrl || msg.miniappUrl || hasGifInText || hasImgInText || hasSoundInText || parseQuestBanner(msgText));
                      })() && (
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          {parseQuestBanner(msg.message || '') && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#FFD700]/15 border border-[#FFD700]/40 text-[#FFD700] font-black text-[9px] uppercase tracking-wide">
                              <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                              Quest
                            </span>
                          )}
                          {msg.imageId && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-500/15 border border-blue-500/40 text-blue-400 font-bold text-[9px]">
                              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                              Image
                            </span>
                          )}
                          {msg.audioId && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-500/15 border border-orange-500/40 text-orange-400 font-bold text-[9px]">
                              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
                              {isCustomAudio(msg.audioId) ? 'Voice' : 'Sound'}
                            </span>
                          )}
                          {msg.castUrl && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-500/15 border border-purple-500/40 text-purple-400 font-bold text-[9px]">
                              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                              Cast
                            </span>
                          )}
                          {msg.miniappUrl && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-green-500/15 border border-green-500/40 text-green-400 font-bold text-[9px]">
                              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6v6H9z"/></svg>
                              Miniapp
                            </span>
                          )}
                          {msg.giftNftImageUrl && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-pink-500/15 border border-pink-500/40 text-pink-400 font-bold text-[9px]">
                              NFT
                            </span>
                          )}
                          {(() => {
                            const mt = msg.message || '';
                            const hasGif = /\/img=https?:\/\/(media\.giphy|media[0-9]*\.giphy|giphy\.com)/i.test(mt) || /\/img=\S+\.gif/i.test(mt);
                            const hasImg = /\/img=/i.test(mt) && !hasGif;
                            const hasSound = /\/sound=/i.test(mt) && !msg.audioId;
                            return (<>
                              {hasGif && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-500/15 border border-purple-500/40 text-purple-400 font-bold text-[9px]">GIF</span>}
                              {hasImg && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-500/15 border border-blue-500/40 text-blue-400 font-bold text-[9px]">IMG</span>}
                              {hasSound && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-500/15 border border-orange-500/40 text-orange-400 font-bold text-[9px]">♪</span>}
                            </>);
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
                </div>
              ))
            )}
            {/* Pagination controls */}
            {totalMsgPages > 1 && (
              <div className="flex items-center justify-between pt-2 mt-2 border-t border-vintage-gold/30">
                <button
                  onClick={() => setMsgPage(p => Math.max(0, p - 1))}
                  disabled={msgPage === 0}
                  className="px-4 py-1.5 bg-vintage-gold text-black border-2 border-black font-black text-sm disabled:opacity-30 disabled:bg-vintage-gold/30 disabled:text-black/40 shadow-[2px_2px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000] transition-all"
                >
                  &lt;
                </button>
                <span className="text-vintage-gold font-bold text-sm">{msgPage + 1} / {totalMsgPages}</span>
                <button
                  onClick={() => setMsgPage(p => Math.min(totalMsgPages - 1, p + 1))}
                  disabled={msgPage >= totalMsgPages - 1}
                  className="px-4 py-1.5 bg-vintage-gold text-black border-2 border-black font-black text-sm disabled:opacity-30 disabled:bg-vintage-gold/30 disabled:text-black/40 shadow-[2px_2px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000] transition-all"
                >
                  &gt;
                </button>
              </div>
            )}
            </div>
            )}
          </div>
        )}

        {/* Claim Button at bottom (always visible when not viewing message and has pending VBMS) */}
        {!selectedMessage && pendingVbms > 0 && (
          <div className="border-t border-vintage-gold/30 pt-4 mt-auto">
            <button
              onClick={() => {
                AudioManager.buttonClick();
                if (!address) {
                  alert('Connect wallet to claim VBMS');
                  return;
                }
                onClaim();
              }}
              disabled={isClaimingRewards || isClaimTxPending}
              className="w-full py-4 bg-vintage-gold text-black font-bold text-lg border-2 border-black shadow-[4px_4px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-50 flex items-center justify-center gap-3"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              <span>
                {isClaimingRewards || isClaimTxPending ? 'Claiming...' : `CLAIM ${pendingVbms} VBMS`}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom bar — home nav style */}
      {myFid && !showComposer && !selectedMessage && (
        <div className="mt-2 flex-shrink-0">
          {/* Send button — only on inbox/sent tabs */}
          {myAddress && activeTab !== 'quests' && (
            <button
              onClick={() => { AudioManager.buttonClick(); setShowPurposeModal(true); setReplyToMessageId(null); }}
              className="w-full py-2.5 mb-1.5 bg-vintage-gold text-vintage-black font-modern font-semibold text-sm rounded-lg border border-vintage-gold/30 flex items-center justify-center gap-2 transition-all hover:brightness-110 active:brightness-90"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
              New VibeMail
            </button>
          )}
          {/* Tabs */}
          <div className="bg-[#0a0a0a] border-2 border-black p-1 flex gap-1">
            <button onClick={() => setActiveTab('inbox')} className={`flex-1 min-w-0 font-black uppercase transition-all px-1 py-2 flex flex-col items-center justify-center gap-0.5 text-[10px] leading-tight border-2 border-black ${activeTab === 'inbox' ? 'vmt-inbox-active shadow-none translate-x-[2px] translate-y-[2px]' : 'vmt-inbox-inactive shadow-[3px_3px_0px_#000]'}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
              <span>Msgs</span>
            </button>
            <button onClick={() => setActiveTab('sent')} className={`flex-1 min-w-0 font-black uppercase transition-all px-1 py-2 flex flex-col items-center justify-center gap-0.5 text-[10px] leading-tight border-2 border-black ${activeTab === 'sent' ? 'vmt-sent-active shadow-none translate-x-[2px] translate-y-[2px]' : 'vmt-sent-inactive shadow-[3px_3px_0px_#000]'}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              <span>Sent</span>
            </button>
            <button onClick={() => setActiveTab('quests')} className={`flex-1 min-w-0 font-black uppercase transition-all px-1 py-2 flex flex-col items-center justify-center gap-0.5 text-[10px] leading-tight border-2 border-black ${activeTab === 'quests' ? 'vmt-quests-active shadow-none translate-x-[2px] translate-y-[2px]' : 'vmt-quests-inactive shadow-[3px_3px_0px_#000]'}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
              <span>Settings</span>
            </button>
          </div>
        </div>
      )}

      {showDexModal && (
        <VibeDexModal onClose={() => setShowDexModal(false)} />
      )}
    </div>
  );
}

interface VibeMailComposerProps {
  message: string;
  setMessage: (msg: string) => void;
  audioId: string | null;
  setAudioId: (id: string | null) => void;
  imageId?: string | null;
  setImageId?: (id: string | null) => void;
}

// VibeMail Composer - Inline component for vote modal
export function VibeMailComposer({ message, setMessage, audioId, setAudioId, imageId, setImageId }: VibeMailComposerProps) {
  const { lang } = useLanguage();
  const t = fidTranslations[lang];
  const [showSoundPicker, setShowSoundPicker] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [previewSound, setPreviewSound] = useState<string | null>(null);

  const playPreview = (soundId: string) => {
    const sound = VIBEMAIL_SOUNDS.find(s => s.id === soundId);
    if (sound && audioRef.current) {
      if (previewSound === soundId) {
        // Stop if same sound
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setPreviewSound(null);
      } else {
        audioRef.current.src = sound.file;
        audioRef.current.play().catch(console.error);
        setPreviewSound(soundId);
      }
    }
  };

  return (
    <div className="bg-[#111] border border-[#333] p-3 space-y-3">
      <audio ref={audioRef} onEnded={() => setPreviewSound(null)} />

      {/* Header with John Pork */}
      <div className="flex items-center gap-2">
        <img
          src="/john-pork.jpg"
          alt="VibeMail"
          className="w-8 h-8 rounded-full border border-vintage-gold"
        />
        <p className="text-vintage-gold font-bold text-xs">{t.vibeMailTitle}</p>
      </div>

      {/* Message Input */}
      <textarea
        value={message}
        onChange={(e) => {
          const raw = e.target.value;
          const visible = raw.split('\n').filter((l: string) => !l.match(/^\/(img|sound|gif|video|url)=/i)).join('\n').length;
          if (visible <= 200) setMessage(raw);
        }}
        placeholder={t.vibeMailPlaceholder}
        className="w-full h-28 min-h-[112px] bg-[#111] border-2 border-[#444] p-2 text-white text-sm placeholder:text-white/40 resize-none focus:border-[#FFD700] focus:outline-none"
                style={{ colorScheme: 'dark', WebkitTextFillColor: 'white' }}
      />
      <div className="flex justify-between items-center">
        <p className="text-vintage-gold/60 text-xs">{t.vibeImageTip}</p>
        <p className="text-white/40 text-xs">{message.split('\n').filter((l: string) => !l.match(/^\/(img|sound|gif|video|url)=/i)).join('\n').length}/200</p>
      </div>

      {/* Voice Recorder */}
      <AudioRecorder
        onAudioReady={(id) => setAudioId(id)}
        onClear={() => setAudioId(null)}
        currentAudioId={isCustomAudio(audioId || undefined) ? audioId : null}
      />

      {/* Meme Sound Picker - only show if no custom audio */}
      {!isCustomAudio(audioId || undefined) && (
        <div>
        <button
          onClick={() => {
            AudioManager.buttonClick();
            setShowSoundPicker(!showSoundPicker);
          }}
          className="w-full flex items-center justify-between p-2 bg-[#1a1a1a] border-2 border-[#444] text-white text-sm hover:border-[#FFD700]/50"
        >
          <span>
            {audioId ? `${t.soundLabel}: ${isMiAudio(audioId) ? getMiName(audioId) : (VIBEMAIL_SOUNDS.find(s => s.id === audioId)?.name || audioId)}` : t.addMemeSound}
          </span>
          <span className="text-vintage-gold">{showSoundPicker ? '▲' : '▼'}</span>
        </button>

        {showSoundPicker && (
          <div className="mt-2 grid grid-cols-2 gap-2 bg-vintage-charcoal/50 p-2 rounded-lg border border-vintage-gold/20">
            {VIBEMAIL_SOUNDS.map((sound) => (
              <button
                key={sound.id}
                onClick={() => {
                  playPreview(sound.id);
                  setAudioId(audioId === sound.id ? null : sound.id);
                }}
                className={`p-2 rounded-lg border text-xs transition-all flex items-center gap-2 ${
                  audioId === sound.id
                    ? 'bg-vintage-gold/30 border-vintage-gold text-vintage-gold'
                    : 'bg-[#1a1a1a] border-[#444] text-white hover:border-[#FFD700]/50 hover:bg-[#FFD700]/10'
                }`}
              >
                <span className={previewSound === sound.id ? 'animate-pulse' : ''}>
                  {previewSound === sound.id ? '⏹' : '▶️'}
                </span>
                <span className="truncate">{sound.name}</span>
              </button>
            ))}
          </div>
        )}
        </div>
      )}

      {/* Image Picker */}
      {setImageId && (
          <div>
          <button
            onClick={() => {
              AudioManager.buttonClick();
              setShowImagePicker(!showImagePicker);
            }}
            className="w-full flex items-center justify-between p-2 bg-[#1a1a1a] border-2 border-[#444] text-white text-sm hover:border-[#FFD700]/50"
          >
            <span>
              <span className="flex items-center gap-1.5"><svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>{imageId ? VIBEMAIL_IMAGES.find(i => i.id === imageId)?.name : 'Add meme image (optional)'}</span>
            </span>
            <span className="text-vintage-gold">{showImagePicker ? '▲' : '▼'}</span>
          </button>

          {showImagePicker && (
            <div className="mt-2 grid grid-cols-4 gap-2">
              {VIBEMAIL_IMAGES.map((img) => (
                <button
                  key={img.id}
                  onClick={() => setImageId(imageId === img.id ? null : img.id)}
                  className={`p-1 rounded-lg border transition-all ${
                    imageId === img.id
                      ? 'border-vintage-gold bg-vintage-gold/20'
                      : 'border-vintage-gold/20 hover:border-vintage-gold/50'
                  }`}
                >
                  {img.isVideo ? (
                    <video src={img.file} className="w-full h-10 object-cover rounded" muted loop autoPlay playsInline />
                  ) : (
                    <img src={img.file} alt={img.name} className="w-full h-10 object-cover rounded" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
