'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

interface AudioContextType {
  musicEnabled: boolean;
  musicVolume: number;
  setMusicEnabled: (enabled: boolean) => void;
  setMusicVolume: (volume: number) => void;
  playSound: (soundName: 'open' | 'victory' | 'defeat' | 'select' | 'match') => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within AudioProvider');
  }
  return context;
};

class AudioManager {
  private static instance: AudioManager;
  private audioContext: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private soundGain: GainNode | null = null;
  private musicSource: AudioBufferSourceNode | null = null;
  private musicBuffer: AudioBuffer | null = null;
  private sounds: { [key: string]: AudioBuffer } = {};
  public currentVolume: number = 0.1;
  private isInitialized: boolean = false;
  private isPlaying: boolean = false;

  private constructor() {}

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  async init() {
    if (this.isInitialized) return;

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.musicGain = this.audioContext.createGain();
      this.soundGain = this.audioContext.createGain();

      this.musicGain.connect(this.audioContext.destination);
      this.soundGain.connect(this.audioContext.destination);

      this.musicGain.gain.value = this.currentVolume;
      this.soundGain.gain.value = 0.3;

      // Load background music
      const musicResponse = await fetch('/music/background.mp3');
      const musicArrayBuffer = await musicResponse.arrayBuffer();
      this.musicBuffer = await this.audioContext.decodeAudioData(musicArrayBuffer);

      // Load sound effects
      const soundNames = ['open', 'victory', 'defeat', 'select', 'match'];
      await Promise.all(
        soundNames.map(async (name) => {
          try {
            const response = await fetch(`/sounds/${name}.mp3`);
            const arrayBuffer = await response.arrayBuffer();
            this.sounds[name] = await this.audioContext!.decodeAudioData(arrayBuffer);
          } catch (error) {
            console.warn(`Failed to load sound: ${name}`);
          }
        })
      );

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize audio:', error);
    }
  }

  async startMusic() {
    if (!this.audioContext || !this.musicBuffer || this.isPlaying) return;

    try {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.musicSource = this.audioContext.createBufferSource();
      this.musicSource.buffer = this.musicBuffer;
      this.musicSource.loop = true;
      this.musicSource.connect(this.musicGain!);
      this.musicSource.start(0);
      this.isPlaying = true;
    } catch (error) {
      console.error('Failed to start music:', error);
    }
  }

  stopMusic() {
    if (this.musicSource) {
      try {
        this.musicSource.stop();
      } catch (error) {
        console.warn('Error stopping music:', error);
      }
      this.musicSource = null;
      this.isPlaying = false;
    }
  }

  setVolume(volume: number) {
    this.currentVolume = Math.max(0, Math.min(1, volume));
    if (this.musicGain) {
      this.musicGain.gain.value = this.currentVolume;
    }
  }

  async playSound(soundName: string) {
    if (!this.audioContext || !this.soundGain || !this.sounds[soundName]) return;

    try {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const source = this.audioContext.createBufferSource();
      source.buffer = this.sounds[soundName];
      source.connect(this.soundGain);
      source.start(0);
    } catch (error) {
      console.warn(`Failed to play sound: ${soundName}`, error);
    }
  }
}

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [musicEnabled, setMusicEnabledState] = useState(false);
  const [musicVolume, setMusicVolumeState] = useState(0.1);
  const audioManagerRef = useRef<AudioManager>(AudioManager.getInstance());
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (musicEnabled && !isInitializedRef.current) {
      audioManagerRef.current.init().then(() => {
        audioManagerRef.current.startMusic();
        isInitializedRef.current = true;
      });
    } else if (musicEnabled) {
      audioManagerRef.current.startMusic();
    } else {
      audioManagerRef.current.stopMusic();
    }
  }, [musicEnabled]);

  useEffect(() => {
    audioManagerRef.current.setVolume(musicVolume);
  }, [musicVolume]);

  const setMusicEnabled = (enabled: boolean) => {
    setMusicEnabledState(enabled);
  };

  const setMusicVolume = (volume: number) => {
    setMusicVolumeState(volume);
  };

  const playSound = (soundName: 'open' | 'victory' | 'defeat' | 'select' | 'match') => {
    audioManagerRef.current.playSound(soundName);
  };

  return (
    <AudioContext.Provider value={{ musicEnabled, musicVolume, setMusicEnabled, setMusicVolume, playSound }}>
      {children}
    </AudioContext.Provider>
  );
};
