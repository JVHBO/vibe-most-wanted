"use client";

import React, { useEffect, useState, useCallback, useMemo, memo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ConvexProfileService, type UserProfile, type MatchHistory } from "../lib/convex-profile"; // ✨ Convex para Profiles
import { ConvexPvPService, type GameRoom } from "../lib/convex-pvp"; // ✨ Convex para PvP Rooms
import { sdk } from "@farcaster/miniapp-sdk";
import { BadgeList } from "@/components/Badge";
import { getUserBadges } from "@/lib/badges";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAccount, useDisconnect } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useQuery, useMutation } from "convex/react";

  // Query player's economy data
  const playerEconomy = useQuery(api.economy.getPlayerEconomy, address ? { address } : "skip");
import { api } from "@/convex/_generated/api";
import FoilCardEffect from "@/components/FoilCardEffect";
import DifficultyModal from "@/components/DifficultyModal";

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_VIBE_CONTRACT;
const JC_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_JC_CONTRACT || CONTRACT_ADDRESS; // JC can have different contract
const CHAIN = process.env.NEXT_PUBLIC_ALCHEMY_CHAIN;
const HAND_SIZE_CONST = 5;
const JC_WALLET_ADDRESS = '0xf14c1dc8ce5fe65413379f76c43fa1460c31e728';
const ADMIN_WALLETS = [
  '0x2a9585Da40dE004d6Ff0f5F12cfe726BD2f98B52', // joaovitoribeiro (you)
  '0xBb4c7d8B2E32c7C99d358Be999377c208cCE53c2', // Claude's wallet
]; // Admin wallets get 50 attacks
const MAX_ATTACKS_DEFAULT = 5; // Increased from 3 to 5
const MAX_ATTACKS_ADMIN = 50; // Increased from 40 to 50

// Helper function to get max attacks for a user
const getMaxAttacks = (walletAddress: string | null | undefined): number => {
  if (!walletAddress) return MAX_ATTACKS_DEFAULT;
  const isAdmin = ADMIN_WALLETS.some(
    admin => admin.toLowerCase() === walletAddress.toLowerCase()
  );
  return isAdmin ? MAX_ATTACKS_ADMIN : MAX_ATTACKS_DEFAULT;
};

// Development logging helpers - only log in development mode
const isDev = process.env.NODE_ENV === 'development';
const devLog = (...args: any[]) => {
  if (isDev) console.log(...args);
};
const devWarn = (...args: any[]) => {
  if (isDev) console.warn(...args);
};
const devError = (...args: any[]) => {
  if (isDev) console.error(...args);
};

const imageUrlCache = new Map();
const IMAGE_CACHE_TIME = 1000 * 60 * 60;

const getFromCache = (key: string): string | null => {
  const item = imageUrlCache.get(key);
  if (!item) return null;
  const timeDiff = Date.now() - item.time;
  if (timeDiff > IMAGE_CACHE_TIME) {
    imageUrlCache.delete(key);
    return null;
  }
  return item.url;
};

const setCache = (key: string, value: string): void => {
  imageUrlCache.set(key, { url: value, time: Date.now() });
};

// Tornar AudioManager global para persistir entre páginas
const getGlobalAudioManager = () => {
  if (typeof window === 'undefined') return null;
  if (!(window as any).globalAudioManager) {
    (window as any).globalAudioManager = {
      context: null as AudioContext | null,
      musicGain: null as GainNode | null,
      backgroundMusic: null as HTMLAudioElement | null,
      backgroundSource: null as AudioBufferSourceNode | null,
      currentVolume: 0.1,
      isPlaying: false
    };
  }
  return (window as any).globalAudioManager;
};

const AudioManager = {
  get context() { return getGlobalAudioManager()?.context || null; },
  set context(value) { const mgr = getGlobalAudioManager(); if (mgr) mgr.context = value; },
  get musicGain() { return getGlobalAudioManager()?.musicGain || null; },
  set musicGain(value) { const mgr = getGlobalAudioManager(); if (mgr) mgr.musicGain = value; },
  get backgroundMusic() { return getGlobalAudioManager()?.backgroundMusic || null; },
  set backgroundMusic(value) { const mgr = getGlobalAudioManager(); if (mgr) mgr.backgroundMusic = value; },
  get backgroundSource() { return getGlobalAudioManager()?.backgroundSource || null; },
  set backgroundSource(value) { const mgr = getGlobalAudioManager(); if (mgr) mgr.backgroundSource = value; },
  get currentVolume() { return getGlobalAudioManager()?.currentVolume || 0.1; },
  set currentVolume(value) { const mgr = getGlobalAudioManager(); if (mgr) mgr.currentVolume = value; },
  get isPlaying() { return getGlobalAudioManager()?.isPlaying || false; },
  set isPlaying(value) { const mgr = getGlobalAudioManager(); if (mgr) mgr.isPlaying = value; },
  async init() {
    if (typeof window === 'undefined') return;
    if (!this.context) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (Ctx) {
        this.context = new Ctx();
        this.musicGain = this.context.createGain();
        this.musicGain.connect(this.context.destination);
        // Usa o volume configurado ao invés de hardcoded 0.6
        this.musicGain.gain.value = this.currentVolume;
      }
    }
    if (this.context && this.context.state === 'suspended') {
      await this.context.resume();
    }
  },
  setVolume(volume: number) {
    this.currentVolume = Math.max(0, Math.min(1, volume)); // Clamp entre 0 e 1
    if (this.musicGain) {
      // Define o valor do gain diretamente - 0 vai mutar completamente
      this.musicGain.gain.value = this.currentVolume;
      devLog(`🔊 Volume ajustado para: ${this.currentVolume} (${Math.round(this.currentVolume * 100)}%)`);
    }
  },
  async playTone(freq: number, dur: number, vol: number = 0.3) {
    if (!this.context) await this.init();
    if (!this.context) return;
    if (this.context.state === 'suspended') await this.context.resume();

    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.connect(gain);
    gain.connect(this.context.destination);
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.setValueAtTime(vol, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + dur);
    osc.start(this.context.currentTime);
    osc.stop(this.context.currentTime + dur);
  },
  async startBackgroundMusic() {
    await this.init();
    if (!this.context || !this.musicGain) return;

    // Se já estiver tocando, apenas retoma o contexto se necessário
    if (this.isPlaying && this.backgroundSource) {
      if (this.context.state === 'suspended') {
        await this.context.resume();
      }
      return;
    }

    if (this.context.state === 'suspended') {
      await this.context.resume();
    }

    // Apenas para a source antiga, não destroi o musicGain
    if (this.backgroundSource) {
      try {
        this.backgroundSource.stop();
        this.backgroundSource.disconnect();
      } catch (e) {
        // Ignora erro se já estiver parado
      }
      this.backgroundSource = null;
      this.isPlaying = false;
    }

    try {
      // Loop sem interrupções usando AudioContext
      const response = await fetch('/jazz-background.mp3');
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.context.decodeAudioData(arrayBuffer);

      this.backgroundSource = this.context.createBufferSource();
      this.backgroundSource.buffer = audioBuffer;
      this.backgroundSource.loop = true;
      this.backgroundSource.loopStart = 0;
      this.backgroundSource.loopEnd = audioBuffer.duration;

      // NÃO cria um novo musicGain, usa o existente do init()
      // Garante que o volume está correto antes de conectar
      this.musicGain.gain.value = this.currentVolume;
      devLog(`🎵 Iniciando música de fundo com volume: ${this.currentVolume} (${Math.round(this.currentVolume * 100)}%)`);

      // Conecta: source -> gain -> destination
      this.backgroundSource.connect(this.musicGain);

      this.backgroundSource.start(0);
      this.isPlaying = true;
    } catch (e) {
      devLog('Erro ao tocar música de fundo:', e);
    }
  },
  stopBackgroundMusic() {
    if (this.backgroundSource) {
      try {
        this.backgroundSource.stop();
      } catch (e) {
        // Ignora erro se já estiver parado
      }
      this.backgroundSource.disconnect();
      this.backgroundSource = null;
      this.isPlaying = false;
    }
    if (this.backgroundMusic) {
      this.backgroundMusic.pause();
      this.backgroundMusic.currentTime = 0;
      this.backgroundMusic = null;
    }
  },
  async selectCard() { await this.playTone(800, 0.1, 0.2); },
  async deselectCard() { await this.playTone(400, 0.1, 0.2); },
  async shuffle() {
    for (let i = 0; i < 5; i++) {
      setTimeout(() => this.playTone(300 + Math.random() * 200, 0.05, 0.15), i * 50);
    }
  },
  async cardBattle() {
    await this.playTone(600, 0.1, 0.3);
    setTimeout(() => this.playTone(700, 0.1, 0.3), 100);
    setTimeout(() => this.playTone(400, 0.15, 0.35), 200);
  },
  async playHand() {
    await this.playTone(600, 0.15, 0.25);
    setTimeout(() => this.playTone(900, 0.15, 0.25), 100);
  },
  async win() {
    await this.init();
    if (this.context && this.context.state === 'suspended') {
      await this.context.resume();
    }
    try {
      const audio = new Audio('https://www.myinstants.com/media/sounds/anime-wow.mp3');
      audio.volume = 0.7;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        await playPromise;
      }
    } catch (e) {
      devLog('Erro ao tocar som de vitória:', e);
    }
  },
  async lose() {
    await this.init();
    if (this.context && this.context.state === 'suspended') {
      await this.context.resume();
    }
    try {
      const audio = new Audio('https://www.myinstants.com/media/sounds/zoeira-efeito-loss.mp3');
      audio.volume = 0.7;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        await playPromise;
      }
    } catch (e) {
      devLog('Erro ao tocar som de derrota:', e);
    }
  },
  async tie() { await this.playTone(500, 0.3, 0.25); },
  // Sons para botões
  async buttonClick() { await this.playTone(600, 0.08, 0.12); },
  async buttonHover() { await this.playTone(500, 0.04, 0.08); },
  async buttonSuccess() {
    await this.playTone(700, 0.08, 0.15);
    setTimeout(() => this.playTone(900, 0.08, 0.15), 80);
  },
  async buttonError() {
    await this.playTone(300, 0.1, 0.2);
    setTimeout(() => this.playTone(250, 0.1, 0.2), 100);
  },
  async buttonNav() { await this.playTone(550, 0.06, 0.1); },
  async toggleOn() {
    await this.playTone(600, 0.08, 0.12);
    setTimeout(() => this.playTone(800, 0.08, 0.12), 60);
  },
  async toggleOff() {
    await this.playTone(800, 0.08, 0.12);
    setTimeout(() => this.playTone(600, 0.08, 0.12), 60);
  }
};


function findAttr(nft: any, trait: string): string {
  const locs = [nft?.raw?.metadata?.attributes, nft?.metadata?.attributes, nft?.metadata?.traits, nft?.raw?.metadata?.traits];
  for (const attrs of locs) {
    if (!Array.isArray(attrs)) continue;
    const found = attrs.find((a: any) => {
      const traitType = String(a?.trait_type || a?.traitType || a?.name || '').toLowerCase().trim();
      const searchTrait = trait.toLowerCase().trim();
      return traitType === searchTrait || traitType.includes(searchTrait);
    });
    if (found) {
      const value = found.value !== undefined ? found.value : found.trait_value;
      if (value !== undefined && value !== null) return String(value).trim();
    }
  }
  return '';
}

function isUnrevealed(nft: any): boolean {
  const hasAttrs = !!(nft?.raw?.metadata?.attributes?.length || nft?.metadata?.attributes?.length || nft?.raw?.metadata?.traits?.length || nft?.metadata?.traits?.length);

  // Se não tem atributos, é não revelada
  if (!hasAttrs) return true;

  const r = (findAttr(nft, 'rarity') || '').toLowerCase();
  const s = (findAttr(nft, 'status') || '').toLowerCase();
  const n = String(nft?.name || '').toLowerCase();

  // Verifica se tem indicadores explícitos de não revelada
  if (r === 'unopened' || s === 'unopened' || n === 'unopened' || n.includes('sealed pack')) {
    return true;
  }

  // Se tem imagem OU tem rarity, considera revelada
  const hasImage = !!(nft?.image?.cachedUrl || nft?.image?.originalUrl || nft?.metadata?.image || nft?.raw?.metadata?.image);
  const hasRarity = r !== '';

  return !(hasImage || hasRarity);
}

function calcPower(nft: any): number {
  const foil = findAttr(nft, 'foil') || 'None';
  const rarity = findAttr(nft, 'rarity') || 'Common';
  const wear = findAttr(nft, 'wear') || 'Lightly Played';
  let base = 15;
  const r = rarity.toLowerCase();
  if (r.includes('legend')) base = 150;
  else if (r.includes('epic')) base = 60;
  else if (r.includes('rare')) base = 15;
  else if (r.includes('common')) base = 15;
  else base = 15;
  let wearMult = 1.0;
  const w = wear.toLowerCase();
  if (w.includes('pristine')) wearMult = 1.25;
  else if (w.includes('mint')) wearMult = 1.1;
  let foilMult = 1.0;
  const f = foil.toLowerCase();
  if (f.includes('prize')) foilMult = 15.0;
  else if (f.includes('standard')) foilMult = 2.5;
  const power = base * wearMult * foilMult;
  return Math.max(1, Math.round(power));
}

function normalizeUrl(url: string): string {
  if (!url) return '';
  let u = url.trim();
  if (u.startsWith('ipfs://')) u = 'https://ipfs.io/ipfs/' + u.slice(7);
  else if (u.startsWith('ipfs/')) u = 'https://ipfs.io/ipfs/' + u.slice(5);
  u = u.replace(/^http:\/\//i, 'https://');
  return u;
}

async function getImage(nft: any): Promise<string> {
  const tid = nft.tokenId;
  const cached = getFromCache(tid);
  if (cached) return cached;

  const extractUrl = (value: any): string | null => {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'object') return value.url || value.cachedUrl || value.originalUrl || value.gateway || null;
    return null;
  };

  try {
    const uri = nft?.tokenUri?.gateway || nft?.raw?.tokenUri;
    if (uri) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(uri, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const json = await res.json();
        const imageFromUri = json?.image || json?.image_url || json?.imageUrl;
        if (imageFromUri) {
          let imageUrl = String(imageFromUri);
          if (imageUrl.includes('wieldcd.net')) {
            const proxyUrl = `https://vibechain.com/api/proxy?url=${encodeURIComponent(imageUrl)}`;
            setCache(tid, proxyUrl);
            return proxyUrl;
          }
          imageUrl = normalizeUrl(imageUrl);
          if (imageUrl && !imageUrl.includes('undefined')) {
            setCache(tid, imageUrl);
            return imageUrl;
          }
        }
      }
    }
  } catch {}

  let rawImage = extractUrl(nft?.raw?.metadata?.image);
  if (rawImage) {
    if (rawImage.includes('wieldcd.net')) {
      const proxyUrl = `https://vibechain.com/api/proxy?url=${encodeURIComponent(rawImage)}`;
      setCache(tid, proxyUrl);
      return proxyUrl;
    }
    rawImage = normalizeUrl(rawImage);
    if (rawImage && !rawImage.includes('undefined')) {
      setCache(tid, rawImage);
      return rawImage;
    }
  }

  const alchemyUrls = [
    extractUrl(nft?.image?.cachedUrl),
    extractUrl(nft?.image?.thumbnailUrl),
    extractUrl(nft?.image?.pngUrl),
    extractUrl(nft?.image?.originalUrl),
  ].filter(Boolean);

  for (const url of alchemyUrls) {
    if (url) {
      if (url.includes('wieldcd.net')) {
        const proxyUrl = `https://vibechain.com/api/proxy?url=${encodeURIComponent(url)}`;
        setCache(tid, proxyUrl);
        return proxyUrl;
      }
      const norm = normalizeUrl(String(url));
      if (norm && !norm.includes("undefined")) {
        setCache(tid, norm);
        return norm;
      }
    }
  }

  const placeholder = `https://via.placeholder.com/300x420/6366f1/ffffff?text=NFT+%23${tid}`;
  setCache(tid, placeholder);
  return placeholder;
}

async function fetchNFTs(owner: string, contractAddress?: string, onProgress?: (page: number, cards: number) => void): Promise<any[]> {
  if (!ALCHEMY_API_KEY) throw new Error("API Key não configurada");
  if (!CHAIN) throw new Error("Chain não configurada");
  const contract = contractAddress || CONTRACT_ADDRESS;
  if (!contract) throw new Error("Contract address não configurado");

  let allNfts: any[] = [];
  let pageKey: string | undefined = undefined;
  let pageCount = 0;
  const maxPages = 20; // Reduced from 70 - most users have < 2000 NFTs

  do {
    pageCount++;
    const url: string = `https://${CHAIN}.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTsForOwner?owner=${owner}&contractAddresses[]=${contract}&withMetadata=true&pageSize=100${pageKey ? `&pageKey=${pageKey}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API falhou: ${res.status}`);
    const json = await res.json();

    // Don't filter here - some NFTs don't have attributes cached in Alchemy
    // Filter after metadata refresh instead (like profile page does)
    const pageNfts = json.ownedNfts || [];
    allNfts = allNfts.concat(pageNfts);

    // Report progress
    if (onProgress) {
      onProgress(pageCount, allNfts.length);
    }

    pageKey = json.pageKey;
  } while (pageKey && pageCount < maxPages);

  return allNfts;
}

const NFTCard = memo(({ nft, selected, onSelect }: { nft: any; selected: boolean; onSelect: (nft: any) => void }) => {
  const tid = nft.tokenId;
  const [imgError, setImgError] = useState(0);

  const getRarityColor = (rarity: string) => {
    const r = (rarity || '').toLowerCase();
    if (r.includes('legend')) return 'from-orange-500 to-yellow-400';
    if (r.includes('epic')) return 'from-purple-500 to-pink-500';
    if (r.includes('rare')) return 'from-blue-500 to-cyan-400';
    return 'from-gray-600 to-gray-500';
  };

  const getRarityRing = (rarity: string) => {
    const r = (rarity || '').toLowerCase();
    if (r.includes('legend')) return 'ring-vintage-gold shadow-gold-lg';
    if (r.includes('epic')) return 'ring-vintage-silver shadow-neon';
    if (r.includes('rare')) return 'ring-vintage-burnt-gold shadow-gold';
    return 'ring-vintage-charcoal shadow-lg';
  };

  const fallbacks = useMemo(() => {
    const allUrls = [];
    if (nft.imageUrl) allUrls.push(nft.imageUrl);
    if (nft?.raw?.metadata?.image) allUrls.push(String(nft.raw.metadata.image));
    [nft?.image?.cachedUrl, nft?.image?.thumbnailUrl, nft?.image?.pngUrl, nft?.image?.originalUrl].forEach((url) => {
      if (url) allUrls.push(String(url));
    });
    if (nft?.metadata?.image) allUrls.push(String(nft.metadata.image));
    allUrls.push(`https://via.placeholder.com/300x420/6366f1/ffffff?text=NFT+%23${tid}`);
    return [...new Set(allUrls)].filter(url => url && !url.includes('undefined') && url.startsWith('http'));
  }, [nft, tid]);

  const currentSrc = fallbacks[imgError] || fallbacks[fallbacks.length - 1];
  const foilValue = (nft.foil || '').trim();

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(nft);
  }, [nft, onSelect]);

  return (
    <>
      <style>{`
        @keyframes holographic {
          0% {
            background-position: 0% 50%;
            filter: hue-rotate(0deg) brightness(1.2) saturate(1.5);
          }
          25% {
            background-position: 50% 100%;
            filter: hue-rotate(90deg) brightness(1.3) saturate(1.6);
          }
          50% {
            background-position: 100% 50%;
            filter: hue-rotate(180deg) brightness(1.4) saturate(1.7);
          }
          75% {
            background-position: 50% 0%;
            filter: hue-rotate(270deg) brightness(1.3) saturate(1.6);
          }
          100% {
            background-position: 0% 50%;
            filter: hue-rotate(360deg) brightness(1.2) saturate(1.5);
          }
        }

        @keyframes prizePulse {
          0%, 100% { opacity: 0.95; }
          50% { opacity: 1; }
        }

        @keyframes prizeGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 140, 0, 0.4), 0 0 60px rgba(255, 0, 255, 0.3); }
          50% { box-shadow: 0 0 30px rgba(255, 215, 0, 0.8), 0 0 60px rgba(255, 140, 0, 0.6), 0 0 90px rgba(255, 0, 255, 0.5); }
        }


        @keyframes cardReflection {
          0% {
            transform: translateX(-200%) translateY(-200%) rotate(45deg);
            opacity: 0;
          }
          50% {
            opacity: 0.3;
          }
          100% {
            transform: translateX(200%) translateY(200%) rotate(45deg);
            opacity: 0;
          }
        }

        @keyframes rainbowShine {
          0% {
            background-position: -200% center;
          }
          100% {
            background-position: 200% center;
          }
        }

        @keyframes shake {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-3deg); }
          75% { transform: rotate(3deg); }
        }

        @keyframes rainbowShine {
          0% {
            background-position: -200% center;
          }
          100% {
            background-position: 200% center;
          }
        }

        .prize-card-ring {
          animation: prizeGlow 2s ease-in-out infinite;
        }
      `}</style>
      
      <div className={`relative group transition-all duration-300 ${selected ? 'scale-95' : 'hover:scale-105'} cursor-pointer`} onClick={handleClick} style={{filter: 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.6))'}}>
        {/* Ring wrapper OUTSIDE overflow-hidden */}
        <div className={`rounded-lg ${
          selected ? `ring-4 ${getRarityRing(nft.rarity || '')} shadow-xl` :
          'ring-2 ring-vintage-deep-black/50 hover:ring-vintage-gold/50'
        }`}>
          <FoilCardEffect
            foilType={(foilValue === 'Standard' || foilValue === 'Prize') ? foilValue as 'Standard' | 'Prize' : null}
            className="relative rounded-lg"
          >
            <div style={{boxShadow: 'inset 0 0 10px rgba(255, 215, 0, 0.1)'}} className="rounded-lg overflow-hidden">
            <img src={currentSrc} alt={`#${tid}`} className="w-full aspect-[2/3] object-cover bg-vintage-deep-black pointer-events-none" loading="lazy" onError={() => { if (imgError < fallbacks.length - 1) setImgError(imgError + 1); }} />

            <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/95 to-transparent p-3 pointer-events-none z-20">
              <div className="flex items-center justify-between">
                <span className={`font-bold text-xl drop-shadow-lg bg-gradient-to-r ${getRarityColor(nft.rarity || '')} bg-clip-text text-transparent`}>{nft.power || 0} PWR</span>
                {selected && <span className="text-vintage-gold text-2xl drop-shadow-lg font-bold">✓</span>}
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-3 pointer-events-none z-20">
              {nft.rarity && (
                <div className="text-xs font-bold uppercase tracking-wider text-white drop-shadow-lg">
                  {nft.rarity}
                </div>
              )}
              {nft.wear && (
                <div className="text-xs text-yellow-300 font-semibold drop-shadow-lg">
                  {nft.wear}
                </div>
              )}
            </div>
          </div>
          </FoilCardEffect>
        </div>
      </div>
    </>
  );
});

// Match History Section Component
const MatchHistorySection = memo(({ address }: { address: string }) => {
  const { t } = useLanguage();

  // Query match history from Convex
  const matchHistory = useQuery(
    api.matches.getMatchHistory,
    address ? { address: address.toLowerCase(), limit: 20 } : "skip"
  );

  if (!matchHistory || matchHistory.length === 0) {
    return (
      <div className="bg-vintage-charcoal/50 backdrop-blur-lg rounded-2xl border-2 border-vintage-gold/30 p-6">
        <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2 text-vintage-gold">
          <span className="text-3xl">📜</span> Match History
        </h2>
        <div className="bg-vintage-black/50 border border-vintage-gold/20 rounded-xl p-8 text-center">
          <p className="text-vintage-burnt-gold">No matches played yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-vintage-charcoal/50 backdrop-blur-lg rounded-2xl border-2 border-vintage-gold/30 p-6">
      <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2 text-vintage-gold">
        <span className="text-3xl">📜</span> Match History
      </h2>
      <div className="space-y-3">
        {matchHistory.map((match, index) => {
          const isWin = match.result === 'win';
          const isTie = match.result === 'tie';
          const borderColor = isWin ? 'border-green-500/50' : isTie ? 'border-yellow-500/50' : 'border-red-500/50';
          const resultColor = isWin ? 'text-green-400' : isTie ? 'text-yellow-400' : 'text-red-400';
          const resultText = isWin ? '♔ VICTORY' : isTie ? '♦ TIE' : '♠ DEFEAT';

          return (
            <div
              key={match._id || index}
              className={`bg-vintage-charcoal border-2 ${borderColor} rounded-xl p-4 hover:scale-[1.01] transition-transform`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Match Type & Result */}
                <div className="flex items-center gap-4">
                  <div className="text-3xl text-vintage-gold">
                    {match.type === 'pvp' ? '♥' : match.type === 'attack' ? '⚔️' : match.type === 'defense' ? '🛡️' : '♣'}
                  </div>
                  <div>
                    <p className={`font-display font-bold text-lg ${resultColor}`}>{resultText}</p>
                    <p className="text-xs text-vintage-burnt-gold font-modern">
                      {match.type === 'pvp' ? 'PLAYER VS PLAYER' :
                       match.type === 'attack' ? 'ATTACK' :
                       match.type === 'defense' ? 'DEFENSE' :
                       'PLAYER VS ENVIRONMENT'}
                    </p>
                    <p className="text-xs text-vintage-burnt-gold/70">
                      {new Date(match.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Power Stats */}
                <div className="flex items-center gap-4">
                  <div className="text-center bg-vintage-black/50 px-4 py-2 rounded-lg border border-vintage-gold/50">
                    <p className="text-xs text-vintage-burnt-gold font-modern">YOUR POWER</p>
                    <p className="text-xl font-bold text-vintage-gold">{match.playerPower}</p>
                  </div>
                  <div className="text-2xl text-vintage-burnt-gold font-bold">VS</div>
                  <div className="text-center bg-vintage-black/50 px-4 py-2 rounded-lg border border-vintage-silver/50">
                    <p className="text-xs text-vintage-burnt-gold font-modern">OPPONENT</p>
                    <p className="text-xl font-bold text-vintage-silver">{match.opponentPower}</p>
                  </div>
                </div>

                {/* Opponent Info (if PvP/Attack/Defense) */}
                {match.opponentUsername && (
                  <div className="text-xs font-modern">
                    <p className="text-vintage-gold">vs @{match.opponentUsername}</p>
                    {match.opponentAddress && (
                      <p className="text-vintage-burnt-gold font-mono">
                        {match.opponentAddress.slice(0, 6)}...{match.opponentAddress.slice(-4)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default function TCGPage() {
  const { lang, setLang, t } = useLanguage();
  const router = useRouter();
  const playButtonsRef = useRef<HTMLDivElement>(null);

  // Wagmi hooks for wallet connection
  const { address: wagmiAddress, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  // State for Farcaster address (when in miniapp)
  const [farcasterAddress, setFarcasterAddress] = useState<string | null>(null);
  const [isInFarcaster, setIsInFarcaster] = useState<boolean>(false);
  const [isCheckingFarcaster, setIsCheckingFarcaster] = useState<boolean>(true);

  // Use Farcaster address if available, otherwise Wagmi
  const address = farcasterAddress || wagmiAddress;

  // Debug logging for address changes
  useEffect(() => {
    devLog('🔍 Address state:', {
      wagmiAddress,
      farcasterAddress,
      finalAddress: address,
      isConnected
    });
  }, [wagmiAddress, farcasterAddress, address, isConnected]);

  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [musicEnabled, setMusicEnabled] = useState<boolean>(true);
  const [musicVolume, setMusicVolume] = useState<number>(0.1); // Volume padrão 10%
  const [showTutorial, setShowTutorial] = useState<boolean>(false);
  const [sortByPower, setSortByPower] = useState<boolean>(false);
  const [sortAttackByPower, setSortAttackByPower] = useState<boolean>(false);
  const [nfts, setNfts] = useState<any[]>([]);
  const [jcNfts, setJcNfts] = useState<any[]>([]);
  const [jcNftsLoading, setJcNftsLoading] = useState<boolean>(true);
  const [jcLoadingProgress, setJcLoadingProgress] = useState<{page: number, cards: number} | null>(null);
  const [filteredCount, setFilteredCount] = useState<number>(0);
  const [status, setStatus] = useState<string>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedCards, setSelectedCards] = useState<any[]>([]);
  const [playerPower, setPlayerPower] = useState<number>(0);
  const [dealerPower, setDealerPower] = useState<number>(0);
  const [result, setResult] = useState<string>('');
  const [isBattling, setIsBattling] = useState<boolean>(false);
  const [dealerCards, setDealerCards] = useState<any[]>([]);
  const [showBattleScreen, setShowBattleScreen] = useState<boolean>(false);
  const [battlePhase, setBattlePhase] = useState<string>('cards');
  const [battleOpponentName, setBattleOpponentName] = useState<string>('Dealer');
  const [battlePlayerName, setBattlePlayerName] = useState<string>('You');
  const [battlePlayerPfp, setBattlePlayerPfp] = useState<string | null>(null);
  const [battleOpponentPfp, setBattleOpponentPfp] = useState<string | null>(null);
  const [showLossPopup, setShowLossPopup] = useState<boolean>(false);
  const [showWinPopup, setShowWinPopup] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const CARDS_PER_PAGE = 12;

  // PvP States
  const [gameMode, setGameMode] = useState<'ai' | 'pvp' | null>(null);
  const [pvpMode, setPvpMode] = useState<'menu' | 'pvpMenu' | 'autoMatch' | 'createRoom' | 'joinRoom' | 'inRoom' | null>(null);
  const [roomCode, setRoomCode] = useState<string>('');
  const [currentRoom, setCurrentRoom] = useState<any>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // AI Difficulty (5 levels with progressive unlock)
  const [aiDifficulty, setAiDifficulty] = useState<'gey' | 'goofy' | 'gooner' | 'gangster' | 'gigachad'>('gey');

  // Economy mutations
  const awardPvECoins = useMutation(api.economy.awardPvECoins);
  const awardPvPCoins = useMutation(api.economy.awardPvPCoins);
  const [unlockedDifficulties, setUnlockedDifficulties] = useState<Set<string>>(new Set(['gey']));
  const [isDifficultyModalOpen, setIsDifficultyModalOpen] = useState(false);
  const [tempSelectedDifficulty, setTempSelectedDifficulty] = useState<'gey' | 'goofy' | 'gooner' | 'gangster' | 'gigachad' | null>(null);

  // Elimination Mode States
  const [battleMode, setBattleMode] = useState<'normal' | 'elimination'>('normal');
  const [eliminationPhase, setEliminationPhase] = useState<'ordering' | 'battle' | null>(null);
  const [orderedPlayerCards, setOrderedPlayerCards] = useState<any[]>([]);
  const [orderedOpponentCards, setOrderedOpponentCards] = useState<any[]>([]);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [roundResults, setRoundResults] = useState<('win' | 'loss' | 'tie')[]>([]);
  const [eliminationPlayerScore, setEliminationPlayerScore] = useState<number>(0);
  const [eliminationOpponentScore, setEliminationOpponentScore] = useState<number>(0);
  const [pvpBattleStarted, setPvpBattleStarted] = useState<boolean>(false); // PvP battle flag to prevent double-start

  // Profile States
  const [currentView, setCurrentView] = useState<'game' | 'profile' | 'leaderboard'>('game');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showCreateProfile, setShowCreateProfile] = useState<boolean>(false);
  const [profileUsername, setProfileUsername] = useState<string>('');
  const [isCreatingProfile, setIsCreatingProfile] = useState<boolean>(false);
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [currentLeaderboardPage, setCurrentLeaderboardPage] = useState<number>(1);
  const LEADERBOARD_PER_PAGE = 10;
  const [matchHistory, setMatchHistory] = useState<MatchHistory[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showChangeUsername, setShowChangeUsername] = useState<boolean>(false);

  // Defense Deck States
  const [showDefenseDeckSaved, setShowDefenseDeckSaved] = useState<boolean>(false);
  const [showPveCardSelection, setShowPveCardSelection] = useState<boolean>(false);
  const [pveSelectedCards, setPveSelectedCards] = useState<any[]>([]);
  const [pveSortByPower, setPveSortByPower] = useState<boolean>(false);
  const [newUsername, setNewUsername] = useState<string>('');
  const [isChangingUsername, setIsChangingUsername] = useState<boolean>(false);

  // Attack States
  const [showAttackCardSelection, setShowAttackCardSelection] = useState<boolean>(false);
  const [attackSelectedCards, setAttackSelectedCards] = useState<any[]>([]);
  const [targetPlayer, setTargetPlayer] = useState<UserProfile | null>(null);
  const [attacksRemaining, setAttacksRemaining] = useState<number>(MAX_ATTACKS_DEFAULT);
  const [isAttacking, setIsAttacking] = useState<boolean>(false);
  const [isConfirmingCards, setIsConfirmingCards] = useState<boolean>(false);

  // Notifications States
  const [defensesReceived, setDefensesReceived] = useState<any[]>([]);
  const [unreadDefenses, setUnreadDefenses] = useState<number>(0);

  // Calculate max attacks for current user
  const maxAttacks = useMemo(() => getMaxAttacks(address), [address]);

  // Battle Result States for sharing
  const [lastBattleResult, setLastBattleResult] = useState<{
    result: 'win' | 'loss' | 'tie';
    playerPower: number;
    opponentPower: number;
    opponentName: string;
    opponentTwitter?: string;
    type: 'pve' | 'pvp' | 'attack' | 'defense';
  } | null>(null);

  // Carregar estado da música do localStorage na montagem
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMusicEnabled = localStorage.getItem('musicEnabled');
      const savedMusicVolume = localStorage.getItem('musicVolume');

      if (savedMusicEnabled !== null) {
        setMusicEnabled(savedMusicEnabled === 'true');
      }
      if (savedMusicVolume !== null) {
        const volume = parseFloat(savedMusicVolume);
        setMusicVolume(volume);
        // Sincroniza o AudioManager.currentVolume imediatamente
        AudioManager.currentVolume = volume;
        devLog(`📦 Volume carregado do localStorage: ${volume} (${Math.round(volume * 100)}%)`);
      }
    }
  }, []);

  // Auto-connect Farcaster wallet in miniapp context
  useEffect(() => {
    const initFarcasterWallet = async () => {
      try {
        // Check if we're in Farcaster context
        if (sdk && typeof sdk.wallet !== 'undefined' && sdk.wallet.ethProvider) {
          setIsInFarcaster(true);
          const addresses = await sdk.wallet.ethProvider.request({
            method: "eth_requestAccounts"
          });
          if (addresses && addresses[0]) {
            setFarcasterAddress(addresses[0]);
            localStorage.setItem('connectedAddress', addresses[0].toLowerCase());
            devLog('✅ Auto-connected Farcaster wallet:', addresses[0]);

            // ✅ Save FID to profile for notifications
            try {
              const context = await sdk.context;
              const fid = context?.user?.fid;
              if (fid) {
                devLog('📱 Farcaster FID detected:', fid);
                // Update profile with FID
                const profile = await ConvexProfileService.getProfile(addresses[0]);
                if (profile && (!profile.fid || profile.fid !== fid.toString())) {
                  await ConvexProfileService.updateProfile(addresses[0], {
                    fid: fid.toString()
                  });
                  devLog('✅ FID saved to profile');
                }
              }
            } catch (fidError) {
              devLog('⚠️ Could not save FID:', fidError);
            }
          } else {
            // Failed to get address, reset Farcaster state
            setIsInFarcaster(false);
          }
        }
      } catch (err) {
        devLog('⚠️ Not in Farcaster context or wallet unavailable');
        // Reset Farcaster state on error
        setIsInFarcaster(false);
        setFarcasterAddress(null);
      } finally {
        // Always set checking to false after checking
        setIsCheckingFarcaster(false);
      }
    };
    initFarcasterWallet();
  }, []);

  // 🔔 Handler to enable Farcaster notifications
  const handleEnableNotifications = async () => {
    try {
      if (!sdk || !sdk.actions || !isInFarcaster) {
        devLog('⚠️ Farcaster SDK not available');
        return;
      }

      devLog('🔔 Requesting Farcaster notification permissions...');
      await sdk.actions.addMiniApp();
      devLog('✅ Notification permission requested');

      if (soundEnabled) AudioManager.buttonClick();
    } catch (error) {
      devError('❌ Error enabling notifications:', error);
      if (soundEnabled) AudioManager.buttonError();
    }
  };

  // Salvar estado da música no localStorage e controlar reprodução
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('musicEnabled', musicEnabled.toString());

      if (musicEnabled) {
        // Aplica volume ANTES de iniciar música para evitar bug de volume 0
        AudioManager.setVolume(musicVolume);
        AudioManager.startBackgroundMusic();
      } else {
        AudioManager.stopBackgroundMusic();
      }
    }
  }, [musicEnabled]);

  // Atualiza e salva volume da música quando musicVolume muda
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('musicVolume', musicVolume.toString());
      AudioManager.setVolume(musicVolume);
    }
  }, [musicVolume]);

  // Farcaster SDK - Informa que o app está pronto
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).sdk?.actions?.ready) {
      (window as any).sdk.actions.ready();
    }
  }, []);

  // Check for Twitter OAuth success
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const twitterConnected = urlParams.get('twitter_connected');
    const error = urlParams.get('error');

    if (twitterConnected) {
      // Check if this is a popup window
      if (window.opener) {
        // This is the popup - send message to parent and close
        window.opener.postMessage({ type: 'twitter_connected', username: twitterConnected }, window.location.origin);
        window.close();
      } else if (userProfile) {
        // This is the main window - update profile
        setUserProfile({ ...userProfile, twitter: twitterConnected });
        // Clean up URL
        window.history.replaceState({}, '', '/');
        // Show success message
        alert(`✅ Twitter connected: @${twitterConnected}`);
      }
    } else if (error === 'twitter_auth_failed') {
      if (window.opener) {
        // This is the popup - notify parent and close
        window.opener.postMessage({ type: 'twitter_error' }, window.location.origin);
        window.close();
      } else {
        alert('❌ Failed to connect Twitter. Please try again.');
        window.history.replaceState({}, '', '/');
      }
    }

    // Listen for messages from OAuth popup
    const handleMessage = (event: MessageEvent) => {
      // Verify origin for security
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'twitter_connected') {
        devLog('✅ Twitter connected via popup:', event.data.username);
        if (address) {
          // Reload profile from Convex to get the updated Twitter handle
          ConvexProfileService.getProfile(address).then((profile) => {
            if (profile) {
              setUserProfile(profile);
              devLog('✅ Profile reloaded with Twitter:', profile.twitter);
            }
          });
        }
      } else if (event.data.type === 'twitter_error') {
        alert('❌ Failed to connect Twitter. Please try again.');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [userProfile, address]);

  // Check for attack parameter (from rematch button)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const attackAddress = urlParams.get('attack');

    if (attackAddress && address && nfts.length > 0) {
      // Fetch target player profile
      ConvexProfileService.getProfile(attackAddress).then((profile) => {
        if (profile) {
          devLog('🎯 Opening attack modal for:', profile.username);
          setTargetPlayer(profile);
          setShowAttackCardSelection(true);
          setAttackSelectedCards([]);
          setCurrentView('game');
          // Clean up URL
          window.history.replaceState({}, '', '/');
        } else {
          devWarn('⚠️ Could not find profile for attack target:', attackAddress);
          // Clean up URL even if profile not found
          window.history.replaceState({}, '', '/');
        }
      }).catch((err) => {
        devError('❌ Error loading attack target profile:', err);
        // Clean up URL on error
        window.history.replaceState({}, '', '/');
      });
    }
  }, [address, nfts.length]);

  const toggleMusic = useCallback(async () => {
    await AudioManager.init();
    if (soundEnabled) {
      if (!musicEnabled) AudioManager.toggleOn();
      else AudioManager.toggleOff();
    }
    setMusicEnabled(!musicEnabled);
  }, [musicEnabled, soundEnabled]);

  // Wallet connection is now handled by RainbowKit ConnectButton
  // No need for manual connectWallet function

  const disconnectWallet = useCallback(() => {
    if (soundEnabled) AudioManager.buttonNav();
    disconnect();
    // Clear Farcaster state as well
    setFarcasterAddress(null);
    setIsInFarcaster(false);
    localStorage.removeItem('connectedAddress');
    setNfts([]);
    setSelectedCards([]);
    setFilteredCount(0);
    setStatus("idle");
    setErrorMsg(null);
    setPlayerPower(0);
    setDealerPower(0);
    setResult('');
    setDealerCards([]);
    devLog('🔌 Desconectado');
  }, [soundEnabled, disconnect]);

  const loadNFTs = useCallback(async () => {
    if (!address) {
      devLog('⚠️ loadNFTs called but no address');
      return;
    }
    devLog('🎴 Starting to load NFTs for address:', address);
    try {
      setStatus("fetching");
      setErrorMsg(null);
      devLog('📡 Fetching NFTs from Alchemy...');
      const raw = await fetchNFTs(address);
      devLog('✅ Received NFTs from Alchemy:', raw.length);

      const METADATA_BATCH_SIZE = 50;
      const enrichedRaw = [];

      for (let i = 0; i < raw.length; i += METADATA_BATCH_SIZE) {
        const batch = raw.slice(i, i + METADATA_BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(async (nft) => {
            const tokenUri = nft?.tokenUri?.gateway || nft?.raw?.tokenUri;
            if (!tokenUri) return nft;
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 2000);
              const res = await fetch(tokenUri, { signal: controller.signal });
              clearTimeout(timeoutId);
              if (res.ok) {
                const metadata = await res.json();
                return { ...nft, metadata: metadata, raw: { ...nft.raw, metadata: metadata } };
              }
            } catch {}
            return nft;
          })
        );
        enrichedRaw.push(...batchResults);
      }

      // Filter unopened cards AFTER metadata refresh (not before)
      // This ensures we have fresh attributes to check
      const revealed = enrichedRaw.filter((nft) => {
        const rarity = findAttr(nft, 'rarity').toLowerCase();
        const status = findAttr(nft, 'status').toLowerCase();
        // Keep cards that are NOT unopened
        return rarity !== 'unopened' && status !== 'unopened';
      });

      const filtered = enrichedRaw.length - revealed.length;
      setFilteredCount(filtered);
      devLog(`📊 NFT Stats: Total=${enrichedRaw.length}, Revealed=${revealed.length}, Filtered=${filtered}`);

      const IMAGE_BATCH_SIZE = 50;
      const processed = [];

      for (let i = 0; i < revealed.length; i += IMAGE_BATCH_SIZE) {
        const batch = revealed.slice(i, i + IMAGE_BATCH_SIZE);
        const enriched = await Promise.all(
          batch.map(async (nft) => {
            const imageUrl = await getImage(nft);
            return {
              ...nft,
              imageUrl,
              rarity: findAttr(nft, 'rarity'),
              status: findAttr(nft, 'status'),
              wear: findAttr(nft, 'wear'),
              foil: findAttr(nft, 'foil'),
              power: calcPower(nft),
            };
          })
        );
        processed.push(...enriched);
        setNfts([...processed]);
      }

      setStatus("loaded");
      devLog('🎉 NFTs loaded successfully:', processed.length);
    } catch (e: any) {
      devLog('❌ Error loading NFTs:', e);
      setStatus("failed");
      setErrorMsg(e.message);
    }
  }, [address]);

  useEffect(() => {
    if (address) {
      devLog('📦 Address changed, loading NFTs:', address);
      loadNFTs();
    }
  }, [address, loadNFTs]);

  const loadJCNFTs = useCallback(async () => {
    try {
      devLog('⚡ Loading JC deck from optimized static file...');

      // Load from optimized static endpoint (instant!)
      const res = await fetch('/api/jc-deck');
      if (!res.ok) {
        throw new Error(`Failed to load JC deck: ${res.status}`);
      }

      const data = await res.json();
      const cards = data.cards || [];

      devLog(`✅ JC deck loaded instantly: ${cards.length} cards from ${data.source}`);

      // Map to expected format with normalized URLs
      const processed = cards.map((card: any) => ({
        tokenId: card.tokenId,
        imageUrl: normalizeUrl(card.imageUrl || ''),
        rarity: card.rarity,
        status: card.status,
        power: card.power,
        name: card.name,
        attributes: card.attributes || [],
        // Reconstruct full NFT object if needed
        raw: {
          metadata: {
            name: card.name,
            image: card.imageUrl,
            attributes: card.attributes
          }
        }
      }));

      setJcNfts(processed);
      setJcNftsLoading(false);

      devLog('✅ JC NFTs ready:', processed.length, 'cards');
      devLog(`   Legendary: ${processed.filter((c: any) => c.rarity === 'Legendary').length}`);
      devLog(`   Epic: ${processed.filter((c: any) => c.rarity === 'Epic').length}`);
      devLog(`   Rare: ${processed.filter((c: any) => c.rarity === 'Rare').length}`);

    } catch (e: any) {
      devError('❌ Error loading JC NFTs from static file:', e);
      devLog('⚠️  Falling back to live API...');

      // Fallback to original live API method
      try {
        const revealed = await fetchNFTs(JC_WALLET_ADDRESS, JC_CONTRACT_ADDRESS, (page, cards) => {
          setJcLoadingProgress({ page, cards });
        });

        const processed = revealed.map(nft => {
          const imageUrl = nft?.image?.cachedUrl ||
                           nft?.image?.thumbnailUrl ||
                           nft?.image?.originalUrl ||
                           nft?.raw?.metadata?.image ||
                           '';

          return {
            ...nft,
            imageUrl: normalizeUrl(imageUrl),
            rarity: findAttr(nft, 'rarity'),
            status: findAttr(nft, 'status'),
            wear: findAttr(nft, 'wear'),
            foil: findAttr(nft, 'foil'),
            power: calcPower(nft),
          };
        });

        setJcNfts(processed);
        setJcNftsLoading(false);
        setJcLoadingProgress(null);
        devLog('✅ JC NFTs loaded from live API:', processed.length, 'cards');

      } catch (fallbackError: any) {
        devError('❌ Fallback also failed:', fallbackError);
        setJcNftsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadJCNFTs();
  }, []); // Run only once on mount

  // Load unlocked difficulties from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('unlockedDifficulties');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setUnlockedDifficulties(new Set(parsed));
      } catch (e) {
        devError('Error loading unlocked difficulties:', e);
      }
    }
  }, []);

  // Save unlocked difficulties to localStorage
  const unlockNextDifficulty = useCallback((currentDifficulty: string) => {
    const difficultyOrder = ['gey', 'goofy', 'gooner', 'gangster', 'gigachad'];
    const currentIndex = difficultyOrder.indexOf(currentDifficulty);

    if (currentIndex < difficultyOrder.length - 1) {
      const nextDifficulty = difficultyOrder[currentIndex + 1];
      setUnlockedDifficulties(prev => {
        const newSet = new Set(prev);
        newSet.add(nextDifficulty);
        localStorage.setItem('unlockedDifficulties', JSON.stringify(Array.from(newSet)));
        return newSet;
      });
      devLog(`Unlocked difficulty: ${nextDifficulty}`);
      return nextDifficulty;
    }
    return null;
  }, []);

  const handleSelectCard = useCallback((card: any) => {
    setSelectedCards(prev => {
      const isSelected = prev.find(c => c.tokenId === card.tokenId);
      if (isSelected) {
        if (soundEnabled) AudioManager.deselectCard();
        return prev.filter(c => c.tokenId !== card.tokenId);
      } else if (prev.length < HAND_SIZE_CONST) {
        if (soundEnabled) AudioManager.selectCard();
        const newSelection = [...prev, card];

        // Auto-scroll to battle button on mobile when 5 cards selected
        if (newSelection.length === HAND_SIZE_CONST) {
          setTimeout(() => {
            const battleButton = document.getElementById('battle-button');
            if (battleButton && window.innerWidth < 768) {
              battleButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 300);
        }

        return newSelection;
      }
      return prev;
    });
  }, [soundEnabled]);

  const clearSelection = useCallback(() => {
    setSelectedCards([]);
    if (soundEnabled) AudioManager.deselectCard();
  }, [soundEnabled]);

  const selectStrongest = useCallback(() => {
    const sorted = [...nfts].sort((a, b) => (b.power || 0) - (a.power || 0));
    const strongest = sorted.slice(0, HAND_SIZE_CONST);
    setSelectedCards(strongest);
    if (soundEnabled) AudioManager.selectCard();

    // Auto-scroll to battle button on mobile
    setTimeout(() => {
      const battleButton = document.getElementById('battle-button');
      if (battleButton && window.innerWidth < 768) {
        battleButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 300);
  }, [nfts, soundEnabled]);

  // Generate AI hand with strategic ordering based on difficulty
  const generateAIHand = useCallback((difficulty: 'gey' | 'goofy' | 'gooner' | 'gangster' | 'gigachad') => {
    const available = jcNfts;
    if (available.length < HAND_SIZE_CONST) {
      alert('⏳ AI deck not ready yet...');
      return [];
    }

    const sorted = [...available].sort((a, b) => (b.power || 0) - (a.power || 0));
    let pickedCards: any[] = [];

    // Select cards based on difficulty (same logic as normal battle)
    switch (difficulty) {
      case 'gey':
        const weakest = sorted.filter(c => (c.power || 0) === 15);
        pickedCards = weakest.sort(() => Math.random() - 0.5).slice(0, HAND_SIZE_CONST);
        break;
      case 'goofy':
        const weak = sorted.filter(c => {
          const p = c.power || 0;
          return p === 18 || p === 21;
        });
        pickedCards = weak.sort(() => Math.random() - 0.5).slice(0, HAND_SIZE_CONST);
        break;
      case 'gooner':
        const medium = sorted.filter(c => {
          const p = c.power || 0;
          return p === 60 || p === 72;
        });
        pickedCards = medium.sort(() => Math.random() - 0.5).slice(0, HAND_SIZE_CONST);
        break;
      case 'gangster':
        const cards150 = sorted.filter(c => (c.power || 0) === 150);
        if (cards150.length >= HAND_SIZE_CONST) {
          pickedCards = cards150.sort(() => Math.random() - 0.5).slice(0, HAND_SIZE_CONST);
        } else {
          const legendaries = sorted.filter(c => (c.rarity || '').toLowerCase().includes('legend'));
          pickedCards = legendaries.slice(0, HAND_SIZE_CONST);
        }
        break;
      case 'gigachad':
        pickedCards = sorted.slice(0, HAND_SIZE_CONST);
        break;
    }

    // Apply strategic ordering based on difficulty
    let orderedCards: any[] = [];
    switch (difficulty) {
      case 'gey':
      case 'goofy':
        // Random order (no strategy)
        orderedCards = pickedCards.sort(() => Math.random() - 0.5);
        break;
      case 'gooner':
        // Weak-first strategy (sacrifice weak cards)
        orderedCards = [...pickedCards].sort((a, b) => (a.power || 0) - (b.power || 0));
        break;
      case 'gangster':
        // Strong-first strategy (overwhelming force)
        orderedCards = [...pickedCards].sort((a, b) => (b.power || 0) - (a.power || 0));
        break;
      case 'gigachad':
        // Balanced strategy (strong-weak-strong-weak-strong)
        const sortedByPower = [...pickedCards].sort((a, b) => (b.power || 0) - (a.power || 0));
        orderedCards = [
          sortedByPower[0], // strongest
          sortedByPower[4], // weakest
          sortedByPower[1], // 2nd strongest
          sortedByPower[3], // 2nd weakest
          sortedByPower[2]  // middle
        ];
        break;
    }

    console.log(`🤖 AI ordered cards for ${difficulty}:`, orderedCards.map(c => `#${c.tokenId} (${c.power} PWR)`));
    return orderedCards;
  }, [jcNfts]);

  const playHand = useCallback((cardsToPlay?: any[]) => {
    const cards = cardsToPlay || selectedCards;
    if (cards.length !== HAND_SIZE_CONST || isBattling) return;
    setIsBattling(true);
    setShowBattleScreen(true);
    setBattlePhase('cards');
    setBattleOpponentName('Mecha George Floyd'); // Show Mecha George Floyd name
    setBattlePlayerName(userProfile?.username || 'You'); // Show player username
    setBattleOpponentPfp(`/images/mecha-george-floyd.jpg?v=${Date.now()}`); // Mecha George pfp with cache bust
    // Player pfp from Twitter if available (same logic as profile/home)
    setBattlePlayerPfp(userProfile?.twitter ? `https://unavatar.io/twitter/${userProfile.twitter}` : null);
    setShowLossPopup(false);
    setShowWinPopup(false);
    setResult('');
    setPlayerPower(0);
    setDealerPower(0);

    if (soundEnabled) AudioManager.playHand();

    const playerTotal = cards.reduce((sum, c) => sum + (c.power || 0), 0);
    // Use JC's deck for dealer cards
    const available = jcNfts;

    devLog('🎮 BATTLE DEBUG:');
    devLog('  JC available cards:', available.length);
    devLog('  JC deck loading status:', jcNftsLoading);
    devLog('  AI difficulty:', aiDifficulty);
    if (available.length > 0) {
      const sorted = [...available].sort((a, b) => (b.power || 0) - (a.power || 0));
      devLog('  Top 5 strongest:', sorted.slice(0, 5).map(c => ({ tokenId: c.tokenId, power: c.power, rarity: c.rarity })));
      devLog('  Bottom 5 weakest:', sorted.slice(-5).map(c => ({ tokenId: c.tokenId, power: c.power, rarity: c.rarity })));
    }

    if (available.length < HAND_SIZE_CONST) {
      devLog('⚠️ Mecha George Floyd deck not loaded yet - retrying in 2 seconds...');

      // Auto-retry after 2 seconds if deck not loaded
      if (!jcNftsLoading) {
        setTimeout(() => {
          devLog('🔄 Retrying battle after waiting for deck to load...');
          playHand();
        }, 2000);
      }

      setIsBattling(false);
      setShowBattleScreen(false);
      alert('⏳ Loading AI deck... Please try again in a moment.');
      return;
    }

    const shuffled = [...available].sort(() => Math.random() - 0.5);
    const sorted = [...available].sort((a, b) => (b.power || 0) - (a.power || 0));

    console.log('🎲 AI DECK SELECTION DEBUG:');
    console.log('  Available cards:', available.length);
    console.log('  Sorted top 5:', sorted.slice(0, 5).map(c => `#${c.tokenId} (${c.power} PWR)`));
    console.log('  Difficulty:', aiDifficulty);

    let pickedDealer: any[] = [];

    // Different strategies based on difficulty (5 levels)
    // Power-based ranges (actual unique values: 15, 18, 21, 38, 45, 53, 60, 72, 84, 150, 180, 225)
    switch (aiDifficulty) {
      case 'gey':
        // GEY (Level 1): Weakest (15 PWR only), total = 75 PWR
        const weakest = sorted.filter(c => (c.power || 0) === 15);
        pickedDealer = weakest.sort(() => Math.random() - 0.5).slice(0, HAND_SIZE_CONST);
        console.log('🏳️‍🌈 GEY: 15 PWR only');
        console.log('  Available:', weakest.length);
        console.log('  Picked 5:', pickedDealer.map(c => `#${c.tokenId} (${c.power} PWR)`));
        console.log('  Total PWR:', pickedDealer.reduce((sum, c) => sum + (c.power || 0), 0));
        break;

      case 'goofy':
        // GOOFY (Level 2): Weak (18-21 PWR), total ~90-105 PWR
        const weak = sorted.filter(c => {
          const p = c.power || 0;
          return p === 18 || p === 21;
        });
        if (weak.length >= HAND_SIZE_CONST) {
          pickedDealer = weak.sort(() => Math.random() - 0.5).slice(0, HAND_SIZE_CONST);
        } else {
          // Fallback: expand to include nearby power values (15-38 range)
          console.log('  ⚠️ Not enough 18-21 PWR cards, using expanded range');
          const weakExpanded = sorted.filter(c => {
            const p = c.power || 0;
            return p >= 18 && p <= 38;
          });
          pickedDealer = weakExpanded.sort(() => Math.random() - 0.5).slice(0, HAND_SIZE_CONST);
        }
        console.log('🤪 GOOFY: 18-21 PWR');
        console.log('  Available:', weak.length);
        console.log('  Picked 5:', pickedDealer.map(c => `#${c.tokenId} (${c.power} PWR)`));
        console.log('  Total PWR:', pickedDealer.reduce((sum, c) => sum + (c.power || 0), 0));
        break;

      case 'gooner':
        // GOONER (Level 3): Medium (60-72 PWR), total ~300-360 PWR
        const medium = sorted.filter(c => {
          const p = c.power || 0;
          return p === 60 || p === 72;
        });
        pickedDealer = medium.sort(() => Math.random() - 0.5).slice(0, HAND_SIZE_CONST);
        console.log('💀 GOONER: 60-72 PWR');
        console.log('  Available:', medium.length);
        console.log('  Picked 5:', pickedDealer.map(c => `#${c.tokenId} (${c.power} PWR)`));
        console.log('  Total PWR:', pickedDealer.reduce((sum, c) => sum + (c.power || 0), 0));
        break;

      case 'gangster':
        // GANGSTER (Level 4): Strong legendaries (150 PWR only, total 750)
        // Filter cards with exactly 150 power
        const cards150 = sorted.filter(c => (c.power || 0) === 150);
        console.log('🔫 GANGSTER DEBUG:');
        console.log('  Total cards in sorted:', sorted.length);
        console.log('  Cards with 150 PWR:', cards150.length);
        if (cards150.length > 0) {
          console.log('  First 3 cards with 150 PWR:', cards150.slice(0, 3).map(c => `#${c.tokenId} (${c.power} PWR, ${c.rarity})`));
        }

        if (cards150.length >= HAND_SIZE_CONST) {
          // Randomize to add variety
          pickedDealer = cards150.sort(() => Math.random() - 0.5).slice(0, HAND_SIZE_CONST);
          console.log('  ✅ Picked', HAND_SIZE_CONST, 'random cards from 150 PWR pool');
        } else {
          // Fallback: pick legendaries
          console.log('  ⚠️ Not enough 150 PWR cards, using legendaries fallback');
          const legendaries = sorted.filter(c => {
            const r = (c.rarity || '').toLowerCase();
            return r.includes('legend');
          });
          console.log('  Legendaries found:', legendaries.length);
          pickedDealer = legendaries.slice(0, HAND_SIZE_CONST);
        }
        console.log('🔫 GANGSTER FINAL:', pickedDealer.length, 'cards picked');
        console.log('  Cards:', pickedDealer.map(c => `#${c.tokenId} (${c.power} PWR)`));
        console.log('  Total PWR:', pickedDealer.reduce((sum, c) => sum + (c.power || 0), 0));
        break;

      case 'gigachad':
        // GIGACHAD (Level 5): TOP 5 STRONGEST (always same cards, total ~855)
        pickedDealer = sorted.slice(0, HAND_SIZE_CONST);
        console.log('💪 GIGACHAD picked top 5:', pickedDealer.map(c => `#${c.tokenId} (${c.power} PWR)`));
        console.log('💪 GIGACHAD total PWR:', pickedDealer.reduce((sum, c) => sum + (c.power || 0), 0));
        break;
    }

    setTimeout(() => {
      // Use orderedOpponentCards if elimination mode, otherwise use pickedDealer
      setDealerCards(battleMode === 'elimination' ? orderedOpponentCards : pickedDealer);
      if (soundEnabled) AudioManager.shuffle();
    }, 1000);

    const dealerTotal = pickedDealer.reduce((sum, c) => sum + (c.power || 0), 0);

    // Check if this is elimination mode
    if (battleMode === 'elimination') {
      // Elimination mode: play round-by-round
      setTimeout(() => {
        // Compare current round's cards
        const playerCard = orderedPlayerCards[currentRound - 1];
        const opponentCard = orderedOpponentCards[currentRound - 1];

        if (!playerCard || !opponentCard) {
          console.error('❌ Missing cards for elimination round!');
          return;
        }

        setPlayerPower(playerCard.power || 0);
        setDealerPower(opponentCard.power || 0);

        setBattlePhase('clash');
        if (soundEnabled) AudioManager.cardBattle();
      }, 2500);

      setTimeout(() => {
        const playerCard = orderedPlayerCards[currentRound - 1];
        const opponentCard = orderedOpponentCards[currentRound - 1];
        const playerCardPower = playerCard?.power || 0;
        const opponentCardPower = opponentCard?.power || 0;

        setBattlePhase('result');

        let roundResult: 'win' | 'loss' | 'tie';
        let newPlayerScore = eliminationPlayerScore;
        let newOpponentScore = eliminationOpponentScore;

        if (playerCardPower > opponentCardPower) {
          roundResult = 'win';
          newPlayerScore++;
          setResult(t('playerWins'));
        } else if (playerCardPower < opponentCardPower) {
          roundResult = 'loss';
          newOpponentScore++;
          setResult(t('dealerWins'));
        } else {
          roundResult = 'tie';
          setResult(t('tie'));
        }

        setEliminationPlayerScore(newPlayerScore);
        setEliminationOpponentScore(newOpponentScore);
        setRoundResults([...roundResults, roundResult]);

        console.log(`⚔️ Round ${currentRound} result:`, roundResult, `Score: ${newPlayerScore}-${newOpponentScore}`);

        // Check if match is over
        setTimeout(() => {
          const isMatchOver = currentRound === 5 || newPlayerScore === 3 || newOpponentScore === 3;

          if (isMatchOver) {
            // Determine final winner
            const finalResult: 'win' | 'loss' | 'tie' = newPlayerScore > newOpponentScore ? 'win' : newPlayerScore < newOpponentScore ? 'loss' : 'tie';

            if (finalResult === 'win') {
              setResult(t('playerWins'));
              // Unlock next difficulty
              const unlockedDiff = unlockNextDifficulty(aiDifficulty);
              if (unlockedDiff) {
                devLog(`🔓 Unlocked new difficulty: ${unlockedDiff.toUpperCase()}`);
              }
            } else if (finalResult === 'loss') {
              setResult(t('dealerWins'));
            } else {
              setResult(t('tie'));
            }

            // Record match
            if (userProfile && address) {
              ConvexProfileService.recordMatch(
              address,
              'pve',
              finalResult,
              newPlayerScore,
              newOpponentScore,
              orderedPlayerCards,
              orderedOpponentCards
              ).then(async () => {
                ConvexProfileService.getMatchHistory(address, 20).then(setMatchHistory);
                
                // Award economy coins for PvE Elimination
                try {
                  const reward = await awardPvECoins({
                    address,
                    difficulty: aiDifficulty,
                    won: finalResult === 'win'
                  });
                  if (reward && reward.awarded > 0) {
                    devLog(`💰 Elimination Mode: Awarded ${reward.awarded} $TESTVBMS`, reward);
                  }
                } catch (err) {
                  devError('❌ Error awarding PvE coins (Elimination):', err);
                }
              }).catch(err => devError('Error recording match:', err));
            }

            // Close battle and show result
            setTimeout(() => {
              setIsBattling(false);
              setShowBattleScreen(false);
              setBattlePhase('cards');
              setBattleMode('normal');
              setEliminationPhase(null);

              setLastBattleResult({
                result: finalResult,
                playerPower: newPlayerScore,
                opponentPower: newOpponentScore,
                opponentName: 'Mecha George Floyd',
                type: 'pve'
              });

              if (finalResult === 'win') {
                setShowWinPopup(true);
                if (soundEnabled) AudioManager.win();
              } else if (finalResult === 'loss') {
                setShowLossPopup(true);
                if (soundEnabled) AudioManager.lose();
              } else {
                if (soundEnabled) AudioManager.tie();
              }
            }, 2000);
          } else {
            // Next round
            setTimeout(() => {
              setCurrentRound(currentRound + 1);
              setBattlePhase('cards');

              // Trigger next round battle sequence
              setTimeout(() => {
                const nextPlayerCard = orderedPlayerCards[currentRound]; // currentRound is still old value here
                const nextOpponentCard = orderedOpponentCards[currentRound];

                setPlayerPower(nextPlayerCard?.power || 0);
                setDealerPower(nextOpponentCard?.power || 0);

                setBattlePhase('clash');
                if (soundEnabled) AudioManager.cardBattle();

                setTimeout(() => {
                  setBattlePhase('result');
                }, 1000);
              }, 1000);
            }, 2000);
          }
        }, 2000);
      }, 3500);

      return; // Skip normal battle logic
    }

    // Normal mode battle logic
    setTimeout(() => {
      setBattlePhase('clash');
      if (soundEnabled) AudioManager.cardBattle();
    }, 2500);

    setTimeout(() => {
      setPlayerPower(playerTotal);
      setDealerPower(dealerTotal);
      setBattlePhase('result');
    }, 3500);

    setTimeout(() => {
      devLog('🎮 RESULTADO:', { playerTotal, dealerTotal });

      let matchResult: 'win' | 'loss' | 'tie';

      if (playerTotal > dealerTotal) {
        devLog('✅ JOGADOR VENCEU!');
        matchResult = 'win';
        setResult(t('playerWins'));

        // Unlock next difficulty on win
        const unlockedDiff = unlockNextDifficulty(aiDifficulty);
        if (unlockedDiff) {
          devLog(`🔓 Unlocked new difficulty: ${unlockedDiff.toUpperCase()}`);
        }
      } else if (playerTotal < dealerTotal) {
        devLog('❌ DEALER VENCEU!');
        matchResult = 'loss';
        setResult(t('dealerWins'));
      } else {
        devLog('🤝 EMPATE!');
        matchResult = 'tie';
        setResult(t('tie'));
      }

      // Record PvE match if user has profile
      if (userProfile && address) {
        ConvexProfileService.recordMatch(
          address,
          'pve',
          matchResult,
          playerTotal,
          dealerTotal,
          cards,
          pickedDealer
        ).then(async () => {
          // Reload match history
          ConvexProfileService.getMatchHistory(address, 20).then(setMatchHistory);
          
          // Award economy coins for PvE
          try {
            const reward = await awardPvECoins({
              address,
              difficulty: aiDifficulty,
              won: matchResult === 'win'
            });
            if (reward && reward.awarded > 0) {
              devLog(`💰 Awarded ${reward.awarded} $TESTVBMS`, reward);
            }
          } catch (err) {
            devError('❌ Error awarding PvE coins:', err);
          }
        }).catch(err => devError('Error recording match:', err));
      }

      // Fecha a tela de batalha E mostra popup SIMULTANEAMENTE
      setTimeout(() => {
        setIsBattling(false);
        setShowBattleScreen(false);
        setBattlePhase('cards');

        // Set last battle result for sharing
        setLastBattleResult({
          result: matchResult,
          playerPower: playerTotal,
          opponentPower: dealerTotal,
          opponentName: 'Mecha George Floyd',
          type: 'pve'
        });

        // Mostra popup IMEDIATAMENTE
        if (matchResult === 'win') {
          setShowWinPopup(true);
          if (soundEnabled) AudioManager.win();
        } else if (matchResult === 'loss') {
          setShowLossPopup(true);
          if (soundEnabled) AudioManager.lose();
        } else {
          if (soundEnabled) AudioManager.tie();
        }
      }, 2000);
    }, 4500);
  }, [selectedCards, nfts, t, soundEnabled, isBattling, aiDifficulty, address, userProfile]);

  const saveDefenseDeck = useCallback(async () => {
    if (!address || !userProfile || selectedCards.length !== HAND_SIZE_CONST) return;

    try {
      // ✅ Verify profile exists in Convex first
      devLog('🔍 Verifying profile exists...');
      const existingProfile = await ConvexProfileService.getProfile(address);
      if (!existingProfile) {
        devError('❌ Profile not found in Convex!');
        alert('Error: Your profile was not found. Please create a profile first.');
        return;
      }
      devLog('✅ Profile verified:', existingProfile.username);

      // ✅ Validate all cards have required data
      const invalidCards = selectedCards.filter(card =>
        !card.tokenId ||
        typeof card.power !== 'number' ||
        isNaN(card.power) ||
        !card.imageUrl ||
        card.imageUrl === 'undefined' ||
        card.imageUrl === ''
      );

      if (invalidCards.length > 0) {
        devError('❌ Invalid cards detected:', invalidCards);
        alert(`Error: ${invalidCards.length} card(s) have invalid data (missing image or power). Please refresh the page and try again.`);
        return;
      }

      // ✅ MUDANÇA: Salvar objetos completos ao invés de apenas tokenIds
      const defenseDeckData = selectedCards.map(card => {
        const hasFoil = card.foil && card.foil !== 'None' && card.foil !== '';
        return {
          tokenId: String(card.tokenId),
          power: Number(card.power) || 0,
          imageUrl: String(card.imageUrl),
          name: card.name || `Card #${card.tokenId}`,
          rarity: card.rarity || 'Common',
          foil: hasFoil ? String(card.foil) : undefined,
        };
      });

      devLog('💾 Saving defense deck:', {
        address,
        cardCount: defenseDeckData.length,
        cards: defenseDeckData.map(c => ({
          tokenId: c.tokenId,
          power: c.power,
          foil: c.foil,
          imageUrl: c.imageUrl.substring(0, 50) + '...'
        }))
      });

      // ✅ Try to save with retry logic
      let saveSuccess = false;
      let lastError: any = null;

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          devLog(`📡 Attempt ${attempt}/3 to save defense deck...`);
          await ConvexProfileService.updateDefenseDeck(address, defenseDeckData);
          devLog(`✅ Defense deck saved successfully on attempt ${attempt}`);
          saveSuccess = true;
          break;
        } catch (err: any) {
          lastError = err;
          devError(`❌ Attempt ${attempt}/3 failed:`, err);

          // If it's the last attempt, throw
          if (attempt === 3) {
            throw err;
          }

          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        }
      }

      if (saveSuccess) {
        if (soundEnabled) AudioManager.buttonSuccess();
        setShowDefenseDeckSaved(true);

        // Hide success message after 3 seconds
        setTimeout(() => {
          setShowDefenseDeckSaved(false);
        }, 3000);

        // Reload profile to get updated defense deck
        const updatedProfile = await ConvexProfileService.getProfile(address);
        if (updatedProfile) {
          setUserProfile(updatedProfile);
        }
      }
    } catch (error: any) {
      devError('Error saving defense deck:', error);

      // More helpful error message
      const errorMsg = error?.message || String(error);
      if (errorMsg.includes('Server Error') || errorMsg.includes('Request ID')) {
        alert('Error: Convex server error. This might be temporary. Please wait a few seconds and try again.');
      } else if (errorMsg.includes('Profile not found')) {
        alert('Error: Your profile was not found. Please refresh the page and try again.');
      } else {
        alert(`Error saving defense deck: ${errorMsg}\n\nPlease try again or refresh the page.`);
      }
    }
  }, [address, userProfile, selectedCards, soundEnabled]);

  const totalPower = useMemo(() =>
    selectedCards.reduce((sum, c) => sum + (c.power || 0), 0),
    [selectedCards]
  );

  const sortedNfts = useMemo(() => {
    if (!sortByPower) return nfts;
    return [...nfts].sort((a, b) => (b.power || 0) - (a.power || 0));
  }, [nfts, sortByPower]);

  const totalPages = Math.ceil(sortedNfts.length / CARDS_PER_PAGE);

  const displayNfts = useMemo(() => {
    const start = (currentPage - 1) * CARDS_PER_PAGE;
    const end = start + CARDS_PER_PAGE;
    return sortedNfts.slice(start, end);
  }, [sortedNfts, currentPage, CARDS_PER_PAGE]);

  useEffect(() => {
    setCurrentPage(1);
  }, [sortByPower, nfts.length]);

  // Sorted NFTs for attack modal
  const sortedAttackNfts = useMemo(() => {
    if (!sortAttackByPower) return nfts;
    return [...nfts].sort((a, b) => (b.power || 0) - (a.power || 0));
  }, [nfts, sortAttackByPower]);

  // Sorted NFTs for PvE modal
  const sortedPveNfts = useMemo(() => {
    if (!pveSortByPower) return nfts;
    return [...nfts].sort((a, b) => (b.power || 0) - (a.power || 0));
  }, [nfts, pveSortByPower]);

  // Convex Room Listener - Escuta mudanças na sala em tempo real
  useEffect(() => {
    if (pvpMode === 'inRoom' && roomCode) {
      // Reset battle flag when entering a new room to prevent stale state from previous battles
      setPvpBattleStarted(false);
      devLog('🔄 Reset pvpBattleStarted to false for new room');
      devLog('🎧 Convex listener started for room:', roomCode);
      // battleStarted is now a state variable (pvpBattleStarted)
      let hasSeenRoom = false; // Flag para rastrear se já vimos a sala pelo menos uma vez

      const unsubscribe = ConvexPvPService.watchRoom(roomCode, async (room) => {
        if (room) {
          hasSeenRoom = true; // Marca que vimos a sala
          // Check if players are ready (Convex: ready = has cards)
          const hostReady = !!room.hostCards && room.hostCards.length > 0;
          const guestReady = !!room.guestCards && room.guestCards.length > 0;

          devLog('🔄 Room update received:', {
            hostReady,
            guestReady,
            roomStatus: room.status,
            pvpBattleStarted
          });
          setCurrentRoom(room);

          // Se ambos os jogadores estiverem prontos, inicia a batalha
          // Só inicia quando status é 'playing' (após ambos submeterem cartas)
          if (hostReady && guestReady && room.status === 'playing' && !pvpBattleStarted) {
            setPvpBattleStarted(true); // Marca que a batalha já iniciou
            devLog('✅ Ambos jogadores prontos! Iniciando batalha...');

            // Determina quem é o jogador local e quem é o oponente
            const isHost = room.hostAddress === address?.toLowerCase();
            const playerCards = isHost ? (room.hostCards || []) : (room.guestCards || []);
            const opponentCards = isHost ? (room.guestCards || []) : (room.hostCards || []);
            const playerPower = isHost ? (room.hostPower || 0) : (room.guestPower || 0);
            const opponentPower = isHost ? (room.guestPower || 0) : (room.hostPower || 0);
            const opponentAddress = isHost ? room.guestAddress : room.hostAddress;
            const opponentName = isHost ? (room.guestUsername || 'Guest') : (room.hostUsername || 'Host');
            const playerName = isHost ? (room.hostUsername || 'You') : (room.guestUsername || 'You');

            // Busca perfil do oponente para pegar Twitter
            let opponentTwitter = undefined;
            if (opponentAddress) {
              try {
                const opponentProfile = await ConvexProfileService.getProfile(opponentAddress);
                opponentTwitter = opponentProfile?.twitter;
                console.log('Opponent profile loaded:', opponentProfile?.username, 'twitter:', opponentTwitter);
              } catch (e) {
                console.log('Failed to load opponent profile:', e);
              }
            }

            // Executa a batalha PvP com animações (igual PVE)
            setIsBattling(true);
            setShowBattleScreen(true);
            setBattlePhase('cards');
            setBattleOpponentName(opponentName); // Show PvP opponent username
            setBattlePlayerName(playerName); // Show player username
            // Opponent pfp from Twitter if available
            setBattleOpponentPfp(opponentTwitter ? `https://unavatar.io/twitter/${opponentTwitter}` : null);
            // Player pfp from Twitter if available
            setBattlePlayerPfp(userProfile?.twitter ? `https://unavatar.io/twitter/${userProfile.twitter}` : null);
            setShowLossPopup(false);
            setShowWinPopup(false);
            setResult('');
            setPlayerPower(0);
            setDealerPower(0);

            if (soundEnabled) AudioManager.playHand();

            // Mostra cartas do oponente (como "dealer")
            setTimeout(() => {
              setDealerCards(opponentCards);
              if (soundEnabled) AudioManager.shuffle();
            }, 1000);

            // Fase de clash - cartas batem
            setTimeout(() => {
              setBattlePhase('clash');
              if (soundEnabled) AudioManager.cardBattle();
            }, 2500);

            // Mostra poderes
            setTimeout(() => {
              setPlayerPower(playerPower);
              setDealerPower(opponentPower);
              setBattlePhase('result');
            }, 3500);

            // Mostra resultado final
            setTimeout(() => {
              const playerWins = playerPower > opponentPower;
              const isDraw = playerPower === opponentPower;

              let matchResult: 'win' | 'loss' | 'tie';

              if (playerWins) {
                matchResult = 'win';
                setResult(t('playerWins'));
              } else if (isDraw) {
                matchResult = 'tie';
                setResult(t('tie'));
              } else {
                matchResult = 'loss';
                setResult(t('dealerWins'));
              }

              // Record PvP match if user has profile
              if (userProfile && address) {
                ConvexProfileService.recordMatch(
                  address,
                  'pvp',
                  matchResult,
                  playerPower,
                  opponentPower,
                  playerCards,
                  opponentCards,
                  opponentAddress
                ).then(async () => {
                  ConvexProfileService.getMatchHistory(address, 20).then(setMatchHistory);
                  
                  // Award economy coins for PvP
                  try {
                    const reward = await awardPvPCoins({
                      address,
                      won: matchResult === 'win'
                    });
                    if (reward && reward.awarded > 0) {
                      devLog(`💰 PvP: Awarded ${reward.awarded} $TESTVBMS`, reward);
                    }
                  } catch (err) {
                    devError('❌ Error awarding PvP coins:', err);
                  }

                  // 🔔 Send notification to defender (opponent)
                  fetch('/api/notifications/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      type: 'defense_attacked',
                      data: {
                        defenderAddress: opponentAddress,
                        defenderUsername: opponentName || 'Unknown',
                        attackerUsername: userProfile.username || 'Unknown',
                        result: matchResult === 'win' ? 'lose' : 'win', // Inverted: attacker wins = defender loses
                      },
                    }),
                  }).catch(err => devError('Error sending notification:', err));
                }).catch(err => devError('Error recording PvP match:', err));
              }

              // Fecha a tela de batalha E mostra popup SIMULTANEAMENTE
              setTimeout(() => {
                setIsBattling(false);
                setShowBattleScreen(false);
                setBattlePhase('cards');

                // Set last battle result for sharing
                setLastBattleResult({
                  result: matchResult,
                  playerPower: playerPower,
                  opponentPower: opponentPower,
                  opponentName: opponentName,
                  opponentTwitter: opponentTwitter,
                  type: 'pvp'
                });

                // Mostra popup IMEDIATAMENTE
                if (matchResult === 'win') {
                  setShowWinPopup(true);
                  if (soundEnabled) AudioManager.win();
                } else if (matchResult === 'loss') {
                  setShowLossPopup(true);
                  if (soundEnabled) AudioManager.lose();
                } else {
                  if (soundEnabled) AudioManager.tie();
                }

                // Reset battle flag immediately so player can start new match without waiting
                setPvpBattleStarted(false);
                devLog('🔄 Battle ended, reset pvpBattleStarted immediately');
                // Fecha a sala PVP e volta ao menu após ver o resultado
                setTimeout(async () => {
                  // Deleta a sala do Convex se for o host
                  if (currentRoom && roomCode && address && address.toLowerCase() === currentRoom.hostAddress) {
                    try {
                      await ConvexPvPService.leaveRoom(roomCode, address);
                      devLog('✅ Room deleted after battle ended');
                    } catch (err) {
                      devError('❌ Error deleting room:', err);
                    }
                  }

                  setPvpMode(null);
                  setGameMode(null);
                  setRoomCode('');
                  setCurrentRoom(null);
                  setSelectedCards([]);
                  setDealerCards([]); // Clear dealer cards
                  setPvpBattleStarted(false); // Reset battle flag
                }, 5000);
              }, 2000);
            }, 3500);
          }
        } else {
          // Sala não existe - só volta ao menu se já vimos a sala antes (foi deletada)
          // Se nunca vimos, pode estar sendo criada ainda (race condition)
          if (hasSeenRoom) {
            devLog('⚠️ Sala foi deletada, voltando ao menu');
            setPvpMode('pvpMenu');
            setRoomCode('');
            setCurrentRoom(null);
          } else {
            devLog('⏳ Aguardando sala ser criada...');
          }
        }
      });

      return () => {
        unsubscribe();
      };
    }
  }, [pvpMode, roomCode, address, soundEnabled, pvpBattleStarted]);

  // Auto Match Listener - Detecta quando uma sala é criada para o jogador
  useEffect(() => {
    if (pvpMode === 'autoMatch' && isSearching && address) {
      devLog('🔍 Starting matchmaking listener for:', address);

      const unsubscribe = ConvexPvPService.watchMatchmaking(address, (roomCode) => {
        if (roomCode) {
          devLog('✅ Match found! Room:', roomCode);
          setRoomCode(roomCode);
          setPvpMode('inRoom');
          setIsSearching(false);
        } else {
          devLog('⚠️ Matchmaking cancelled or failed');
          setIsSearching(false);
          setPvpMode('pvpMenu');
        }
      });

      // ConvexPvPService já cuida do polling internamente, não precisa de heartbeat manual
      return () => {
        devLog('🛑 Stopping matchmaking listener');
        unsubscribe();
      };
    }
  }, [pvpMode, isSearching, address]);

  // Farcaster SDK - Call ready() when app loads
  useEffect(() => {
    const initFarcasterSDK = async () => {
      try {
        await sdk.actions.ready();
        devLog('✅ Farcaster SDK ready called');
      } catch (error) {
        devError('❌ Error calling Farcaster ready:', error);
      }
    };

    initFarcasterSDK();
  }, []);

  // Load user profile when wallet connects
  useEffect(() => {
    if (address) {
      setIsLoadingProfile(true);
      ConvexProfileService.getProfile(address).then((profile) => {

        setUserProfile(profile);
        setIsLoadingProfile(false);

        // Load match history
        if (profile) {
          ConvexProfileService.getMatchHistory(address, 20).then(setMatchHistory);
        }
      });
    } else {
      setUserProfile(null);
      setMatchHistory([]);
    }
  }, [address]);

  // Auto scroll to play buttons when 5 cards are selected
  useEffect(() => {
    if (selectedCards.length === 5 && playButtonsRef.current) {
      setTimeout(() => {
        playButtonsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [selectedCards.length]);

  // Update profile stats when NFTs change
  useEffect(() => {
    if (address && userProfile && nfts.length > 0) {
      const totalPower = nfts.reduce((sum, nft) => sum + (nft.power || 0), 0);
      const openedCards = nfts.filter(nft => !isUnrevealed(nft)).length;
      const unopenedCards = nfts.filter(nft => isUnrevealed(nft)).length;

      // Update stats and reload profile to show updated values
      ConvexProfileService.updateStats(address, nfts.length, openedCards, unopenedCards, totalPower)
        .then(() => {
          // Reload profile to get updated stats
          return ConvexProfileService.getProfile(address);
        })
        .then((updatedProfile) => {
          if (updatedProfile) {
            setUserProfile(updatedProfile);
          }
        })
        .catch((error) => {
          devError('Error updating profile stats:', error);
        });
    }
  }, [address, nfts]); // Removed userProfile to prevent infinite loop

  // Load leaderboard with 5-minute refresh (usando Convex agora! 🚀)
  useEffect(() => {
    const loadLeaderboard = () => {
      ConvexProfileService.getLeaderboard().then(setLeaderboard);
    };

    loadLeaderboard();
    const interval = setInterval(loadLeaderboard, 30 * 60 * 1000); // 30 minutes (sem limites com Convex!)

    return () => clearInterval(interval);
  }, []);

  // Cleanup old rooms and matchmaking entries periodically
  useEffect(() => {
    // Run cleanup immediately on mount
    ConvexPvPService.cleanupOldRooms().catch(err => devError('Cleanup error:', err));

    // Run cleanup every 2 minutes
    const cleanupInterval = setInterval(() => {
      ConvexPvPService.cleanupOldRooms().catch(err => devError('Cleanup error:', err));
    }, 2 * 60 * 1000);

    return () => clearInterval(cleanupInterval);
  }, []);

  // Calculate attacks remaining based on UTC date
  useEffect(() => {
    if (!userProfile || !address) {
      setAttacksRemaining(0);
      return;
    }

    const now = new Date();
    const todayUTC = now.toISOString().split('T')[0]; // YYYY-MM-DD in UTC
    const lastAttackDate = userProfile.lastAttackDate || '';
    const attacksToday = userProfile.attacksToday || 0;

    if (lastAttackDate === todayUTC) {
      // Same day, use existing count
      setAttacksRemaining(Math.max(0, maxAttacks - attacksToday));
    } else {
      // New day detected - just set attacks to max locally
      // Let the backend handle the reset when user makes next attack
      devLog('🆕 New day detected! Attacks reset to max.');
      setAttacksRemaining(maxAttacks);
    }
  }, [userProfile?.lastAttackDate, userProfile?.attacksToday, maxAttacks, address]);

  // Load defenses received (attacks from other players)
  useEffect(() => {
    if (!address || !userProfile) {
      setDefensesReceived([]);
      setUnreadDefenses(0);
      return;
    }

    // Fetch match history filtering only defenses
    ConvexProfileService.getMatchHistory(address, 20).then((history) => {
      const defenses = history.filter(match => match.type === 'defense');
      setDefensesReceived(defenses);

      // Check localStorage for last seen timestamp
      const lastSeenKey = `defenses_last_seen_${address.toLowerCase()}`;
      const lastSeen = parseInt(localStorage.getItem(lastSeenKey) || '0');

      // Count unread defenses (newer than last seen)
      const unread = defenses.filter(d => d.timestamp > lastSeen).length;
      setUnreadDefenses(unread);
    });
  }, [address, userProfile]);

  return (
    <div className="min-h-screen bg-vintage-deep-black text-vintage-ice p-4 lg:p-6 overflow-x-hidden">
      {showWinPopup && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[200]" onClick={() => setShowWinPopup(false)}>
          <div className="relative flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
            <img
              src="https://pbs.twimg.com/media/G2cr8wQWMAADqE7.jpg"
              alt="Victory!"
              className="max-w-[90vw] max-h-[80vh] rounded-2xl shadow-2xl shadow-yellow-500/50 border-4 border-yellow-400"
            />
            <p className="text-2xl md:text-3xl font-bold text-yellow-400 animate-pulse px-4 text-center">
              {t('victoryPrize')}
            </p>
            <div className="flex gap-3">
              <a
                href={(() => {
                  if (!lastBattleResult || !userProfile) return '#';
                  // Link to user's profile page
                  const profileUrl = `${window.location.origin}/profile/${userProfile.username}`;

                  // Build tweet text with opponent mention if they have Twitter
                  let tweetText = t('tweetVictory', { power: lastBattleResult.playerPower });
                  if (lastBattleResult.opponentTwitter && lastBattleResult.type !== 'pve') {
                    const twitterHandle = lastBattleResult.opponentTwitter.replace('@', '');
                    tweetText += `\n\nDefeated @${twitterHandle}!`;
                  }

                  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(profileUrl)}`;
                })()}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => { if (soundEnabled) AudioManager.buttonSuccess(); }}
                className="px-6 py-3 bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black rounded-xl font-display font-bold shadow-gold transition-all hover:scale-105 flex items-center gap-2"
              >
                <span>𝕏</span> {t('shareVictory')}
              </a>
              <a
                href={(() => {
                  if (!lastBattleResult) return '#';
                  let castText = t('castVictory', { power: lastBattleResult.playerPower });

                  // Add battle details to cast
                  if (lastBattleResult.type === 'attack') {
                    castText += `\n\n⚔️ Attacked ${lastBattleResult.opponentName}!`;
                  } else if (lastBattleResult.type === 'defense') {
                    castText += `\n\n🛡️ Defended against ${lastBattleResult.opponentName}!`;
                  } else if (lastBattleResult.type === 'pvp') {
                    castText += `\n\n👑 Defeated ${lastBattleResult.opponentName}!`;
                  }

                  castText += `\n${lastBattleResult.playerPower} vs ${lastBattleResult.opponentPower}`;

                  return `https://warpcast.com/~/compose?text=${encodeURIComponent(castText)}&embeds[]=${encodeURIComponent('https://farcaster.xyz/miniapps/UpOGC4pheWVP/vibe-most-wanted')}`;
                })()}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => { if (soundEnabled) AudioManager.buttonSuccess(); }}
                className="px-6 py-3 bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black rounded-xl font-display font-bold shadow-gold transition-all hover:scale-105 flex items-center gap-2"
              >
                <span>♦</span> Farcaster
              </a>
            </div>
            <button
              onClick={() => setShowWinPopup(false)}
              className="absolute top-4 right-4 bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black rounded-full w-10 h-10 flex items-center justify-center text-2xl font-bold shadow-gold"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {showLossPopup && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[200]" onClick={() => setShowLossPopup(false)}>
          <div className="relative flex flex-col items-center gap-4">
            <img
              src="https://preview.redd.it/ceetrhas51441.jpg?width=640&crop=smart&auto=webp&s=90022f1d648fb5c0596063c2777c656b148b8d26"
              alt="You Lost"
              className="max-w-[90vw] max-h-[80vh] rounded-2xl shadow-2xl shadow-red-500/50 border-4 border-red-500"
            />
            <p className="text-2xl md:text-3xl font-bold text-red-400 animate-pulse px-4 text-center">
              {t('defeatPrize')}
            </p>
            <div className="flex gap-3">
              <a
                href={(() => {
                  if (!lastBattleResult || !userProfile) return '#';
                  // Link to user's profile page
                  const profileUrl = `${window.location.origin}/profile/${userProfile.username}`;

                  // Build tweet text with opponent mention if they have Twitter
                  let tweetText = t('tweetDefeat', { power: lastBattleResult.playerPower });
                  if (lastBattleResult.opponentTwitter && lastBattleResult.type !== 'pve') {
                    const twitterHandle = lastBattleResult.opponentTwitter.replace('@', '');
                    tweetText += `\n\nLost to @${twitterHandle} - I want a rematch!`;
                  }

                  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(profileUrl)}`;
                })()}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => { if (soundEnabled) AudioManager.buttonSuccess(); }}
                className="px-6 py-3 bg-vintage-silver hover:bg-vintage-burnt-gold text-vintage-black rounded-xl font-display font-bold shadow-lg transition-all hover:scale-105 flex items-center gap-2"
              >
                <span>𝕏</span> {t('shareDefeat')}
              </a>
              <a
                href={(() => {
                  if (!lastBattleResult) return '#';
                  let castText = t('castDefeat', { power: lastBattleResult.playerPower });

                  // Add battle details to cast
                  if (lastBattleResult.type === 'attack') {
                    castText += `\n\n⚔️ Lost attacking ${lastBattleResult.opponentName}`;
                  } else if (lastBattleResult.type === 'defense') {
                    castText += `\n\n🛡️ Defense failed against ${lastBattleResult.opponentName}`;
                  } else if (lastBattleResult.type === 'pvp') {
                    castText += `\n\n👑 Lost to ${lastBattleResult.opponentName}`;
                  }

                  castText += `\n${lastBattleResult.playerPower} vs ${lastBattleResult.opponentPower}`;

                  return `https://warpcast.com/~/compose?text=${encodeURIComponent(castText)}&embeds[]=${encodeURIComponent('https://farcaster.xyz/miniapps/UpOGC4pheWVP/vibe-most-wanted')}`;
                })()}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => { if (soundEnabled) AudioManager.buttonSuccess(); }}
                className="px-6 py-3 bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black rounded-xl font-display font-bold shadow-gold transition-all hover:scale-105 flex items-center gap-2"
              >
                <span>♦</span> Farcaster
              </a>
            </div>
            <button
              onClick={() => setShowLossPopup(false)}
              className="absolute top-4 right-4 bg-vintage-silver hover:bg-vintage-burnt-gold text-vintage-black rounded-full w-10 h-10 flex items-center justify-center text-2xl font-bold shadow-lg"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[250] p-4" onClick={() => setShowSettings(false)}>
          <div className="bg-vintage-charcoal rounded-2xl border-2 border-vintage-gold p-8 max-w-md w-full shadow-gold" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-display font-bold text-vintage-gold flex items-center gap-2">
                <span>§</span> {t('settings')}
              </h2>
              <button onClick={() => setShowSettings(false)} className="text-vintage-gold hover:text-vintage-ice text-2xl transition">×</button>
            </div>

            <div className="space-y-6">
              {/* Music Toggle */}
              <div className="bg-vintage-black/50 p-5 rounded-xl border border-vintage-gold/50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl text-vintage-gold">♫</span>
                    <div>
                      <p className="font-modern font-bold text-vintage-gold">MUSIC</p>
                      <p className="text-xs text-vintage-burnt-gold">{musicEnabled ? t('musicOn') : t('musicOff')}</p>
                    </div>
                  </div>
                  <button
                    onClick={toggleMusic}
                    className={`relative w-16 h-8 rounded-full transition-all border-2 ${musicEnabled ? 'bg-vintage-gold border-vintage-gold' : 'bg-vintage-black border-vintage-gold/50'}`}
                  >
                    <div className={`absolute top-1 left-1 w-6 h-6 ${musicEnabled ? 'bg-vintage-black' : 'bg-vintage-gold'} rounded-full transition-transform ${musicEnabled ? 'translate-x-7' : 'translate-x-0'}`} />
                  </button>
                </div>
                {musicEnabled && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-vintage-burnt-gold font-modern">VOLUME</span>
                      <span className="text-sm text-vintage-gold font-bold">{Math.round(musicVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={musicVolume * 100}
                      onChange={(e) => setMusicVolume(Number(e.target.value) / 100)}
                      className="w-full h-2 bg-vintage-black rounded-lg appearance-none cursor-pointer accent-vintage-gold border border-vintage-gold/30"
                    />
                  </div>
                )}
              </div>

              {/* Language Selector */}
              <div className="bg-vintage-black/50 p-5 rounded-xl border border-vintage-gold/50">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl text-vintage-gold">◊</span>
                  <p className="font-modern font-bold text-vintage-gold">{t('language').toUpperCase()}</p>
                </div>
                <select
                  onChange={(e) => setLang(e.target.value as any)}
                  value={lang}
                  className="w-full bg-vintage-black text-vintage-gold px-4 py-3 rounded-lg border border-vintage-gold/50 hover:bg-vintage-gold/10 transition cursor-pointer font-modern font-semibold [&>option]:bg-vintage-charcoal [&>option]:text-vintage-ice [&>option]:py-2"
                >
                  <option value="en" className="bg-vintage-charcoal text-vintage-ice">English</option>
                  <option value="pt-BR" className="bg-vintage-charcoal text-vintage-ice">Português</option>
                  <option value="es" className="bg-vintage-charcoal text-vintage-ice">Español</option>
                  <option value="hi" className="bg-vintage-charcoal text-vintage-ice">हिन्दी</option>
                </select>
              </div>

              {/* Change Username */}
              {userProfile && (
                <div className="bg-vintage-black/50 p-5 rounded-xl border border-vintage-gold/50">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl text-vintage-gold">♔</span>
                    <div className="flex-1">
                      <p className="font-modern font-bold text-vintage-gold">USERNAME</p>
                      <p className="text-xs text-vintage-burnt-gold">@{userProfile.username}</p>
                    </div>
                    {!showChangeUsername && (
                      <button
                        onClick={() => {
                          if (soundEnabled) AudioManager.buttonClick();
                          setShowChangeUsername(true);
                          setNewUsername('');
                        }}
                        className="px-4 py-2 bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black rounded-lg font-modern font-semibold transition text-sm"
                      >
                        Change
                      </button>
                    )}
                  </div>

                  {showChangeUsername && (
                    <div className="mt-4 space-y-3">
                      <div className="bg-vintage-gold/20 border border-vintage-gold/50 rounded-lg p-3">
                        <p className="text-vintage-gold text-sm font-modern font-semibold mb-1">◆ IMPORTANT</p>
                        <p className="text-vintage-burnt-gold text-xs">
                          Changing your username will change your profile URL from<br />
                          <span className="font-mono bg-vintage-black/30 px-1 rounded">/profile/{userProfile.username}</span> to<br />
                          <span className="font-mono bg-vintage-black/30 px-1 rounded">/profile/{newUsername || 'new_username'}</span>
                        </p>
                      </div>

                      <input
                        type="text"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value.toLowerCase())}
                        placeholder="New username"
                        className="w-full bg-vintage-black text-vintage-gold px-4 py-3 rounded-lg border border-vintage-gold/50 focus:border-vintage-gold focus:outline-none font-modern font-medium"
                        maxLength={20}
                      />
                      <p className="text-xs text-vintage-burnt-gold">
                        3-20 characters, only letters, numbers and underscore
                      </p>

                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            if (soundEnabled) AudioManager.buttonClick();

                            if (!newUsername || newUsername.length < 3) {
                              alert('Username must have at least 3 characters');
                              return;
                            }

                            if (!/^[a-z0-9_]+$/.test(newUsername)) {
                              alert('Username can only contain letters, numbers and underscore');
                              return;
                            }

                            const confirmed = confirm(
                              `Are you sure you want to change your username to @${newUsername}?\n\n` +
                              `Your profile URL will change from:\n/profile/${userProfile.username}\nto:\n/profile/${newUsername}\n\n` +
                              `This action cannot be undone easily.`
                            );

                            if (!confirmed) return;

                            setIsChangingUsername(true);
                            try {
                              await ConvexProfileService.updateUsername(address!, newUsername);

                              // Recarrega o perfil
                              const updatedProfile = await ConvexProfileService.getProfile(address!);
                              setUserProfile(updatedProfile);

                              setShowChangeUsername(false);
                              setNewUsername('');

                              if (soundEnabled) AudioManager.buttonSuccess();
                              alert(`Username successfully changed to @${newUsername}!`);
                            } catch (err: any) {
                              devError('Error changing username:', err);
                              if (soundEnabled) AudioManager.buttonError();
                              alert(`Error: ${err.message || 'Failed to change username'}`);
                            } finally {
                              setIsChangingUsername(false);
                            }
                          }}
                          disabled={isChangingUsername}
                          className="flex-1 px-4 py-2 bg-vintage-gold hover:bg-vintage-gold-dark disabled:bg-vintage-black/50 text-vintage-black rounded-lg font-modern font-semibold transition"
                        >
                          {isChangingUsername ? 'Changing...' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => {
                            if (soundEnabled) AudioManager.buttonNav();
                            setShowChangeUsername(false);
                            setNewUsername('');
                          }}
                          disabled={isChangingUsername}
                          className="flex-1 px-4 py-2 bg-vintage-black hover:bg-vintage-gold/10 disabled:bg-vintage-black/30 text-vintage-gold border border-vintage-gold/50 rounded-lg font-modern font-semibold transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Twitter/X Connection */}
              {userProfile && (
                <div className="bg-vintage-black/50 p-5 rounded-xl border border-vintage-gold/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl text-vintage-gold">𝕏</span>
                      <div>
                        <p className="font-modern font-bold text-vintage-gold">X / TWITTER</p>
                        <p className="text-xs text-vintage-burnt-gold">
                          {userProfile.twitter ? `@${userProfile.twitter}` : 'Not connected'}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={async () => {
                        if (soundEnabled) AudioManager.buttonClick();

                        if (!address) {
                          alert('Please connect your wallet first');
                          return;
                        }

                        try {
                          devLog('🔵 Calling Twitter OAuth API...');

                          // Call our API to get Twitter OAuth URL
                          const response = await fetch(`/api/auth/twitter?address=${address}`);
                          devLog('📡 Response status:', response.status);

                          const data = await response.json();
                          devLog('📦 Response data:', data);

                          if (data.url) {
                            devLog('✅ Got OAuth URL, opening popup...');
                            devLog('🔗 URL:', data.url);

                            // Open Twitter OAuth in a popup
                            const width = 600;
                            const height = 700;
                            const left = (window.screen.width - width) / 2;
                            const top = (window.screen.height - height) / 2;

                            const popup = window.open(
                              data.url,
                              'Twitter OAuth',
                              `width=${width},height=${height},left=${left},top=${top}`
                            );

                            if (!popup) {
                              alert('Popup bloqueado! Permita popups para este site.');
                            }
                          } else {
                            devError('❌ No URL in response');
                            throw new Error('Failed to get OAuth URL');
                          }
                        } catch (error) {
                          devError('❌ Twitter OAuth error:', error);
                          alert('Failed to connect Twitter. Check console for details.');
                        }
                      }}
                      className="px-4 py-2 bg-vintage-neon-blue hover:bg-vintage-neon-blue/80 text-vintage-black rounded-lg text-sm font-modern font-semibold transition flex items-center gap-2"
                    >
                      <span>𝕏</span> {userProfile.twitter ? 'Reconnect' : 'Connect'}
                    </button>
                  </div>

                  {/* Easter egg message to Vibe Market */}
                  <div className="mt-3 pt-3 border-t border-vintage-gold/30">
                    <p className="text-xs text-vintage-burnt-gold italic text-center">
                      {t('vibeMarketEasterEgg')}
                    </p>
                  </div>
                </div>
              )}

              {/* Close Button */}
              <button
                onClick={() => setShowSettings(false)}
                className="w-full px-6 py-3 bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black rounded-xl font-display font-bold hover:shadow-gold-lg transition-all"
              >
                {t('understood')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Elimination Mode - Card Ordering Screen */}
      {eliminationPhase === 'ordering' && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[300] overflow-y-auto">
          <div className="w-full max-w-4xl p-8 my-8">
            <h2 className="text-3xl md:text-5xl font-bold text-center mb-4 text-purple-400 uppercase tracking-wider">
              ⚔️ ELIMINATION MODE
            </h2>
            <p className="text-center text-vintage-gold mb-8 text-lg">
              Arrange your cards in battle order (Position 1 fights first)
            </p>

            {/* Card Ordering List */}
            <div className="space-y-2 mb-6">
              {orderedPlayerCards.map((card, index) => {
                const power = card?.power || 0;

                return (
                  <div key={index} className="flex items-center gap-3 bg-vintage-charcoal border-2 border-purple-500/50 rounded-lg p-3">
                    {/* Position Number */}
                    <div className="text-2xl font-bold text-purple-400 w-12 text-center">
                      #{index + 1}
                    </div>

                    {/* Card Image */}
                    <div className="w-16 h-20 rounded-lg overflow-hidden border border-vintage-gold/30">
                      <img
                        src={card?.imageUrl || '/placeholder.png'}
                        alt={card?.name || 'Card'}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Card Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-vintage-gold truncate">{card?.name || 'Unknown'}</h3>
                      <p className="text-vintage-burnt-gold font-bold">⚡ {power}</p>
                    </div>

                    {/* Reorder Buttons */}
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => {
                          if (index > 0) {
                            const newOrder = [...orderedPlayerCards];
                            [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
                            setOrderedPlayerCards(newOrder);
                            if (soundEnabled) AudioManager.buttonClick();
                          }
                        }}
                        disabled={index === 0}
                        className={`px-3 py-1 rounded-lg font-bold text-sm ${index === 0 ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => {
                          if (index < orderedPlayerCards.length - 1) {
                            const newOrder = [...orderedPlayerCards];
                            [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
                            setOrderedPlayerCards(newOrder);
                            if (soundEnabled) AudioManager.buttonClick();
                          }
                        }}
                        disabled={index === orderedPlayerCards.length - 1}
                        className={`px-3 py-1 rounded-lg font-bold text-sm ${index === orderedPlayerCards.length - 1 ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Start Battle Button */}
            <div className="flex justify-center gap-4">
              <button
                onClick={() => {
                  if (soundEnabled) AudioManager.buttonClick();
                  // Generate AI card order based on difficulty
                  const aiCards = generateAIHand(aiDifficulty);
                  setOrderedOpponentCards(aiCards);

                  // Start elimination battle
                  setEliminationPhase('battle');
                  setCurrentRound(1);
                  setRoundResults([]);
                  setEliminationPlayerScore(0);
                  setEliminationOpponentScore(0);
                  setShowBattleScreen(true);
                }}
                className="px-12 py-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-600 text-white rounded-lg font-display font-bold text-2xl shadow-lg transition-all uppercase tracking-wider border-2 border-purple-500/30"
              >
                <span className="drop-shadow-lg">START ELIMINATION BATTLE</span>
              </button>
              <button
                onClick={() => {
                  if (soundEnabled) AudioManager.buttonClick();
                  setEliminationPhase(null);
                  setBattleMode('normal');
                  setShowPveCardSelection(true);
                }}
                className="px-8 py-4 bg-vintage-black/50 border-2 border-vintage-burnt-gold text-vintage-burnt-gold rounded-lg hover:bg-vintage-burnt-gold hover:text-vintage-black transition-all font-modern font-bold text-lg uppercase"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {showBattleScreen && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[300]">
          <div className="w-full max-w-6xl p-8">
            {/* Title - Different for Elimination Mode */}
            {battleMode === 'elimination' ? (
              <div className="text-center mb-6 md:mb-8">
                <h2 className="text-2xl md:text-4xl font-bold text-purple-400 uppercase tracking-wider mb-2">
                  ⚔️ ELIMINATION MODE
                </h2>
                <div className="flex items-center justify-center gap-4 md:gap-8 text-lg md:text-2xl font-bold">
                  <span className="text-cyan-400">Round {currentRound}/5</span>
                  <span className="text-vintage-gold">•</span>
                  <span className="text-cyan-400">You {eliminationPlayerScore}</span>
                  <span className="text-vintage-gold">-</span>
                  <span className="text-red-400">{eliminationOpponentScore} Opponent</span>
                </div>
              </div>
            ) : (
              <h2 className="text-3xl md:text-5xl font-bold text-center mb-8 md:mb-12 text-yellow-400 uppercase tracking-wider" style={{ animation: 'battlePowerPulse 2s ease-in-out infinite' }}>
                {t('battle')}
              </h2>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-8">
              {/* Player Cards */}
              <div>
                {/* Player Header with Avatar */}
                <div className="flex flex-col items-center mb-3 md:mb-4">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-4 border-cyan-500 shadow-lg shadow-cyan-500/50 mb-2 bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center relative">
                    {userProfile?.twitter ? (
                      <img
                        src={`https://unavatar.io/twitter/${userProfile.twitter}`}
                        alt={battlePlayerName}
                        className="w-full h-full object-cover absolute inset-0"
                        onLoad={() => console.log('Player PFP loaded:', userProfile.twitter)}
                        onError={(e) => {
                          console.log('Player PFP failed to load:', userProfile.twitter);
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2306b6d4"><circle cx="12" cy="12" r="10"/></svg>';
                        }}
                      />
                    ) : null}
                    <span className={`text-2xl md:text-3xl font-bold text-white ${userProfile?.twitter ? 'opacity-0' : 'opacity-100'}`}>
                      {battlePlayerName?.substring(0, 2).toUpperCase() || '??'}
                    </span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-vintage-neon-blue text-center">{battlePlayerName}</h3>
                </div>

                {/* Cards Display - Different for Elimination Mode */}
                {battleMode === 'elimination' ? (
                  // Show only current round's card (single large card)
                  <div className="flex flex-col items-center gap-4">
                    <div className="text-purple-400 font-bold text-lg">Position #{currentRound}</div>
                    <div
                      className="relative w-48 md:w-64 aspect-[2/3] rounded-lg overflow-hidden ring-4 ring-cyan-500"
                      style={{
                        animation: battlePhase === 'clash'
                          ? `battleGlowBlue 1.5s ease-in-out infinite`
                          : 'battleCardFadeIn 0.8s ease-out'
                      }}
                    >
                      <FoilCardEffect
                        foilType={(selectedCards[currentRound - 1]?.foil === 'Standard' || selectedCards[currentRound - 1]?.foil === 'Prize') ? selectedCards[currentRound - 1].foil : null}
                        className="w-full h-full"
                      >
                        <img src={selectedCards[currentRound - 1]?.imageUrl} alt={`#${selectedCards[currentRound - 1]?.tokenId}`} className="w-full h-full object-cover" loading="eager" />
                      </FoilCardEffect>
                      <div
                        className="absolute top-0 left-0 bg-cyan-500 text-white text-lg md:text-xl font-bold px-3 py-2 rounded-br"
                        style={{
                          animation: battlePhase === 'clash'
                            ? 'battlePowerPulse 1s ease-in-out infinite'
                            : undefined
                        }}
                      >
                        {selectedCards[currentRound - 1]?.power}
                      </div>
                    </div>
                    {/* Show mini previous cards if not first round */}
                    {currentRound > 1 && (
                      <div className="flex gap-1 mt-2">
                        {orderedPlayerCards.slice(0, currentRound - 1).map((card, i) => (
                          <div key={i} className={`w-12 h-16 rounded border-2 ${roundResults[i] === 'win' ? 'border-green-500' : roundResults[i] === 'loss' ? 'border-red-500' : 'border-yellow-500'} opacity-50`}>
                            <img src={card.imageUrl} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  // Normal mode - show all 5 cards
                  <>
                    <div
                      className="grid grid-cols-5 gap-1 md:gap-2"
                      style={{
                        animation: battlePhase === 'clash'
                          ? 'battleCardShake 2s ease-in-out'
                          : 'battleCardFadeIn 0.8s ease-out'
                      }}
                    >
                      {selectedCards.map((c, i) => (
                        <div
                          key={i}
                          className="relative aspect-[2/3] rounded-lg overflow-hidden ring-2 ring-cyan-500"
                          style={{
                            animation: battlePhase === 'clash'
                              ? `battleGlowBlue 1.5s ease-in-out infinite`
                              : undefined,
                            animationDelay: `${i * 0.1}s`
                          }}
                        >
                          <FoilCardEffect
                            foilType={(c.foil === 'Standard' || c.foil === 'Prize') ? c.foil : null}
                            className="w-full h-full"
                          >
                            <img src={c.imageUrl} alt={`#${c.tokenId}`} className="w-full h-full object-cover" loading="eager" />
                          </FoilCardEffect>
                          <div
                            className="absolute top-0 left-0 bg-cyan-500 text-white text-xs md:text-sm font-bold px-1 md:px-2 py-1 rounded-br"
                            style={{
                              animation: battlePhase === 'clash'
                                ? 'battlePowerPulse 1s ease-in-out infinite'
                                : undefined
                            }}
                          >
                            {c.power}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 md:mt-4 text-center">
                      <p
                        className="text-3xl md:text-4xl font-bold text-vintage-neon-blue"
                        style={{
                          animation: battlePhase === 'result'
                            ? 'battlePowerPulse 1.5s ease-in-out 3'
                            : undefined
                        }}
                      >
                        {playerPower}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Opponent Cards */}
              <div>
                {/* Opponent Header with Avatar */}
                <div className="flex flex-col items-center mb-3 md:mb-4">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-4 border-red-500 shadow-lg shadow-red-500/50 mb-2 bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center relative">
                    {battleOpponentPfp ? (
                      <img
                        src={battleOpponentPfp}
                        alt={battleOpponentName}
                        className="w-full h-full object-cover absolute inset-0"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          setBattleOpponentPfp(null); // Reset to null so initials show
                        }}
                      />
                    ) : null}
                    <span className={`text-2xl md:text-3xl font-bold text-white ${battleOpponentPfp ? 'opacity-0' : 'opacity-100'}`}>
                      {battleOpponentName?.substring(0, 2).toUpperCase() || '??'}
                    </span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-red-400 text-center">{battleOpponentName}</h3>
                </div>

                {/* Cards Display - Different for Elimination Mode */}
                {battleMode === 'elimination' ? (
                  // Show only current round's card (single large card)
                  <div className="flex flex-col items-center gap-4">
                    <div className="text-purple-400 font-bold text-lg">Position #{currentRound}</div>
                    <div
                      className="relative w-48 md:w-64 aspect-[2/3] rounded-lg overflow-hidden ring-4 ring-red-500"
                      style={{
                        animation: battlePhase === 'clash'
                          ? `battleGlowRed 1.5s ease-in-out infinite`
                          : 'battleCardFadeIn 0.8s ease-out'
                      }}
                    >
                      <FoilCardEffect
                        foilType={(dealerCards[currentRound - 1]?.foil === 'Standard' || dealerCards[currentRound - 1]?.foil === 'Prize') ? dealerCards[currentRound - 1].foil : null}
                        className="w-full h-full"
                      >
                        <img src={dealerCards[currentRound - 1]?.imageUrl} alt={`#${dealerCards[currentRound - 1]?.tokenId}`} className="w-full h-full object-cover" loading="eager" />
                      </FoilCardEffect>
                      <div
                        className="absolute top-0 left-0 bg-red-500 text-white text-lg md:text-xl font-bold px-3 py-2 rounded-br"
                        style={{
                          animation: battlePhase === 'clash'
                            ? 'battlePowerPulse 1s ease-in-out infinite'
                            : undefined
                        }}
                      >
                        {dealerCards[currentRound - 1]?.power}
                      </div>
                      {battlePhase === 'result' && (
                        <div className="absolute bottom-0 right-0 bg-black/80 text-vintage-gold text-xs px-2 py-1 rounded-tl font-mono">
                          #{dealerCards[currentRound - 1]?.tokenId}
                        </div>
                      )}
                    </div>
                    {/* Show mini previous cards if not first round */}
                    {currentRound > 1 && (
                      <div className="flex gap-1 mt-2">
                        {orderedOpponentCards.slice(0, currentRound - 1).map((card, i) => (
                          <div key={i} className={`w-12 h-16 rounded border-2 ${roundResults[i] === 'loss' ? 'border-green-500' : roundResults[i] === 'win' ? 'border-red-500' : 'border-yellow-500'} opacity-50`}>
                            <img src={card.imageUrl} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  // Normal mode - show all 5 cards
                  <>
                    <div
                      className="grid grid-cols-5 gap-1 md:gap-2"
                      style={{
                        animation: battlePhase === 'clash'
                          ? 'battleCardShake 2s ease-in-out'
                          : 'battleCardFadeIn 0.8s ease-out'
                      }}
                    >
                      {dealerCards.map((c, i) => (
                        <div
                          key={i}
                          className="relative aspect-[2/3] rounded-lg overflow-hidden ring-2 ring-red-500"
                          style={{
                            animation: battlePhase === 'clash'
                              ? `battleGlowRed 1.5s ease-in-out infinite`
                              : undefined,
                            animationDelay: `${i * 0.1}s`
                          }}
                        >
                          <FoilCardEffect
                            foilType={(c.foil === 'Standard' || c.foil === 'Prize') ? c.foil : null}
                            className="w-full h-full"
                          >
                            <img src={c.imageUrl} alt={`#${c.tokenId}`} className="w-full h-full object-cover" loading="eager" />
                          </FoilCardEffect>
                          <div
                            className="absolute top-0 left-0 bg-red-500 text-white text-xs md:text-sm font-bold px-1 md:px-2 py-1 rounded-br"
                            style={{
                              animation: battlePhase === 'clash'
                                ? 'battlePowerPulse 1s ease-in-out infinite'
                                : undefined
                            }}
                          >
                            {c.power}
                          </div>
                          {battlePhase === 'result' && (
                            <div className="absolute bottom-0 right-0 bg-black/80 text-vintage-gold text-xs px-2 py-1 rounded-tl font-mono">
                              #{c.tokenId}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 md:mt-4 text-center">
                      <p
                        className="text-3xl md:text-4xl font-bold text-red-400"
                        style={{
                          animation: battlePhase === 'result'
                            ? 'battlePowerPulse 1.5s ease-in-out 3'
                            : undefined
                        }}
                      >
                        {dealerPower}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Result */}
            {battlePhase === 'result' && result && (
              <div className="text-center" style={{ animation: 'battleResultSlide 0.8s ease-out' }}>
                <div className={`text-3xl md:text-6xl font-bold ${
                  result === t('playerWins') ? 'text-green-400' :
                  result === t('dealerWins') ? 'text-red-400' :
                  'text-yellow-400'
                }`}>
                  {battleMode === 'elimination' && currentRound <= 5
                    ? (result === t('playerWins') ? '🏆 ROUND WIN!' : result === t('dealerWins') ? '💀 ROUND LOST' : '🤝 ROUND TIE')
                    : result
                  }
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PvE Card Selection Modal */}
      {showPveCardSelection && !isDifficultyModalOpen && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[150] p-4 overflow-y-auto" onClick={() => setShowPveCardSelection(false)}>
          <div className="bg-vintage-charcoal rounded-2xl border-2 border-vintage-neon-blue max-w-4xl w-full p-8 shadow-neon my-8 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-3xl font-display font-bold text-center mb-2 text-vintage-neon-blue">
              {t('selectYourCardsTitle')}
            </h2>
            <p className="text-center text-vintage-burnt-gold mb-6 text-sm font-modern">
              Choose {HAND_SIZE_CONST} cards to battle vs AI ({pveSelectedCards.length}/{HAND_SIZE_CONST} selected)
            </p>

            {/* Selected Cards Display */}
            <div className="mb-6 p-4 bg-vintage-black/50 rounded-xl border border-vintage-neon-blue/50">
              <div className="grid grid-cols-5 gap-2">
                {pveSelectedCards.map((card, i) => (
                  <div key={i} className="relative aspect-[2/3] rounded-lg overflow-hidden ring-2 ring-vintage-neon-blue shadow-lg">
                    <FoilCardEffect
                      foilType={(card.foil === 'Standard' || card.foil === 'Prize') ? card.foil : null}
                      className="w-full h-full"
                    >
                      <img src={card.imageUrl} alt={`#${card.tokenId}`} className="w-full h-full object-cover" />
                    </FoilCardEffect>
                    <div className="absolute top-0 left-0 bg-vintage-neon-blue text-vintage-black text-xs px-1 rounded-br font-bold">{card.power}</div>
                  </div>
                ))}
                {Array(HAND_SIZE_CONST - pveSelectedCards.length).fill(0).map((_, i) => (
                  <div key={`e-${i}`} className="aspect-[2/3] rounded-xl border-2 border-dashed border-vintage-neon-blue/40 flex items-center justify-center text-vintage-neon-blue/50 bg-vintage-felt-green/30">
                    <span className="text-2xl font-bold">+</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-center">
                <p className="text-xs text-vintage-burnt-gold">Total Power</p>
                <p className="text-2xl font-bold text-vintage-neon-blue">
                  {pveSelectedCards.reduce((sum, c) => sum + (c.power || 0), 0)}
                </p>
              </div>
            </div>

            {/* Available Cards Grid */}
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-6 max-h-96 overflow-y-auto p-2">
              {sortedPveNfts.map((nft) => {
                const isSelected = pveSelectedCards.find(c => c.tokenId === nft.tokenId);
                return (
                  <div
                    key={nft.tokenId}
                    onClick={() => {
                      if (isSelected) {
                        setPveSelectedCards(prev => prev.filter(c => c.tokenId !== nft.tokenId));
                        if (soundEnabled) AudioManager.deselectCard();
                      } else if (pveSelectedCards.length < HAND_SIZE_CONST) {
                        setPveSelectedCards(prev => [...prev, nft]);
                        if (soundEnabled) AudioManager.selectCard();
                      }
                    }}
                    className={`relative aspect-[2/3] rounded-lg overflow-hidden cursor-pointer transition-all ${
                      isSelected
                        ? 'ring-4 ring-vintage-neon-blue scale-95'
                        : 'hover:scale-105 hover:ring-2 hover:ring-vintage-gold/50'
                    }`}
                  >
                    <img src={nft.imageUrl} alt={`#${nft.tokenId}`} className="w-full h-full object-cover" />
                    <div className="absolute top-0 left-0 bg-vintage-gold text-vintage-black text-xs px-1 rounded-br font-bold">
                      {nft.power}
                    </div>
                    {isSelected && (
                      <div className="absolute inset-0 bg-vintage-neon-blue/20 flex items-center justify-center">
                        <div className="bg-vintage-neon-blue text-vintage-black rounded-full w-8 h-8 flex items-center justify-center font-bold">
                          ✓
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Sort Button */}
            <div className="mb-4 flex justify-center">
              <button
                onClick={() => {
                  setPveSortByPower(!pveSortByPower);
                  if (soundEnabled) AudioManager.buttonClick();
                }}
                className={`px-4 py-2 rounded-xl font-modern font-semibold transition-all ${
                  pveSortByPower
                    ? 'bg-vintage-neon-blue text-vintage-black shadow-neon'
                    : 'bg-vintage-black/50 text-vintage-gold border border-vintage-gold/50 hover:bg-vintage-gold/10'
                }`}
              >
                {pveSortByPower ? '↓ Sorted by Power' : '⇄ Sort by Power'}
              </button>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => {
                  if (pveSelectedCards.length === HAND_SIZE_CONST && jcNfts.length >= HAND_SIZE_CONST) {
                    if (soundEnabled) AudioManager.buttonClick();
                    setIsDifficultyModalOpen(true);
                  }
                }}
                disabled={pveSelectedCards.length !== HAND_SIZE_CONST || jcNfts.length < HAND_SIZE_CONST}
                className={`w-full px-6 py-4 rounded-xl font-display font-bold text-lg transition-all uppercase tracking-wide ${
                  pveSelectedCards.length === HAND_SIZE_CONST && jcNfts.length >= HAND_SIZE_CONST
                    ? 'bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black shadow-gold hover:scale-105'
                    : 'bg-vintage-black/50 text-vintage-gold/40 cursor-not-allowed border border-vintage-gold/20'
                }`}
              >
                {jcNfts.length < HAND_SIZE_CONST ? t('loadingDealerDeck') : `⚔️ ${t('chooseDifficulty')} (${pveSelectedCards.length}/${HAND_SIZE_CONST})`}
              </button>

              <button
                onClick={() => {
                  if (soundEnabled) AudioManager.buttonNav();
                  setShowPveCardSelection(false);
                  setPveSelectedCards([]);
                }}
                className="w-full px-6 py-3 bg-vintage-black hover:bg-vintage-gold/10 text-vintage-gold border border-vintage-gold/50 rounded-xl font-modern font-semibold transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attack Card Selection Modal */}
      {showAttackCardSelection && targetPlayer && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[150] p-4 overflow-y-auto" onClick={() => setShowAttackCardSelection(false)}>
          <div className="bg-vintage-charcoal rounded-2xl border-2 border-red-600 max-w-4xl w-full p-4 shadow-lg shadow-red-600/50 my-4 max-h-[95vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-3xl font-display font-bold text-center mb-2 text-red-500">
              ⚔️ ATTACK {targetPlayer.username.toUpperCase()}
            </h2>
            <p className="text-center text-vintage-burnt-gold mb-6 text-sm font-modern">
              Choose {HAND_SIZE_CONST} cards to attack with ({attackSelectedCards.length}/{HAND_SIZE_CONST} selected)
            </p>

            {/* Selected Cards Display */}
            <div className="mb-3 p-2 bg-vintage-black/50 rounded-xl border border-red-600/50">
              <div className="grid grid-cols-5 gap-1.5">
                {attackSelectedCards.map((card, i) => (
                  <div key={i} className="relative aspect-[2/3] rounded-lg overflow-hidden ring-2 ring-red-600 shadow-lg">
                    <img src={card.imageUrl} alt={`#${card.tokenId}`} className="w-full h-full object-cover" />
                    <div className="absolute top-0 left-0 bg-red-600 text-white text-xs px-1 rounded-br font-bold">{card.power}</div>
                  </div>
                ))}
                {Array(HAND_SIZE_CONST - attackSelectedCards.length).fill(0).map((_, i) => (
                  <div key={`e-${i}`} className="aspect-[2/3] rounded-xl border-2 border-dashed border-red-600/40 flex items-center justify-center text-red-600/50 bg-vintage-felt-green/30">
                    <span className="text-xl font-bold">+</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-center">
                <p className="text-xs text-vintage-burnt-gold">Your Attack Power</p>
                <p className="text-xl font-bold text-red-500">
                  {attackSelectedCards.reduce((sum, c) => sum + (c.power || 0), 0)}
                </p>
              </div>
            </div>

            {/* Sort Button */}
            <div className="mb-2 flex justify-end">
              <button
                onClick={() => {
                  setSortAttackByPower(!sortAttackByPower);
                  if (soundEnabled) AudioManager.buttonClick();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-modern font-medium transition-all ${
                  sortAttackByPower
                    ? 'bg-vintage-gold text-vintage-black shadow-gold'
                    : 'bg-vintage-charcoal border border-vintage-gold/30 text-vintage-gold hover:bg-vintage-gold/10'
                }`}
              >
                {sortAttackByPower ? '↓ Sort by Power' : '⇄ Default Order'}
              </button>
            </div>

            {/* Available Cards Grid */}
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-1.5 mb-4 max-h-[45vh] overflow-y-auto p-1">
              {sortedAttackNfts.map((nft) => {
                const isSelected = attackSelectedCards.find(c => c.tokenId === nft.tokenId);
                return (
                  <div
                    key={nft.tokenId}
                    onClick={() => {
                      if (isSelected) {
                        setAttackSelectedCards(prev => prev.filter(c => c.tokenId !== nft.tokenId));
                        if (soundEnabled) AudioManager.deselectCard();
                      } else if (attackSelectedCards.length < HAND_SIZE_CONST) {
                        setAttackSelectedCards(prev => [...prev, nft]);
                        if (soundEnabled) AudioManager.selectCard();
                      }
                    }}
                    className={`relative aspect-[2/3] rounded-lg overflow-hidden cursor-pointer transition-all ${
                      isSelected
                        ? 'ring-4 ring-red-600 scale-95'
                        : 'hover:scale-105 hover:ring-2 hover:ring-vintage-gold/50'
                    }`}
                  >
                    <img src={nft.imageUrl} alt={`#${nft.tokenId}`} className="w-full h-full object-cover" />
                    <div className="absolute top-0 left-0 bg-vintage-gold text-vintage-black text-xs px-1 rounded-br font-bold">
                      {nft.power}
                    </div>
                    {isSelected && (
                      <div className="absolute inset-0 bg-red-600/20 flex items-center justify-center">
                        <div className="bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                          ✓
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={async () => {
                  if (attackSelectedCards.length !== HAND_SIZE_CONST || !targetPlayer || isAttacking) return;

                  // Prevent multiple clicks
                  setIsAttacking(true);

                  // ✅ MUDANÇA: Usar dados salvos ao invés de recalcular
                  devLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                  devLog(`⚔️  ATTACKING: ${targetPlayer.username}`);
                  devLog(`🛡️  Using saved defense deck data (no NFT fetch needed)`);

                  const defenderCards = (targetPlayer.defenseDeck || [])
                    .filter((card): card is { tokenId: string; power: number; imageUrl: string; name: string; rarity: string; foil?: string } => typeof card === 'object') // Skip legacy string format
                    .map((card, i) => {
                      devLog(`🃏 Card ${i+1}: ID=${card.tokenId}, Power=${card.power}, Name="${card.name}", Rarity="${card.rarity}"`);
                      return {
                        tokenId: card.tokenId,
                        power: card.power,           // ✅ USA PODER SALVO
                        imageUrl: card.imageUrl,
                        name: card.name,
                        rarity: card.rarity,
                      };
                    });
                  devLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

                  // Set up battle
                  setSelectedCards(attackSelectedCards);
                  setDealerCards(defenderCards);
                  setBattleOpponentName(targetPlayer.username); // Show enemy username
                  setBattlePlayerName(userProfile?.username || 'You'); // Show player username
                  // Opponent pfp from Twitter if available
                  setBattleOpponentPfp(targetPlayer.twitter ? `https://unavatar.io/twitter/${targetPlayer.twitter}` : null);
                  // Player pfp from Twitter if available
                  setBattlePlayerPfp(userProfile?.twitter ? `https://unavatar.io/twitter/${userProfile.twitter}` : null);
                  setShowAttackCardSelection(false);
                  setIsBattling(true);
                  setShowBattleScreen(true);
                  setBattlePhase('cards');
                  setGameMode('pvp'); // Mark as PvP-style battle

                  if (soundEnabled) AudioManager.playHand();

                  const playerTotal = attackSelectedCards.reduce((sum, c) => sum + (c.power || 0), 0);
                  const dealerTotal = defenderCards.reduce((sum, c) => sum + (c.power || 0), 0);

                  // Animate battle
                  setTimeout(() => {
                    setBattlePhase('clash');
                    if (soundEnabled) AudioManager.cardBattle();
                  }, 2500);

                  setTimeout(() => {
                    setPlayerPower(playerTotal);
                    setDealerPower(dealerTotal);
                    setBattlePhase('result');
                  }, 3500);

                  setTimeout(async () => {
                    let matchResult: 'win' | 'loss' | 'tie';
                    if (playerTotal > dealerTotal) {
                      matchResult = 'win';
                    } else if (playerTotal < dealerTotal) {
                      matchResult = 'loss';
                    } else {
                      matchResult = 'tie';
                    }

                    // Update stats and record matches
                    if (address && userProfile) {
                      try {
                        const todayUTC = new Date().toISOString().split('T')[0];

                        // Update attack tracking
                        await ConvexProfileService.updateProfile(address, {
                          attacksToday: (userProfile.attacksToday || 0) + 1,
                          lastAttackDate: todayUTC,
                        });

                        // Increment attacker stats
                        if (matchResult === 'win') {
                          await ConvexProfileService.incrementStat(address, 'attackWins');
                        } else if (matchResult === 'loss') {
                          await ConvexProfileService.incrementStat(address, 'attackLosses');
                        }

                        // Increment defender stats
                        if (matchResult === 'loss') {
                          await ConvexProfileService.incrementStat(targetPlayer.address, 'defenseWins');
                        } else if (matchResult === 'win') {
                          await ConvexProfileService.incrementStat(targetPlayer.address, 'defenseLosses');
                        }

                        await ConvexProfileService.recordMatch(
                          address,
                          'attack',
                          matchResult,
                          playerTotal,
                          dealerTotal,
                          attackSelectedCards,
                          defenderCards,
                          targetPlayer.address,
                          targetPlayer.username
                        );

                        await ConvexProfileService.recordMatch(
                          targetPlayer.address,
                          'defense',
                          matchResult === 'win' ? 'loss' : matchResult === 'loss' ? 'win' : 'tie',
                          dealerTotal,
                          playerTotal,
                          defenderCards,
                          attackSelectedCards,
                          address,
                          userProfile.username
                        );

                        const updatedProfile = await ConvexProfileService.getProfile(address);
                        if (updatedProfile) {
                          setUserProfile(updatedProfile);
                        }

                        // 🔔 Send notification to defender
                        fetch('/api/notifications/send', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            type: 'defense_attacked',
                            data: {
                              defenderAddress: targetPlayer.address,
                              defenderUsername: targetPlayer.username || 'Unknown',
                              attackerUsername: userProfile.username || 'Unknown',
                              result: matchResult === 'win' ? 'lose' : 'win', // Inverted: attacker wins = defender loses
                            },
                          }),
                        }).catch(err => devError('Error sending notification:', err));
                      } catch (error) {
                        devError('Attack error:', error);
                      }
                    }

                    // Close battle and show result
                    setTimeout(() => {
                      setIsBattling(false);
                      setShowBattleScreen(false);
                      setBattlePhase('cards');
                      setAttackSelectedCards([]);
                      setIsAttacking(false); // Reset attack state

                      // Set last battle result for sharing
                      setLastBattleResult({
                        result: matchResult,
                        playerPower: playerTotal,
                        opponentPower: dealerTotal,
                        opponentName: targetPlayer.username,
                        opponentTwitter: targetPlayer.twitter,
                        type: 'attack'
                      });

                      setTargetPlayer(null);

                      if (matchResult === 'win') {
                        setShowWinPopup(true);
                        if (soundEnabled) AudioManager.win();
                      } else if (matchResult === 'loss') {
                        setShowLossPopup(true);
                        if (soundEnabled) AudioManager.lose();
                      } else {
                        if (soundEnabled) AudioManager.tie();
                      }
                    }, 2000);
                  }, 4500);
                }}
                disabled={attackSelectedCards.length !== HAND_SIZE_CONST || isAttacking}
                className={`w-full px-6 py-4 rounded-xl font-display font-bold text-lg transition-all uppercase tracking-wide ${
                  attackSelectedCards.length === HAND_SIZE_CONST && !isAttacking
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/50 hover:scale-105'
                    : 'bg-vintage-black/50 text-vintage-gold/40 cursor-not-allowed border border-vintage-gold/20'
                }`}
              >
                {isAttacking ? '⏳ Attacking...' : `⚔️ Attack! (${attackSelectedCards.length}/${HAND_SIZE_CONST})`}
              </button>

              <button
                onClick={() => {
                  if (soundEnabled) AudioManager.buttonNav();
                  setShowAttackCardSelection(false);
                  setAttackSelectedCards([]);
                  setTargetPlayer(null);
                }}
                className="w-full px-6 py-3 bg-vintage-black hover:bg-vintage-gold/10 text-vintage-gold border border-vintage-gold/50 rounded-xl font-modern font-semibold transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Seleção de Modo de Jogo */}
      {pvpMode === 'menu' && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[150] p-4" onClick={() => setPvpMode(null)}>
          <div className="bg-vintage-charcoal rounded-2xl border-2 border-vintage-gold max-w-md w-full p-8 shadow-gold" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-3xl font-display font-bold text-center mb-2 text-vintage-gold">
              {t('selectMode') || 'SELECT MODE'}
            </h2>
            <p className="text-center text-vintage-burnt-gold mb-8 text-sm font-modern">
              {t('chooseBattleMode') || 'CHOOSE YOUR BATTLE MODE'}
            </p>

            <div className="space-y-4">
              {/* Difficulty Selector Button */}
              <button
                onClick={() => {
                  if (soundEnabled) AudioManager.buttonClick();
                  setIsDifficultyModalOpen(true);
                }}
                className="w-full bg-vintage-charcoal/50 rounded-xl p-4 border-2 border-vintage-gold/50 hover:border-vintage-gold hover:shadow-lg hover:shadow-vintage-gold/20 transition-all"
              >
                <p className="text-center text-vintage-gold text-sm font-modern mb-2">⚔️ SELECT DIFFICULTY ⚔️</p>
                <div className="flex items-center justify-center gap-3 mb-2">
                  {(['gey', 'goofy', 'gooner', 'gangster', 'gigachad'] as const).map((diff) => {
                    const diffEmoji = {
                      gey: '🏳️‍🌈',
                      goofy: '🤪',
                      gooner: '💀',
                      gangster: '🔫',
                      gigachad: '💪'
                    };
                    const isUnlocked = unlockedDifficulties.has(diff);
                    const isCurrent = aiDifficulty === diff;

                    return (
                      <div
                        key={diff}
                        className={`text-xl transition-all ${
                          !isUnlocked ? 'opacity-20 grayscale' :
                          isCurrent ? 'scale-125 drop-shadow-lg' : 'opacity-50'
                        }`}
                      >
                        {diffEmoji[diff]}
                      </div>
                    );
                  })}
                </div>
                <p className="text-center text-vintage-burnt-gold text-xs">
                  Current: {aiDifficulty === 'gey' && '🏳️‍🌈 GEY (75 PWR)'}
                  {aiDifficulty === 'goofy' && '🤪 GOOFY (~105 PWR)'}
                  {aiDifficulty === 'gooner' && '💀 GOONER (~360 PWR)'}
                  {aiDifficulty === 'gangster' && '🔫 GANGSTER (750 PWR)'}
                  {aiDifficulty === 'gigachad' && '💪 GIGACHAD (855 PWR)'}
                </p>
              </button>

              {/* Jogar vs IA */}
              <button
                onClick={() => {
                  if (soundEnabled) AudioManager.buttonSuccess();
                  setPvpMode(null);
                  setShowPveCardSelection(true);
                  setPveSelectedCards([]);
                }}
                className="w-full px-6 py-4 bg-vintage-neon-blue hover:bg-vintage-neon-blue/80 text-vintage-black rounded-xl font-display font-bold text-lg shadow-neon transition-all hover:scale-105"
              >
                ♣ {t('playVsAI')}
              </button>

              {/* Jogar vs Jogador */}
              <button
                onClick={() => {
                  if (soundEnabled) AudioManager.buttonClick();
                  setGameMode('pvp');
                  setPvpMode('pvpMenu');
                }}
                className="w-full px-6 py-4 bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black rounded-xl font-display font-bold text-lg shadow-gold transition-all hover:scale-105"
              >
                ♥ {t('playVsPlayer')}
              </button>

              {/* Cancelar */}
              <button
                onClick={() => {
                  if (soundEnabled) AudioManager.buttonNav();
                  setPvpMode(null);
                  setGameMode(null);
                }}
                className="w-full px-6 py-3 bg-vintage-black hover:bg-vintage-gold/10 text-vintage-gold border border-vintage-gold/50 rounded-xl font-modern font-semibold transition"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Menu PvP */}
      {pvpMode === 'pvpMenu' && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[150] p-4" onClick={() => setPvpMode(null)}>
          <div className="bg-vintage-charcoal rounded-2xl border-2 border-vintage-gold max-w-md w-full p-8 shadow-gold" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-3xl font-display font-bold text-center mb-2 text-vintage-gold">
              {t('pvp')}
            </h2>
            <p className="text-center text-vintage-burnt-gold mb-8 text-sm font-modern">
              {t('choosePvpMode') || 'CHOOSE HOW TO FIND OPPONENT'}
            </p>

            <div className="space-y-4">
              {/* Busca Automática */}
              <button
                disabled={isSearching}
                onClick={async () => {
                  if (soundEnabled) AudioManager.buttonSuccess();
                  setPvpMode('autoMatch');
                  setIsSearching(true);
                  try {
                    const code = await ConvexPvPService.findMatch(address || '', userProfile?.username);
                    if (code) {
                      // Encontrou uma sala imediatamente
                      setRoomCode(code);
                      setPvpMode('inRoom');
                      setIsSearching(false);
                    }
                    // Se não encontrou (code === ''), continua em autoMatch aguardando
                  } catch (error) {
                    alert('Erro ao buscar partida: ' + error);
                    setIsSearching(false);
                    setPvpMode('pvpMenu');
                  }
                }}
                className="w-full px-6 py-4 bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black rounded-xl font-display font-bold text-lg shadow-gold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                ◊ {t('autoMatch')}
              </button>

              {/* Criar Sala */}
              <button
                onClick={async () => {
                  if (soundEnabled) AudioManager.buttonClick();
                  try {
                    // Remove do matchmaking antes de criar sala manual
                    await ConvexPvPService.cancelMatchmaking(address || '');
                    const code = await ConvexPvPService.createRoom(address || '', userProfile?.username);
                    setRoomCode(code);
                    setPvpMode('createRoom');
                  } catch (error) {
                    alert('Erro ao criar sala: ' + error);
                  }
                }}
                className="w-full px-6 py-4 bg-vintage-neon-blue hover:bg-vintage-neon-blue/80 text-vintage-black rounded-xl font-display font-bold text-lg shadow-neon transition-all hover:scale-105"
              >
                ＋ {t('createRoom')}
              </button>

              {/* Entrar na Sala */}
              <button
                onClick={() => {
                  if (soundEnabled) AudioManager.buttonClick();
                  setPvpMode('joinRoom');
                }}
                className="w-full px-6 py-4 bg-vintage-silver hover:bg-vintage-burnt-gold text-vintage-black rounded-xl font-display font-bold text-lg shadow-lg transition-all hover:scale-105"
              >
                → {t('joinRoom')}
              </button>

              {/* Voltar */}
              <button
                onClick={() => {
                  if (soundEnabled) AudioManager.buttonNav();
                  setPvpMode(null);
                  setGameMode(null);
                }}
                className="w-full px-6 py-3 bg-vintage-black hover:bg-vintage-gold/10 text-vintage-gold border border-vintage-gold/50 rounded-xl font-modern font-semibold transition"
              >
                ← {t('back') || 'BACK'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Busca Automática */}
      {pvpMode === 'autoMatch' && isSearching && !roomCode && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[150] p-4">
          <div className="bg-vintage-charcoal rounded-2xl border-2 border-vintage-gold max-w-md w-full p-8 shadow-gold">
            <div className="text-center">
              <div className="mb-6">
                <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-vintage-gold border-t-transparent"></div>
              </div>
              <h2 className="text-2xl font-display font-bold text-vintage-gold mb-2">
                {t('searching')}
              </h2>
              <p className="text-vintage-burnt-gold mb-8 font-modern">
                {t('waitingForOpponent')}
              </p>
              <button
                onClick={() => {
                  if (soundEnabled) AudioManager.buttonError();
                  setIsSearching(false);
                  setPvpMode('pvpMenu');
                  ConvexPvPService.cancelMatchmaking(address || '');
                }}
                className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition"
              >
                {t('cancelSearch')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criar Sala */}
      {pvpMode === 'createRoom' && roomCode && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[150] p-4">
          <div className="bg-vintage-charcoal rounded-2xl border-2 border-vintage-gold shadow-gold border-vintage-neon-blue max-w-md w-full p-8">
            <h2 className="text-2xl font-bold text-center text-blue-400 mb-2">
              {t('roomCreated')}
            </h2>
            <p className="text-center text-vintage-burnt-gold mb-6 text-sm">
              {t('shareCode')}
            </p>

            <div className="bg-vintage-charcoal rounded-xl p-6 mb-6 border-2 border-vintage-gold shadow-gold">
              <p className="text-vintage-burnt-gold text-sm mb-2 text-center font-modern">{t('roomCode')}</p>
              <p className="text-4xl font-bold text-center text-vintage-neon-blue tracking-wider font-display">
                {roomCode}
              </p>
            </div>

            <button
              onClick={() => {
                if (soundEnabled) AudioManager.buttonSuccess();
                navigator.clipboard.writeText(roomCode);
              }}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold mb-4 transition"
            >
              📋 {t('copyCode')}
            </button>

            <button
              onClick={() => {
                if (soundEnabled) AudioManager.buttonClick();
                setPvpMode('inRoom');
              }}
              className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold mb-2 transition"
            >
              ✓ {t('ready') || 'Ready'}
            </button>

            <button
              onClick={() => {
                if (soundEnabled) AudioManager.buttonNav();
                setPvpMode('pvpMenu');
                setRoomCode('');
                ConvexPvPService.leaveRoom(roomCode, address || '');
              }}
              className="w-full px-6 py-3 bg-vintage-black hover:bg-vintage-gold/10 text-vintage-gold border border-vintage-gold/50 rounded-xl font-semibold transition"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Modal de Entrar na Sala */}
      {pvpMode === 'joinRoom' && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[150] p-4">
          <div className="bg-vintage-charcoal rounded-2xl border-2 border-vintage-gold shadow-gold border-vintage-gold max-w-md w-full p-8">
            <h2 className="text-2xl font-bold text-center text-vintage-gold mb-2">
              {t('joinRoom')}
            </h2>
            <p className="text-center text-vintage-burnt-gold mb-6 text-sm">
              {t('enterRoomCode')}
            </p>

            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              className="w-full px-4 py-3 bg-vintage-charcoal border-2 border-vintage-gold rounded-xl text-center text-2xl font-bold text-vintage-neon-blue tracking-wider mb-6 focus:outline-none focus:ring-2 focus:ring-vintage-gold font-display shadow-gold"
            />

            <button
              onClick={async () => {
                if (soundEnabled) AudioManager.buttonClick();
                try {
                  // Remove do matchmaking antes de entrar em sala manual
                  await ConvexPvPService.cancelMatchmaking(address || '');
                  await ConvexPvPService.joinRoom(roomCode, address || '', userProfile?.username);
                  setPvpMode('inRoom');
                  if (soundEnabled) AudioManager.buttonSuccess();
                } catch (error: any) {
                  alert(error.message);
                  if (soundEnabled) AudioManager.buttonError();
                }
              }}
              disabled={roomCode.length !== 6}
              className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-xl font-semibold mb-2 transition"
            >
              {t('join')}
            </button>

            <button
              onClick={() => {
                if (soundEnabled) AudioManager.buttonNav();
                setPvpMode('pvpMenu');
                setRoomCode('');
              }}
              className="w-full px-6 py-3 bg-vintage-black hover:bg-vintage-gold/10 text-vintage-gold border border-vintage-gold/50 rounded-xl font-semibold transition"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Modal de Sala (Aguardando/Jogando) */}
      {pvpMode === 'inRoom' && roomCode && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[150] p-4">
          <div className="bg-vintage-charcoal rounded-2xl border-2 border-vintage-gold shadow-gold border-yellow-500 max-w-2xl w-full p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-yellow-400">
                {t('room') || 'Room'}: {roomCode}
              </h2>
              <button
                onClick={() => {
                  if (soundEnabled) AudioManager.buttonNav();
                  setPvpMode('pvpMenu');
                  setRoomCode('');
                  setCurrentRoom(null);
                  ConvexPvPService.leaveRoom(roomCode, address || '');
                }}
                className="text-vintage-burnt-gold hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            {currentRoom ? (
              <div className="space-y-4">
                {/* Host */}
                <div className="bg-vintage-charcoal rounded-xl p-4 border-2 border-vintage-neon-blue/50">
                  <p className="text-vintage-neon-blue font-bold mb-2 font-modern">Host</p>
                  <p className="text-white text-sm font-mono">{currentRoom.hostUsername || `${currentRoom.hostAddress.slice(0, 10)}...`}</p>
                  <p className="text-vintage-burnt-gold text-sm">
                    {(currentRoom.hostCards && currentRoom.hostCards.length > 0) ? '✓ Ready' : '⏳ Selecting cards...'}
                  </p>
                </div>

                {/* Guest */}
                <div className="bg-vintage-charcoal rounded-xl p-4 border-2 border-vintage-gold/50">
                  <p className="text-vintage-gold font-bold mb-2 font-modern">{t('opponent')}</p>
                  {currentRoom.guestAddress ? (
                    <>
                      <p className="text-white text-sm font-mono">{currentRoom.guestUsername || `${currentRoom.guestAddress.slice(0, 10)}...`}</p>
                      <p className="text-vintage-burnt-gold text-sm">
                        {(currentRoom.guestCards && currentRoom.guestCards.length > 0) ? '✓ Ready' : '⏳ Selecting cards...'}
                      </p>
                    </>
                  ) : (
                    <p className="text-vintage-burnt-gold text-sm">{t('waitingForOpponent')}</p>
                  )}
                </div>

                {/* Grid de Seleção de Cartas */}
                {currentRoom.guestAddress && (() => {
                  const isHost = currentRoom.hostAddress === address?.toLowerCase();
                  const playerReady = isHost ? (currentRoom.hostCards && currentRoom.hostCards.length > 0) : (currentRoom.guestCards && currentRoom.guestCards.length > 0);

                  // Só mostra grid se o jogador atual NÃO estiver pronto ainda
                  if (playerReady) return null;

                  // Se não tem NFTs carregados, mostra loading
                  if (nfts.length === 0) {
                    return (
                      <div className="mt-6 text-center">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent mb-4"></div>
                        <p className="text-vintage-burnt-gold">Loading your cards...</p>
                      </div>
                    );
                  }

                  return (
                    <div className="mt-6">
                      <h3 className="text-lg font-bold text-center text-white mb-4">
                        {t('selectYourCards') || 'Select Your Cards'} ({selectedCards.length}/5)
                      </h3>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-[300px] overflow-y-auto p-2">
                        {nfts.map((nft, index) => {
                          const isSelected = selectedCards.some((c: any) => c.tokenId === nft.tokenId);
                          return (
                            <div
                              key={index}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedCards(selectedCards.filter((c: any) => c.tokenId !== nft.tokenId));
                                } else if (selectedCards.length < 5) {
                                  setSelectedCards([...selectedCards, nft]);
                                }
                                if (soundEnabled) AudioManager.buttonClick();
                              }}
                              className={`relative cursor-pointer rounded-lg overflow-hidden transition-all ${
                                isSelected
                                  ? 'ring-4 ring-green-500 scale-95'
                                  : 'hover:scale-105 opacity-70 hover:opacity-100'
                              }`}
                            >
                              <img
                                src={nft.imageUrl}
                                alt={nft.name}
                                className="w-full h-auto"
                                loading="lazy"
                              />
                              <div className="absolute top-1 right-1 bg-black/70 rounded-full px-2 py-0.5 text-xs font-bold text-white">
                                {nft.power}
                              </div>
                              {isSelected && (
                                <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                                  <span className="text-4xl">✓</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Botão de Confirmar Cartas */}
                {currentRoom.guestAddress && (() => {
                  const isHost = currentRoom.hostAddress === address?.toLowerCase();
                  const playerReady = isHost ? (currentRoom.hostCards && currentRoom.hostCards.length > 0) : (currentRoom.guestCards && currentRoom.guestCards.length > 0);

                  // Só mostra botão se o jogador atual NÃO estiver pronto ainda
                  if (playerReady) return null;

                  return (
                    <button
                      onClick={async () => {
                        if (isConfirmingCards || selectedCards.length !== 5) return;
                        setIsConfirmingCards(true);

                        if (soundEnabled) AudioManager.buttonSuccess();
                        await ConvexPvPService.updateCards(roomCode, address || '', selectedCards);

                        // Reset after 2 seconds in case of error
                        setTimeout(() => setIsConfirmingCards(false), 2000);
                      }}
                      disabled={selectedCards.length !== 5 || isConfirmingCards}
                      className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition mt-4"
                    >
                      {isConfirmingCards ? '⏳ Confirming...' : `${t('confirmCards') || 'Confirm Cards'} (${selectedCards.length}/5)`}
                    </button>
                  );
                })()}

                {/* Mensagem de aguardo */}
                {currentRoom.guestAddress && (() => {
                  const isHost = currentRoom.hostAddress === address?.toLowerCase();
                  const playerReady = isHost ? (currentRoom.hostCards && currentRoom.hostCards.length > 0) : (currentRoom.guestCards && currentRoom.guestCards.length > 0);
                  const opponentReady = isHost ? (currentRoom.guestCards && currentRoom.guestCards.length > 0) : (currentRoom.hostCards && currentRoom.hostCards.length > 0);

                  // Mostra loading se pelo menos um jogador confirmou
                  if (!playerReady && !opponentReady) return null;

                  return (
                    <div className="mt-4 text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-yellow-500 border-t-transparent mb-2"></div>
                      <p className="text-yellow-400 font-semibold">
                        {playerReady && !opponentReady
                          ? (t('waitingForOpponent') || 'Waiting for opponent...')
                          : (t('waitingForBothPlayers') || 'Starting battle...')
                        }
                      </p>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-yellow-500 border-t-transparent mb-4"></div>
                <p className="text-vintage-burnt-gold">{t('loading') || 'Loading room...'}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {showTutorial && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowTutorial(false)}>
          <div className="bg-vintage-deep-black rounded-2xl border-2 border-vintage-gold max-w-2xl max-h-[90vh] overflow-y-auto p-8 shadow-[0_0_40px_rgba(255,215,0,0.4)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-display font-bold text-vintage-gold" style={{textShadow: '0 0 15px rgba(255, 215, 0, 0.5)'}}>{t('tutorialTitle')}</h2>
              <button onClick={() => setShowTutorial(false)} className="text-vintage-burnt-gold hover:text-vintage-gold text-2xl transition">✕</button>
            </div>

            <div className="space-y-6 text-vintage-ice">
              {/* Precisa de Cartas? */}
              <div className="relative p-1 rounded-xl" style={{background: 'linear-gradient(145deg, #FFD700, #C9A227, #FFD700)', boxShadow: '0 0 20px rgba(255, 215, 0, 0.4)', animation: 'pulse 2s ease-in-out infinite'}}>
                <div className="bg-vintage-black/90 p-5 rounded-lg">
                  <h3 className="text-xl font-display font-bold text-vintage-gold mb-2 flex items-center gap-2">
                    <span className="text-2xl">🛒</span> {t('needCards')}
                  </h3>
                  <p className="mb-4 text-vintage-burnt-gold">{t('needCardsDesc')}</p>
                  <a
                    href="https://vibechain.com/market/vibe-most-wanted?ref=XCLR1DJ6LQTT"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-modern font-bold transition-all hover:scale-105"
                    style={{background: 'linear-gradient(145deg, #FFD700, #C9A227)', color: '#0C0C0C', boxShadow: '0 0 15px rgba(255, 215, 0, 0.5)'}}
                  >
                    {t('buyCards')} 🛒
                  </a>
                </div>
              </div>

              {/* Como Jogar */}
              <div className="bg-vintage-charcoal/50 p-5 rounded-xl border border-vintage-gold/30">
                <h3 className="text-xl font-display font-bold text-vintage-gold mb-3 flex items-center gap-2">
                  <span className="text-2xl">🎮</span> {t('howToPlay')}
                </h3>
                <div className="bg-vintage-black/50 p-4 rounded-lg border border-vintage-gold/20">
                  <p className="whitespace-pre-line text-sm leading-relaxed text-vintage-ice">{t('howToPlayDesc')}</p>
                </div>
              </div>

              {/* Poder Total */}
              <div className="bg-vintage-charcoal/50 p-5 rounded-xl border border-vintage-neon-blue/30">
                <h3 className="text-xl font-display font-bold text-vintage-neon-blue mb-3 flex items-center gap-2">
                  <span className="text-2xl">⚡</span> {t('totalPowerInfo')}
                </h3>
                <div className="bg-vintage-black/50 p-4 rounded-lg border border-vintage-neon-blue/20">
                  <p className="whitespace-pre-line text-sm leading-relaxed text-vintage-ice">{t('totalPowerInfoDesc')}</p>
                </div>
              </div>

              {/* Ranking Global */}
              <div className="bg-vintage-charcoal/50 p-5 rounded-xl border border-vintage-gold/30">
                <h3 className="text-xl font-display font-bold text-vintage-gold mb-3 flex items-center gap-2">
                  <span className="text-2xl">🏆</span> {t('leaderboardInfo')}
                </h3>
                <div className="bg-vintage-black/50 p-4 rounded-lg border border-vintage-gold/20">
                  <p className="whitespace-pre-line text-sm leading-relaxed text-vintage-ice">{t('leaderboardInfoDesc')}</p>
                </div>
              </div>

              {/* Deck de Defesa */}
              <div className="bg-vintage-charcoal/50 p-5 rounded-xl border border-vintage-burnt-gold/30">
                <h3 className="text-xl font-display font-bold text-vintage-burnt-gold mb-3 flex items-center gap-2">
                  <span className="text-2xl">🛡️</span> {t('defenseDeckInfo')}
                </h3>
                <div className="bg-vintage-black/50 p-4 rounded-lg border border-vintage-burnt-gold/20">
                  <p className="whitespace-pre-line text-sm leading-relaxed text-vintage-ice">{t('defenseDeckInfoDesc')}</p>
                </div>
              </div>

              {/* Sistema de Ataques */}
              <div className="bg-vintage-charcoal/50 p-5 rounded-xl border border-red-500/30">
                <h3 className="text-xl font-display font-bold text-red-400 mb-3 flex items-center gap-2">
                  <span className="text-2xl">⚔️</span> {t('attackSystemInfo')}
                </h3>
                <div className="bg-vintage-black/50 p-4 rounded-lg border border-red-500/20">
                  <p className="whitespace-pre-line text-sm leading-relaxed text-vintage-ice">{t('attackSystemInfoDesc')}</p>
                </div>
              </div>

              {/* Como o Poder Funciona */}
              <div className="bg-vintage-charcoal/50 p-5 rounded-xl border border-vintage-gold/30">
                <h3 className="text-xl font-display font-bold text-vintage-gold mb-2 flex items-center gap-2">
                  <span className="text-2xl">⚡</span> {t('powerCalc')}
                </h3>
                <p className="mb-3 text-sm text-vintage-burnt-gold">{t('powerCalcDesc')}</p>
                <div className="bg-vintage-black/50 p-4 rounded-lg space-y-3 text-sm border border-vintage-gold/20">
                  <div>
                    <p className="text-vintage-gold font-bold font-modern">{t('rarityBase')}</p>
                    <p className="ml-4 text-vintage-burnt-gold text-xs mt-1">{t('rarityValues')}</p>
                  </div>
                  <div>
                    <p className="text-vintage-gold font-bold font-modern">{t('wearMultiplier')}</p>
                    <p className="ml-4 text-vintage-burnt-gold text-xs mt-1">{t('wearValues')}</p>
                  </div>
                  <div>
                    <p className="text-vintage-gold font-bold font-modern">{t('foilMultiplier')}</p>
                    <p className="ml-4 text-vintage-burnt-gold text-xs mt-1">{t('foilValues')}</p>
                  </div>
                </div>
              </div>

              {/* Foil Types */}
              <div className="bg-vintage-felt-green/20 p-4 rounded-xl border border-vintage-gold/30">
                <div className="space-y-2 text-sm">
                  <p className="text-vintage-gold font-bold font-modern flex items-center gap-2">
                    <span className="text-xl">🌟</span> {t('prizeFoil')}
                  </p>
                  <p className="text-vintage-neon-blue font-bold font-modern flex items-center gap-2">
                    <span className="text-xl">✨</span> {t('standardFoil')}
                  </p>
                </div>
              </div>

              {/* Exemplos */}
              <div className="bg-vintage-charcoal/50 p-5 rounded-xl border border-vintage-gold/30">
                <h3 className="text-xl font-display font-bold text-vintage-gold mb-3 flex items-center gap-2">
                  <span className="text-2xl">📊</span> {t('powerExamples')}
                </h3>
                <div className="bg-vintage-black/50 p-4 rounded-lg space-y-2 text-sm border border-vintage-gold/20">
                  <p className="text-vintage-ice">• {t('exampleCommon')}</p>
                  <p className="text-vintage-ice">• {t('exampleRare')}</p>
                  <p className="text-vintage-ice">• {t('exampleLegendary')}</p>
                  <p className="text-vintage-gold font-bold text-base flex items-center gap-2">
                    <span>•</span> {t('exampleMythic')}
                  </p>
                </div>
              </div>
            </div>

            {/* Illuminated Button */}
            <div className="relative mt-6 p-1 rounded-xl" style={{background: 'linear-gradient(145deg, #FFD700, #C9A227, #FFD700)', boxShadow: '0 0 20px rgba(255, 215, 0, 0.5)'}}>
              <button
                onClick={() => setShowTutorial(false)}
                className="w-full px-6 py-4 rounded-lg font-display font-bold text-lg transition-all hover:scale-[1.02]"
                style={{background: 'linear-gradient(145deg, #FFD700, #C9A227)', color: '#0C0C0C', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.4)'}}
              >
                {t('understood')} ♠
              </button>
            </div>
          </div>
        </div>
      )}

      <header className={`flex flex-col items-center gap-3 md:gap-6 mb-4 md:mb-8 p-3 md:p-6 bg-vintage-deep-black border-2 border-vintage-gold rounded-lg shadow-[0_0_30px_rgba(255,215,0,0.3)] ${isInFarcaster ? 'mt-[70px]' : ''}`}>
        <div className="text-center relative">
          <div className="absolute inset-0 blur-3xl opacity-30 bg-vintage-gold rounded-full" style={{boxShadow: '0 0 80px rgba(255, 215, 0, 0.4)'}}></div>
          <h1 className="relative text-3xl md:text-5xl lg:text-6xl font-display font-black text-vintage-gold tracking-wider mb-1 md:mb-2" style={{textShadow: '0 0 20px rgba(255, 215, 0, 0.5), 0 0 40px rgba(255, 215, 0, 0.3)'}}>
            VIBE MOST WANTED
          </h1>
          <p className="relative text-xs md:text-sm text-vintage-burnt-gold font-modern tracking-[0.2em] md:tracking-[0.3em] uppercase">{t('cardBattle')}</p>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-2 md:gap-3 w-full md:w-auto">
          <a
            href="https://vibechain.com/market/vibe-most-wanted?ref=XCLR1DJ6LQTT"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 md:px-8 py-2 md:py-3 border-2 border-vintage-gold text-vintage-black font-modern font-semibold rounded-lg transition-all duration-300 shadow-gold hover:shadow-gold-lg tracking-wider flex items-center gap-2 text-sm md:text-base"
            style={{background: 'linear-gradient(145deg, #FFD700, #C9A227)'}}
          >
            <span className="text-base md:text-lg">◆</span> <span className="hidden md:inline">{t('buyCardsExternal') || 'BUY CARDS ON VIBE MARKET'}</span><span className="md:hidden">Buy Cards</span>
          </a>

          {!isInFarcaster && (
            <a
              href="https://farcaster.xyz/miniapps/UpOGC4pheWVP/vibe-most-wanted"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 md:px-6 py-2 md:py-2.5 border-2 border-purple-500 text-purple-300 hover:text-purple-100 bg-purple-900/30 hover:bg-purple-800/40 font-modern font-semibold rounded-lg transition-all duration-300 tracking-wider flex items-center gap-2 text-xs md:text-sm"
            >
              <span className="text-base md:text-lg">🎮</span> {t('tryMiniapp')}
            </a>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Coin Balance Display */}
          {address && userProfile && playerEconomy && (
            <div className="bg-gradient-to-r from-vintage-gold/20 to-vintage-burnt-gold/20 border-2 border-vintage-gold px-4 md:px-6 py-2 md:py-3 rounded-lg flex items-center gap-2 shadow-[0_0_20px_rgba(255,215,0,0.3)]">
              <span className="text-2xl">💰</span>
              <div className="flex flex-col">
                <span className="text-vintage-gold font-display font-bold text-sm md:text-base leading-none">
                  {(playerEconomy.coins || 0).toLocaleString()}
                </span>
                <span className="text-vintage-burnt-gold font-modern text-[9px] md:text-xs leading-none mt-0.5">
                  $TESTVBMS
                </span>
              </div>
            </div>
          )}

          {/* Notifications Button - Only show if user is logged in */}
          {address && userProfile && (
            <button
              onClick={() => {
                // Mark all as read
                const lastSeenKey = `defenses_last_seen_${address.toLowerCase()}`;
                localStorage.setItem(lastSeenKey, Date.now().toString());
                setUnreadDefenses(0);

                // Redirect to profile with scroll to match history
                const username = userProfile.username;
                router.push(`/profile/${username}?scrollTo=match-history`);
              }}
              className={`bg-vintage-deep-black border-2 text-vintage-gold px-3 md:px-4 py-1.5 md:py-2 rounded-lg hover:bg-vintage-gold/20 transition font-bold text-sm md:text-base relative ${
                unreadDefenses > 0 ? 'border-red-500 animate-notification-pulse' : 'border-vintage-gold'
              }`}
              title={unreadDefenses > 0 ? `${unreadDefenses} novos ataques recebidos` : 'Notificações'}
            >
              <span className="text-lg">🔔</span>
              {unreadDefenses > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                  {unreadDefenses}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => {
              if (soundEnabled) AudioManager.buttonClick();
              setShowSettings(true);
            }}
            className="bg-vintage-deep-black border-2 border-vintage-gold text-vintage-gold px-3 md:px-4 py-1.5 md:py-2 rounded-lg hover:bg-vintage-gold/20 transition font-bold text-sm md:text-base"
            title={t('settings')}
          >
            <span className="text-lg">§</span>
          </button>

          <button
            onClick={() => setShowTutorial(true)}
            className="bg-vintage-deep-black border-2 border-vintage-gold text-vintage-gold px-3 md:px-4 py-1.5 md:py-2 rounded-lg hover:bg-vintage-gold/20 transition font-bold text-sm md:text-base"
            title={t('tutorial')}
          >
            <span className="text-lg">?</span>
          </button>
        </div>
      </header>

      {!address ? (
        <div className="flex flex-col items-center justify-center py-20">
          {/* Show loading while checking for Farcaster OR if confirmed in Farcaster */}
          {isCheckingFarcaster || isInFarcaster ? (
            <div className="bg-vintage-charcoal backdrop-blur-lg p-8 rounded-2xl border-2 border-vintage-gold max-w-md text-center">
              <div className="text-6xl mb-4 text-vintage-gold font-display animate-pulse">♠</div>
              <div className="w-full px-6 py-4 bg-vintage-gold/20 text-vintage-gold rounded-xl border-2 border-vintage-gold/50 font-display font-semibold">
                {t('loading')}...
              </div>
            </div>
          ) : (
            /* Show full connect modal ONLY after confirming NOT in Farcaster */
            <div className="bg-vintage-charcoal backdrop-blur-lg p-8 rounded-2xl border-2 border-vintage-gold max-w-md text-center">
              <div className="text-6xl mb-4 text-vintage-gold font-display">♠</div>
              <h2 className="text-2xl font-bold mb-4 text-vintage-gold">{t('connectTitle')}</h2>
              <p className="text-vintage-burnt-gold mb-6">{t('connectDescription')}</p>

              <div className="flex justify-center">
                <ConnectButton.Custom>
                  {({
                    account,
                    chain,
                    openAccountModal,
                    openChainModal,
                    openConnectModal,
                    mounted,
                  }) => {
                    return (
                      <div
                        {...(!mounted && {
                          'aria-hidden': true,
                          'style': {
                            opacity: 0,
                            pointerEvents: 'none',
                            userSelect: 'none',
                          },
                        })}
                      >
                        {(() => {
                          if (!mounted || !account || !chain) {
                            return (
                              <button
                                onClick={openConnectModal}
                                className="w-full px-6 py-4 bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black rounded-xl shadow-gold hover:shadow-gold-lg transition-all font-display font-semibold"
                              >
                                {t('connectWallet')}
                              </button>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    );
                  }}
                </ConnectButton.Custom>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Claude AI Disclaimer */}
          <div className="mb-4 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-purple-500/10 border-2 border-purple-400/30 rounded-xl p-3 md:p-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl md:text-3xl flex-shrink-0">🤖</div>
              <div className="flex-1 min-w-0">
                <p className="text-purple-300 font-bold text-sm md:text-base mb-1">
                  {t('claudeDisclaimerTitle')}
                </p>
                {/* Desktop: normal text */}
                <p className="hidden md:block text-purple-200/90 text-xs md:text-sm leading-relaxed">
                  {t('claudeDisclaimerText')}
                </p>
                {/* Mobile: scrolling marquee */}
                <div className="md:hidden overflow-hidden">
                  <p className="text-purple-200/90 text-xs leading-relaxed animate-marquee whitespace-nowrap inline-block">
                    {t('claudeDisclaimerText')}&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Metadata Delay Warning Banner */}
          <div className="mb-4 bg-gradient-to-r from-orange-500/20 via-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/50 rounded-xl p-3 md:p-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl md:text-3xl flex-shrink-0">⚠️</div>
              <div className="flex-1">
                <p className="text-yellow-300 font-bold text-sm md:text-base mb-1">
                  {t('metadataWarningTitle')}
                </p>
                <p className="text-yellow-200/90 text-xs md:text-sm leading-relaxed">
                  {t('metadataWarningText')}
                </p>
              </div>
            </div>
          </div>

          <div className={`mb-3 md:mb-6 ${isInFarcaster ? 'fixed top-0 left-0 right-0 z-[100] m-0' : ''}`}>
            <div className={`bg-vintage-charcoal/80 backdrop-blur-lg p-2 md:p-4 ${isInFarcaster ? 'rounded-none border-b-2' : 'rounded-xl border-2'} border-vintage-gold/30 shadow-gold`}>
              <div className="flex flex-wrap items-center justify-between gap-2 md:gap-3">
                <div className="flex items-center gap-2">
                  {/* Profile Button */}
                  {userProfile ? (
                    <Link
                      href={`/profile/${userProfile.username}`}
                      onClick={() => { if (soundEnabled) AudioManager.buttonClick(); }}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-vintage-gold/50 rounded-lg transition"
                    >
                      {userProfile.twitter ? (
                        <img
                          src={`https://unavatar.io/twitter/${userProfile.twitter}`}
                          alt={userProfile.username}
                          className="w-6 h-6 rounded-full"
                          onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23a855f7"><circle cx="12" cy="12" r="10"/></svg>'; }}
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-vintage-gold to-vintage-burnt-gold flex items-center justify-center text-xs font-bold text-vintage-black">
                          {userProfile.username[0].toUpperCase()}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">@{userProfile.username}</span>
                        <BadgeList badges={getUserBadges(userProfile.address, userProfile.userIndex ?? 9999)} size="sm" />
                      </div>
                    </Link>
                  ) : (
                    <button
                      onClick={() => {
                        if (soundEnabled) AudioManager.buttonClick();
                        setShowCreateProfile(true);
                      }}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold"
                    >
                      {t('createProfile')}
                    </button>
                  )}

                  <button
                    onClick={disconnectWallet}
                    className="px-3 py-2 bg-vintage-charcoal hover:bg-vintage-gold/20 text-vintage-gold rounded-lg text-xl border border-vintage-gold/50 font-modern font-semibold transition-all"
                    title={t('disconnect')}
                  >
                    ⏏
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className={isInFarcaster ? 'fixed bottom-0 left-0 right-0 z-[100]' : 'mb-3 md:mb-6 relative z-40'}>
            <div className={`bg-vintage-charcoal backdrop-blur-lg ${isInFarcaster ? 'rounded-none border-t-2' : 'rounded-xl border-2'} border-vintage-gold/50 p-2 flex gap-2`}>
              <button
                onClick={() => {
                  if (soundEnabled) AudioManager.buttonClick();
                  setCurrentView('game');
                }}
                className={`flex-1 ${isInFarcaster ? 'px-4 py-3' : 'px-2 md:px-6 py-2 md:py-3'} rounded-lg font-modern font-semibold transition-all ${isInFarcaster ? 'text-base' : 'text-xs md:text-base'} ${
                  currentView === 'game'
                    ? 'bg-vintage-gold text-vintage-black shadow-gold'
                    : 'bg-vintage-black text-vintage-gold hover:bg-vintage-gold/10 border border-vintage-gold/30'
                }`}
              >
                <span className={isInFarcaster ? 'text-2xl' : 'text-base md:text-lg'}>♠</span> {isInFarcaster ? t('title') : <><span className="hidden sm:inline">{t('title')}</span></>}
              </button>
              <button
                onClick={() => {
                  if (soundEnabled) AudioManager.buttonClick();
                  setCurrentView('leaderboard');
                }}
                className={`flex-1 ${isInFarcaster ? 'px-4 py-3' : 'px-2 md:px-6 py-2 md:py-3'} rounded-lg font-modern font-semibold transition-all ${isInFarcaster ? 'text-base' : 'text-xs md:text-base'} ${
                  currentView === 'leaderboard'
                    ? 'bg-vintage-gold text-vintage-black shadow-gold'
                    : 'bg-vintage-black text-vintage-gold hover:bg-vintage-gold/10 border border-vintage-gold/30'
                }`}
              >
                <span className={isInFarcaster ? 'text-2xl' : 'text-base md:text-lg'}>♔</span> {isInFarcaster ? t('leaderboard') : <><span className="hidden sm:inline">{t('leaderboard')}</span></>}
              </button>
            </div>
          </div>

          {/* Content wrapper with padding for fixed bars in miniapp */}
          <div className={isInFarcaster ? 'pt-[70px] pb-[80px]' : ''}>
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 mb-6">
              <p className="text-red-400 font-bold">❌ {t('error')}</p>
              <p className="text-red-300 text-sm mt-1">{errorMsg}</p>
              <button onClick={loadNFTs} className="mt-3 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm">{t('retryButton')}</button>
            </div>
          )}

          {status === 'fetching' && (
            <div className="flex items-center justify-center gap-3 text-vintage-neon-blue mb-6 bg-vintage-charcoal/50 p-6 rounded-xl border border-vintage-gold/30">
              <div className="animate-spin h-8 w-8 border-4 border-cyan-400 border-t-transparent rounded-full" />
              <p className="font-medium text-lg">{t('loading')}</p>
            </div>
          )}

          {/* Game View */}
          {currentView === 'game' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-vintage-charcoal/50 backdrop-blur-lg rounded-2xl border-2 border-vintage-gold/50 p-6">
                <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                  <h2 className="text-2xl font-display font-bold text-vintage-gold flex items-center gap-2">
                    <span className="text-3xl">♦</span>
                    {t('yourNfts')}
                    {nfts.length > 0 && <span className="text-sm text-vintage-burnt-gold">({nfts.length})</span>}
                  </h2>

                  {nfts.length > 0 && (
                    <div className="flex gap-2">
                      <button
                        onClick={loadNFTs}
                        disabled={status === 'fetching'}
                        className="px-4 py-2 bg-vintage-charcoal hover:bg-vintage-gold/20 disabled:bg-vintage-black disabled:text-vintage-burnt-gold border border-vintage-gold/50 text-vintage-gold rounded-lg text-sm font-modern font-semibold transition-all"
                        title="Refresh cards and metadata"
                      >
                        ↻
                      </button>
                      <button
                        onClick={() => setSortByPower(!sortByPower)}
                        className={`px-4 py-2 rounded-lg text-sm font-modern font-medium transition-all ${
                          sortByPower
                            ? 'bg-vintage-gold text-vintage-black shadow-gold'
                            : 'bg-vintage-charcoal border border-vintage-gold/30 text-vintage-gold hover:bg-vintage-gold/10'
                        }`}
                      >
                        {sortByPower ? '↓ ' + t('sortByPower') : '⇄ ' + t('sortDefault')}
                      </button>
                    </div>
                  )}
                </div>

                {nfts.length === 0 && status !== 'fetching' && (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📭</div>
                    <p className="text-vintage-burnt-gold">{t('noNfts')}</p>
                  </div>
                )}

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-3">
                  {displayNfts.map((nft) => (
                    <NFTCard
                      key={nft.tokenId}
                      nft={nft}
                      selected={selectedCards.some(c => c.tokenId === nft.tokenId)}
                      onSelect={handleSelectCard}
                    />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-6">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 bg-vintage-charcoal hover:bg-vintage-gold/20 disabled:bg-vintage-black disabled:text-vintage-burnt-gold border border-vintage-gold/50 text-vintage-gold rounded-lg transition font-modern"
                    >
                      ←
                    </button>
                    <span className="text-sm text-vintage-burnt-gold">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 bg-vintage-charcoal hover:bg-vintage-gold/20 disabled:bg-vintage-black disabled:text-vintage-burnt-gold border border-vintage-gold/50 text-vintage-gold rounded-lg transition font-modern"
                    >
                      →
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="bg-vintage-charcoal rounded-2xl border-2 border-vintage-gold p-6 sticky top-6 shadow-gold" style={{boxShadow: '0 0 30px rgba(255, 215, 0, 0.3), inset 0 0 60px rgba(0, 0, 0, 0.5)'}}>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-display font-bold text-vintage-gold" style={{textShadow: '0 0 10px rgba(255, 215, 0, 0.5)'}}>
                    {t('yourHand')}
                  </h2>
                  <div className="flex gap-2">
                    {nfts.length >= HAND_SIZE_CONST && selectedCards.length === 0 && (
                      <button onClick={selectStrongest} className="px-3 py-1 bg-vintage-gold/20 text-vintage-gold border border-vintage-gold/50 rounded-lg text-xs hover:bg-vintage-gold/30 transition font-modern font-semibold">
                        {t('selectStrongest')}
                      </button>
                    )}
                    {selectedCards.length > 0 && (
                      <button onClick={clearSelection} className="px-3 py-1 bg-vintage-black/50 text-vintage-gold border border-vintage-gold/50 rounded-lg text-xs hover:bg-vintage-black/70 transition font-modern">
                        {t('clearSelection')}
                      </button>
                    )}
                  </div>
                </div>

                {/* Felt Table Surface */}
                <div className="bg-vintage-felt-green p-4 rounded-xl border-2 border-vintage-gold/40 mb-4" style={{boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.6)', backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,.05) 2px, rgba(0,0,0,.05) 4px)'}}>
                  <div className="grid grid-cols-5 gap-2 min-h-[120px]">
                    {selectedCards.map((c, i) => (
                      <FoilCardEffect key={i} foilType={(c.foil === 'Standard' || c.foil === 'Prize') ? c.foil : null} className="relative aspect-[2/3] rounded-lg overflow-hidden ring-2 ring-vintage-gold shadow-gold">
                        <img src={c.imageUrl} alt={`#${c.tokenId}`} className="w-full h-full object-cover" />
                        <div className="absolute top-0 left-0 bg-vintage-gold text-vintage-black text-xs px-1 rounded-br font-bold">{c.power}</div>
                      </FoilCardEffect>
                    ))}
                    {[...Array(HAND_SIZE_CONST - selectedCards.length)].map((_, i) => (
                      <div key={`e-${i}`} className="aspect-[2/3] rounded-xl border-2 border-dashed border-vintage-gold/40 flex items-center justify-center text-vintage-gold/50 bg-vintage-felt-green/30">
                        <span className="text-2xl font-bold">+</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Illuminated Casino Panel for Defense Deck Button */}
                <div ref={playButtonsRef} className="relative p-1 rounded-xl mb-4" style={{background: 'linear-gradient(145deg, #FFD700, #C9A227, #FFD700)', boxShadow: '0 0 20px rgba(255, 215, 0, 0.5), inset 0 0 10px rgba(255, 215, 0, 0.3)'}}>
                  <div className="bg-vintage-black/90 p-4 rounded-lg">
                    <button
                      id="defense-deck-button"
                      onClick={saveDefenseDeck}
                      disabled={selectedCards.length !== HAND_SIZE_CONST || !userProfile}
                      className={`w-full px-6 py-4 rounded-xl shadow-lg text-lg font-display font-bold transition-all uppercase tracking-wide ${
                        selectedCards.length === HAND_SIZE_CONST && userProfile
                          ? 'text-vintage-black hover:shadow-gold-lg'
                          : 'bg-vintage-black/50 text-vintage-gold/40 cursor-not-allowed border border-vintage-gold/20'
                      }`}
                      style={selectedCards.length === HAND_SIZE_CONST && userProfile ? {
                        background: 'linear-gradient(145deg, #FFD700, #C9A227)',
                        boxShadow: '0 0 20px rgba(255, 215, 0, 0.6), 0 4px 8px rgba(0, 0, 0, 0.4)'
                      } : {}}
                    >
                      Save Defense Deck ({selectedCards.length}/{HAND_SIZE_CONST})
                    </button>
                    {showDefenseDeckSaved && (
                      <div className="mt-2 text-center text-green-400 font-modern font-semibold animate-pulse">
                        ✓ Defense Deck Saved!
                      </div>
                    )}
                  </div>
                </div>

                {/* Battle vs AI Button */}
                <div className="mb-4">
                  <button
                    onClick={() => {
                      // Check if defense deck is set
                      if (!userProfile?.defenseDeck || userProfile.defenseDeck.length !== HAND_SIZE_CONST) {
                        alert('You must set your Defense Deck first! Select 5 cards above and click "Save Defense Deck".');
                        if (soundEnabled) AudioManager.buttonError();
                        return;
                      }
                      if (soundEnabled) AudioManager.buttonClick();
                      setShowPveCardSelection(true);
                      setPveSelectedCards([]);
                    }}
                    disabled={!userProfile}
                    className={`w-full px-6 py-3 rounded-xl font-display font-bold transition-all uppercase tracking-wide ${
                      userProfile
                        ? 'bg-vintage-neon-blue hover:bg-vintage-neon-blue/80 text-vintage-black shadow-neon hover:scale-105'
                        : 'bg-vintage-black/50 text-vintage-gold/40 cursor-not-allowed border border-vintage-gold/20'
                    }`}
                  >
                    Battle vs AI
                  </button>
                </div>

                {/* Battle vs Player Button */}
                <div className="mb-4">
                  <button
                    onClick={() => {
                      // Check if defense deck is set
                      if (!userProfile?.defenseDeck || userProfile.defenseDeck.length !== HAND_SIZE_CONST) {
                        alert('You must set your Defense Deck first! Select 5 cards above and click "Save Defense Deck".');
                        if (soundEnabled) AudioManager.buttonError();
                        return;
                      }
                      if (soundEnabled) AudioManager.buttonClick();
                      setGameMode('pvp');
                      setPvpMode('pvpMenu');
                    }}
                    disabled={!userProfile}
                    className={`w-full px-6 py-3 rounded-xl font-display font-bold transition-all uppercase tracking-wide ${
                      userProfile
                        ? 'bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black shadow-gold hover:scale-105'
                        : 'bg-vintage-black/50 text-vintage-gold/40 cursor-not-allowed border border-vintage-gold/20'
                    }`}
                  >
                    Battle vs Player
                  </button>
                </div>

                <div className="mt-6 space-y-4">
                  {dealerCards.length > 0 && !showBattleScreen && (
                    <div className="bg-gradient-to-br from-vintage-wine to-vintage-black backdrop-blur p-4 rounded-xl border-2 border-vintage-gold/50">
                      <p className="text-xs font-modern font-semibold text-vintage-gold mb-3"><span className="text-lg">♦</span> {t('dealerCards').toUpperCase()}</p>
                      <div className="grid grid-cols-5 gap-2 mb-3">
                        {dealerCards.map((c, i) => (
                          <FoilCardEffect key={i} foilType={(c.foil === 'Standard' || c.foil === 'Prize') ? c.foil : null} className="relative aspect-[2/3] rounded-lg overflow-hidden ring-2 ring-red-500 shadow-lg shadow-red-500/30">
                            <img src={c.imageUrl} alt={`#${c.tokenId}`} className="w-full h-full object-cover" />
                            <div className="absolute top-0 left-0 bg-red-500 text-white text-xs px-1 rounded-br">{c.power}</div>
                            <div className="absolute bottom-0 right-0 bg-black/80 text-vintage-gold text-xs px-2 py-1 rounded-tl font-mono">#{c.tokenId}</div>
                          </FoilCardEffect>
                        ))}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-vintage-burnt-gold">{t('dealerTotalPower')}</p>
                        <p className="text-2xl font-bold text-red-400">{dealerCards.reduce((sum, c) => sum + (c.power || 0), 0)}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="bg-vintage-charcoal p-6 rounded-xl border-2 border-vintage-gold shadow-gold">
                    <p className="text-xs font-semibold text-vintage-burnt-gold mb-2 font-modern flex items-center gap-2">
                      <span className="text-lg">💪</span> {t('totalPower')}
                    </p>
                    <p className="text-5xl font-bold text-vintage-neon-blue font-display">{totalPower}</p>
                  </div>
                  
                  {playerPower > 0 && (
                    <div className="bg-vintage-charcoal/80 backdrop-blur p-4 rounded-xl border-2 border-vintage-gold/30 space-y-3">
                      <p className="text-xs font-semibold text-vintage-burnt-gold font-modern">📊 {t('lastResult')}</p>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-xs text-vintage-burnt-gold">{t('you')}</p>
                          <p className="text-2xl font-bold text-blue-400">{playerPower}</p>
                        </div>
                        <div className="text-2xl">⚔️</div>
                        <div className="text-right">
                          <p className="text-xs text-vintage-burnt-gold">{t('dealer')}</p>
                          <p className="text-2xl font-bold text-red-400">{dealerPower}</p>
                        </div>
                      </div>
                      {result && (
                        <div className="text-center pt-3 border-t border-vintage-gold/30">
                          <p className="text-xl font-bold text-yellow-300 animate-pulse">{result}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Leaderboard View */}
          {currentView === 'leaderboard' && (
            <div className="max-w-6xl mx-auto">
              <div className="bg-vintage-charcoal/80 backdrop-blur-lg rounded-2xl border-2 border-vintage-gold/30 shadow-gold p-3 md:p-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-0 mb-4 md:mb-6">
                  <h1 className="text-2xl md:text-4xl font-bold text-yellow-400 flex items-center gap-2 md:gap-3">
                    <span className="text-2xl md:text-4xl">🏆</span> {t('leaderboard')}
                  </h1>
                  <div className="text-left md:text-right">
                    {userProfile && (
                      <p className="text-xs md:text-sm font-modern font-semibold text-vintage-gold mb-1">
                        ⚔️ <span className="hidden md:inline">Attacks Remaining:</span> <span className="text-vintage-neon-blue">{attacksRemaining}/{maxAttacks}</span>
                      </p>
                    )}
                    {/* 🔔 Farcaster Notifications Button */}
                    {isInFarcaster && userProfile && (
                      <button
                        onClick={handleEnableNotifications}
                        className="mb-1 px-2 py-1 rounded-lg bg-vintage-gold/10 hover:bg-vintage-gold/20 border border-vintage-gold/30 text-vintage-gold text-[10px] md:text-xs font-modern font-semibold transition-all hover:scale-105"
                      >
                        🔔 Enable Notifications
                      </button>
                    )}
                    <p className="text-[10px] md:text-xs text-vintage-burnt-gold">⏱️ {t('updateEvery5Min')}</p>
                  </div>
                </div>

                {leaderboard.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-6xl mb-4">👥</p>
                    <p className="text-vintage-burnt-gold">{t('noProfile')}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-3 md:mx-0">
                    <table className="w-full text-sm md:text-base">
                      <thead>
                        <tr className="border-b border-vintage-gold/20">
                          <th className="text-left p-2 md:p-4 text-vintage-burnt-gold font-semibold text-xs md:text-base">#{/* {t('rank')} */}</th>
                          <th className="text-left p-2 md:p-4 text-vintage-burnt-gold font-semibold text-xs md:text-base">{t('player')}</th>
                          <th className="text-right p-2 md:p-4 text-vintage-burnt-gold font-semibold text-xs md:text-base hidden md:table-cell">Opened</th>
                          <th className="text-right p-2 md:p-4 text-vintage-burnt-gold font-semibold text-xs md:text-base">{t('power')}</th>
                          <th className="text-right p-2 md:p-4 text-vintage-burnt-gold font-semibold text-xs md:text-base hidden lg:table-cell">{t('wins')}</th>
                          <th className="text-right p-2 md:p-4 text-vintage-burnt-gold font-semibold text-xs md:text-base hidden lg:table-cell">{t('losses')}</th>
                          <th className="text-center p-1 md:p-4 text-vintage-burnt-gold font-semibold text-xs md:text-base"><span className="hidden sm:inline">Actions</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboard
                          .slice((currentLeaderboardPage - 1) * LEADERBOARD_PER_PAGE, currentLeaderboardPage * LEADERBOARD_PER_PAGE)
                          .map((profile, sliceIndex) => {
                            const index = (currentLeaderboardPage - 1) * LEADERBOARD_PER_PAGE + sliceIndex;
                            return (
                          <tr key={profile.address} className={`border-b border-vintage-gold/10 hover:bg-vintage-gold/10 transition ${profile.address === address ? 'bg-vintage-gold/20' : ''}`}>
                            <td className="p-2 md:p-4">
                              <span className={`text-lg md:text-2xl font-bold ${
                                index === 0 ? 'text-yellow-400' :
                                index === 1 ? 'text-gray-300' :
                                index === 2 ? 'text-orange-400' :
                                'text-gray-500'
                              }`}>
                                #{index + 1}
                              </span>
                            </td>
                            <td className="p-2 md:p-4">
                              <Link href={`/profile/${profile.username}`} className="block hover:scale-105 transition-transform">
                                <div>
                                  <div className="flex items-center gap-1 md:gap-2 mb-1">
                                    <p className="font-bold text-vintage-neon-blue hover:text-cyan-300 transition-colors text-xs md:text-base">{profile.username}</p>
                                    <BadgeList badges={getUserBadges(profile.address, profile.userIndex ?? 9999)} size="xs" />
                                  </div>
                                  <p className="text-[10px] md:text-xs text-vintage-burnt-gold font-mono hidden sm:block">{profile.address.slice(0, 6)}...{profile.address.slice(-4)}</p>
                                </div>
                              </Link>
                            </td>
                            <td className="p-2 md:p-4 text-right text-green-400 font-bold text-sm md:text-base hidden md:table-cell">{profile.stats.openedCards || 0}</td>
                            <td className="p-2 md:p-4 text-right text-yellow-400 font-bold text-base md:text-xl">{(profile.stats.totalPower || 0).toLocaleString()}</td>
                            <td className="p-2 md:p-4 text-right text-vintage-neon-blue font-semibold text-sm md:text-base hidden lg:table-cell">{(profile.stats.pveWins || 0) + (profile.stats.pvpWins || 0)}</td>
                            <td className="p-2 md:p-4 text-right text-red-400 font-semibold text-sm md:text-base hidden lg:table-cell">{(profile.stats.pveLosses || 0) + (profile.stats.pvpLosses || 0)}</td>
                            <td className="p-1 md:p-4 text-center">
                              {profile.address.toLowerCase() !== address?.toLowerCase() && (
                                <button
                                  onClick={() => {
                                    // Check if target has defense deck
                                    if (!profile.defenseDeck || profile.defenseDeck.length !== 5) {
                                      alert('This player has not set up their defense deck yet.');
                                      if (soundEnabled) AudioManager.buttonError();
                                      return;
                                    }
                                    // Check if you have defense deck
                                    if (!userProfile?.defenseDeck || userProfile.defenseDeck.length !== 5) {
                                      alert('You must set your Defense Deck first!');
                                      if (soundEnabled) AudioManager.buttonError();
                                      return;
                                    }
                                    // Check attack limit
                                    if (attacksRemaining <= 0) {
                                      alert(`You have used all ${maxAttacks} attacks for today. Attacks reset at midnight UTC.`);
                                      if (soundEnabled) AudioManager.buttonError();
                                      return;
                                    }
                                    // Open attack card selection
                                    if (soundEnabled) AudioManager.buttonClick();
                                    setTargetPlayer(profile);
                                    setShowAttackCardSelection(true);
                                    setAttackSelectedCards([]);
                                  }}
                                  disabled={!userProfile || attacksRemaining <= 0 || !profile.defenseDeck}
                                  className={`px-2 md:px-3 py-1 md:py-1.5 rounded-lg font-modern font-semibold text-xs md:text-sm transition-all ${
                                    userProfile && attacksRemaining > 0 && profile.defenseDeck
                                      ? 'bg-red-600 hover:bg-red-700 text-white hover:scale-105'
                                      : 'bg-vintage-black/50 text-vintage-burnt-gold cursor-not-allowed border border-vintage-gold/20'
                                  }`}
                                >
                                  ⚔️<span className="hidden sm:inline"> Attack</span>
                                </button>
                              )}
                              {profile.address.toLowerCase() === address?.toLowerCase() && (
                                <span className="text-[10px] md:text-xs text-vintage-burnt-gold">(You)</span>
                              )}
                            </td>
                          </tr>
                        );
                          })}
                      </tbody>
                    </table>

                    {/* Pagination Controls - only show if more than 10 players */}
                    {leaderboard.length > LEADERBOARD_PER_PAGE && (
                      <div className="mt-6 flex items-center justify-center gap-2 flex-wrap">
                        <button
                          onClick={() => {
                            setCurrentLeaderboardPage(Math.max(1, currentLeaderboardPage - 1));
                            if (soundEnabled) AudioManager.buttonClick();
                          }}
                          disabled={currentLeaderboardPage === 1}
                          className="px-3 md:px-4 py-2 bg-vintage-charcoal border-2 border-vintage-gold/50 hover:border-vintage-gold disabled:border-vintage-gold/20 disabled:text-vintage-burnt-gold text-vintage-gold rounded-lg font-semibold transition text-sm md:text-base"
                        >
                          ← {t('previous')}
                        </button>

                        {/* Page numbers */}
                        <div className="flex gap-1 md:gap-2">
                          {Array.from({ length: Math.ceil(leaderboard.length / LEADERBOARD_PER_PAGE) }, (_, i) => i + 1).map(pageNum => (
                            <button
                              key={pageNum}
                              onClick={() => {
                                setCurrentLeaderboardPage(pageNum);
                                if (soundEnabled) AudioManager.buttonClick();
                              }}
                              className={`px-2 md:px-3 py-2 rounded-lg font-semibold transition text-sm md:text-base ${
                                currentLeaderboardPage === pageNum
                                  ? 'bg-vintage-gold text-vintage-black border-2 border-vintage-gold'
                                  : 'bg-vintage-charcoal border-2 border-vintage-gold/50 hover:border-vintage-gold text-vintage-gold'
                              }`}
                            >
                              {pageNum}
                            </button>
                          ))}
                        </div>

                        <button
                          onClick={() => {
                            setCurrentLeaderboardPage(Math.min(Math.ceil(leaderboard.length / LEADERBOARD_PER_PAGE), currentLeaderboardPage + 1));
                            if (soundEnabled) AudioManager.buttonClick();
                          }}
                          disabled={currentLeaderboardPage === Math.ceil(leaderboard.length / LEADERBOARD_PER_PAGE)}
                          className="px-3 md:px-4 py-2 bg-vintage-charcoal border-2 border-vintage-gold/50 hover:border-vintage-gold disabled:border-vintage-gold/20 disabled:text-vintage-burnt-gold text-vintage-gold rounded-lg font-semibold transition text-sm md:text-base"
                        >
                          {t('next')} →
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Match History Section */}
                {userProfile && (
                  <div className="mt-8">
                    <MatchHistorySection address={userProfile.address} />
                  </div>
                )}
              </div>
            </div>
          )}
          </div>
          {/* End content wrapper */}


          {/* Create Profile Modal */}
          {showCreateProfile && !isCheckingFarcaster && (
            <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[150] p-4" onClick={() => setShowCreateProfile(false)}>
              <div className="bg-vintage-charcoal rounded-2xl border-2 border-vintage-gold shadow-gold border-vintage-gold max-w-md w-full p-8" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-3xl font-bold text-center mb-2 text-vintage-gold font-display">
                  {t('createProfile')}
                </h2>
                <p className="text-center text-vintage-burnt-gold mb-6 text-sm">
                  {t('noProfile')}
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">{t('username')}</label>
                    <input
                      type="text"
                      value={profileUsername}
                      onChange={(e) => setProfileUsername(e.target.value)}
                      placeholder={t('usernamePlaceholder')}
                      maxLength={20}
                      className="w-full px-4 py-3 bg-vintage-charcoal border-2 border-vintage-gold/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-vintage-gold font-modern"
                    />
                    <p className="text-xs text-yellow-400 mt-2">⚠️ Don't include @ symbol - just enter your username</p>
                    <p className="text-xs text-gray-500 mt-1">💡 Você pode adicionar seu Twitter depois na aba de perfil</p>
                  </div>

                  <button
                    onClick={async () => {
                      if (isCreatingProfile || !profileUsername.trim()) {
                        if (!profileUsername.trim() && soundEnabled) AudioManager.buttonError();
                        return;
                      }

                      setIsCreatingProfile(true);

                      if (soundEnabled) AudioManager.buttonClick();

                      try {
                        await ConvexProfileService.createProfile(address!, profileUsername.trim());
                        devLog('✅ Profile created successfully!');

                        const profile = await ConvexProfileService.getProfile(address!);
                        devLog('📊 Profile retrieved:', profile);

                        setUserProfile(profile);
                        setShowCreateProfile(false);
                        setProfileUsername('');
                        setCurrentView('game');

                        if (soundEnabled) AudioManager.buttonSuccess();
                      } catch (error: any) {
                        if (soundEnabled) AudioManager.buttonError();
                        devError('❌ Error creating profile:', error.code, error.message);
                      } finally {
                        setIsCreatingProfile(false);
                      }
                    }}
                    disabled={isCreatingProfile || !profileUsername.trim()}
                    className="w-full px-6 py-3 bg-vintage-gold hover:bg-vintage-gold-dark shadow-gold text-white rounded-xl font-semibold shadow-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreatingProfile ? '⏳ Creating...' : t('save')}
                  </button>

                  <button
                    onClick={() => {
                      if (soundEnabled) AudioManager.buttonNav();
                      setShowCreateProfile(false);
                      setProfileUsername('');
                    }}
                    className="w-full px-6 py-3 bg-vintage-black hover:bg-vintage-gold/10 text-vintage-gold border border-vintage-gold/50 rounded-xl font-semibold transition"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </div>
            </div>
          )}

        </>
      )}

      {/* Difficulty Selection Modal */}
      <DifficultyModal
        isOpen={isDifficultyModalOpen}
        onClose={() => {
          setIsDifficultyModalOpen(false);
          setTempSelectedDifficulty(null);
        }}
        onSelect={(difficulty) => {
          if (soundEnabled) AudioManager.buttonClick();
          setTempSelectedDifficulty(difficulty);
        }}
        onBattle={(difficulty) => {
          // Don't play sound here - playHand() will play AudioManager.playHand()
          setAiDifficulty(difficulty);
          setIsDifficultyModalOpen(false);
          setTempSelectedDifficulty(null);

          // Start the battle with selected cards and difficulty
          setShowPveCardSelection(false);
          setGameMode('ai');
          setPvpMode(null);
          setSelectedCards(pveSelectedCards);
          setBattleMode('normal');

          // Pass cards directly to playHand to avoid state timing issues
          playHand(pveSelectedCards);
        }}
        onEliminationBattle={(difficulty) => {
          if (soundEnabled) AudioManager.buttonClick();
          setAiDifficulty(difficulty);
          setIsDifficultyModalOpen(false);
          setTempSelectedDifficulty(null);

          // Start elimination mode
          setShowPveCardSelection(false);
          setGameMode('ai');
          setPvpMode(null);
          setSelectedCards(pveSelectedCards);
          setBattleMode('elimination');
          setEliminationPhase('ordering');
          setOrderedPlayerCards(pveSelectedCards);
        }}
        unlockedDifficulties={unlockedDifficulties as Set<'gey' | 'goofy' | 'gooner' | 'gangster' | 'gigachad'>}
        currentDifficulty={aiDifficulty}
        tempSelected={tempSelectedDifficulty}
      />
    </div>
  );
}