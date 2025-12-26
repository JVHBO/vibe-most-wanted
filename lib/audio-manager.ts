/**
 * Audio Manager
 *
 * Global audio manager for background music and sound effects
 * Enhanced with sound variation, throttling, and richer tones
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
      isPlaying: false,
      // Throttling: track last play time for each sound type
      lastPlayTime: {} as Record<string, number>,
      // Sound variation: track last variation used to avoid repetition
      lastVariation: {} as Record<string, number>,
    };
  }
  return (window as any).globalAudioManager;
};

// Helper: get random number in range
const randomInRange = (min: number, max: number) => min + Math.random() * (max - min);

// Helper: pick random item from array, avoiding last picked
const pickVariation = (key: string, count: number): number => {
  const mgr = getGlobalAudioManager();
  if (!mgr) return 0;

  const last = mgr.lastVariation[key] ?? -1;
  let pick = Math.floor(Math.random() * count);

  // If same as last and we have multiple options, re-pick once
  if (pick === last && count > 1) {
    pick = (pick + 1 + Math.floor(Math.random() * (count - 1))) % count;
  }

  mgr.lastVariation[key] = pick;
  return pick;
};

// Helper: check if sound can play (throttle)
const canPlaySound = (key: string, cooldownMs: number): boolean => {
  const mgr = getGlobalAudioManager();
  if (!mgr) return false;

  const now = Date.now();
  const lastTime = mgr.lastPlayTime[key] || 0;

  if (now - lastTime < cooldownMs) {
    return false;
  }

  mgr.lastPlayTime[key] = now;
  return true;
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
  async playTone(freq: number, dur: number, vol: number = 0.3, options?: {
    type?: OscillatorType;
    randomize?: boolean; // Add slight pitch/timing variation
    harmonics?: boolean; // Add overtones for richer sound
  }) {
    if (!this.context) await this.init();
    if (!this.context) return;
    if (this.context.state === 'suspended') await this.context.resume();

    // Apply randomization if requested
    let actualFreq = freq;
    let actualDur = dur;
    let actualVol = vol;
    if (options?.randomize) {
      actualFreq = freq * randomInRange(0.97, 1.03); // ±3% pitch variation
      actualDur = dur * randomInRange(0.9, 1.1); // ±10% duration variation
      actualVol = vol * randomInRange(0.85, 1.0); // slight volume variation
    }

    const oscType = options?.type || 'sine';

    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.connect(gain);
    gain.connect(this.context.destination);
    osc.frequency.value = actualFreq;
    osc.type = oscType;
    gain.gain.setValueAtTime(actualVol, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + actualDur);
    osc.start(this.context.currentTime);
    osc.stop(this.context.currentTime + actualDur);

    // Add harmonics for richer sound
    if (options?.harmonics && this.context) {
      // Add octave harmonic (quieter)
      const osc2 = this.context.createOscillator();
      const gain2 = this.context.createGain();
      osc2.connect(gain2);
      gain2.connect(this.context.destination);
      osc2.frequency.value = actualFreq * 2; // Octave up
      osc2.type = oscType;
      gain2.gain.setValueAtTime(actualVol * 0.3, this.context.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + actualDur * 0.8);
      osc2.start(this.context.currentTime);
      osc2.stop(this.context.currentTime + actualDur * 0.8);

      // Add fifth harmonic (even quieter)
      const osc3 = this.context.createOscillator();
      const gain3 = this.context.createGain();
      osc3.connect(gain3);
      gain3.connect(this.context.destination);
      osc3.frequency.value = actualFreq * 1.5; // Fifth
      osc3.type = 'triangle';
      gain3.gain.setValueAtTime(actualVol * 0.15, this.context.currentTime);
      gain3.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + actualDur * 0.6);
      osc3.start(this.context.currentTime);
      osc3.stop(this.context.currentTime + actualDur * 0.6);
    }
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
  // Card selection sounds - differentiated by rarity, with variation
  async selectCard() {
    if (!canPlaySound('selectCard', 80)) return;
    await this.playTone(800, 0.09, 0.18, { randomize: true });
  },
  async selectCardCommon() {
    if (!canPlaySound('selectCard', 80)) return;
    const variation = pickVariation('selectCommon', 3);
    const freqs = [580, 620, 560];
    await this.playTone(freqs[variation], 0.09, 0.16, { randomize: true, type: 'triangle' });
  },
  async selectCardRare() {
    if (!canPlaySound('selectCard', 80)) return;
    const variation = pickVariation('selectRare', 2);
    if (variation === 0) {
      await this.playTone(780, 0.09, 0.18, { randomize: true });
      setTimeout(() => this.playTone(920, 0.07, 0.14, { type: 'triangle' }), 55);
    } else {
      await this.playTone(820, 0.08, 0.17, { randomize: true, type: 'triangle' });
      setTimeout(() => this.playTone(960, 0.08, 0.15), 60);
    }
  },
  async selectCardEpic() {
    if (!canPlaySound('selectCard', 80)) return;
    const variation = pickVariation('selectEpic', 2);
    if (variation === 0) {
      await this.playTone(980, 0.09, 0.2, { randomize: true, harmonics: true });
      setTimeout(() => this.playTone(1180, 0.07, 0.17, { type: 'triangle' }), 45);
      setTimeout(() => this.playTone(1380, 0.06, 0.14), 95);
    } else {
      await this.playTone(1050, 0.08, 0.19, { randomize: true });
      setTimeout(() => this.playTone(1250, 0.07, 0.16, { harmonics: true }), 50);
      setTimeout(() => this.playTone(1450, 0.06, 0.13, { type: 'triangle' }), 100);
    }
  },
  async selectCardLegendary() {
    if (!canPlaySound('selectCard', 80)) return;
    const variation = pickVariation('selectLegendary', 2);
    if (variation === 0) {
      await this.playTone(1180, 0.11, 0.22, { randomize: true, harmonics: true });
      setTimeout(() => this.playTone(1480, 0.09, 0.2, { harmonics: true }), 45);
      setTimeout(() => this.playTone(1780, 0.08, 0.18, { type: 'triangle' }), 95);
      setTimeout(() => this.playTone(2000, 0.06, 0.16), 145);
    } else {
      await this.playTone(1250, 0.1, 0.21, { randomize: true, harmonics: true });
      setTimeout(() => this.playTone(1550, 0.09, 0.19), 50);
      setTimeout(() => this.playTone(1850, 0.07, 0.17, { harmonics: true }), 100);
      setTimeout(() => this.playTone(2100, 0.06, 0.15, { type: 'triangle' }), 155);
    }
  },
  async deselectCard() {
    if (!canPlaySound('deselectCard', 80)) return;
    await this.playTone(420, 0.09, 0.16, { randomize: true, type: 'triangle' });
  },
  async shuffle() {
    if (!canPlaySound('shuffle', 300)) return;
    // Randomized shuffle sound
    for (let i = 0; i < 5; i++) {
      const baseFreq = 280 + Math.random() * 180;
      const delay = i * (45 + Math.random() * 20);
      setTimeout(() => this.playTone(baseFreq, 0.04, 0.12, { type: 'triangle' }), delay);
    }
  },
  async cardBattle() {
    if (!canPlaySound('cardBattle', 150)) return;
    const variation = pickVariation('cardBattle', 3);
    if (variation === 0) {
      await this.playTone(580, 0.09, 0.28, { harmonics: true, randomize: true });
      setTimeout(() => this.playTone(720, 0.09, 0.28), 90);
      setTimeout(() => this.playTone(380, 0.14, 0.32, { type: 'sawtooth' }), 180);
    } else if (variation === 1) {
      await this.playTone(620, 0.1, 0.26, { randomize: true });
      setTimeout(() => this.playTone(680, 0.08, 0.28, { harmonics: true }), 100);
      setTimeout(() => this.playTone(420, 0.13, 0.3, { type: 'triangle' }), 190);
    } else {
      await this.playTone(550, 0.08, 0.27, { randomize: true, type: 'triangle' });
      setTimeout(() => this.playTone(750, 0.1, 0.29, { harmonics: true }), 85);
      setTimeout(() => this.playTone(350, 0.15, 0.33), 180);
    }
  },
  async playHand() {
    if (!canPlaySound('playHand', 200)) return;
    const variation = pickVariation('playHand', 2);
    if (variation === 0) {
      await this.playTone(580, 0.14, 0.22, { randomize: true, harmonics: true });
      setTimeout(() => this.playTone(880, 0.14, 0.22, { type: 'triangle' }), 95);
    } else {
      await this.playTone(620, 0.12, 0.21, { randomize: true });
      setTimeout(() => this.playTone(920, 0.13, 0.23, { harmonics: true }), 100);
    }
  },
  async win() {
    await this.init();
    if (this.context && this.context.state === 'suspended') {
      await this.context.resume();
    }
    try {
      const audio = new Audio('/win-sound.mp3');
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
      const audio = new Audio('/lose-sound.mp3');
      audio.volume = 0.7;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        await playPromise;
      }
    } catch (e) {
      devLog('Erro ao tocar som de derrota:', e);
    }
  },
  async tie() {
    if (!canPlaySound('tie', 300)) return;
    // Tie sound - neutral draw effect with variation
    const variation = pickVariation('tie', 2);
    if (variation === 0) {
      await this.playTone(480, 0.14, 0.33, { randomize: true, type: 'triangle' });
      setTimeout(() => this.playTone(520, 0.14, 0.33), 145);
      setTimeout(() => this.playTone(380, 0.18, 0.28, { harmonics: true }), 290);
    } else {
      await this.playTone(520, 0.13, 0.32, { randomize: true });
      setTimeout(() => this.playTone(480, 0.15, 0.34, { type: 'triangle' }), 155);
      setTimeout(() => this.playTone(420, 0.2, 0.3), 305);
    }
    this.hapticFeedback('medium');
  },
  // Sons para botões - com throttling e variação
  async buttonClick() {
    // Throttle: 50ms cooldown to prevent spam
    if (!canPlaySound('buttonClick', 50)) return;

    // 4 variations of button click sounds
    const variation = pickVariation('buttonClick', 4);
    const frequencies = [580, 620, 550, 640];
    const types: OscillatorType[] = ['sine', 'triangle', 'sine', 'triangle'];

    await this.playTone(frequencies[variation], 0.07, 0.1, {
      type: types[variation],
      randomize: true
    });
  },
  async buttonHover() {
    // Throttle: 80ms cooldown
    if (!canPlaySound('buttonHover', 80)) return;
    await this.playTone(500, 0.03, 0.06, { randomize: true });
  },
  async buttonSuccess() {
    // Throttle: 200ms cooldown
    if (!canPlaySound('buttonSuccess', 200)) return;

    const variation = pickVariation('buttonSuccess', 3);
    if (variation === 0) {
      await this.playTone(700, 0.08, 0.14, { harmonics: true, randomize: true });
      setTimeout(() => this.playTone(920, 0.1, 0.14, { harmonics: true }), 90);
    } else if (variation === 1) {
      await this.playTone(650, 0.07, 0.12, { type: 'triangle', randomize: true });
      setTimeout(() => this.playTone(850, 0.09, 0.14, { type: 'triangle' }), 80);
      setTimeout(() => this.playTone(1000, 0.07, 0.1, { type: 'sine' }), 150);
    } else {
      await this.playTone(800, 0.06, 0.12, { randomize: true });
      setTimeout(() => this.playTone(1000, 0.08, 0.14), 60);
    }
  },
  async buttonError() {
    // Throttle: 150ms cooldown
    if (!canPlaySound('buttonError', 150)) return;

    const variation = pickVariation('buttonError', 2);
    if (variation === 0) {
      await this.playTone(280, 0.12, 0.18, { type: 'sawtooth', randomize: true });
      setTimeout(() => this.playTone(220, 0.14, 0.2, { type: 'sawtooth' }), 110);
    } else {
      await this.playTone(320, 0.1, 0.16, { randomize: true });
      setTimeout(() => this.playTone(200, 0.15, 0.18), 100);
    }
  },
  async buttonNav() {
    // Throttle: 60ms cooldown
    if (!canPlaySound('buttonNav', 60)) return;

    const variation = pickVariation('buttonNav', 3);
    const frequencies = [530, 560, 520];
    await this.playTone(frequencies[variation], 0.05, 0.08, { randomize: true });
  },
  async toggleOn() {
    if (!canPlaySound('toggle', 150)) return;
    await this.playTone(600, 0.07, 0.11, { randomize: true });
    setTimeout(() => this.playTone(820, 0.08, 0.12, { type: 'triangle' }), 55);
  },
  async toggleOff() {
    if (!canPlaySound('toggle', 150)) return;
    await this.playTone(780, 0.07, 0.11, { randomize: true });
    setTimeout(() => this.playTone(580, 0.08, 0.12, { type: 'triangle' }), 55);
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
  // Boss Raid Epic Sounds - with variation for less repetition
  async bossAttack() {
    if (!canPlaySound('bossAttack', 100)) return;

    const variation = pickVariation('bossAttack', 4);
    // 4 different epic impact sounds
    if (variation === 0) {
      await this.playTone(190, 0.14, 0.38, { harmonics: true, randomize: true });
      setTimeout(() => this.playTone(140, 0.18, 0.42, { type: 'sawtooth' }), 75);
      setTimeout(() => this.playTone(95, 0.23, 0.48), 145);
    } else if (variation === 1) {
      await this.playTone(220, 0.12, 0.36, { randomize: true, type: 'triangle' });
      setTimeout(() => this.playTone(160, 0.17, 0.44, { harmonics: true }), 80);
      setTimeout(() => this.playTone(110, 0.22, 0.46), 150);
    } else if (variation === 2) {
      await this.playTone(180, 0.15, 0.4, { randomize: true });
      setTimeout(() => this.playTone(130, 0.2, 0.45, { type: 'sawtooth' }), 85);
      setTimeout(() => this.playTone(85, 0.25, 0.5, { harmonics: true }), 160);
    } else {
      await this.playTone(210, 0.13, 0.37, { randomize: true, harmonics: true });
      setTimeout(() => this.playTone(150, 0.19, 0.43), 70);
      setTimeout(() => this.playTone(100, 0.24, 0.47, { type: 'triangle' }), 140);
    }
    this.hapticFeedback('heavy');
  },
  async criticalHit() {
    if (!canPlaySound('criticalHit', 150)) return;

    const variation = pickVariation('criticalHit', 3);
    // 3 explosive critical hit variations
    if (variation === 0) {
      await this.playTone(1450, 0.07, 0.33, { randomize: true, harmonics: true });
      setTimeout(() => this.playTone(1780, 0.08, 0.38, { type: 'triangle' }), 38);
      setTimeout(() => this.playTone(2150, 0.09, 0.43, { harmonics: true }), 78);
      setTimeout(() => this.playTone(2450, 0.11, 0.48), 118);
      setTimeout(() => this.playTone(280, 0.18, 0.38, { type: 'sawtooth' }), 175);
    } else if (variation === 1) {
      await this.playTone(1550, 0.08, 0.35, { randomize: true });
      setTimeout(() => this.playTone(1900, 0.07, 0.4, { harmonics: true }), 42);
      setTimeout(() => this.playTone(2300, 0.1, 0.44), 82);
      setTimeout(() => this.playTone(2600, 0.12, 0.5, { type: 'triangle' }), 125);
      setTimeout(() => this.playTone(320, 0.2, 0.42, { harmonics: true }), 185);
    } else {
      await this.playTone(1380, 0.09, 0.34, { randomize: true, harmonics: true });
      setTimeout(() => this.playTone(1700, 0.08, 0.39), 35);
      setTimeout(() => this.playTone(2050, 0.1, 0.45, { type: 'triangle' }), 75);
      setTimeout(() => this.playTone(2380, 0.11, 0.49, { harmonics: true }), 115);
      setTimeout(() => this.playTone(250, 0.22, 0.4, { type: 'sawtooth' }), 170);
    }
    this.hapticFeedback('heavy');
  },
  async bossDefeat() {
    // Epic boss defeat - only one variation but randomized
    if (!canPlaySound('bossDefeat', 500)) return;

    await this.playTone(380, 0.14, 0.38, { randomize: true, harmonics: true });
    setTimeout(() => this.playTone(480, 0.14, 0.4, { type: 'triangle' }), 95);
    setTimeout(() => this.playTone(580, 0.14, 0.42, { harmonics: true }), 195);
    setTimeout(() => this.playTone(780, 0.18, 0.45), 295);
    setTimeout(() => this.playTone(980, 0.22, 0.48, { type: 'triangle', harmonics: true }), 395);
    setTimeout(() => this.playTone(1180, 0.28, 0.52, { harmonics: true }), 495);
    this.hapticFeedback('heavy');
  },
  async bossSpawn() {
    if (!canPlaySound('bossSpawn', 400)) return;

    const variation = pickVariation('bossSpawn', 2);
    // Ominous spawn sounds
    if (variation === 0) {
      await this.playTone(95, 0.28, 0.48, { harmonics: true, randomize: true });
      setTimeout(() => this.playTone(140, 0.24, 0.43, { type: 'sawtooth' }), 145);
      setTimeout(() => this.playTone(190, 0.2, 0.38), 270);
      setTimeout(() => this.playTone(280, 0.14, 0.33, { type: 'triangle' }), 375);
    } else {
      await this.playTone(110, 0.3, 0.5, { randomize: true });
      setTimeout(() => this.playTone(160, 0.25, 0.45, { harmonics: true }), 155);
      setTimeout(() => this.playTone(210, 0.2, 0.4, { type: 'triangle' }), 285);
      setTimeout(() => this.playTone(320, 0.15, 0.35, { harmonics: true }), 385);
    }
    this.hapticFeedback('heavy');
  },
  async refuelCard() {
    if (!canPlaySound('refuelCard', 120)) return;

    const variation = pickVariation('refuelCard', 3);
    // Power up sounds
    if (variation === 0) {
      await this.playTone(580, 0.09, 0.23, { randomize: true });
      setTimeout(() => this.playTone(780, 0.09, 0.28, { type: 'triangle' }), 55);
      setTimeout(() => this.playTone(980, 0.14, 0.33, { harmonics: true }), 115);
    } else if (variation === 1) {
      await this.playTone(620, 0.08, 0.22, { randomize: true, harmonics: true });
      setTimeout(() => this.playTone(820, 0.1, 0.27), 60);
      setTimeout(() => this.playTone(1050, 0.13, 0.32, { type: 'triangle' }), 120);
    } else {
      await this.playTone(550, 0.1, 0.24, { randomize: true, type: 'triangle' });
      setTimeout(() => this.playTone(750, 0.09, 0.29, { harmonics: true }), 58);
      setTimeout(() => this.playTone(1000, 0.14, 0.34), 118);
    }
    this.hapticFeedback('medium');
  }
};
