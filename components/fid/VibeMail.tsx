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
import { NFTGiftModal } from './NFTGiftModal';
import haptics from "@/lib/fid/haptics";
import { AudioRecorder } from './AudioRecorder';
import { useMusic } from '@/contexts/MusicContext';
import { openMarketplace } from "@/lib/fid/marketplace-utils";
import { VibeDexModal } from './VibeDexModal';
import { CastPreview } from './CastPreview';


const VIBEMAIL_COST_VBMS = "100"; // Cost for paid VibeMail



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

// Render message with media (image/video) support using /vibe command
function renderMessageWithMedia(
  message: string,
  imageId: string | undefined,
  lang: string = "en",
  username?: string
): React.ReactNode {
  if (!message && !imageId) return null;

  const imageData = imageId ? getImageFile(imageId) : null;

  // Check if message contains /vibe command
  const vibeMatch = message?.match(/\/vibe/i);
  const hasVibeCommand = !!vibeMatch;

  // Remove /vibe from the message for display
  const cleanMessage = message?.replace(/\/vibe/gi, '').trim() || '';

  // Render the media element - compact size
  const renderMedia = () => {
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

  if (hasVibeCommand && imageData) {
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

interface VibeMailMessage {
  _id: Id<'cardVotes'>;
  message?: string;
  audioId?: string;
  imageId?: string;
  castUrl?: string;
  isRead?: boolean;
  createdAt: number;
  voteCount: number;
  isPaid: boolean;
  voterFid?: number;
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
            <div className="bg-vintage-black/50 rounded-lg p-2 mb-2 flex items-center gap-2">
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
              <div className="text-vintage-ice text-sm leading-relaxed mb-3">
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
                    <p className="text-vintage-ice/50 text-xs">
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
                    <p className="text-vintage-ice/50 text-[10px]">{selectedMessage.giftNftCollection}</p>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-vintage-gold flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                </div>
              )}

              {/* Vote Info */}
              <div className="mt-4 pt-3 border-t border-vintage-gold/20 flex items-center justify-between text-xs">
                <span className="text-vintage-ice/50">
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
                <p className="text-vintage-ice/50 text-sm">{t.noMessagesYet}</p>
                <p className="text-vintage-ice/30 text-xs mt-1">
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
                      ? 'bg-vintage-black/30 border-vintage-gold/20 hover:border-vintage-gold/40'
                      : 'bg-vintage-black/60 border-vintage-gold/60 hover:bg-vintage-black/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${msg.isRead ? 'bg-vintage-ice/30' : 'bg-vintage-gold animate-pulse'}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${msg.isRead ? 'text-vintage-ice/70' : 'text-white font-bold'}`}>
                        {msg.message?.slice(0, 50)}...
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {msg.audioId && (
                          <span className="text-xs text-vintage-burnt-gold">{t.hasAudio}</span>
                        )}
                        <span className="text-xs text-vintage-ice/40">
                          {new Date(msg.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <span className={`text-xs font-bold ${msg.isPaid ? 'text-yellow-400' : 'text-vintage-ice/50'}`}>
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
  asPage?: boolean; // Render as full page instead of modal
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

  // NFT Gift modal state
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [giftRecipientFid, setGiftRecipientFid] = useState<number | null>(null);
  const [giftRecipientAddress, setGiftRecipientAddress] = useState<string>('');
  const [giftRecipientUsername, setGiftRecipientUsername] = useState<string>('');

  // Query to get recipient address for NFT gift (for new message OR reply)
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

  return (
    <div className={asPage
      ? "min-h-screen bg-vintage-dark"
      : "fixed inset-0 z-[350] flex items-center justify-center bg-black/90 p-4"
    }>
      <audio ref={audioRef} onEnded={() => setPlayingAudio(null)} />

      <div
        style={{ colorScheme: 'dark' }}
        className={asPage
          ? "bg-vintage-charcoal h-screen w-full flex flex-col"
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
              <h3 className="text-vintage-gold font-bold text-lg uppercase tracking-wide">VibeQuest</h3>
              <p className="text-vintage-ice/60 text-xs">
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
                  setShowComposer(true);
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
            <button
              onClick={() => {
                stopAudio();
                onClose();
              }}
              className="w-8 h-8 bg-vintage-black border-2 border-black shadow-[2px_2px_0px_#000] text-vintage-gold font-bold hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center"
            >
              X
            </button>
          </div>
        </div>

        {/* Tabs - Msgs/Sent/Quests/Wanted */}
        {myFid && !selectedMessage && !showComposer && (
          <div className="flex gap-1 mb-3">
            <button
              onClick={() => setActiveTab('inbox')}
              className={`flex-1 py-2 text-xs font-bold border-2 border-black transition-all ${
                activeTab === 'inbox'
                  ? 'bg-vintage-gold text-black shadow-[2px_2px_0px_#000]'
                  : 'bg-vintage-black/50 text-vintage-ice/70 shadow-[2px_2px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000]'
              }`}
            >
              <span className="flex items-center justify-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
                Msgs
              </span>
            </button>
            <button
              onClick={() => setActiveTab('sent')}
              className={`flex-1 py-2 text-xs font-bold border-2 border-black transition-all ${
                activeTab === 'sent'
                  ? 'bg-vintage-gold text-black shadow-[2px_2px_0px_#000]'
                  : 'bg-vintage-black/50 text-vintage-ice/70 shadow-[2px_2px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000]'
              }`}
            >
              <span className="flex items-center justify-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                Sent
              </span>
            </button>
            <button
              onClick={() => setActiveTab('quests')}
              className={`flex-1 py-2 text-xs font-bold border-2 border-black transition-all ${
                activeTab === 'quests'
                  ? 'bg-[#22C55E] text-black shadow-[2px_2px_0px_#000]'
                  : 'bg-vintage-black/50 text-vintage-ice/70 shadow-[2px_2px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000]'
              }`}
            >
              <span className="flex items-center justify-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Quests
              </span>
            </button>
          </div>
        )}

        {/* VibeMail Composer Modal - FULL SCREEN OVERLAY */}
        {showComposer && myFid && myAddress && (
          <div className="fixed inset-0 z-[500] bg-vintage-dark overflow-y-auto" style={{ colorScheme: 'dark' }}>
            <div className="bg-vintage-charcoal min-h-full p-4 flex flex-col">
            {/* HEADER */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-black">
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
                  if (composerAudioRef.current) {
                    composerAudioRef.current.pause();
                  }
                }}
                className="w-8 h-8 bg-vintage-black border-2 border-black shadow-[2px_2px_0px_#000] text-vintage-gold font-bold hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center"
              >X</button>
              <h3 className="text-vintage-gold font-bold text-lg uppercase tracking-wide">
                {replyToMessageId ? 'Reply' : 'New Message'}
              </h3>
              <div className="w-10" />
            </div>

            {/* VBMS Balance */}
            <div className="bg-vintage-black/50 border-2 border-black shadow-[2px_2px_0px_#000] p-3 mb-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-vintage-ice/60 text-xs">{(t as any).yourVbmsBalance || 'Your VBMS Balance'}</p>
                <button
                  onClick={() => { AudioManager.buttonClick(); setShowDexModal(true); }}
                  className="text-vintage-burnt-gold text-xs hover:text-vintage-gold transition-colors flex items-center gap-1"
                >
                  Need more $VBMS?
                </button>
              </div>
              <p className="text-vintage-gold font-bold text-lg">
                {vbmsBalance ? parseFloat(vbmsBalance).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0'} VBMS
              </p>
            </div>

            {/* Reply indicator */}
            {replyToMessageId && (
              <div className="mb-3 bg-vintage-gold/10 border-2 border-black p-2 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>
                <p className="text-vintage-ice/70 text-sm">Replying anonymously to sender</p>
              </div>
            )}

            {/* Mode Selector (only for new message, not reply) */}
            {!replyToMessageId && (
              <div className="mb-3 flex gap-2">
                <button
                  onClick={() => { setSendMode('single'); setRecipientFid(null); setRecipientUsername(''); setBroadcastRecipients([]); }}
                  className={`flex-1 py-2 px-2 border-2 border-black text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                    sendMode === 'single'
                      ? 'bg-vintage-gold text-black shadow-[2px_2px_0px_#000]'
                      : 'bg-vintage-black/50 text-vintage-ice/70 shadow-[2px_2px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000]'
                  }`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  {t.vibemailModeSingle}
                </button>
                <button
                  onClick={() => { setSendMode('broadcast'); setRecipientFid(null); setRecipientUsername(''); }}
                  className={`flex-1 py-2 px-2 border-2 border-black text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                    sendMode === 'broadcast'
                      ? 'bg-vintage-gold text-black shadow-[2px_2px_0px_#000]'
                      : 'bg-vintage-black/50 text-vintage-ice/70 shadow-[2px_2px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000]'
                  }`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.42 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.82a16 16 0 0 0 6.29 6.29l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  {t.vibemailModeBroadcast}
                </button>
                <button
                  onClick={() => { setSendMode('random'); setRecipientFid(null); setRecipientUsername(''); setBroadcastRecipients([]); }}
                  className={`flex-1 py-2 px-2 border-2 border-black text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                    sendMode === 'random'
                      ? 'bg-vintage-gold text-black shadow-[2px_2px_0px_#000]'
                      : 'bg-vintage-black/50 text-vintage-ice/70 shadow-[2px_2px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000]'
                  }`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>
                  {t.vibemailModeRandom}
                </button>
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
                      className="flex-1 bg-vintage-black/50 border border-vintage-gold/30 rounded-lg px-2 py-2 text-vintage-ice text-sm focus:outline-none focus:border-vintage-gold"
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
                  <p className="text-vintage-ice/50 text-[10px] mt-1 text-center">
                    {randomQuantity * 100} VBMS ({randomQuantity} × 100)
                  </p>
                </div>

                {/* Random List - Cards already added */}
                {randomList.length > 0 && (
                  <div className="mb-2 bg-vintage-gold/10 border border-vintage-gold/30 rounded-lg p-2">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-vintage-gold text-xs font-bold">
                        <span className="flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> {(t.vibemailRandomListCount || '{count} in list').replace('{count}', String(randomList.length))}</span>
                      </p>
                      <button
                        onClick={() => setRandomList([])}
                        className="text-red-400 text-xs hover:text-red-300"
                      >
                        {t.vibemailClearList || 'Clear'}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                      {randomList.map(r => (
                        <span key={r.fid} className="inline-flex items-center gap-1 bg-purple-500/20 border border-purple-500/50 rounded-full px-2 py-0.5 text-xs text-vintage-ice">
                          @{r.username}
                          <button
                            onClick={() => setRandomList(prev => prev.filter(p => p.fid !== r.fid))}
                            className="text-red-400 hover:text-red-300"
                          >×</button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Manual Add - Current Random Card + Shuffle/Add buttons */}
                <div className="bg-vintage-black/30 border border-vintage-gold/20 rounded-lg p-2">
                  <p className="text-vintage-ice/50 text-[10px] mb-1">{(t as any).vibemailOrManual || 'Or add manually:'}</p>
                  {randomCard ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2"/><circle cx="8" cy="8" r="1" fill="currentColor"/><circle cx="16" cy="8" r="1" fill="currentColor"/><circle cx="8" cy="16" r="1" fill="currentColor"/><circle cx="16" cy="16" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>
                          <div>
                          <p className="text-vintage-gold font-bold text-xs">@{randomCard.username}</p>
                          <p className="text-vintage-ice/50 text-[10px]">FID: {randomCard.fid}</p>
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
                    <p className="text-vintage-ice/50 text-xs text-center">Loading...</p>
                  )}
                </div>

                {randomList.length > 0 && (
                  <p className="text-green-400 text-xs mt-2 text-center font-bold">
                    <span className="flex items-center justify-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> {((t as any).vibemailReadyToSend || 'Ready to send to {count} people').replace('{count}', String(randomList.length))} = {randomList.length * 100} VBMS</span>
                  </p>
                )}
              </div>
            )}

            {/* Broadcast Recipients (multiple selection) */}
            {sendMode === 'broadcast' && !replyToMessageId && (
              <div className="mb-3">
                <div className="flex flex-wrap gap-1 mb-2 max-h-24 overflow-y-auto">
                  {broadcastRecipients.map(r => (
                    <span key={r.fid} className="inline-flex items-center gap-1 bg-vintage-gold/20 border border-vintage-gold/50 rounded-full px-2 py-1 text-xs text-vintage-gold">
                      @{r.username}
                      <button
                        onClick={() => setBroadcastRecipients(prev => prev.filter(p => p.fid !== r.fid))}
                        className="text-red-400 hover:text-red-300"
                      >×</button>
                    </span>
                  ))}
                </div>
                <div className="flex justify-between items-center mb-1">
                  <p className={`text-xs ${broadcastRecipients.length >= MAX_BROADCAST_RECIPIENTS ? 'text-red-400' : 'text-vintage-ice/50'}`}>
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
                      className="w-full bg-vintage-black/50 border border-vintage-gold/30 rounded-lg px-3 py-2 text-vintage-ice text-sm placeholder:text-vintage-ice/40 focus:outline-none focus:border-vintage-gold"
                      style={{ colorScheme: 'dark', WebkitTextFillColor: 'inherit' }}
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
                            className="w-full text-left px-3 py-2 hover:bg-vintage-gold/20 text-vintage-ice text-sm border-b border-vintage-gold/20 last:border-0"
                          >
                            <strong>{card.username}</strong>
                            <span className="text-vintage-ice/50 ml-2">FID: {card.fid}</span>
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
                      className="w-full bg-vintage-black/50 border-2 border-black px-3 py-2 text-vintage-ice text-sm placeholder:text-vintage-ice/40 focus:outline-none focus:border-vintage-gold"
                      style={{ colorScheme: 'dark', WebkitTextFillColor: 'inherit' }}
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
                            className="w-full text-left px-3 py-2 hover:bg-vintage-gold/20 text-vintage-ice text-sm border-b border-vintage-gold/20 last:border-0"
                          >
                            <strong>{card.username}</strong>
                            <span className="text-vintage-ice/50 ml-2">FID: {card.fid}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Message Input */}
            <textarea
              value={composerMessage}
              onChange={(e) => setComposerMessage(e.target.value.slice(0, 200))}
              placeholder="Write your anonymous message..."
              className="w-full bg-vintage-black/50 border-2 border-black px-3 py-2 text-vintage-ice text-sm placeholder:text-vintage-ice/40 focus:outline-none resize-none h-28 min-h-[112px]"
              style={{ colorScheme: 'dark', WebkitTextFillColor: 'inherit' }}
            />
            <div className="flex justify-between items-center">
              <p className="text-vintage-gold/60 text-xs">{t.vibeImageTip}</p>
              <p className="text-vintage-ice/40 text-xs">{composerMessage.length}/200</p>
            </div>

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
                <span className="text-vintage-ice text-sm flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                Meme sound selected
              </span>
                <button
                  onClick={() => setComposerAudioId(null)}
                  className="text-red-400 text-xs hover:text-red-300"
                >Clear</button>
              </div>
            )}

            {/* Meme Sound Picker - only show if no custom audio */}
            <audio ref={composerAudioRef} onEnded={() => setPreviewSound(null)} />
            {!isCustomAudio(composerAudioId || undefined) && (
            <button
              onClick={() => setShowSoundPicker(!showSoundPicker)}
              className="mt-2 w-full py-2 bg-vintage-black/50 border-2 border-black shadow-[2px_2px_0px_#000] text-vintage-ice text-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000] transition-all flex items-center justify-between px-3"
            >
              <span className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                {composerAudioId ? VIBEMAIL_SOUNDS.find(s => s.id === composerAudioId)?.name : 'Add meme sound (optional)'}
              </span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points={showSoundPicker ? "18 15 12 9 6 15" : "6 9 12 15 18 9"}/></svg>
            </button>
            )}

            {showSoundPicker && (
              <div className="mt-2 bg-vintage-charcoal/50 p-2 rounded-lg border border-vintage-gold/20">
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                  {VIBEMAIL_SOUNDS.map((sound) => (
                    <button
                      key={sound.id}
                      onClick={() => {
                        // Play preview
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
                      className={`p-2 rounded-lg border text-xs transition-all flex items-center gap-2 ${
                        composerAudioId === sound.id
                          ? 'bg-vintage-gold/30 border-vintage-gold text-vintage-gold'
                          : 'bg-vintage-charcoal border-vintage-gold/30 text-vintage-ice hover:border-vintage-gold/50 hover:bg-vintage-gold/10'
                      }`}
                    >
                      <span>{previewSound === sound.id ? '⏹' : '▶️'}</span>
                      <span className="truncate">{sound.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Image Selector */}
            <button
              onClick={() => setShowImagePicker(!showImagePicker)}
              className="mt-2 w-full py-2 bg-vintage-black/50 border-2 border-black shadow-[2px_2px_0px_#000] text-vintage-ice text-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000] transition-all flex items-center justify-between px-3"
            >
              <span className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                {composerImageId ? VIBEMAIL_IMAGES.find(i => i.id === composerImageId)?.name : 'Add meme image (optional)'}
              </span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points={showImagePicker ? "18 15 12 9 6 15" : "6 9 12 15 18 9"}/></svg>
            </button>

            {showImagePicker && (
              <div className="mt-2 grid grid-cols-4 gap-2">
                {VIBEMAIL_IMAGES.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => setComposerImageId(composerImageId === img.id ? null : img.id)}
                    className={`p-1 rounded-lg border transition-all ${
                      composerImageId === img.id
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

            {/* Cast URL Embed */}
            <button
              onClick={() => { setShowCastInput(!showCastInput); if (showCastInput) { setComposerCastUrl(null); setCastInputValue(''); } }}
              className={`mt-2 w-full py-2 border-2 border-black shadow-[2px_2px_0px_#000] text-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000] transition-all flex items-center justify-between px-3 ${composerCastUrl ? 'bg-[#9945FF]/20 text-[#c87eff]' : 'bg-vintage-black/50 text-vintage-ice'}`}
            >
              <span className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                {composerCastUrl ? 'Cast embedded' : 'Embed a cast (optional)'}
              </span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points={showCastInput ? "18 15 12 9 6 15" : "6 9 12 15 18 9"}/></svg>
            </button>
            {showCastInput && (
              <div className="mt-1">
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
                  className="w-full bg-[#0A0A0A] border-2 border-[#444] text-white px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#9945FF]"
                  style={{ colorScheme: 'dark', WebkitTextFillColor: 'inherit' }}
                />
                {composerCastUrl && (
                  <CastPreview castUrl={composerCastUrl} compact />
                )}
              </div>
            )}

            {/* Free VibeMail limit display */}
            <div className="text-center text-xs mb-2">
              {hasFreeVotes ? (
                <span className="text-green-400 flex items-center justify-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  {t.freeVotesRemaining}: {freeVotesRemaining?.remaining ?? 0}
                </span>
              ) : (
                <span className="text-vintage-gold flex items-center justify-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3" strokeLinecap="round"/></svg>
                  {t.costPerVote}: {VIBEMAIL_COST_VBMS} VBMS
                </span>
              )}
            </div>

            {/* Next Button - Opens gift modal first, then sends everything */}
            <button
              onClick={async () => {
                if (isSending || isTransferPending) return;
                if (!composerMessage.trim() && !composerImageId) return;
                if (!myAddress || !myFid) return;

                // For replies - also show gift modal if we have the recipient address
                if (replyToMessageId && replyToFid && recipientCard?.address) {
                  setGiftRecipientFid(replyToFid);
                  setGiftRecipientAddress(recipientCard.address);
                  setGiftRecipientUsername('sender'); // Anonymous reply
                  setShowGiftModal(true);
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

                // RANDOM MODE - show gift modal like single mode
                if (sendMode === 'random' && randomCard && randomCard.address) {
                  setGiftRecipientFid(randomCard.fid);
                  setGiftRecipientAddress(randomCard.address);
                  setGiftRecipientUsername(randomCard.username);
                  setShowGiftModal(true);
                  return;
                }

                // SINGLE MODE - For direct messages, show gift modal first
                if (sendMode === 'single' && recipientFid && recipientCard?.address) {
                  setGiftRecipientFid(recipientFid);
                  setGiftRecipientAddress(recipientCard.address);
                  setGiftRecipientUsername(recipientUsername);
                  setShowGiftModal(true);
                  // Don't close composer yet - will close after gift modal
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
                  {t.vibemailSendTo.replace('{count}', String(broadcastRecipients.length)).replace('{cost}', String(broadcastRecipients.length * 100))}
                </span>
              ) : sendMode === 'random' ? (
                <span className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>
                  {randomList.length > 0
                    ? `${(t.vibemailSendToList || 'Send to List ({count})').replace('{count}', String(randomList.length))} (${randomList.length * 100} VBMS)`
                    : t.vibemailRandomCost}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  {t.vibemailNextGift}
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
            <div className="bg-vintage-black/60 border-2 border-black p-3 flex-1 overflow-y-auto">
              <div className="text-vintage-ice text-sm leading-relaxed mb-3">
                {selectedMessage.imageId ? (
                  renderMessageWithMedia(selectedMessage.message || "", selectedMessage.imageId, lang, username)
                ) : (
                  <>"{renderFormattedMessage(selectedMessage.message || "", lang, username)}"</>
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
                    <p className="text-vintage-ice/50 text-[10px]">
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
                  className="mt-3 bg-vintage-black/50 border-2 border-black shadow-[2px_2px_0px_#000] p-2 flex items-center gap-3 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000] transition-all cursor-pointer"
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
                    <p className="text-vintage-ice/50 text-[10px]">{selectedMessage.giftNftCollection}</p>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                </div>
              )}

              <div className="mt-2 pt-2 border-t-2 border-black/30 flex items-center justify-between text-[10px]">
                <span className="text-vintage-ice/50">
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
                {t.replyAnonymously}
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
                    <p className="text-vintage-ice/50 text-sm">No active quests</p>
                    <p className="text-vintage-ice/30 text-xs mt-1">Check back later or create your own!</p>
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

            {activeTab !== 'quests' && (
            <div className="space-y-2">
            {!currentMessages || currentMessages.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-vintage-ice/50 text-sm">{t.noMessagesYet}</p>
                <p className="text-vintage-ice/30 text-xs mt-1">
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
                  className={`flex-1 text-left p-3 border-2 border-black shadow-[2px_2px_0px_#000] transition-all ${
                    msg.isRead
                      ? 'bg-vintage-black/40 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000]'
                      : 'bg-vintage-gold/15 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000]'
                  } ${deleteMode ? 'opacity-80' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${msg.isRead ? 'bg-vintage-ice/30' : 'bg-vintage-gold animate-pulse'}`} />
                    <div className="flex-1 min-w-0">
                      {/* Show recipient for sent messages */}
                      {msg.isSent && msg.recipientUsername && (
                        <p className="text-vintage-gold/70 text-xs mb-1">
                          {t.sentTo}: {msg.recipientUsername}
                        </p>
                      )}
                      <p className={`text-sm truncate ${msg.isRead ? 'text-vintage-ice/70' : 'text-vintage-gold font-bold'}`}>
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
                        <span className="text-xs text-vintage-ice/40">
                          {new Date(msg.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <span className={`text-xs font-bold ${msg.isPaid ? 'text-yellow-400' : 'text-vintage-ice/50'}`}>
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

      {/* NFT Gift Modal - handles everything: gift selection + VibeMail sending */}
      {showGiftModal && giftRecipientFid && giftRecipientAddress && myFid && myAddress && (
        <NFTGiftModal
          onClose={() => {
            setShowGiftModal(false);
            setGiftRecipientFid(null);
            setGiftRecipientAddress('');
            setGiftRecipientUsername('');
          }}
          onComplete={() => {
            // Show success feedback
            const recipientName = giftRecipientUsername || 'sender';
            haptics.send(); // Haptic on send
                  setSendSuccess({ recipient: recipientName, timestamp: Date.now() });
            // Auto-hide after 3 seconds
            setTimeout(() => setSendSuccess(null), 3000);
            // Reset everything after complete
            setShowGiftModal(false);
            setShowComposer(false);
            setGiftRecipientFid(null);
            setGiftRecipientAddress('');
            setGiftRecipientUsername('');
            setRecipientFid(null);
            setRecipientUsername('');
            setReplyToMessageId(null);
            setReplyToFid(null);
            setComposerMessage('');
            setComposerAudioId(null);
            setComposerImageId(null);
            setComposerCastUrl(null);
            setShowCastInput(false);
            setCastInputValue('');
            setSearchQuery('');
          }}
          recipientFid={giftRecipientFid}
          recipientAddress={giftRecipientAddress}
          recipientUsername={giftRecipientUsername}
          senderFid={myFid}
          senderAddress={myAddress}
          message={composerMessage}
          audioId={composerAudioId || undefined}
          imageId={composerImageId || undefined}
          castUrl={composerCastUrl || undefined}
          isPaidVibeMail={!hasFreeVotes}
          replyToMessageId={replyToMessageId || undefined}
        />
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
    <div className="bg-vintage-black/50 rounded-lg p-3 space-y-3">
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
        className="w-full h-28 min-h-[112px] bg-vintage-charcoal border border-vintage-gold/30 rounded-lg p-2 text-vintage-ice text-sm placeholder:text-vintage-ice/30 resize-none focus:border-vintage-gold focus:outline-none"
      />
      <div className="flex justify-between items-center">
        <p className="text-vintage-gold/60 text-xs">{t.vibeImageTip}</p>
        <p className="text-vintage-ice/40 text-xs">{message.length}/200</p>
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
          className="w-full flex items-center justify-between p-2 bg-vintage-charcoal border border-vintage-gold/30 rounded-lg text-vintage-ice text-sm hover:border-vintage-gold/50"
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
                    : 'bg-vintage-charcoal border-vintage-gold/30 text-vintage-ice hover:border-vintage-gold/50 hover:bg-vintage-gold/10'
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
            className="w-full flex items-center justify-between p-2 bg-vintage-charcoal border border-vintage-gold/30 rounded-lg text-vintage-ice text-sm hover:border-vintage-gold/50"
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
