'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useLanguage } from './LanguageContext';
import type { SupportedLanguage } from '@/lib/translations';

type MusicMode = 'default' | 'language';

interface MusicContextType {
  musicMode: MusicMode;
  setMusicMode: (mode: MusicMode) => void;
  isMusicEnabled: boolean;
  setIsMusicEnabled: (enabled: boolean) => void;
  volume: number; // Controlled externally, synced from main volume
  setVolume: (volume: number) => void;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

// Music file paths for each language - tries MP3 first, then M4A as fallback
const getMusicPath = (basename: string): string => {
  // Returns MP3 path (will try M4A automatically if MP3 fails to load)
  return `/music/${basename}.mp3`;
};

const LANGUAGE_MUSIC: Record<SupportedLanguage, string> = {
  'pt-BR': getMusicPath('pt-br'),
  'en': getMusicPath('en'),
  'es': getMusicPath('es'),
  'hi': getMusicPath('hi'),
  'ru': getMusicPath('ru'),
  'zh-CN': getMusicPath('zh-cn'),
};

// Volume normalization multipliers - adjust these to make all tracks sound equal at 100%
// 1.0 = default volume, < 1.0 = quieter, > 1.0 = louder
const VOLUME_NORMALIZATION: Record<string, number> = {
  'default': 1.0,   // Reference track
  'pt-br': 1.0,     // Adjust if needed
  'en': 1.0,        // Adjust if needed
  'es': 1.0,        // Adjust if needed
  'hi': 0.85,       // Slightly quieter (adjust based on actual file)
  'ru': 1.0,        // Adjust if needed
  'zh-cn': 1.0,     // Adjust if needed
};

const DEFAULT_MUSIC = getMusicPath('default');
const FADE_DURATION = 1500; // 1.5 seconds fade in/out

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const { lang } = useLanguage();
  const [musicMode, setMusicModeState] = useState<MusicMode>('default');
  const [isMusicEnabled, setIsMusicEnabled] = useState(true);
  const [volume, setVolume] = useState(0.1); // 0.0 to 1.0 (starts at 10%)

  // Audio references
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentTrackRef = useRef<string | null>(null);
  const hasUserInteractedRef = useRef(false); // Track if user has clicked anything

  /**
   * Fade out current audio, then fade in new audio
   */
  const crossfade = useCallback((newTrackUrl: string) => {
    // If same track, do nothing
    if (currentTrackRef.current === newTrackUrl) {
      return;
    }

    const oldAudio = audioRef.current;
    const targetVolume = volume;

    // Clear any existing fade
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }

    // Fade out old audio
    if (oldAudio && !oldAudio.paused) {
      const fadeOutSteps = 30;
      const fadeOutInterval = FADE_DURATION / fadeOutSteps;
      const volumeDecrement = oldAudio.volume / fadeOutSteps;

      let step = 0;
      fadeIntervalRef.current = setInterval(() => {
        step++;
        if (step >= fadeOutSteps || !oldAudio) {
          if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
          oldAudio?.pause();
          oldAudio!.currentTime = 0;
          loadAndFadeIn(newTrackUrl, targetVolume);
        } else {
          oldAudio!.volume = Math.max(0, oldAudio!.volume - volumeDecrement);
        }
      }, fadeOutInterval);
    } else {
      // No audio playing, directly load and fade in
      loadAndFadeIn(newTrackUrl, targetVolume);
    }
  }, [volume]);

  /**
   * Load new audio and fade in
   */
  const loadAndFadeIn = useCallback((trackUrl: string, targetVolume: number) => {
    // FORCE STOP any previous audio to prevent dual playback bug
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      } catch (e) {
        // Ignore errors
      }
    }

    // Stop old AudioManager music if it exists (prevent dual playback)
    if (typeof window !== 'undefined' && (window as any).globalAudioManager) {
      const oldManager = (window as any).globalAudioManager;
      if (oldManager.backgroundSource) {
        try {
          oldManager.backgroundSource.stop();
          oldManager.backgroundSource = null;
          oldManager.isPlaying = false;
        } catch (e) {
          // Ignore errors
        }
      }
    }

    // Extract track name from URL for normalization lookup
    const trackName = trackUrl.split('/').pop()?.replace('.mp3', '') || 'default';
    const normalizationMultiplier = VOLUME_NORMALIZATION[trackName] || 1.0;

    // Apply normalization to target volume
    const normalizedVolume = Math.min(1.0, targetVolume * normalizationMultiplier);

    // Create new audio element
    const newAudio = new Audio(trackUrl);
    newAudio.loop = true;
    newAudio.volume = 0; // Start at 0

    newAudio.play().then(() => {
      // Fade in
      const fadeInSteps = 30;
      const fadeInInterval = FADE_DURATION / fadeInSteps;
      const volumeIncrement = normalizedVolume / fadeInSteps;

      let step = 0;
      const fadeInTimer = setInterval(() => {
        step++;
        if (step >= fadeInSteps || !newAudio) {
          clearInterval(fadeInTimer);
          if (newAudio) newAudio.volume = normalizedVolume;
        } else {
          newAudio.volume = Math.min(normalizedVolume, newAudio.volume + volumeIncrement);
        }
      }, fadeInInterval);
    }).catch(err => {
      console.warn('⚠️ Failed to play music (MP3):', err);
      console.log('📝 Note: File may be M4A format with .mp3 extension - this is OK, browsers support it');
    });

    audioRef.current = newAudio;
    currentTrackRef.current = trackUrl;
  }, []);

  /**
   * Update music mode
   */
  const setMusicMode = useCallback((mode: MusicMode) => {
    setMusicModeState(mode);
    localStorage.setItem('musicMode', mode);
  }, []);

  /**
   * Update music enabled state
   */
  const setMusicEnabledWrapper = useCallback((enabled: boolean) => {
    setIsMusicEnabled(enabled);

    if (!enabled && audioRef.current) {
      // Fade out and stop
      const audio = audioRef.current;
      const fadeOutSteps = 20;
      const fadeOutInterval = 1000 / fadeOutSteps; // 1 second fade out
      const volumeDecrement = audio.volume / fadeOutSteps;

      let step = 0;
      const timer = setInterval(() => {
        step++;
        if (step >= fadeOutSteps || !audio) {
          clearInterval(timer);
          audio?.pause();
          if (audio) audio.currentTime = 0;
        } else {
          audio!.volume = Math.max(0, audio!.volume - volumeDecrement);
        }
      }, fadeOutInterval);
    }
  }, []);

  /**
   * Sync volume changes to current audio
   */
  useEffect(() => {
    if (audioRef.current && isMusicEnabled && currentTrackRef.current) {
      // Extract track name for normalization
      const trackName = currentTrackRef.current.split('/').pop()?.replace('.mp3', '') || 'default';
      const normalizationMultiplier = VOLUME_NORMALIZATION[trackName] || 1.0;

      // Apply normalized volume
      audioRef.current.volume = Math.min(1.0, volume * normalizationMultiplier);
    }
  }, [volume, isMusicEnabled]);

  /**
   * Handle music mode or language changes
   */
  useEffect(() => {
    // If music is disabled, stop any playing music
    if (!isMusicEnabled) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
        fadeIntervalRef.current = null;
      }
      currentTrackRef.current = null;
      return;
    }

    // If enabled, play the appropriate track
    const trackUrl = musicMode === 'default'
      ? DEFAULT_MUSIC
      : LANGUAGE_MUSIC[lang];

    crossfade(trackUrl);
  }, [musicMode, lang, isMusicEnabled, crossfade]);

  /**
   * Load music mode from localStorage on mount
   */
  useEffect(() => {
    const stored = localStorage.getItem('musicMode') as MusicMode;
    if (stored && (stored === 'default' || stored === 'language')) {
      setMusicModeState(stored);
    }
  }, []);

  /**
   * Resume music on first user interaction (fixes browser autoplay block)
   */
  useEffect(() => {
    const handleFirstClick = () => {
      if (!hasUserInteractedRef.current && isMusicEnabled && audioRef.current) {
        hasUserInteractedRef.current = true;
        audioRef.current.play().catch(() => {
          // Still blocked, will try again on next click
        });
      }
    };

    document.addEventListener('click', handleFirstClick, { once: false });
    document.addEventListener('touchstart', handleFirstClick, { once: false });

    return () => {
      document.removeEventListener('click', handleFirstClick);
      document.removeEventListener('touchstart', handleFirstClick);
    };
  }, [isMusicEnabled]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return (
    <MusicContext.Provider value={{
      musicMode,
      setMusicMode,
      isMusicEnabled,
      setIsMusicEnabled: setMusicEnabledWrapper,
      volume,
      setVolume
    }}>
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  const context = useContext(MusicContext);
  if (context === undefined) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
}
