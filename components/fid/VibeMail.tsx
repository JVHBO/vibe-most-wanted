'use client';

import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useConvex } from 'convex/react';
import { api } from "@/lib/fid/convex-generated/api";
import { Id } from "@/lib/fid/convex-generated/dataModel";
import { AudioManager } from "@/lib/fid/audio-manager";
import { useLanguage } from '@/contexts/LanguageContext';
import { fidTranslations } from "@/lib/fid/fidTranslations";
import { translations } from "@/lib/translations";
import { sdk } from '@farcaster/miniapp-sdk';
import { useTransferVBMS, useVBMSBalance } from "@/hooks/fid/useVBMSContracts";
import { useFarcasterContext } from "@/hooks/fid/useFarcasterContext";
import { CONTRACTS } from "@/lib/fid/contracts";
import { parseEther } from 'viem';
import haptics from "@/lib/fid/haptics";
import { AudioRecorder } from './AudioRecorder';
import { useMusic } from '@/contexts/MusicContext';
import { openMarketplace } from "@/lib/fid/marketplace-utils";
import { VibeDexModal } from './VibeDexModal';
import { CastPreview } from './CastPreview';
import { MiniappPreview } from './MiniappPreview';


const VIBEMAIL_COST_VBMS = "1000"; // Cost for paid VibeMail
const VIBEMAIL_RECIPIENT_VBMS = 500; // VBMS recipient earns per message

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

// Slash commands available in the composer (Discord-like)
const SLASH_COMMANDS = [
  { cmd: '/b', icon: 'B', label: 'Bold text' },
  { cmd: '/i', icon: 'I', label: 'Italic text' },
  { cmd: '/link', icon: '🔗', label: 'Insert link' },
  { cmd: '/img', icon: '📷', label: 'Attach image' },
  { cmd: '/sound', icon: '🔊', label: 'Attach sound' },
  { cmd: '/cast', icon: '💬', label: 'Embed cast' },
  { cmd: '/app', icon: '🎮', label: 'Link miniapp' },
  { cmd: '/clear', icon: '🗑️', label: 'Clear message' },
] as const;



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
  const lines = normalizedMessage.split('\n');

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

      const linkIdx = linkMatch ? remaining.indexOf(linkMatch[0]) : -1;
      const boldIdx = boldMatch ? remaining.indexOf(boldMatch[0]) : -1;

      if (linkIdx === -1 && boldIdx === -1) {
        if (remaining) parts.push(<span key={`${lineIdx}-${keyIdx++}`}>{remaining}</span>);
        break;
      }

      if (linkIdx !== -1 && (boldIdx === -1 || linkIdx < boldIdx)) {
        if (linkIdx > 0) {
          parts.push(<span key={`${lineIdx}-${keyIdx++}`}>{remaining.slice(0, linkIdx)}</span>);
        }
        const [, linkText, linkUrl] = linkMatch!;
        parts.push(
          <button
            key={`${lineIdx}-${keyIdx++}`}
            onClick={async (e) => {
              e.stopPropagation();
              try {
                if (sdk?.actions?.openMiniApp) {
                  await sdk.actions.openMiniApp({ url: linkUrl });
                } else {
                  window.open(linkUrl, '_blank');
                }
              } catch {
                window.open(linkUrl, '_blank');
              }
            }}
            className="text-vintage-gold underline hover:text-yellow-400 font-bold transition-colors"
          >
            {linkText}
          </button>
        );
        remaining = remaining.slice(linkIdx + linkMatch![0].length);
      } else {
        if (boldIdx > 0) {
          parts.push(<span key={`${lineIdx}-${keyIdx++}`}>{remaining.slice(0, boldIdx)}</span>);
        }
        const [, boldText] = boldMatch!;
        parts.push(<strong key={`${lineIdx}-${keyIdx++}`} className="text-vintage-gold">{boldText}</strong>);
        remaining = remaining.slice(boldIdx + boldMatch![0].length);
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
  { id: 'suck-jones', name: 'Suck Jones', file: '/vibemail/suck-jones.mp4', isVideo: true },
  { id: 'neymar', name: 'Neymar', file: '/vibemail/neymar.png', isVideo: false },
] as const;

// Check if audio is a custom recording (vs predefined sound)
export function isCustomAudio(audioId: string | undefined): boolean {
  return audioId?.startsWith('custom:') || false;
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
  // Custom audio has no static file, needs to be fetched from Convex
  if (isCustomAudio(audioId)) return null;
  const sound = VIBEMAIL_SOUNDS.find(s => s.id === audioId);
  return sound?.file || null;
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
}

// VibeMail Inbox Component - Shows all messages for a card
export function VibeMailInbox({ cardFid, username, onClose, asPage }: VibeMailInboxProps) {
  const { lang } = useLanguage();
  const t = fidTranslations[lang];
  const { isMusicEnabled, setIsMusicEnabled } = useMusic();
  const messages = useQuery(api.cardVotes.getMessagesForCard, { cardFid, limit: 50 });
  const markAsRead = useMutation(api.cardVotes.markMessageAsRead);
  const [selectedMessage, setSelectedMessage] = useState<VibeMailMessage | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const convex = useConvex();

  // Get secretary for selected message
  const secretary = selectedMessage ? getSecretaryForMessage(selectedMessage._id) : VIBEMAIL_SECRETARIES[0];

  const handleOpenMessage = async (msg: VibeMailMessage) => {
    AudioManager.buttonClick();
    setSelectedMessage(msg);

    // Mark as read if not already
    if (!msg.isRead) {
      await markAsRead({ messageId: msg._id });
    }

    // Auto-play audio if exists (both predefined and custom)
    if (msg.audioId) {
      playAudioById(msg.audioId, audioRef, convex, setPlayingAudio);
    }
  };

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
    <div className={asPage
      ? "min-h-screen bg-vintage-dark"
      : "fixed inset-0 z-[350] flex items-center justify-center bg-black/90 p-4"
    }>
      <audio ref={audioRef} onEnded={() => setPlayingAudio(null)} />

      <div className={asPage
        ? "bg-vintage-charcoal p-4 w-full h-full flex flex-col"
        : "bg-vintage-charcoal border-2 border-vintage-gold rounded-2xl p-4 w-full max-w-md max-h-[calc(100vh-120px)] overflow-hidden flex flex-col"
      }>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <img
              src={secretary.image}
              alt={secretary.name}
              className="w-12 h-12 rounded-full border-2 border-vintage-gold"
            />
              <div>
              <h3 className="text-vintage-gold font-bold text-lg">{t.vibeMailTitle}</h3>
              <p className="text-vintage-ice/60 text-xs">
                {messages?.length || 0} {t.messagesCount}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopAudio();
              onClose();
            }}
            className="w-8 h-8 bg-vintage-black/50 border border-vintage-gold/30 rounded-full text-vintage-gold hover:bg-vintage-gold/20 transition-all"
          >
            X
          </button>
        </div>

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
            <div className="bg-gradient-to-b from-vintage-black/80 to-vintage-charcoal rounded-lg p-3 flex-1">
              <div className="text-white text-sm leading-relaxed mb-3">
                {selectedMessage.imageId ? (
                  renderMessageWithMedia(selectedMessage.message || "", selectedMessage.imageId, lang, username)
                ) : (
                  <>"{renderFormattedMessage(selectedMessage.message || "", lang, username)}"</>
                )}
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
                      {isCustomAudio(selectedMessage.audioId) ? <span className="flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg> Voice message</span> : (VIBEMAIL_SOUNDS.find(s => s.id === selectedMessage.audioId)?.name || t.memeSound)}
                    </p>
                    <p className="text-white/60 text-xs">
                      {playingAudio === selectedMessage.audioId ? t.playing : t.tapToPlay}
                    </p>
                  </div>
                </div>
              )}

              {/* Cast Embed */}
              {selectedMessage.castUrl && (
                <CastPreview castUrl={selectedMessage.castUrl} />
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

              {/* Vote Info */}
              <div className="mt-4 pt-3 border-t border-vintage-gold/20 flex items-center justify-between text-xs">
                <span className="text-white/60">
                  {new Date(selectedMessage.createdAt).toLocaleDateString()}
                </span>
                <span className={`font-bold ${selectedMessage.isPaid ? 'text-yellow-400' : 'text-vintage-gold'}`}>
                  +{selectedMessage.voteCount} {selectedMessage.isPaid ? t.paidVote : t.freeVote}
                </span>
              </div>
            </div>

            {/* Back Button */}
            <button
              onClick={() => {
                stopAudio();
                setSelectedMessage(null);
              }}
              className="mt-3 w-full py-2 bg-vintage-black border border-vintage-gold/30 text-vintage-gold rounded-lg hover:bg-vintage-gold/10"
            >
              Back to Inbox
            </button>
          </div>
        ) : (
          /* Message List */
          <div className="flex-1 overflow-y-auto space-y-2">
            {!messages || messages.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-white/60 text-sm">{t.noMessagesYet}</p>
                <p className="text-white/40 text-xs mt-1">
                  {t.messagesWillAppear}
                </p>
              </div>
            ) : (
              messages.map((msg: VibeMailMessage) => (
                <button
                  key={msg._id}
                  onClick={() => handleOpenMessage(msg)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    msg.isRead
                      ? 'bg-[#1a1a1a] border-[#333] hover:border-[#555]'
                      : 'bg-vintage-black/60 border-vintage-gold/60 hover:bg-vintage-black/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${msg.isRead ? 'bg-vintage-ice/30' : 'bg-vintage-gold animate-pulse'}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${msg.isRead ? 'text-white/60' : 'text-white font-bold'}`}>
                        {msg.message?.slice(0, 50)}...
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {msg.audioId && (
                          <span className="text-xs text-vintage-burnt-gold">{t.hasAudio}</span>
                        )}
                        <span className="text-xs text-white/40">
                          {new Date(msg.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <span className={`text-xs font-bold ${msg.isPaid ? 'text-yellow-400' : 'text-white/50'}`}>
                      +{msg.voteCount}
                    </span>
                  </div>
                </button>
              ))
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
  const [msgPage, setMsgPage] = useState(0);
  const [showPurposeModal, setShowPurposeModal] = useState(false);
  const [composerQuestType, setComposerQuestType] = useState<string | null>(null);
  const [composerFollowTarget, setComposerFollowTarget] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
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
  const [composerAudioId, setComposerAudioId] = useState<string | null>(null);
  const [recipientFid, setRecipientFid] = useState<number | null>(null);
  const [recipientUsername, setRecipientUsername] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showSoundPicker, setShowSoundPicker] = useState(false);
  const [previewSound, setPreviewSound] = useState<string | null>(null);
  const [composerImageId, setComposerImageId] = useState<string | null>(null);
  const [showImagePicker, setShowImagePicker] = useState(false);
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

  // VibeMail Stats
  const vibeMailStats = useQuery(
    api.cardVotes.getVibeMailStats,
    myFid ? { fid: myFid } : 'skip'
  );

  // Debug: Log VibeMail stats
  console.log('[VibeMail] myFid:', myFid, 'stats:', vibeMailStats);

  // VBMS Balance for Need More button
  const { balance: vbmsBalance } = useVBMSBalance(myAddress as `0x${string}` | undefined);
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

  // Slash command picker state
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashFilter, setSlashFilter] = useState('');

  // Generate upload URL for custom images (same storage as AudioRecorder)
  const generateUploadUrl = useMutation(api.audioStorage.generateUploadUrl);

  // Query to get recipient address (kept for compat)
  const targetFidForGift = recipientFid || replyToFid;
  const recipientCard = useQuery(
    api.farcasterCards.getFarcasterCardByFid,
    targetFidForGift ? { fid: targetFidForGift } : 'skip'
  );

  // TX hook for VibeMail (free vote = 0 VBMS but requires TX signature)
  const { transfer: transferVBMS, isPending: isTransferPending } = useTransferVBMS();

  // Free VibeMail limit (uses same system as voting)
  const freeVotesRemaining = useQuery(
    api.cardVotes.getUserFreeVotesRemaining,
    myFid ? { voterFid: myFid } : 'skip'
  );
  const hasFreeVotes = (freeVotesRemaining?.remaining ?? 0) > 0;

  const searchResults = useQuery(
    api.cardVotes.searchCardsForVibeMail,
    searchQuery.length >= 2 ? { searchTerm: searchQuery, limit: 5 } : 'skip'
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

    if (!msg.isRead) {
      await markAsRead({ messageId: msg._id });
    }

    if (msg.audioId) {
      playAudioById(msg.audioId, audioRef, convex, setPlayingAudio);
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlayingAudio(null);
  };

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
    try {
      if (!hasFreeVotes) {
        await transferVBMS(CONTRACTS.VBMSPoolTroll as `0x${string}`, parseEther(VIBEMAIL_COST_VBMS));
      }
      if (isReply && origMsgId) {
        await replyMutation({
          originalMessageId: origMsgId,
          senderFid: myFid,
          senderAddress: myAddress,
          senderUsername: username || undefined,
          senderPfpUrl: userPfpUrl || undefined,
          message: composerMessage,
          audioId: composerAudioId || undefined,
          imageId: composerImageId || undefined,
          miniappUrl: composerMiniappUrl || undefined,
        });
      } else {
        await sendDirectMutation({
          recipientFid: recipFid,
          senderFid: myFid,
          senderAddress: myAddress,
          senderUsername: username || undefined,
          senderPfpUrl: userPfpUrl || undefined,
          message: composerMessage,
          audioId: composerAudioId || undefined,
          imageId: composerImageId || undefined,
          castUrl: composerCastUrl || undefined,
          miniappUrl: composerMiniappUrl || undefined,
        });
      }
      haptics.send();
      setSendSuccess({ recipient: recipUsername, timestamp: Date.now() });
      setTimeout(() => setSendSuccess(null), 3000);
      setShowComposer(false);
      setComposerMessage('');
      setComposerAudioId(null);
      setComposerImageId(null);
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
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value.slice(0, 200);
    setComposerMessage(val);
    const cursorPos = e.target.selectionStart ?? val.length;
    const textBeforeCursor = val.slice(0, cursorPos);
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
        setComposerMessage((before + after).slice(0, 200));
        setShowImagePicker(true); setShowSoundPicker(false); setShowCastInput(false); setShowMiniappInput(false);
        break;
      case '/sound':
        setComposerMessage((before + after).slice(0, 200));
        setShowSoundPicker(true); setShowImagePicker(false); setShowCastInput(false); setShowMiniappInput(false);
        break;
      case '/cast':
        setComposerMessage((before + after).slice(0, 200));
        setShowCastInput(true); setShowSoundPicker(false); setShowImagePicker(false); setShowMiniappInput(false);
        break;
      case '/app':
        setComposerMessage((before + after).slice(0, 200));
        setShowMiniappInput(true); setShowSoundPicker(false); setShowImagePicker(false); setShowCastInput(false);
        break;
    }
    setSlashMenuOpen(false);
  };

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
      inline ? "w-full"
      : asPage ? "min-h-screen bg-vintage-dark"
      : "fixed inset-0 z-[350] flex items-center justify-center bg-black/90 p-4"
    }>
      <audio ref={audioRef} onEnded={() => setPlayingAudio(null)} />

      <div
        style={{ colorScheme: 'dark' }}
        className={
          inline ? "bg-[#111] w-full flex flex-col p-3 min-h-[calc(100dvh-110px)]"
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

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <img
              src={userPfpUrl || farcasterContext?.user?.pfpUrl || secretary.image}
              alt={username || 'User'}
              className="w-12 h-12 rounded-full border-2 border-black shadow-[2px_2px_0px_#000]"
            />
              <div>
              <h3 className="text-white font-black text-base">
                {username ? `@${username}` : 'Messages'}
              </h3>
              <p className="text-[#9945FF] text-[10px] font-bold uppercase tracking-widest">VibeMail</p>
              <p className="text-white/40 text-[10px]">
                {messages?.length || 0} {t.messagesCount}
              </p>
              {/* VibeMail Stats - Always show sent/received */}
              <div className="flex gap-3 text-[10px] mt-1">
                <span className="text-green-400 flex items-center gap-1">
                  <span>↓</span> {vibeMailStats?.totalVbmsReceived || 0} VBMS
                </span>
                <span className="text-red-400 flex items-center gap-1">
                  <span>↑</span> {vibeMailStats?.totalVbmsSent || 0} VBMS
                </span>
                {pendingVbms > 0 && (
                  <span className="text-vintage-gold flex items-center gap-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
                    {pendingVbms}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {myFid && myAddress && (
              <button
                onClick={() => {
                  AudioManager.buttonClick();
                  setShowPurposeModal(true);
                  setReplyToMessageId(null);
                }}
                className="w-8 h-8 bg-vintage-gold text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center"
                title="New VibeMail"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                  <line x1="12" y1="13" x2="12" y2="6"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Tabs - Msgs/Sent/Quests/Wanted */}
        {myFid && !selectedMessage && !showComposer && (
          <div className="flex gap-1 mb-3">
            <button
              onClick={() => setActiveTab('inbox')}
              className="flex-1 py-2 text-xs font-bold border-2 border-black transition-all shadow-[2px_2px_0px_#000]"
              style={{
                background: activeTab === 'inbox' ? '#2563EB' : '#0f204a',
                color: '#fff',
              }}
            >
              <span className="flex items-center justify-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
                Msgs
              </span>
            </button>
            <button
              onClick={() => setActiveTab('sent')}
              className="flex-1 py-2 text-xs font-bold border-2 border-black transition-all shadow-[2px_2px_0px_#000]"
              style={{
                background: activeTab === 'sent' ? '#EA580C' : '#4a2000',
                color: '#fff',
              }}
            >
              <span className="flex items-center justify-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                Sent
              </span>
            </button>
            <button
              onClick={() => setActiveTab('quests')}
              className="flex-1 py-2 text-xs font-bold border-2 border-black transition-all shadow-[2px_2px_0px_#000]"
              style={{
                background: activeTab === 'quests' ? '#16A34A' : '#0f3a1a',
                color: activeTab === 'quests' ? '#000' : '#fff',
              }}
            >
              <span className="flex items-center justify-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Quests
              </span>
            </button>
          </div>
        )}

        {/* Purpose Chooser Modal */}
        {showPurposeModal && !showComposer && myFid && myAddress && (
          <div className="fixed inset-0 z-[500] bg-[#0a0a0a] flex flex-col" style={{ colorScheme: 'dark' }}>
            <div className="p-4 border-b-2 border-[#FFD400] flex items-center justify-between flex-shrink-0">
              <button onClick={() => setShowPurposeModal(false)} className="w-8 h-8 bg-[#1a1a1a] border-2 border-[#444] text-white font-black shadow-[2px_2px_0px_#000] flex items-center justify-center">X</button>
              <h3 className="text-[#FFD400] font-black text-sm uppercase tracking-widest">What's your goal?</h3>
              <div className="w-8" />
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <p className="text-white/40 text-[10px] text-center mb-3">Choose the type of message to send</p>
              {/* Just a Message */}
              <button
                onClick={() => { AudioManager.buttonClick(); setComposerMessage(''); setComposerQuestType(null); setShowPurposeModal(false); setShowComposer(true); }}
                className="w-full p-4 bg-[#1a1a1a] border-2 border-[#444] flex items-center gap-3 hover:border-[#FFD400] hover:bg-[#222] transition-all shadow-[3px_3px_0px_#000] text-left mb-3"
              >
                <span className="text-3xl">📨</span>
                <div className="flex-1">
                  <p className="text-white font-black text-sm">Just a Message</p>
                  <p className="text-white/50 text-xs">Free-form, no quest attached</p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFD400" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
              {/* Divider */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 h-px bg-[#333]" />
                <span className="text-white/30 text-[10px] font-bold uppercase tracking-widest">Message + Quest</span>
                <div className="flex-1 h-px bg-[#333]" />
              </div>
              {/* Quest type options */}
              <div className="space-y-2">
                {QUEST_PURPOSES.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      AudioManager.buttonClick();
                      const target = username || '';
                      const filledTemplate = opt.questType === 'follow_me' && target
                        ? opt.template.replace(/@\[your-username\]/g, `@${target}`)
                        : opt.template;
                      setComposerMessage(filledTemplate);
                      setComposerQuestType(opt.questType);
                      if (opt.questType === 'follow_me') setComposerFollowTarget(target);
                      if (opt.questType === 'rt_cast') { setShowCastInput(true); setCastInputValue(''); setComposerCastUrl(null); }
                      setShowPurposeModal(false);
                      setShowComposer(true);
                    }}
                    className="w-full p-3 bg-[#1a1a1a] border-2 border-[#333] flex items-center gap-3 hover:border-[#FFD400] hover:bg-[#222] transition-all shadow-[2px_2px_0px_#000] text-left"
                  >
                    <span className="text-2xl w-8 text-center flex-shrink-0">{opt.id === 'cast_engage' ? '🔁❤️' : opt.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm">{opt.label}</p>
                      <p className="text-white/50 text-xs">{opt.shortDesc}</p>
                    </div>
                    <svg className="flex-shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFD400" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                ))}
              </div>
              <p className="text-white/20 text-[10px] text-center pt-4">Create the quest in Quests tab first, then send this message to promote it</p>
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
                <p className="text-[#FFD400] font-bold text-sm">
                  {vbmsBalance ? parseFloat(vbmsBalance).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0'} VBMS
                </p>
              </div>
              <button
                onClick={() => { AudioManager.buttonClick(); setShowDexModal(true); }}
                className="text-[#FFD400]/70 text-[10px] hover:text-[#FFD400] transition-colors border border-[#FFD400]/30 px-2 py-1"
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
                <div className="mb-2 p-2 bg-[#0a0a0a] border-2 border-[#FFD400] flex items-start gap-2">
                  <span className="text-base flex-shrink-0">{purpose.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#FFD400] font-black text-[10px] uppercase tracking-wide">{purpose.label}</p>
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
              <div className="mb-2 flex items-center gap-2 bg-[#0a0a0a] border-2 border-[#444] px-3 py-2 focus-within:border-[#FFD400]">
                <span className="text-white/40 text-xs flex-shrink-0">Follow target:</span>
                <span className="text-[#FFD400] text-xs font-bold flex-shrink-0">@</span>
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
                  <p className="text-vintage-gold text-xs font-bold mb-2 flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2"/><circle cx="8" cy="8" r="1" fill="currentColor"/><circle cx="16" cy="8" r="1" fill="currentColor"/><circle cx="8" cy="16" r="1" fill="currentColor"/><circle cx="16" cy="16" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg> {(t as any).vibemailQuickRandom || 'Quick Random Select'}</p>
                  <div className="flex items-center gap-2">
                    <select
                      value={randomQuantity}
                      onChange={(e) => setRandomQuantity(Number(e.target.value))}
                      className="flex-1 bg-[#111] border-2 border-[#444] px-2 py-2 text-white text-sm focus:outline-none focus:border-[#FFD400]"
                      style={{ colorScheme: 'dark' }}
                    >
                      <option value={5}>5 {(t as any).vibemailPeople || 'people'}</option>
                      <option value={10}>10 {(t as any).vibemailPeople || 'people'}</option>
                      <option value={25}>25 {(t as any).vibemailPeople || 'people'}</option>
                      <option value={50}>50 {(t as any).vibemailPeople || 'people'}</option>
                      <option value={100}>100 {(t as any).vibemailPeople || 'people'}</option>
                      <option value={250}>250 {(t as any).vibemailPeople || 'people'}</option>
                      <option value={500}>500 {(t as any).vibemailPeople || 'people'}</option>
                    </select>
                    <button
                      onClick={autoFillRandomList}
                      disabled={isLoadingRandom}
                      className="px-4 py-2 bg-[#FFD400] text-black font-bold rounded-sm border-2 border-black shadow-[3px_3px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-none disabled:opacity-50 text-sm"
                    >
                      {isLoadingRandom
                        ? <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 inline animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                        : <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2"/><circle cx="8" cy="8" r="1" fill="currentColor"/><circle cx="16" cy="8" r="1" fill="currentColor"/><circle cx="8" cy="16" r="1" fill="currentColor"/><circle cx="16" cy="16" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>
                      } {(t as any).vibemailAutoSelect || 'Select'}
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
                        <span key={r.fid} className="inline-flex items-center gap-1 bg-[#FFD400] border border-black px-2 py-0.5 text-xs text-black font-bold">
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
                  <p className="text-white/60 text-[10px] mb-1">{(t as any).vibemailOrManual || 'Or add manually:'}</p>
                  {randomCard ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2"/><circle cx="8" cy="8" r="1" fill="currentColor"/><circle cx="16" cy="8" r="1" fill="currentColor"/><circle cx="8" cy="16" r="1" fill="currentColor"/><circle cx="16" cy="16" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>
                          <div>
                          <p className="text-[#FFD400] font-bold text-xs">@{randomCard.username}</p>
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
                    <span className="flex items-center justify-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> {((t as any).vibemailReadyToSend || 'Ready to send to {count} people').replace('{count}', String(randomList.length))} = {randomList.length * 1000} VBMS</span>
                  </p>
                )}
              </div>
            )}

            {/* Broadcast Recipients (multiple selection) */}
            {sendMode === 'broadcast' && !replyToMessageId && (
              <div className="mb-3">
                <div className="flex flex-wrap gap-1 mb-2 max-h-24 overflow-y-auto">
                  {broadcastRecipients.map(r => (
                    <span key={r.fid} className="inline-flex items-center gap-1 bg-[#FFD400] border border-black px-2 py-1 text-xs text-black font-bold">
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
                      placeholder={t.vibemailSearchPlayers || "Search to add recipients..."}
                      className="w-full bg-[#111] border-2 border-[#444] px-3 py-2 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-[#FFD400]"
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
                            className="w-full text-left px-3 py-2 hover:bg-[#FFD400]/20 text-white text-sm border-b border-white/10 last:border-0"
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
              <div className="mb-3">
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
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by username or FID..."
                      className="w-full bg-[#111] border-2 border-[#444] px-3 py-2 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-[#FFD400]"
                      style={{ colorScheme: 'dark', WebkitTextFillColor: 'white' }}
                    />
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
                            className="w-full text-left px-3 py-2 hover:bg-[#FFD400]/20 text-white text-sm border-b border-white/10 last:border-0"
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
                  <div className="absolute bottom-full left-0 right-0 mb-1 bg-[#1a1a1a] border-2 border-[#FFD400]/60 z-50 shadow-[4px_4px_0px_#000]">
                    <div className="px-2 py-1 border-b border-[#333] flex items-center gap-1">
                      <span className="text-[#FFD400] text-[10px] font-bold uppercase tracking-wider">Commands</span>
                    </div>
                    {filtered.map((cmd) => (
                      <button
                        key={cmd.cmd}
                        onMouseDown={(e) => { e.preventDefault(); handleSlashSelect(cmd.cmd); }}
                        className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-[#FFD400]/10 border-b border-[#333] last:border-0 transition-colors"
                        style={{ WebkitTextFillColor: 'white', color: 'white' }}
                      >
                        <span className="w-5 text-center text-sm">{cmd.icon}</span>
                        <span className="text-[#FFD400] text-sm font-mono font-bold">{cmd.cmd}</span>
                        <span className="text-white/50 text-xs">{cmd.label}</span>
                      </button>
                    ))}
                  </div>
                ) : null;
              })()}
              <textarea
                ref={textareaRef}
                value={composerMessage}
                onChange={handleMessageChange}
                onKeyDown={(e) => { if (e.key === 'Escape') setSlashMenuOpen(false); }}
                placeholder="Write your message... (type / for commands)"
                className="w-full bg-[#0a0a0a] border-2 border-[#444] px-3 py-2 text-white text-xs placeholder:text-white/30 focus:outline-none resize-none h-20 min-h-[80px]"
                style={{ colorScheme: 'dark', WebkitTextFillColor: 'white', color: 'white' }}
              />
            </div>
            <p className="text-[#FFD400]/50 text-[10px] mb-1">Type / for commands · **bold** · *italic* · [text](url)</p>

            {/* Voice Recorder - only show if no meme sound selected */}
            {!composerAudioId || isCustomAudio(composerAudioId || undefined) ? (
              <div className="mt-2">
                <AudioRecorder
                  onAudioReady={(id) => setComposerAudioId(id)}
                  onClear={() => setComposerAudioId(null)}
                  currentAudioId={isCustomAudio(composerAudioId || undefined) ? composerAudioId : null}
                />
              </div>
            ) : (
              <div className="mt-2 p-2 bg-vintage-gold/10 border border-vintage-gold/30 rounded-lg flex items-center justify-between">
                <span className="text-white text-sm flex items-center gap-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                  Meme sound selected
                </span>
                <button
                  onClick={() => setComposerAudioId(null)}
                  className="text-red-400 text-xs hover:text-red-300"
                >Clear</button>
              </div>
            )}

            {/* Attachment panels - shown above toolbar when active */}
            <audio ref={composerAudioRef} onEnded={() => setPreviewSound(null)} />

            {showSoundPicker && !isCustomAudio(composerAudioId || undefined) && (
              <div className="mt-2 bg-[#1a1a1a] border border-[#FFD400]/20 p-2">
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                  {VIBEMAIL_SOUNDS.map((sound) => (
                    <button
                      key={sound.id}
                      onClick={() => {
                        if (composerAudioRef.current) {
                          if (previewSound === sound.id) {
                            composerAudioRef.current.pause();
                            setPreviewSound(null);
                          } else {
                            composerAudioRef.current.src = sound.file;
                            composerAudioRef.current.play().catch(console.error);
                            setPreviewSound(sound.id);
                          }
                        }
                        setComposerAudioId(composerAudioId === sound.id ? null : sound.id);
                      }}
                      className={`p-2 border-2 text-xs transition-all flex items-center gap-2 font-bold ${
                        composerAudioId === sound.id
                          ? 'bg-[#FFD400]/20 border-[#FFD400] text-[#FFD400] shadow-[0_0_8px_rgba(255,212,0,0.2)]'
                          : 'bg-[#1a1200] border-[#FFD400]/50 text-[#FFD400]/80 hover:border-[#FFD400] hover:text-[#FFD400] hover:bg-[#FFD400]/10'
                      }`}
                    >
                      <span>{previewSound === sound.id ? '⏹' : '▶'}</span>
                      <span className="truncate">{sound.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showImagePicker && (
              <div className="mt-2 bg-[#1a1a1a] border border-[#FFD400]/20 p-2">
                {/* Custom image upload */}
                <input
                  type="file"
                  accept="image/*"
                  ref={imageUploadRef}
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setIsUploadingImage(true);
                    try {
                      const uploadUrl = await generateUploadUrl();
                      const res = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': file.type }, body: file });
                      if (!res.ok) throw new Error('Upload failed');
                      const { storageId } = await res.json();
                      setComposerImageId(`img:${storageId}`);
                      setComposerCustomImagePreview(URL.createObjectURL(file));
                      setShowImagePicker(false);
                    } catch (err) { console.error('Image upload error:', err); }
                    finally { setIsUploadingImage(false); e.target.value = ''; }
                  }}
                />
                <button
                  onClick={() => imageUploadRef.current?.click()}
                  disabled={isUploadingImage}
                  className="w-full mb-2 py-1.5 bg-[#1a1a1a] border border-[#FFD400]/30 text-white text-xs flex items-center justify-center gap-2 hover:border-[#FFD400]/60 disabled:opacity-50"
                  style={{ WebkitTextFillColor: 'white' }}
                >
                  {isUploadingImage ? (
                    <span>Uploading...</span>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      Upload image
                    </>
                  )}
                </button>
                <div className="grid grid-cols-4 gap-2">
                  {VIBEMAIL_IMAGES.map((img) => (
                    <button
                      key={img.id}
                      onClick={() => { setComposerImageId(composerImageId === img.id ? null : img.id); setComposerCustomImagePreview(null); }}
                      className={`p-1 border transition-all ${
                        composerImageId === img.id
                          ? 'border-vintage-gold bg-vintage-gold/20'
                          : 'border-vintage-gold/20 hover:border-vintage-gold/50'
                      }`}
                    >
                      {img.isVideo ? (
                        <video src={img.file} className="w-full h-10 object-cover" muted loop autoPlay playsInline />
                      ) : (
                        <img src={img.file} alt={img.name} className="w-full h-10 object-cover" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showCastInput && composerQuestType !== 'miniapp' && (
              <div className="mt-2 bg-[#1a1a1a] border border-[#FFD400]/20 p-2">
                <input
                  type="text"
                  value={castInputValue}
                  onChange={(e) => {
                    setCastInputValue(e.target.value);
                    const val = e.target.value.trim();
                    if (val.startsWith('https://warpcast.com/') || val.startsWith('https://www.warpcast.com/')) {
                      setComposerCastUrl(val);
                    } else {
                      setComposerCastUrl(null);
                    }
                  }}
                  placeholder="https://warpcast.com/..."
                  className="w-full bg-[#0A0A0A] border-2 border-[#444] text-white px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-[#9945FF]"
                  style={{ colorScheme: 'dark', WebkitTextFillColor: 'white', color: 'white' }}
                />
                {composerCastUrl && <CastPreview castUrl={composerCastUrl} compact />}
              </div>
            )}

            {showMiniappInput && (
              <div className="mt-2 bg-[#1a1a1a] border border-[#FFD400]/20 p-2">
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
                  className="w-full bg-[#0A0A0A] border-2 border-[#444] text-white px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-[#22C55E]"
                  style={{ colorScheme: 'dark', WebkitTextFillColor: 'white', color: 'white' }}
                />
                {composerMiniappUrl && (
                  <MiniappPreview url={composerMiniappUrl} />
                )}
              </div>
            )}

            {/* Bottom toolbar */}
            <div className="flex items-center gap-1 border-t-2 border-[#333] pt-2 mt-2">
              {/* Aa - VERMELHO */}
              <button
                onClick={handleFormatBold}
                className="w-9 h-9 flex items-center justify-center border-2 border-[#DC2626] bg-[#DC2626] text-white hover:bg-[#B91C1C] transition-all font-black text-sm"
                style={{ WebkitTextFillColor: 'white' }}
                title="Bold"
              >
                Aa
              </button>

              {/* Som - LARANJA */}
              {!isCustomAudio(composerAudioId || undefined) && (
                <button
                  onClick={() => { setShowSoundPicker(!showSoundPicker); setShowImagePicker(false); setShowCastInput(false); setShowMiniappInput(false); }}
                  className={`w-9 h-9 flex items-center justify-center border-2 transition-all ${
                    (composerAudioId && !isCustomAudio(composerAudioId)) || showSoundPicker
                      ? 'border-[#C2410C] bg-[#C2410C] text-white'
                      : 'border-[#EA580C] bg-[#EA580C] text-white hover:bg-[#C2410C]'
                  }`}
                  style={{ WebkitTextFillColor: 'white' }}
                  title="Sound"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                </button>
              )}

              {/* Imagem - VIOLETA escuro */}
              <button
                onClick={() => { setShowImagePicker(!showImagePicker); setShowSoundPicker(false); setShowCastInput(false); setShowMiniappInput(false); }}
                className={`w-9 h-9 flex items-center justify-center border-2 transition-all ${
                  composerImageId || showImagePicker
                    ? 'border-[#5B21B6] bg-[#5B21B6] text-white'
                    : 'border-[#7C3AED] bg-[#7C3AED] text-white hover:bg-[#5B21B6]'
                }`}
                style={{ WebkitTextFillColor: 'white' }}
                title="Image"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              </button>

              {/* Cast - AZUL */}
              {composerQuestType !== 'miniapp' && (
                <button
                  onClick={() => { setShowCastInput(!showCastInput); if (showCastInput) { setComposerCastUrl(null); setCastInputValue(''); } setShowSoundPicker(false); setShowImagePicker(false); setShowMiniappInput(false); }}
                  className={`w-9 h-9 flex items-center justify-center border-2 transition-all ${
                    composerCastUrl || showCastInput
                      ? 'border-[#1D4ED8] bg-[#1D4ED8] text-white'
                      : 'border-[#2563EB] bg-[#2563EB] text-white hover:bg-[#1D4ED8]'
                  }`}
                  style={{ WebkitTextFillColor: 'white' }}
                  title="Farcaster cast"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </button>
              )}

              {/* Miniapp - VERDE */}
              <button
                onClick={() => { setShowMiniappInput(!showMiniappInput); if (showMiniappInput) { setComposerMiniappUrl(null); setMiniappInputValue(''); } setShowSoundPicker(false); setShowImagePicker(false); setShowCastInput(false); }}
                className={`w-9 h-9 flex items-center justify-center border-2 transition-all ${
                  composerMiniappUrl || showMiniappInput
                    ? 'border-[#15803D] bg-[#15803D] text-white'
                    : 'border-[#16A34A] bg-[#16A34A] text-white hover:bg-[#15803D]'
                }`}
                style={{ WebkitTextFillColor: 'white' }}
                title="Miniapp link"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6v6H9z"/></svg>
              </button>

              {/* Preview - ROSA/PINK */}
              {(composerMessage.trim() || composerImageId) && (
                <button
                  onClick={() => setShowPreview(true)}
                  className="w-9 h-9 flex items-center justify-center border-2 border-[#DB2777] bg-[#DB2777] text-white hover:bg-[#BE185D] transition-all"
                  style={{ WebkitTextFillColor: 'white' }}
                  title="Preview"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              )}

              {/* Spacer */}
              <div className="flex-1" />

              {/* Character count */}
              <span className="text-white/30 text-[10px] mr-1">{composerMessage.length}/200</span>
            </div>


            {/* Preview - full-screen overlay */}
            {showPreview && (
              <div className="fixed inset-0 z-[600] bg-[#0a0a0a] flex flex-col" style={{ colorScheme: 'dark', color: 'white' }}>
                {/* Header */}
                <div className="flex items-center justify-between p-3 border-b-2 border-[#FFD400]">
                  <p className="text-[#FFD400] font-black text-sm uppercase tracking-widest">Preview</p>
                  <button onClick={() => setShowPreview(false)} className="text-white/60 hover:text-white text-xs border border-[#444] px-2 py-1">
                    Edit
                  </button>
                </div>
                {/* Content - scrollable */}
                <div className="flex-1 overflow-y-auto p-3">
                  <div className="bg-[#FFD400]/15 border-2 border-black p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full bg-[#FFD400] animate-pulse flex-shrink-0" />
                      <p className="text-white font-bold text-sm truncate">@{username || 'you'}</p>
                      <span className="ml-auto text-white/40 text-xs">Just now</span>
                    </div>
                    <p className="text-white/90 text-sm whitespace-pre-wrap leading-relaxed">{composerMessage || '(no text)'}</p>
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
                            <img src={composerCustomImagePreview} alt="Custom" className="max-w-full max-h-48 object-contain border border-[#FFD400]/30" />
                          ) : (
                            <p className="text-[#FFD400]/70 text-xs">Custom image attached</p>
                          )
                        ) : (() => {
                          const imgData = getImageFile(composerImageId);
                          return imgData ? (
                            imgData.isVideo ? (
                              <video src={imgData.file} className="max-w-full max-h-48 object-contain border border-[#FFD400]/30" autoPlay loop muted playsInline />
                            ) : (
                              <img src={imgData.file} alt="Attachment" className="max-w-full max-h-48 object-contain border border-[#FFD400]/30" />
                            )
                          ) : (
                            <p className="text-[#FFD400]/70 text-xs">Image attached</p>
                          );
                        })()}
                      </div>
                    )}
                    <div className="mt-3 text-right">
                      <span className="text-[#FFD400] text-sm font-bold">+{hasFreeVotes ? 0 : 100} VBMS</span>
                    </div>
                  </div>
                </div>
                {/* Bottom */}
                <div className="p-3 border-t-2 border-[#333]">
                  <button
                    onClick={() => setShowPreview(false)}
                    className="w-full py-3 bg-[#1a1a1a] border-2 border-[#444] text-white font-bold text-sm hover:border-[#FFD400] transition-all"
                  >
                    Back to Edit
                  </button>
                </div>
              </div>
            )}

            {/* Next Button - Opens gift modal first, then sends everything */}
            <button
              onClick={async () => {
                if (isSending || isTransferPending) return;
                if (!composerMessage.trim() && !composerImageId) return;
                if (!myAddress || !myFid) return;

                // For replies - send directly
                if (replyToMessageId && replyToFid) {
                  await handleDirectSend(replyToFid, 'sender', true, replyToMessageId);
                  return;
                }

                // BROADCAST MODE - send to multiple recipients (costs 100 VBMS per recipient)
                if (sendMode === 'broadcast' && broadcastRecipients.length > 0) {
                  const totalCost = BigInt(broadcastRecipients.length) * parseEther(VIBEMAIL_COST_VBMS);
                  setIsSending(true);
                  setBroadcastResult(null);
                  try {
                    // Transfer VBMS to contract (payment for broadcast)
                    const txHash = await transferVBMS(CONTRACTS.VBMSPoolTroll, totalCost);
                    if (!txHash) {
                      console.error('Broadcast payment failed');
                      setBroadcastResult({ success: false, sent: 0, total: broadcastRecipients.length, failed: broadcastRecipients.length });
                      setIsSending(false);
                      return;
                    }
                    console.log('Broadcast payment TX:', txHash);

                    // Send broadcast after payment
                    const result = await broadcastMutation({
                      recipientFids: broadcastRecipients.map(r => r.fid),
                      message: composerMessage,
                      audioId: composerAudioId || undefined,
                      imageId: composerImageId || undefined,
                      senderAddress: myAddress,
                      senderFid: myFid,
                    });
                    console.log('Broadcast result:', result);
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
                      imageId: composerImageId || undefined,
                      senderAddress: myAddress,
                      senderFid: myFid,
                    });
                    setBroadcastResult({ success: result.success, sent: result.sent, total: result.total, failed: result.failed });
                    setShowComposer(false);
                    setSendMode('single');
                    setRandomList([]);
                    setComposerMessage('');
                    setComposerAudioId(null);
                    setComposerImageId(null);
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
              disabled={isSending || isTransferPending || (!composerMessage.trim() && !composerImageId) || (!replyToMessageId && sendMode === 'single' && !recipientFid) || (sendMode === 'broadcast' && broadcastRecipients.length === 0) || (sendMode === 'random' && !randomCard && randomList.length === 0)}
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
                  {t.vibemailSendTo.replace('{count}', String(broadcastRecipients.length)).replace('{cost}', String(broadcastRecipients.length * 1000))}
                </span>
              ) : sendMode === 'random' ? (
                <span className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>
                  {randomList.length > 0
                    ? `${(t.vibemailSendToList || 'Send to List ({count})').replace('{count}', String(randomList.length))} (${randomList.length * 1000} VBMS)`
                    : t.vibemailRandomCost}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  Send
                </span>
              )}
            </button>
            </div>
          </div>
        )}

        {/* Selected Message View */}
        {selectedMessage ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Secretary Header - Compact */}
            <div className="bg-vintage-black/50 border-2 border-black shadow-[2px_2px_0px_#000] p-2 mb-2 flex items-center gap-2">
              <img
                src={secretary.image}
                alt={secretary.name}
                className="w-10 h-10 rounded-full border-2 border-black shadow-[1px_1px_0px_#000]"
              />
              <p className="text-vintage-gold font-bold text-xs uppercase tracking-wide">
                {secretary.name} {t.secretaryInterceptedMessage}
              </p>
            </div>

            {/* Message Content */}
            <div className="bg-[#0a0a0a] border-2 border-black p-3 flex-1 overflow-y-auto">
              {/* Sender info */}
              {(selectedMessage.voterUsername || selectedMessage.voterFid) && !selectedMessage.isSent && (
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
                  <div className="w-6 h-6 rounded-full bg-[#FFD400] flex items-center justify-center text-[10px] font-black text-black flex-shrink-0">
                    {selectedMessage.voterUsername ? selectedMessage.voterUsername[0].toUpperCase() : '?'}
                  </div>
                  <div>
                    <p className="text-[#FFD400] font-bold text-xs">
                      {selectedMessage.voterUsername ? `@${selectedMessage.voterUsername}` : `FID #${selectedMessage.voterFid}`}
                    </p>
                    <p className="text-white/30 text-[9px]">{new Date(selectedMessage.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              )}
              <div className="text-white text-sm leading-relaxed mb-3">
                {selectedMessage.imageId ? (
                  renderMessageWithMedia(selectedMessage.message || "", selectedMessage.imageId, lang, username)
                ) : (
                  <>{renderFormattedMessage(selectedMessage.message || "", lang, username)}</>
                )}
              </div>

              {selectedMessage.audioId && (
                <div className="border-2 border-black shadow-[2px_2px_0px_#000] p-2 flex items-center gap-2 bg-vintage-black/50">
                  <button
                    onClick={() => {
                      if (playingAudio === selectedMessage.audioId) {
                        stopAudio();
                      } else {
                        playAudioById(selectedMessage.audioId!, audioRef, convex, setPlayingAudio);
                      }
                    }}
                    className={`w-8 h-8 border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000] transition-all ${
                      playingAudio === selectedMessage.audioId
                        ? 'bg-red-500 text-white'
                        : 'bg-vintage-gold text-black'
                    }`}
                  >
                    {playingAudio === selectedMessage.audioId ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    )}
                  </button>
                  <div className="flex-1">
                    <p className="text-vintage-gold font-bold text-xs flex items-center gap-1">
                      {isCustomAudio(selectedMessage.audioId) ? (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                          Voice message
                        </>
                      ) : (VIBEMAIL_SOUNDS.find(s => s.id === selectedMessage.audioId)?.name || t.memeSound)}
                    </p>
                    <p className="text-white/60 text-[10px]">
                      {playingAudio === selectedMessage.audioId ? t.playing : t.tapToPlay}
                    </p>
                  </div>
                </div>
              )}

              {/* Miniapp Rich Preview */}
              {selectedMessage.miniappUrl && (
                <MiniappPreview url={selectedMessage.miniappUrl} />
              )}

              {/* NFT Gift Display */}
              {selectedMessage.giftNftImageUrl && (
                <div
                  onClick={() => {
                    const url = getMarketplaceUrl(selectedMessage.giftNftCollection);
                    if (url) openMarketplace(url, sdk, true);
                  }}
                  className="mt-3 bg-[#111] border-2 border-black shadow-[2px_2px_0px_#000] p-2 flex items-center gap-3 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000] transition-all cursor-pointer"
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={selectedMessage.giftNftImageUrl}
                      alt={selectedMessage.giftNftName || 'NFT Gift'}
                      className="w-12 h-12 object-cover border-2 border-black"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder.png';
                      }}
                    />
                    <div className="absolute -top-1 -right-1 bg-vintage-gold border border-black w-4 h-4 flex items-center justify-center">
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-vintage-gold font-bold text-xs truncate">{selectedMessage.giftNftName}</p>
                    <p className="text-white/60 text-[10px]">{selectedMessage.giftNftCollection}</p>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                </div>
              )}

              <div className="mt-2 pt-2 border-t-2 border-black/30 flex items-center justify-between text-[10px]">
                <span className="text-white/60">
                  {new Date(selectedMessage.createdAt).toLocaleDateString()}
                </span>
                <span className={`font-bold ${selectedMessage.isPaid ? 'text-yellow-400' : 'text-vintage-gold'}`}>
                  +{selectedMessage.voteCount} {selectedMessage.isPaid ? t.paidVote : t.freeVote}
                </span>
              </div>
            </div>

            {/* Reply Button */}
            {myFid && myAddress && selectedMessage.voterFid && selectedMessage.voterFid !== myFid && (
              <button
                onClick={() => {
                  AudioManager.buttonClick();
                  const msgId = selectedMessage._id;
                  const senderFid = selectedMessage.voterFid;
                  setSelectedMessage(null); // Close message view first
                  setReplyToMessageId(msgId);
                  setReplyToFid(senderFid || null); // Store sender FID for gift modal
                  setShowComposer(true);
                }}
                className="mt-3 w-full py-2 bg-vintage-gold text-black font-bold border-2 border-black shadow-[3px_3px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>
                Reply
              </button>
            )}

            <button
              onClick={() => {
                stopAudio();
                setSelectedMessage(null);
              }}
              className="mt-3 w-full py-2 bg-vintage-black text-vintage-gold font-bold border-2 border-black shadow-[3px_3px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
            >
              {t.back}
            </button>
          </div>
        ) : (
          /* Message List */
          <div className="flex-1 overflow-hidden flex flex-col mb-4">
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

            {/* Quests Tab Content */}
            {activeTab === 'quests' && (
              <div className="max-h-[320px] overflow-y-auto space-y-2">
                {questsLoading ? (
                  <div className="text-center py-8">
                    <p className="text-vintage-ice/50 text-sm animate-pulse">Loading quests...</p>
                  </div>
                ) : activeQuests.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-white/60 text-sm">No active quests</p>
                    <p className="text-white/40 text-xs mt-1">Check back later or create your own!</p>
                  </div>
                ) : (
                  activeQuests.map((quest: any) => {
                    const QUEST_ICONS: Record<string, string> = {
                      follow_me: '👤', join_channel: '📢', rt_cast: '🔁', use_miniapp: '🎮', like_cast: '❤️',
                    };
                    const QUEST_LABELS: Record<string, string> = {
                      follow_me: 'Follow', join_channel: 'Join Channel', rt_cast: 'Recast', use_miniapp: 'Use App', like_cast: 'Like Cast',
                    };
                    const isClaiming = claimingQuestId === quest._id;
                    const claimResult = questClaimResult?.questId === quest._id ? questClaimResult : null;
                    const slotsLeft = quest.maxCompleters - quest.completedCount;
                    const hoursLeft = Math.max(0, Math.floor((quest.expiresAt - Date.now()) / 3600000));
                    return (
                      <div key={quest._id} className="bg-vintage-black/40 border-2 border-black shadow-[2px_2px_0px_#000] p-3">
                        <div className="flex items-start gap-2 mb-2">
                          <span className="text-xl">{QUEST_ICONS[quest.questType] || '?'}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-vintage-gold font-bold text-xs uppercase">{QUEST_LABELS[quest.questType]}</p>
                            <p className="text-white/70 text-xs truncate">by @{quest.creatorUsername}</p>
                            <p className="text-white/50 text-[10px] truncate">{quest.targetDisplay}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-[#FFD400] font-black text-sm">+{quest.rewardPerCompleter.toLocaleString()}</p>
                            <p className="text-white/30 text-[10px]">coins</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-white/30 mb-2">
                          <span>{slotsLeft}/{quest.maxCompleters} slots left</span>
                          <span>{hoursLeft}h left</span>
                        </div>
                        {claimResult && (
                          <div className={`text-xs text-center py-1 mb-2 border ${claimResult.success ? 'text-green-400 border-green-500/50 bg-green-900/20' : 'text-red-400 border-red-500/50 bg-red-900/20'}`}>
                            {claimResult.success ? `Claimed! +${quest.rewardPerCompleter.toLocaleString()} coins` : claimResult.error}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              AudioManager.buttonClick();
                              try {
                                if (sdk?.actions?.openMiniApp) {
                                  await sdk.actions.openMiniApp({ url: quest.targetUrl });
                                } else {
                                  window.open(quest.targetUrl, '_blank');
                                }
                              } catch { window.open(quest.targetUrl, '_blank'); }
                            }}
                            className="flex-1 py-1.5 bg-vintage-black border-2 border-black text-vintage-gold font-bold text-xs hover:translate-x-[1px] hover:translate-y-[1px] transition-all shadow-[2px_2px_0px_#000] hover:shadow-[1px_1px_0px_#000]"
                          >
                            Do it
                          </button>
                          <button
                            onClick={() => { AudioManager.buttonClick(); handleClaimQuest(quest); }}
                            disabled={isClaiming || !!claimResult?.success}
                            className="flex-1 py-1.5 bg-[#22C55E] border-2 border-black text-black font-black text-xs hover:translate-x-[1px] hover:translate-y-[1px] transition-all shadow-[2px_2px_0px_#000] hover:shadow-[1px_1px_0px_#000] disabled:opacity-50"
                          >
                            {isClaiming ? '...' : claimResult?.success ? 'Done' : 'Claim'}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
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
                        <p className="text-[#FFD400] font-black text-xl">{total}</p>
                        <p className="text-white/50 text-[10px] uppercase font-bold">Sent</p>
                      </div>
                      <div className="bg-[#111] border-2 border-black shadow-[2px_2px_0px_#000] p-2 text-center">
                        <p className="text-[#22C55E] font-black text-xl">{opened}</p>
                        <p className="text-white/50 text-[10px] uppercase font-bold">Opened</p>
                      </div>
                      <div className="bg-[#111] border-2 border-black shadow-[2px_2px_0px_#000] p-2 text-center">
                        <p className={`font-black text-xl ${openRate >= 50 ? 'text-[#22C55E]' : openRate >= 20 ? 'text-[#FFD400]' : 'text-white/50'}`}>{openRate}%</p>
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
                        <div className="h-full bg-[#FFD400] transition-all" style={{ width: `${openRate}%` }} />
                      </div>
                    </div>
                    {/* Per-message list */}
                    <div className="space-y-1">
                      <p className="text-white/40 text-[10px] uppercase font-bold px-1">Recent Messages</p>
                      {pagedMessages.map((msg: VibeMailMessage) => (
                        <div key={msg._id} className="bg-[#111] border-2 border-black p-2 flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${msg.isRead ? 'bg-[#22C55E]' : 'bg-white/20'}`} />
                          <div className="flex-1 min-w-0">
                            {msg.recipientUsername && (
                              <p className="text-[#FFD400] text-[10px] font-bold truncate">@{msg.recipientUsername}</p>
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
            <div className="space-y-2">
            {!currentMessages || currentMessages.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-white/60 text-sm">{t.noMessagesYet}</p>
                <p className="text-white/40 text-xs mt-1">
                  {t.messagesWillAppear}
                </p>
              </div>
            ) : (
              pagedMessages.map((msg: VibeMailMessage) => (
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
                  className={`flex-1 text-left p-3 border-2 shadow-[2px_2px_0px_#000] transition-all ${
                    msg.isRead
                      ? 'bg-[#161616] border-[#2a2a2a] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000]'
                      : 'bg-[#1a1030] border-[#5b21b6]/60 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000]'
                  } ${deleteMode ? 'opacity-80' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${msg.isRead ? 'bg-white/20' : 'bg-[#818CF8] animate-pulse'}`} />
                    <div className="flex-1 min-w-0">
                      {/* Show sender/recipient */}
                      {msg.isSent && msg.recipientUsername ? (
                        <p className="text-white/40 text-[10px] mb-0.5">
                          To: @{msg.recipientUsername}
                        </p>
                      ) : msg.voterUsername ? (
                        <p className="text-white/50 text-[10px] mb-0.5">
                          From: @{msg.voterUsername}
                        </p>
                      ) : msg.voterFid ? (
                        <p className="text-white/40 text-[10px] mb-0.5">
                          FID #{msg.voterFid}
                        </p>
                      ) : null}
                      <p className={`text-sm truncate ${msg.isRead ? 'text-white/50' : 'text-white font-bold'}`}>
                        {msg.message?.slice(0, 50)}...
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {msg.audioId && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#C8962E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                        )}
                        {msg.imageId && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#C8962E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        )}
                        {msg.castUrl && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9945ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        )}
                        <span className="text-xs text-white/40">
                          {new Date(msg.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <span className={`text-xs font-bold ${msg.isPaid ? 'text-yellow-400' : 'text-white/50'}`}>
                      +{msg.voteCount}
                    </span>
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
        onChange={(e) => setMessage(e.target.value.slice(0, 200))}
        placeholder={t.vibeMailPlaceholder}
        className="w-full h-28 min-h-[112px] bg-[#111] border-2 border-[#444] p-2 text-white text-sm placeholder:text-white/40 resize-none focus:border-[#FFD400] focus:outline-none"
                style={{ colorScheme: 'dark', WebkitTextFillColor: 'white' }}
      />
      <div className="flex justify-between items-center">
        <p className="text-vintage-gold/60 text-xs">{t.vibeImageTip}</p>
        <p className="text-white/40 text-xs">{message.length}/200</p>
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
          className="w-full flex items-center justify-between p-2 bg-[#1a1a1a] border-2 border-[#444] text-white text-sm hover:border-[#FFD400]/50"
        >
          <span>
            {audioId ? `${t.soundLabel}: ${VIBEMAIL_SOUNDS.find(s => s.id === audioId)?.name}` : t.addMemeSound}
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
                    : 'bg-[#1a1a1a] border-[#444] text-white hover:border-[#FFD400]/50 hover:bg-[#FFD400]/10'
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
            className="w-full flex items-center justify-between p-2 bg-[#1a1a1a] border-2 border-[#444] text-white text-sm hover:border-[#FFD400]/50"
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
