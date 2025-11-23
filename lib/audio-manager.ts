/**
 * Audio Manager
 *
 * Global audio manager for background music and sound effects
 */

import { devLog } from '@/lib/utils/logger';

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

export const AudioManager = {
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
  // Card selection sounds - differentiated by rarity
  async selectCard() { await this.playTone(800, 0.1, 0.2); },
  async selectCardCommon() { await this.playTone(600, 0.1, 0.2); },
  async selectCardRare() {
    await this.playTone(800, 0.1, 0.2);
    setTimeout(() => this.playTone(900, 0.08, 0.15), 60);
  },
  async selectCardEpic() {
    await this.playTone(1000, 0.1, 0.22);
    setTimeout(() => this.playTone(1200, 0.08, 0.18), 50);
    setTimeout(() => this.playTone(1400, 0.06, 0.15), 100);
  },
  async selectCardLegendary() {
    await this.playTone(1200, 0.12, 0.25);
    setTimeout(() => this.playTone(1500, 0.1, 0.22), 50);
    setTimeout(() => this.playTone(1800, 0.08, 0.2), 100);
    setTimeout(() => this.playTone(2000, 0.06, 0.18), 150);
  },
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
  },
  // Haptic feedback for mobile devices
  hapticFeedback(style: 'light' | 'medium' | 'heavy' = 'medium') {
    if (typeof window === 'undefined' || !('vibrate' in navigator)) return;

    const patterns = {
      light: 10,
      medium: 20,
      heavy: [30, 10, 30]
    };

    try {
      navigator.vibrate(patterns[style]);
    } catch (e) {
      // Ignore if vibration not supported
    }
  },
  // Smart card selection sound based on rarity
  async selectCardByRarity(rarity?: string) {
    const r = (rarity || '').toLowerCase();
    if (r.includes('legend')) {
      await this.selectCardLegendary();
      this.hapticFeedback('heavy');
    } else if (r.includes('epic')) {
      await this.selectCardEpic();
      this.hapticFeedback('medium');
    } else if (r.includes('rare')) {
      await this.selectCardRare();
      this.hapticFeedback('medium');
    } else {
      await this.selectCardCommon();
      this.hapticFeedback('light');
    }
  },
  // Boss Raid Epic Sounds
  async bossAttack() {
    // Epic attack sound - heavy impact
    await this.playTone(200, 0.15, 0.4);
    setTimeout(() => this.playTone(150, 0.2, 0.45), 80);
    setTimeout(() => this.playTone(100, 0.25, 0.5), 150);
    this.hapticFeedback('heavy');
  },
  async criticalHit() {
    // Critical hit sound - explosive!
    await this.playTone(1500, 0.08, 0.35);
    setTimeout(() => this.playTone(1800, 0.08, 0.4), 40);
    setTimeout(() => this.playTone(2200, 0.1, 0.45), 80);
    setTimeout(() => this.playTone(2500, 0.12, 0.5), 120);
    setTimeout(() => this.playTone(300, 0.2, 0.4), 180); // Bass drop
    this.hapticFeedback('heavy');
  },
  async bossDefeat() {
    // Epic boss defeat sound - triumphant!
    await this.playTone(400, 0.15, 0.4);
    setTimeout(() => this.playTone(500, 0.15, 0.4), 100);
    setTimeout(() => this.playTone(600, 0.15, 0.4), 200);
    setTimeout(() => this.playTone(800, 0.2, 0.45), 300);
    setTimeout(() => this.playTone(1000, 0.25, 0.5), 400);
    setTimeout(() => this.playTone(1200, 0.3, 0.55), 500);
    this.hapticFeedback('heavy');
  },
  async bossSpawn() {
    // Boss spawn sound - ominous
    await this.playTone(100, 0.3, 0.5);
    setTimeout(() => this.playTone(150, 0.25, 0.45), 150);
    setTimeout(() => this.playTone(200, 0.2, 0.4), 280);
    setTimeout(() => this.playTone(300, 0.15, 0.35), 380);
    this.hapticFeedback('heavy');
  },
  async refuelCard() {
    // Refuel card sound - power up
    await this.playTone(600, 0.1, 0.25);
    setTimeout(() => this.playTone(800, 0.1, 0.3), 60);
    setTimeout(() => this.playTone(1000, 0.15, 0.35), 120);
    this.hapticFeedback('medium');
  }
};
