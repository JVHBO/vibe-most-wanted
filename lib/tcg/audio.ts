/**
 * TCG Audio System - Sound effects, combo voices, and BGM management
 * Fix Issue #7: All new Audio() instances are tracked in allBgmAudios for proper cleanup
 */

export type SoundType = "card" | "turn" | "ability" | "victory" | "defeat" | "select" | "combo" | "error" | "tick" | "buff" | "debuff" | "destroy" | "steal" | "draw" | "energy" | "shuffle" | "heal" | "shield" | "bomb" | "hit" | "damage";
export type MemeSound = "mechaArena" | "ggez" | "bruh" | "emotional" | "wow";

// Store current BGM audio to stop on game restart
let currentBgmAudio: HTMLAudioElement | null = null;
let allBgmAudios: HTMLAudioElement[] = []; // Track all BGM audios created

// Track last played sounds to prevent overlap
let lastSoundTime: Record<string, number> = {};
const SOUND_COOLDOWN_MS = 150; // Minimum time between same sound type

/** Track a new Audio element for cleanup. FIX Issue #7: prevents audio leaks */
const trackAudio = (audio: HTMLAudioElement): HTMLAudioElement => {
  allBgmAudios.push(audio);
  return audio;
};

export const stopBgm = () => {
  // Helper to aggressively stop an audio element
  const killAudio = (audio: HTMLAudioElement | null) => {
    if (!audio) return;
    try {
      audio.pause();
      audio.muted = true;
      audio.volume = 0;
      audio.currentTime = 0;
      audio.src = ""; // Force release
      audio.load(); // Reset the audio element
    } catch (e) {}
  };

  // Stop the tracked BGM
  killAudio(currentBgmAudio);
  currentBgmAudio = null;

  // Also stop all tracked BGM audios (backup)
  allBgmAudios.forEach(audio => killAudio(audio));
  allBgmAudios = [];
};

export const playSound = (type: SoundType) => {
  if (typeof window === "undefined") return;

  // Prevent same sound from playing too quickly (overlap prevention)
  const now = Date.now();
  if (lastSoundTime[type] && now - lastSoundTime[type] < SOUND_COOLDOWN_MS) {
    return; // Skip - sound played too recently
  }
  lastSoundTime[type] = now;

  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;

  const audioCtx = new AudioContext();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  switch (type) {
    case "card":
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.15);
      break;

    case "select":
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.05);
      break;

    case "turn":
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
      oscillator.frequency.setValueAtTime(400, audioCtx.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(500, audioCtx.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.3);
      break;

    case "ability":
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.05);
      oscillator.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.15);
      gainNode.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.2);
      break;

    case "buff": {
      const playBuffNote = (freq: number, delay: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + 0.1);
        osc.start(audioCtx.currentTime + delay);
        osc.stop(audioCtx.currentTime + delay + 0.1);
      };
      playBuffNote(523, 0);
      playBuffNote(659, 0.06);
      playBuffNote(784, 0.12);
      return;
    }

    case "debuff":
      oscillator.type = "sawtooth";
      oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.25);
      break;

    case "destroy": {
      const playBoom = (freq: number, delay: number, dur: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
        osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + delay + dur);
        gain.gain.setValueAtTime(0.4, audioCtx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + dur);
        osc.start(audioCtx.currentTime + delay);
        osc.stop(audioCtx.currentTime + delay + dur);
      };
      playBoom(150, 0, 0.3);
      playBoom(100, 0.05, 0.25);
      return;
    }

    case "steal":
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(200, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.08);
      oscillator.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.15);
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.2);
      break;

    case "draw": {
      const playFlip = (delay: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = "triangle";
        osc.frequency.setValueAtTime(1200, audioCtx.currentTime + delay);
        osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + delay + 0.05);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + 0.08);
        osc.start(audioCtx.currentTime + delay);
        osc.stop(audioCtx.currentTime + delay + 0.08);
      };
      playFlip(0);
      playFlip(0.08);
      return;
    }

    case "energy":
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(100, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.2);
      oscillator.frequency.setValueAtTime(400, audioCtx.currentTime + 0.25);
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.25, audioCtx.currentTime + 0.15);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.3);
      break;

    case "shuffle": {
      const playShuffle = (freq: number, delay: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = "square";
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
        osc.frequency.setValueAtTime(freq * 0.7, audioCtx.currentTime + delay + 0.03);
        osc.frequency.setValueAtTime(freq * 1.2, audioCtx.currentTime + delay + 0.06);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + 0.1);
        osc.start(audioCtx.currentTime + delay);
        osc.stop(audioCtx.currentTime + delay + 0.1);
      };
      playShuffle(400, 0);
      playShuffle(600, 0.08);
      playShuffle(300, 0.16);
      return;
    }

    case "shield":
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
      oscillator.frequency.setValueAtTime(350, audioCtx.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(300, audioCtx.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.3);
      break;

    case "bomb": {
      const playTick2 = (delay: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(1000, audioCtx.currentTime + delay);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + 0.05);
        osc.start(audioCtx.currentTime + delay);
        osc.stop(audioCtx.currentTime + delay + 0.05);
      };
      playTick2(0);
      playTick2(0.1);
      playTick2(0.2);
      setTimeout(() => playSound("destroy"), 250);
      return;
    }

    case "heal": {
      const playHeal = (freq: number, delay: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + 0.15);
        osc.start(audioCtx.currentTime + delay);
        osc.stop(audioCtx.currentTime + delay + 0.15);
      };
      playHeal(880, 0);
      playHeal(1047, 0.1);
      playHeal(1319, 0.2);
      return;
    }

    case "victory":
      try {
        stopBgm();
        const victoryAudio = trackAudio(new Audio("/sounds/victory.mp3"));
        victoryAudio.volume = 0.6;
        currentBgmAudio = victoryAudio;
        victoryAudio.play().catch(() => {});
      } catch {
        const playVictoryNote = (freq: number, delay: number) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
          gain.gain.setValueAtTime(0.3, audioCtx.currentTime + delay);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + 0.2);
          osc.start(audioCtx.currentTime + delay);
          osc.stop(audioCtx.currentTime + delay + 0.2);
        };
        playVictoryNote(523, 0);
        playVictoryNote(659, 0.15);
        playVictoryNote(784, 0.3);
        playVictoryNote(1047, 0.45);
      }
      return;

    case "defeat":
      try {
        stopBgm();
        const defeatAudio = trackAudio(new Audio("/sounds/defeat.mp3"));
        defeatAudio.volume = 0.6;
        currentBgmAudio = defeatAudio;
        defeatAudio.play().catch(() => {});
      } catch {
        oscillator.type = "sawtooth";
        oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.5);
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.5);
      }
      return;

    case "combo": {
      const playComboChord = (freqs: number[], delay: number, duration: number, vol: number) => {
        freqs.forEach(freq => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
          gain.gain.setValueAtTime(vol, audioCtx.currentTime + delay);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + duration);
          osc.start(audioCtx.currentTime + delay);
          osc.stop(audioCtx.currentTime + delay + duration);
        });
      };
      playComboChord([150, 300], 0, 0.15, 0.4);
      playComboChord([200, 400, 600], 0.1, 0.2, 0.35);
      playComboChord([300, 450, 600, 900], 0.25, 0.4, 0.45);
      const sparkle = (freq: number, d: number) => {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.connect(g); g.connect(audioCtx.destination);
        o.type = "sine";
        o.frequency.setValueAtTime(freq, audioCtx.currentTime + d);
        g.gain.setValueAtTime(0.2, audioCtx.currentTime + d);
        g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + d + 0.1);
        o.start(audioCtx.currentTime + d);
        o.stop(audioCtx.currentTime + d + 0.1);
      };
      sparkle(1200, 0.5);
      sparkle(1500, 0.55);
      sparkle(1800, 0.6);
      return;
    }

    case "error":
      oscillator.type = "sawtooth";
      oscillator.frequency.setValueAtTime(150, audioCtx.currentTime);
      oscillator.frequency.setValueAtTime(100, audioCtx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.2);
      break;

    case "tick":
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.08);
      break;

    case "hit":
      try {
        // FIX Issue #7: track attack audio for cleanup
        const attackAudio = trackAudio(new Audio("/sounds/attack.mp3"));
        attackAudio.volume = 0.3;
        attackAudio.play().catch(() => {});
      } catch {
        const playHit = (freq: number, delay: number, dur: number) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
          osc.frequency.exponentialRampToValueAtTime(freq * 0.3, audioCtx.currentTime + delay + dur);
          gain.gain.setValueAtTime(0.35, audioCtx.currentTime + delay);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + dur);
          osc.start(audioCtx.currentTime + delay);
          osc.stop(audioCtx.currentTime + delay + dur);
        };
        playHit(200, 0, 0.1);
        playHit(100, 0.02, 0.15);
      }
      return;

    case "damage":
      try {
        const damageAudio = trackAudio(new Audio("/sounds/hit.mp3"));
        damageAudio.volume = 0.3;
        damageAudio.play().catch(() => {});
      } catch {
        const playImpact = (freq: number, delay: number, type: OscillatorType = "sawtooth") => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.type = type;
          osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
          osc.frequency.exponentialRampToValueAtTime(freq * 0.3, audioCtx.currentTime + delay + 0.12);
          gain.gain.setValueAtTime(0.5, audioCtx.currentTime + delay);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + 0.15);
          osc.start(audioCtx.currentTime + delay);
          osc.stop(audioCtx.currentTime + delay + 0.15);
        };
        playImpact(120, 0, "sawtooth");
        playImpact(80, 0.02, "triangle");
        playImpact(200, 0.01, "square");
      }
      return;
  }
};

// Mapping from combo ID to audio file name
export const COMBO_VOICE_FILES: Record<string, string> = {
  romero_family: "romero.mp3",
  crypto_kings: "cryptokings.mp3",
  mythic_assembly: "mythic.mp3",
  legends_unite: "legends_unite.mp3",
  ai_bros: "ai_takeover.mp3",
  scam_squad: "scam_squad.mp3",
  degen_trio: "degen_trio.mp3",
  vibe_team: "vibe_team.mp3",
  dirty_duo: "dirty_duo.mp3",
  code_masters: "code_masters.mp3",
  content_creators: "content_creators.mp3",
  chaos_agents: "chaos_agents.mp3",
  sniper_support: "sniper_elite.mp3",
  money_makers: "money_makers.mp3",
  underdog_uprising: "underdog_uprising.mp3",
  parallel: "PARALLEL.mp3",
  royal_brothers: "royal_brothers.mp3",
  philosopher_chad: "philosopher_chad.mp3",
  scaling_masters: "scaling_masters.mp3",
  christmas_spirit: "christmas_spirit.mp3",
  shadow_network: "shadow_network.mp3",
  pixel_artists: "pixel_artists.mp3",
  dirty_money: "dirty_money.mp3",
};

// Play combo voice announcement
export const playComboVoice = (comboId: string) => {
  if (typeof window === "undefined") return;

  const audioFile = COMBO_VOICE_FILES[comboId];
  if (!audioFile) return;

  try {
    // FIX Issue #7: track combo voice audio for cleanup
    const audio = trackAudio(new Audio(`/sounds/combos/${audioFile}`));
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch {
    // Silently fail if audio can't play
  }
};

/** Play a one-shot audio file with tracking for cleanup. FIX Issue #7 */
export const playTrackedAudio = (src: string, volume = 0.5) => {
  if (typeof window === "undefined") return;
  try {
    const audio = trackAudio(new Audio(src));
    audio.volume = volume;
    audio.play().catch(() => {});
  } catch {}
};

/** Play 5-second warning sound. FIX Issue #7: tracked for cleanup */
export const playFiveSecondWarning = () => {
  if (typeof window === "undefined") return;
  try {
    const audio = trackAudio(new Audio("/sounds/5 SEGUNDOS.mp3"));
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch {}
};

// Meme sounds for profile menu
export const playMemeSound = (type: MemeSound) => {
  if (typeof window === "undefined") return;

  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;

  const audioCtx = new AudioContext();

  const playNote = (freq: number, delay: number, duration: number, type: OscillatorType = "sine", gain: number = 0.3) => {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
    gainNode.gain.setValueAtTime(gain, audioCtx.currentTime + delay);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + duration);
    osc.start(audioCtx.currentTime + delay);
    osc.stop(audioCtx.currentTime + delay + duration);
  };

  switch (type) {
    case "mechaArena":
      playNote(150, 0, 0.15, "sawtooth", 0.4);
      playNote(200, 0.1, 0.15, "sawtooth", 0.4);
      playNote(300, 0.2, 0.15, "square", 0.3);
      playNote(400, 0.3, 0.15, "square", 0.3);
      playNote(600, 0.4, 0.2, "sawtooth", 0.5);
      playNote(800, 0.5, 0.3, "sawtooth", 0.4);
      playNote(1000, 0.6, 0.4, "sine", 0.3);
      break;

    case "ggez":
      playNote(523, 0, 0.1, "square", 0.3);
      playNote(659, 0.1, 0.1, "square", 0.3);
      playNote(784, 0.2, 0.1, "square", 0.3);
      playNote(659, 0.35, 0.1, "square", 0.3);
      playNote(523, 0.45, 0.15, "square", 0.3);
      break;

    case "bruh":
      playNote(200, 0, 0.1, "sawtooth", 0.5);
      playNote(150, 0.1, 0.15, "sawtooth", 0.4);
      playNote(100, 0.25, 0.2, "sawtooth", 0.3);
      playNote(80, 0.45, 0.3, "sawtooth", 0.2);
      break;

    case "emotional":
      playNote(440, 0, 0.15, "sine", 0.3);
      playNote(415, 0.15, 0.15, "sine", 0.3);
      playNote(392, 0.3, 0.15, "sine", 0.3);
      playNote(349, 0.45, 0.3, "sine", 0.4);
      playNote(330, 0.75, 0.5, "sine", 0.3);
      break;

    case "wow":
      playNote(300, 0, 0.1, "sine", 0.4);
      playNote(400, 0.08, 0.1, "sine", 0.4);
      playNote(500, 0.16, 0.1, "sine", 0.4);
      playNote(700, 0.24, 0.15, "sine", 0.5);
      playNote(900, 0.35, 0.2, "sine", 0.4);
      playNote(1100, 0.5, 0.3, "sine", 0.3);
      break;
  }
};
