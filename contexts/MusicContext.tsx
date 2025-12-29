'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useLanguage } from './LanguageContext';
import type { SupportedLanguage } from '@/lib/translations';

type MusicMode = 'default' | 'language' | 'custom' | 'playlist';

interface MusicContextType {
  musicMode: MusicMode;
  setMusicMode: (mode: MusicMode) => void;
  isMusicEnabled: boolean;
  setIsMusicEnabled: (enabled: boolean) => void;
  volume: number; // Controlled externally, synced from main volume
  setVolume: (volume: number) => void;
  customMusicUrl: string | null;
  setCustomMusicUrl: (url: string | null) => void;
  isCustomMusicLoading: boolean;
  customMusicError: string | null;
  // Playlist support
  playlist: string[];
  setPlaylist: (urls: string[]) => void;
  addToPlaylist: (url: string) => void;
  removeFromPlaylist: (index: number) => void;
  currentPlaylistIndex: number;
  setCurrentPlaylistIndex: (index: number) => void;
  skipToNext: () => void;
  skipToPrevious: () => void;
  // Playback control
  isPaused: boolean;
  pause: () => void;
  play: () => void;
  // Track info
  currentTrackName: string | null;
  currentTrackThumbnail: string | null;
}

// Track metadata for display
interface TrackMetadata {
  title: string;
  thumbnail?: string;
  duration?: number;
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
  'id': getMusicPath('id'),
  'fr': getMusicPath('fr'),
  'ja': getMusicPath('ja'),
  'it': getMusicPath('it'),
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
  'id': 1.0,        // Indonesian - Rungkad (mean: -13.8dB, close to reference)
  'fr': 1.8,        // French - Le Festin (mean: -19.1dB, 6dB quieter - boosted)
  'it': 1.0,        // Italian - Tu vuò fà l'americano
  'ja': 1.0,        // Japanese - Stay With Me
  'custom': 1.0,    // Custom music
};

const DEFAULT_MUSIC = getMusicPath('default');
const FADE_DURATION = 1500; // 1.5 seconds fade in/out

// Helper to extract YouTube video ID
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Check if URL is a YouTube URL
function isYouTubeUrl(url: string): boolean {
  return url.includes('youtube.com') || url.includes('youtu.be');
}

// Fetch YouTube video metadata (title, thumbnail)
async function fetchYouTubeMetadata(videoId: string): Promise<{ title: string; thumbnail: string } | null> {
  try {
    // Use noembed.com as a free alternative to YouTube oEmbed (no API key needed)
    const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
    if (!response.ok) return null;
    const data = await response.json();
    return {
      title: data.title || 'YouTube Music',
      thumbnail: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    };
  } catch (e) {
    console.warn('Failed to fetch YouTube metadata:', e);
    // Fallback to direct thumbnail URL
    return {
      title: 'YouTube Music',
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    };
  }
}

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const { lang } = useLanguage();
  const [musicMode, setMusicModeState] = useState<MusicMode>('default');
  // FIX: Load initial music enabled state from localStorage to prevent playing when muted
  const [isMusicEnabled, setIsMusicEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('musicEnabled');
      return saved === null ? true : saved === 'true';
    }
    return true;
  });
  const [volume, setVolume] = useState(0.1); // 0.0 to 1.0 (starts at 10%)
  const [customMusicUrl, setCustomMusicUrlState] = useState<string | null>(null);
  const [isCustomMusicLoading, setIsCustomMusicLoading] = useState(false);
  const [customMusicError, setCustomMusicError] = useState<string | null>(null);

  // Playlist state
  const [playlist, setPlaylistState] = useState<string[]>([]);
  const [currentPlaylistIndex, setCurrentPlaylistIndexState] = useState(0);
  const [currentTrackName, setCurrentTrackName] = useState<string | null>(null);
  const [currentTrackThumbnail, setCurrentTrackThumbnail] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Audio references
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentTrackRef = useRef<string | null>(null);
  const hasUserInteractedRef = useRef(false); // Track if user has clicked anything
  const youtubePlayerRef = useRef<any>(null);
  const youtubeContainerRef = useRef<HTMLDivElement | null>(null);
  const isPlaylistModeRef = useRef(false); // Track if we're in playlist mode
  const youtubePollingRef = useRef<NodeJS.Timeout | null>(null); // YT background advancement

  /**
   * Stop YouTube player if exists
   */
  const stopYouTubePlayer = useCallback(() => {
    if (youtubePollingRef.current) { clearTimeout(youtubePollingRef.current); youtubePollingRef.current = null; }
    if (youtubePlayerRef.current) {
      try {
        youtubePlayerRef.current.stopVideo();
        youtubePlayerRef.current.destroy();
      } catch (e) {
        // Ignore errors
      }
      youtubePlayerRef.current = null;
    }
    if (youtubeContainerRef.current) {
      youtubeContainerRef.current.remove();
      youtubeContainerRef.current = null;
    }
  }, []);

  /**
   * Play YouTube audio (invisible iframe)
   */
  const playYouTubeAudio = useCallback((videoId: string, targetVolume: number, shouldLoop: boolean = true, onTrackEnd?: () => void) => {
    // Stop any existing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    stopYouTubePlayer();

    // Create container for YouTube iframe
    const container = document.createElement('div');
    container.id = 'youtube-music-player';
    container.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;';
    document.body.appendChild(container);
    youtubeContainerRef.current = container;

    // Load YouTube IFrame API if not already loaded
    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      (window as any).onYouTubeIframeAPIReady = () => {
        createYouTubePlayer(videoId, targetVolume, shouldLoop, onTrackEnd);
      };
    } else {
      createYouTubePlayer(videoId, targetVolume, shouldLoop, onTrackEnd);
    }
  }, [stopYouTubePlayer]);

  const createYouTubePlayer = useCallback((videoId: string, targetVolume: number, shouldLoop: boolean = true, onTrackEnd?: () => void) => {
    if (!youtubeContainerRef.current) return;

    const playerDiv = document.createElement('div');
    playerDiv.id = 'yt-player';
    youtubeContainerRef.current.appendChild(playerDiv);

    youtubePlayerRef.current = new (window as any).YT.Player('yt-player', {
      width: '1',
      height: '1',
      videoId: videoId,
      playerVars: {
        autoplay: 1,
        loop: shouldLoop ? 1 : 0,
        playlist: shouldLoop ? videoId : undefined, // Required for loop to work
        controls: 0,
        showinfo: 0,
        modestbranding: 1,
        playsinline: 1,
      },
      events: {
        onReady: (event: any) => {
          event.target.setVolume(targetVolume * 100);
          event.target.playVideo();
          setIsCustomMusicLoading(false);
          setCustomMusicError(null);
          currentTrackRef.current = `youtube:${videoId}`;

          // Schedule next track based on video duration (works in background tabs)
          if (!shouldLoop && onTrackEnd) {
            // Clear any existing timeout
            if (youtubePollingRef.current) {
              clearTimeout(youtubePollingRef.current);
              youtubePollingRef.current = null;
            }

            // Get duration and schedule next track
            const checkAndSchedule = () => {
              try {
                const duration = event.target.getDuration();
                if (duration > 0) {
                  // Schedule next track 1 second before end
                  const timeoutMs = Math.max(1000, (duration - 1) * 1000);
                  console.log('YT: Scheduling next track in', (timeoutMs/1000).toFixed(0), 'seconds');
                  youtubePollingRef.current = setTimeout(() => {
                    console.log('YT timeout: triggering next track!');
                    onTrackEnd();
                  }, timeoutMs);
                } else {
                  // Duration not ready yet, retry in 1 second
                  setTimeout(checkAndSchedule, 1000);
                }
              } catch(e) { console.log('YT schedule error:', e); }
            };
            checkAndSchedule();
          }
        },
        onStateChange: (event: any) => {
          // YT.PlayerState.ENDED = 0
          if (event.data === 0 && !shouldLoop && onTrackEnd) {
            console.log('🎵 YouTube track ended, playing next...');
            onTrackEnd();
          }
        },
        onError: (event: any) => {
          console.error('YouTube player error:', event.data);
          setCustomMusicError('Failed to load YouTube video');
          setIsCustomMusicLoading(false);
          // Fallback to default music
          setMusicModeState('default');
        },
      },
    });
  }, []);

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

    // Stop YouTube if playing
    stopYouTubePlayer();

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
  }, [volume, stopYouTubePlayer]);

  /**
   * Load new audio and fade in
   * @param trackUrl - URL of the track to play
   * @param targetVolume - Target volume (0-1)
   * @param isPlaylist - Whether this is a playlist track (don't loop, trigger next on end)
   * @param onTrackEnd - Callback when track ends (for playlist progression)
   */
  const loadAndFadeIn = useCallback((
    trackUrl: string,
    targetVolume: number,
    isPlaylist: boolean = false,
    onTrackEnd?: () => void
  ) => {
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

    // Stop YouTube if playing
    stopYouTubePlayer();

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
    // Loop only if NOT in playlist mode (or if playlist has single track)
    newAudio.loop = !isPlaylist;
    newAudio.volume = 0; // Start at 0

    // Handle track end for playlist progression
    if (isPlaylist && onTrackEnd) {
      newAudio.onended = () => {
        console.log('🎵 Playlist track ended, playing next...');
        onTrackEnd();
      };
    }

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
      console.warn('⚠️ Failed to play music:', err);
      setCustomMusicError('Failed to play audio. Try a different URL.');
      setIsCustomMusicLoading(false);
      // Fallback to default if custom music fails
      if (musicMode === 'custom' || musicMode === 'playlist') {
        setMusicModeState('default');
      }
    });

    audioRef.current = newAudio;
    currentTrackRef.current = trackUrl;
  }, [stopYouTubePlayer, musicMode]);

  /**
   * Update music mode
   */
  const setMusicMode = useCallback((mode: MusicMode) => {
    setMusicModeState(mode);
    setCustomMusicError(null);
    try {
      localStorage.setItem('musicMode', mode);
    } catch (error) {
      // localStorage might not be available in some contexts (e.g., Farcaster miniapp iframe)
      console.warn('localStorage not available, cannot persist music mode preference');
    }
  }, []);

  /**
   * Update custom music URL
   */
  const setCustomMusicUrl = useCallback((url: string | null) => {
    setCustomMusicUrlState(url);
    setCustomMusicError(null);
    try {
      if (url) {
        localStorage.setItem('customMusicUrl', url);
      } else {
        localStorage.removeItem('customMusicUrl');
      }
    } catch (error) {
      console.warn('localStorage not available');
    }
  }, []);

  /**
   * Set playlist URLs
   */
  const setPlaylist = useCallback((urls: string[]) => {
    setPlaylistState(urls);
    if (urls.length > 0) {
      setMusicModeState('playlist');
      isPlaylistModeRef.current = true;
    }
    try {
      localStorage.setItem('musicPlaylist', JSON.stringify(urls));
    } catch (error) {
      console.warn('localStorage not available');
    }
  }, []);

  /**
   * Add URL to playlist
   */
  const addToPlaylist = useCallback((url: string) => {
    setPlaylistState(prev => {
      const newList = [...prev, url];
      try {
        localStorage.setItem('musicPlaylist', JSON.stringify(newList));
      } catch (error) {
        console.warn('localStorage not available');
      }
      if (newList.length > 0) {
        setMusicModeState('playlist');
        isPlaylistModeRef.current = true;
      }
      return newList;
    });
  }, []);

  /**
   * Remove URL from playlist by index
   */
  const removeFromPlaylist = useCallback((index: number) => {
    setPlaylistState(prev => {
      const newList = prev.filter((_, i) => i !== index);
      try {
        localStorage.setItem('musicPlaylist', JSON.stringify(newList));
      } catch (error) {
        console.warn('localStorage not available');
      }
      // If removing current song, play next or reset
      if (index === currentPlaylistIndex && newList.length > 0) {
        setCurrentPlaylistIndexState(Math.min(index, newList.length - 1));
      } else if (index < currentPlaylistIndex) {
        setCurrentPlaylistIndexState(prev => Math.max(0, prev - 1));
      }
      // If playlist empty, switch back to default
      if (newList.length === 0) {
        setMusicModeState('default');
        isPlaylistModeRef.current = false;
      }
      return newList;
    });
  }, [currentPlaylistIndex]);

  /**
   * Set current playlist index (which track is playing)
   */
  const setCurrentPlaylistIndex = useCallback((index: number) => {
    setCurrentPlaylistIndexState(index);
    try {
      localStorage.setItem('playlistIndex', String(index));
    } catch (error) {
      console.warn('localStorage not available');
    }
  }, []);

  /**
   * Skip to next track in playlist
   */
  const skipToNext = useCallback(() => {
    if (playlist.length === 0) return;
    const nextIndex = (currentPlaylistIndex + 1) % playlist.length;
    setCurrentPlaylistIndex(nextIndex);
  }, [playlist, currentPlaylistIndex, setCurrentPlaylistIndex]);

  /**
   * Skip to previous track in playlist
   */
  const skipToPrevious = useCallback(() => {
    if (playlist.length === 0) return;
    const prevIndex = currentPlaylistIndex === 0 ? playlist.length - 1 : currentPlaylistIndex - 1;
    setCurrentPlaylistIndex(prevIndex);
  }, [playlist, currentPlaylistIndex, setCurrentPlaylistIndex]);

  /**
   * Pause playback
   */
  const pause = useCallback(() => {
    setIsPaused(true);
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
    }
    if (youtubePlayerRef.current && typeof youtubePlayerRef.current.pauseVideo === 'function') {
      youtubePlayerRef.current.pauseVideo();
    }
  }, []);

  /**
   * Resume playback
   */
  const play = useCallback(() => {
    setIsPaused(false);
    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play().catch(() => {
        // Ignore errors
      });
    }
    if (youtubePlayerRef.current && typeof youtubePlayerRef.current.playVideo === 'function') {
      youtubePlayerRef.current.playVideo();
    }
  }, []);

  /**
   * Update music enabled state
   */
  const setMusicEnabledWrapper = useCallback((enabled: boolean) => {
    setIsMusicEnabled(enabled);

    if (!enabled) {
      // Stop YouTube player
      stopYouTubePlayer();

      // Fade out and stop HTML audio
      if (audioRef.current) {
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
    }
  }, [stopYouTubePlayer]);

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

    // Also update YouTube volume
    if (youtubePlayerRef.current && typeof youtubePlayerRef.current.setVolume === 'function') {
      youtubePlayerRef.current.setVolume(volume * 100);
    }
  }, [volume, isMusicEnabled]);

  /**
   * Remove invalid track from playlist and skip to next
   */
  const handleInvalidTrack = useCallback((failedIndex: number) => {
    console.warn(`🚫 Removing invalid track at index ${failedIndex}`);
    setPlaylistState(prev => {
      const newList = prev.filter((_, i) => i !== failedIndex);
      try {
        localStorage.setItem('musicPlaylist', JSON.stringify(newList));
      } catch (error) {
        console.warn('localStorage not available');
      }
      if (newList.length === 0) {
        setMusicModeState('default');
        isPlaylistModeRef.current = false;
        setCurrentTrackName(null);
      } else {
        const nextIndex = Math.min(failedIndex, newList.length - 1);
        setCurrentPlaylistIndexState(nextIndex);
      }
      return newList;
    });
  }, []);

  /**
   * Extract a friendly name from URL
   */
  const getTrackNameFromUrl = useCallback((url: string): string => {
    if (isYouTubeUrl(url)) {
      return 'YouTube Music';
    }
    const filename = url.split('/').pop() || url;
    return filename.replace(/\.(mp3|m4a|wav|ogg)$/i, '').replace(/[-_]/g, ' ');
  }, []);

  /**
   * Play track from playlist (with progression callback)
   */
  const playPlaylistTrack = useCallback((index: number) => {
    if (playlist.length === 0) return;

    const safeIndex = index % playlist.length;
    const trackUrl = playlist[safeIndex];

    // If this track is already playing, don't restart it
    if (currentTrackRef.current === trackUrl && audioRef.current && !audioRef.current.paused) {
      console.log(`🎵 Track already playing, skipping restart`);
      setIsCustomMusicLoading(false);
      return;
    }

    // For YouTube, check if same video is already playing
    if (isYouTubeUrl(trackUrl)) {
      const videoId = extractYouTubeId(trackUrl);
      if (videoId && currentTrackRef.current === `youtube:${videoId}` && youtubePlayerRef.current) {
        console.log(`🎵 YouTube track already playing, skipping restart`);
        setIsCustomMusicLoading(false);
        return;
      }
    }

    console.log(`🎵 Playing playlist track ${safeIndex + 1}/${playlist.length}: ${trackUrl}`);
    setCurrentTrackName(getTrackNameFromUrl(trackUrl));
    setCurrentTrackThumbnail(null); // Non-YouTube tracks don't have thumbnails

    // Check if it's a YouTube URL
    if (isYouTubeUrl(trackUrl)) {
      const videoId = extractYouTubeId(trackUrl);
      if (videoId) {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }

        // Fetch YouTube metadata for title and thumbnail
        fetchYouTubeMetadata(videoId).then(metadata => {
          if (metadata) {
            setCurrentTrackName(metadata.title);
            setCurrentTrackThumbnail(metadata.thumbnail);
          }
        });

        const shouldLoop = playlist.length === 1;
        const onEnd = playlist.length > 1 ? () => {
          const nextIndex = (safeIndex + 1) % playlist.length;
          console.log('onEnd called! Current:', safeIndex, 'Next:', nextIndex, 'Playlist length:', playlist.length);
          setCurrentPlaylistIndexState(nextIndex);
        } : undefined;

        // REUSE existing YouTube player if possible (allows background tab advancement)
        if (youtubePlayerRef.current && typeof youtubePlayerRef.current.loadVideoById === 'function') {
          console.log('Reusing existing YT player for video:', videoId);
          // Clear old timeout
          if (youtubePollingRef.current) {
            clearTimeout(youtubePollingRef.current);
            youtubePollingRef.current = null;
          }
          // Load new video in existing player
          youtubePlayerRef.current.loadVideoById(videoId);
          youtubePlayerRef.current.setVolume(volume * 100);
          currentTrackRef.current = `youtube:${videoId}`;

          // Schedule next track
          if (!shouldLoop && onEnd) {
            const scheduleNext = () => {
              try {
                const duration = youtubePlayerRef.current.getDuration();
                if (duration > 0) {
                  const timeoutMs = Math.max(1000, (duration - 1) * 1000);
                  console.log('YT reuse: Scheduling next in', (timeoutMs/1000).toFixed(0), 's');
                  youtubePollingRef.current = setTimeout(() => {
                    console.log('YT reuse timeout: next track!');
                    onEnd();
                  }, timeoutMs);
                } else {
                  setTimeout(scheduleNext, 1000);
                }
              } catch(e) {}
            };
            setTimeout(scheduleNext, 500); // Wait for video to load
          }
          setIsCustomMusicLoading(false);
          return;
        }

        console.log('Creating new YT player for video:', videoId);
        playYouTubeAudio(videoId, volume, shouldLoop, onEnd);
        setIsCustomMusicLoading(false);
        return;
      } else {
        console.warn('🚫 Invalid YouTube URL, removing from playlist');
        handleInvalidTrack(safeIndex);
        return;
      }
    }

    // For non-YouTube URLs
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      } catch (e) {}
    }
    stopYouTubePlayer();

    const newAudio = new Audio(trackUrl);
    newAudio.loop = playlist.length === 1;
    newAudio.volume = 0;

    // Use timeupdate for more reliable next-track detection in background tabs
    // (onended doesn't fire reliably when tab is inactive)
    let hasTriggeredNext = false;
    newAudio.ontimeupdate = () => {
      if (hasTriggeredNext) return;
      if (newAudio.duration && newAudio.currentTime >= newAudio.duration - 0.5) {
        hasTriggeredNext = true;
        console.log('🎵 Playlist track ending (timeupdate), playing next...');
        const nextIndex = (safeIndex + 1) % playlist.length;
        setCurrentPlaylistIndexState(nextIndex);
      }
    };
    // Keep onended as fallback
    if (playlist.length > 1) {
      newAudio.onended = () => {
        if (hasTriggeredNext) return;
        hasTriggeredNext = true;
        console.log('🎵 Playlist track ended (onended), playing next...');
        const nextIndex = (safeIndex + 1) % playlist.length;
        setCurrentPlaylistIndexState(nextIndex);
      };
    }

    newAudio.onerror = () => {
      console.warn(`🚫 Failed to load track: ${trackUrl}`);
      setCustomMusicError(`Failed to load: ${trackUrl}`);
      handleInvalidTrack(safeIndex);
    };

    newAudio.play().then(() => {
      const fadeInSteps = 30;
      const fadeInInterval = FADE_DURATION / fadeInSteps;
      const volumeIncrement = volume / fadeInSteps;
      let step = 0;
      const fadeInTimer = setInterval(() => {
        step++;
        if (step >= fadeInSteps || !newAudio) {
          clearInterval(fadeInTimer);
          if (newAudio) newAudio.volume = volume;
        } else {
          newAudio.volume = Math.min(volume, newAudio.volume + volumeIncrement);
        }
      }, fadeInInterval);
      setIsCustomMusicLoading(false);
      setCustomMusicError(null);
    }).catch(err => {
      console.warn('⚠️ Failed to play playlist track:', err);
      setCustomMusicError(`Failed to play: ${trackUrl}`);
      handleInvalidTrack(safeIndex);
    });

    audioRef.current = newAudio;
    currentTrackRef.current = trackUrl;
  }, [playlist, volume, playYouTubeAudio, stopYouTubePlayer, handleInvalidTrack, getTrackNameFromUrl]);

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
      stopYouTubePlayer();
      currentTrackRef.current = null;
      return;
    }

    // If playlist mode with tracks
    if (musicMode === 'playlist' && playlist.length > 0) {
      console.log('useEffect: Playing playlist track', currentPlaylistIndex);
      setIsCustomMusicLoading(true);
      setCustomMusicError(null);
      playPlaylistTrack(currentPlaylistIndex);
      return;
    }

    // If custom mode with custom URL (legacy single URL)
    if (musicMode === 'custom' && customMusicUrl) {
      setIsCustomMusicLoading(true);
      setCustomMusicError(null);

      // Check if it's a YouTube URL
      if (isYouTubeUrl(customMusicUrl)) {
        const videoId = extractYouTubeId(customMusicUrl);
        if (videoId) {
          // Stop regular audio first
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
          }
          playYouTubeAudio(videoId, volume);
        } else {
          setCustomMusicError('Invalid YouTube URL');
          setIsCustomMusicLoading(false);
          setMusicModeState('default');
        }
      } else {
        // Direct audio URL
        stopYouTubePlayer();
        crossfade(customMusicUrl);
        setIsCustomMusicLoading(false);
      }
      return;
    }

    // If enabled, play the appropriate track
    const trackUrl = musicMode === 'default'
      ? DEFAULT_MUSIC
      : LANGUAGE_MUSIC[lang];

    crossfade(trackUrl);
  }, [musicMode, lang, isMusicEnabled, customMusicUrl, playlist, currentPlaylistIndex, crossfade, playYouTubeAudio, stopYouTubePlayer, volume, playPlaylistTrack]);

  /**
   * Load music mode, custom URL, and playlist from localStorage on mount
   */
  useEffect(() => {
    try {
      const storedMode = localStorage.getItem('musicMode') as MusicMode;
      if (storedMode && (storedMode === 'default' || storedMode === 'language' || storedMode === 'custom' || storedMode === 'playlist')) {
        setMusicModeState(storedMode);
      }
      const storedUrl = localStorage.getItem('customMusicUrl');
      if (storedUrl) {
        setCustomMusicUrlState(storedUrl);
      }

      // Load playlist
      const storedPlaylist = localStorage.getItem('musicPlaylist');
      if (storedPlaylist) {
        try {
          const parsed = JSON.parse(storedPlaylist);
          if (Array.isArray(parsed)) {
            setPlaylistState(parsed);
            isPlaylistModeRef.current = parsed.length > 0;
          }
        } catch (e) {
          console.warn('Failed to parse stored playlist');
        }
      }

      // Load playlist index
      const storedIndex = localStorage.getItem('playlistIndex');
      if (storedIndex) {
        setCurrentPlaylistIndexState(parseInt(storedIndex, 10) || 0);
      }
    } catch (error) {
      // localStorage might not be available in some contexts (e.g., Farcaster miniapp iframe)
      console.warn('localStorage not available, using default music mode');
    }
  }, []);

  /**
   * Resume music on first user interaction (fixes browser autoplay block)
   */
  useEffect(() => {
    const handleFirstClick = () => {
      if (!hasUserInteractedRef.current && isMusicEnabled) {
        hasUserInteractedRef.current = true;
        if (audioRef.current) {
          audioRef.current.play().catch(() => {
            // Still blocked, will try again on next click
          });
        }
        if (youtubePlayerRef.current && typeof youtubePlayerRef.current.playVideo === 'function') {
          youtubePlayerRef.current.playVideo();
        }
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
   * Resume YouTube playback when tab becomes visible again
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isMusicEnabled && !isPaused) {
        // Try to resume YouTube if it exists
        if (youtubePlayerRef.current && typeof youtubePlayerRef.current.playVideo === 'function') {
          try {
            const state = youtubePlayerRef.current.getPlayerState();
            // If paused (2) or not started, try to play
            if (state === 2 || state === -1 || state === 5) {
              youtubePlayerRef.current.playVideo();
            }
          } catch(e) {}
        }
        // Also try to resume HTML audio
        if (audioRef.current && audioRef.current.paused) {
          audioRef.current.play().catch(() => {});
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isMusicEnabled, isPaused]);

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
      stopYouTubePlayer();
    };
  }, [stopYouTubePlayer]);

  return (
    <MusicContext.Provider value={{
      musicMode,
      setMusicMode,
      isMusicEnabled,
      setIsMusicEnabled: setMusicEnabledWrapper,
      volume,
      setVolume,
      customMusicUrl,
      setCustomMusicUrl,
      isCustomMusicLoading,
      customMusicError,
      // Playlist support
      playlist,
      setPlaylist,
      addToPlaylist,
      removeFromPlaylist,
      currentPlaylistIndex,
      setCurrentPlaylistIndex,
      skipToNext,
      skipToPrevious,
      // Playback control
      isPaused,
      pause,
      play,
      currentTrackName,
      currentTrackThumbnail,
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
