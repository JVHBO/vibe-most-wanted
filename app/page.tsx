"use client";

import React, { useEffect, useState, useCallback, useMemo, memo } from "react";
import Link from "next/link";
import { PvPService, ProfileService, type GameRoom, type UserProfile, type MatchHistory } from "../lib/firebase";
import { sdk } from "@farcaster/miniapp-sdk";
import { BadgeList } from "@/components/Badge";
import { getUserBadges } from "@/lib/badges";

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_VIBE_CONTRACT;
const JC_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_JC_CONTRACT || CONTRACT_ADDRESS; // JC can have different contract
const CHAIN = process.env.NEXT_PUBLIC_ALCHEMY_CHAIN;
const HAND_SIZE_CONST = 5;
const JC_WALLET_ADDRESS = '0xf14c1dc8ce5fe65413379f76c43fa1460c31e728';
const ADMIN_WALLET = '0x2a9585Da40dE004d6Ff0f5F12cfe726BD2f98B52'; // Admin gets 40 attacks
const MAX_ATTACKS_DEFAULT = 3;
const MAX_ATTACKS_ADMIN = 40;

// Helper function to get max attacks for a user
const getMaxAttacks = (walletAddress: string | null): number => {
  if (!walletAddress) return MAX_ATTACKS_DEFAULT;
  return walletAddress.toLowerCase() === ADMIN_WALLET.toLowerCase()
    ? MAX_ATTACKS_ADMIN
    : MAX_ATTACKS_DEFAULT;
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
        this.musicGain.gain.value = 0.6;
      }
    }
    if (this.context && this.context.state === 'suspended') {
      await this.context.resume();
    }
  },
  setVolume(volume: number) {
    this.currentVolume = Math.max(0, Math.min(1, volume)); // Clamp entre 0 e 1
    if (this.musicGain) {
      this.musicGain.gain.value = this.currentVolume;
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
    if (!this.context) return;

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

    this.stopBackgroundMusic();

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

      // Cria ganho para controlar volume
      this.musicGain = this.context.createGain();
      this.musicGain.gain.value = this.currentVolume; // Usa volume configurado

      // Conecta: source -> gain -> destination
      this.backgroundSource.connect(this.musicGain);
      this.musicGain.connect(this.context.destination);

      this.backgroundSource.start(0);
      this.isPlaying = true;
    } catch (e) {
      console.log('Erro ao tocar música de fundo:', e);
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
      console.log('Erro ao tocar som de vitória:', e);
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
      console.log('Erro ao tocar som de derrota:', e);
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

const translations = {
  "pt-BR": {
    title: 'Vibe Most Wanted',
    connectWallet: 'Conectar Carteira',
    reloadNfts: 'Recarregar NFTs',
    playerWins: 'Você venceu!',
    dealerWins: 'Dealer venceu!',
    tie: 'Empate!',
    yourNfts: 'Suas Cartas',
    noNfts: 'Nenhuma carta revelada encontrada.',
    selectCards: 'Selecione 5 cartas para jogar',
    playHand: 'Jogar Mão',
    language: 'Idioma',
    loading: 'Carregando...',
    error: 'Erro',
    soundOn: 'Som Ligado',
    soundOff: 'Som Desligado',
    musicOn: 'Música Ligada',
    musicOff: 'Música Desligada',
    clearSelection: 'Limpar Seleção',
    selectStrongest: 'Selecionar Mais Fortes',
    disconnect: 'Desconectar',
    filtered: '{count} carta(s) não revelada(s) filtradas',
    sortByPower: 'Ordenar por Poder',
    sortDefault: 'Ordem Padrão',
    tutorial: 'Tutorial',
    connectTitle: 'Conecte sua carteira',
    connectDescription: 'Conecte para carregar suas cartas reveladas deste contrato e montar sua mão.',
    tutorialTitle: 'Como Jogar Vibe Most Wanted',
    howToPlay: '🎮 Regras do Jogo',
    howToPlayDesc: '1. Você precisa de NO MÍNIMO 5 CARTAS para jogar\n2. Selecione exatamente 5 cartas da sua coleção\n3. Clique em "Jogar Mão" para começar a batalha\n4. O Dealer escolhe 5 cartas aleatórias do resto da sua coleção\n5. Quem tiver o maior poder total VENCE!',
    needCards: '🛒 Precisa de Cartas?',
    needCardsDesc: 'Compre cartas no Vibe Market para começar a jogar! Mínimo necessário: 5 cartas.',
    buyCards: '💳 Comprar Cartas',
    powerCalc: '⚡ Como o Poder Funciona',
    powerCalcDesc: 'Cada carta tem um poder calculado por: Raridade × Desgaste × Foil',
    rarityBase: '• Raridade (Base)',
    rarityValues: 'Common=1 • Uncommon=8 • Rare=15 • Epic=60 • Legendary=150 • Mythic=350',
    wearMultiplier: '• Desgaste (Multiplicador)',
    wearValues: 'Pristine=×1.4 • Mint=×1.2 • Outros=×1.0',
    foilMultiplier: '• Foil (Multiplicador)',
    foilValues: '🌟 Prize Foil=×15 • ✨ Standard Foil=×2.5 • Normal=×1',
    prizeFoil: '🌟 Prize Foil: efeito holográfico + poder ×15!',
    standardFoil: '✨ Standard Foil: efeito suave + poder ×2.5',
    powerExamples: '📊 Exemplos',
    exampleCommon: '• Common normal = 1 poder',
    exampleRare: '• Rare + Standard Foil = 38 poder',
    exampleLegendary: '• Legendary + Mint = 180 poder',
    exampleMythic: '• Mythic + Prize Foil = 5250 poder! 🔥',
    victoryPrize: 'Este é o seu prêmio! 😏',
    defeatPrize: 'Este é o seu prêmio! 😅',
    buyCardsExternal: '🛒 Comprar Cartas no Vibe Market',
    understood: 'Começar a Jogar!',
    pvp: 'PvP',
    playVsAI: 'Jogar vs IA',
    playVsPlayer: 'Jogar vs Jogador',
    autoMatch: 'Busca Automática',
    createRoom: 'Criar Sala',
    joinRoom: 'Entrar na Sala',
    roomCode: 'Código da Sala',
    copyCode: 'Copiar Código',
    waitingForOpponent: 'Aguardando oponente...',
    opponentFound: 'Oponente encontrado!',
    searching: 'Procurando oponente...',
    cancelSearch: 'Cancelar Busca',
    createCustomRoom: 'Criar Sala Personalizada',
    enterRoomCode: 'Digite o código da sala',
    join: 'Entrar',
    create: 'Criar',
    cancel: 'Cancelar',
    roomCreated: 'Sala criada!',
    shareCode: 'Compartilhe este código:',
    opponent: 'Oponente',
    back: 'Voltar',
    room: 'Sala',
    ready: 'Pronto',
    confirmCards: 'Confirmar Cartas',
    choosePvpMode: 'Escolha como encontrar oponente',
    yourHand: 'Sua Mão',
    dealerCards: 'Cartas do Dealer',
    dealerTotalPower: 'Poder Total',
    totalPower: 'PODER TOTAL',
    lastResult: 'ÚLTIMO RESULTADO',
    you: 'Você',
    dealer: 'Dealer',
    retryButton: 'Tentar Novamente',
    cardBattle: 'Arena de Cartas',
    battle: 'BATALHA!',
    profile: 'Perfil',
    leaderboard: 'Ranking',
    matchHistory: 'Histórico',
    createProfile: 'Criar Perfil',
    username: 'Nome de Usuário',
    twitterHandle: 'X/Handle (opcional)',
    twitterPlaceholder: '@seu_twitter',
    usernamePlaceholder: 'Digite seu username',
    save: 'Salvar',
    edit: 'Editar',
    rank: 'Rank',
    player: 'Jogador',
    cards: 'Cartas',
    power: 'Poder',
    wins: 'Vitórias',
    losses: 'Derrotas',
    pveRecord: 'PvE',
    pvpRecord: 'PvP',
    inventory: 'Inventário',
    stats: 'Estatísticas',
    recentMatches: 'Partidas Recentes',
    noMatches: 'Nenhuma partida jogada ainda',
    victory: 'Vitória',
    defeat: 'Derrota',
    vs: 'vs',
    ai: 'IA',
    updateEvery5Min: 'Atualiza a cada 5 minutos',
    usernameRequired: 'Username é obrigatório',
    usernameInUse: 'Username já está em uso',
    profileCreated: 'Perfil criado com sucesso!',
    noProfile: 'Crie um perfil para aparecer no ranking',
    viewProfile: 'Ver Perfil',
    connectTwitter: 'Conectar X',
    shareVictory: 'Compartilhar Vitória',
    shareDefeat: 'Compartilhar Derrota',
    tweetVictory: '🏆 VITÓRIA ÉPICA no Vibe Most Wanted!\n\n⚡ Poder Total: {power}\n🎴 5 cartas dominaram a batalha\n🔥 Estou imparável!\n\nCriado por @lowprofile_eth\n🛒 Compre cartas: @vibedotmarket\n👉 Veja meu perfil:',
    tweetDefeat: '😤 Batalha INTENSA no Vibe Most Wanted!\n\n⚡ Poder usado: {power}\n💪 Lutei até o fim mas a sorte não estava do meu lado\n🎯 Quero revanche!\n\nCriado por @lowprofile_eth\n🛒 Compre cartas: @vibedotmarket\n👉 Me desafie:',
    castVictory: '🏆 VITÓRIA ÉPICA no Vibe Most Wanted!\n\n⚡ Poder Total: {power}\n🎴 5 cartas dominaram a batalha\n🔥 Estou imparável!\n\nCriado por @jvhbo\n🛒 Compre suas cartas: @vibemarket\n👉 Veja meu perfil:',
    castDefeat: '😤 Batalha INTENSA no Vibe Most Wanted!\n\n⚡ Poder usado: {power}\n💪 Lutei até o fim mas a sorte não estava do meu lado\n🎯 Quero revanche!\n\nCriado por @jvhbo\n🛒 Compre suas cartas: @vibemarket\n👉 Me desafie:',
    myInventory: 'Meu Inventário',
    viewStats: 'Ver Estatísticas',
    settings: 'Configurações',
    vibeMarketEasterEgg: '🎯 Nico, me manda um DM que te mostro como adicionar esse botão',
    // Difficulty levels
    difficulty: 'Dificuldade',
    easy: 'Fácil',
    medium: 'Médio',
    hard: 'Difícil',
    extreme: 'Extremo',
    impossible: 'Impossível',
    difficultyEasy: '🟢 Cartas aleatórias',
    difficultyMedium: '🔵 Estratégia balanceada (70% top 3)',
    difficultyHard: '🟠 Escolhe das top 7',
    difficultyExtreme: '🔴 Escolhe das top 10',
    difficultyImpossible: '🟣 EXATAMENTE as top 5 mais fortes (PODER MÁXIMO)',
    // Attack/Defense system
    battleVsAI: 'Batalhar vs IA',
    yourAttackPower: 'Seu Poder de Ataque',
    chooseYourCards: 'Escolha Suas Cartas',
    selectAttackCards: 'Selecione suas cartas de ataque',
    attackButton: '⚔️ Atacar',
    attacksRemaining: '⚔️ Ataques Restantes:',
    saveDefenseDeck: 'Salvar Deck de Defesa',
    defenseDeckSaved: '✓ Deck de Defesa Salvo!',
    defenseCard: 'Carta de Defesa',
    // AI/JC Loading
    loadingBurnedCards: 'Carregando Cartas Queimadas...',
    cardsFound: 'cartas encontradas',
    page: 'Página',
    // Leaderboard
    opened: 'Abertas',
    // Alert messages
    mustSetDefenseDeck: 'Você deve configurar seu Deck de Defesa primeiro!',
    mustSetDefenseDeckFull: 'Você deve configurar seu Deck de Defesa primeiro! Selecione 5 cartas acima e clique em "Salvar Deck de Defesa".',
    allAttacksUsed: 'Você usou todos os 3 ataques de hoje. Os ataques resetam à meia-noite UTC.',
    sortByPowerAttack: '↓ Ordenar por Poder',
    sortDefaultAttack: '⇄ Ordem Padrão'
  },
  hi: {
    title: 'Vibe Most Wanted',
    connectWallet: 'वॉलेट कनेक्ट करें',
    reloadNfts: 'NFTs रीलोड करें',
    playerWins: 'आप जीत गए!',
    dealerWins: 'डीलर जीत गया!',
    tie: 'टाई!',
    yourNfts: 'आपके कार्ड',
    noNfts: 'कोई खुले कार्ड नहीं मिले।',
    selectCards: 'खेलने के लिए 5 कार्ड चुनें',
    playHand: 'हाथ खेलें',
    language: 'भाषा',
    loading: 'लोड हो रहा है...',
    error: 'त्रुटि',
    soundOn: 'ध्वनि चालू',
    soundOff: 'ध्वनि बंद',
    musicOn: 'संगीत चालू',
    musicOff: 'संगीत बंद',
    clearSelection: 'चयन साफ़ करें',
    selectStrongest: 'सबसे मजबूत चुनें',
    disconnect: 'डिस्कनेक्ट करें',
    filtered: '{count} बंद कार्ड फ़िल्टर किए गए',
    sortByPower: 'शक्ति से क्रमबद्ध करें',
    sortDefault: 'डिफ़ॉल्ट क्रम',
    tutorial: 'ट्यूटोरियल',
    connectTitle: 'अपना वॉलेट कनेक्ट करें',
    connectDescription: 'इस अनुबंध से अपने खुले कार्ड लोड करने और अपना हाथ बनाने के लिए कनेक्ट करें।',
    tutorialTitle: 'Vibe Most Wanted कैसे खेलें',
    howToPlay: 'कैसे खेलें',
    howToPlayDesc: 'अपने 5 कार्ड चुनें और "हाथ खेलें" पर क्लिक करें। डीलर आपके शेष संग्रह से 5 यादृच्छिक कार्ड चुनता है। सबसे अधिक कुल शक्ति जीतती है।',
    powerCalc: 'शक्ति गणना',
    powerCalcDesc: 'कार्ड की शक्ति दुर्लभता, घिसावट और फ़ॉइल प्रकार पर निर्भर करती है।',
    rarityBase: 'दुर्लभता के आधार पर',
    rarityValues: 'Common=1 • Uncommon=8 • Rare=15 • Epic=60 • Legendary=150 • Mythic=350',
    wearMultiplier: 'घिसावट गुणक',
    wearValues: 'Pristine=×1.4 • Mint=×1.2 • अन्य=×1.0',
    foilMultiplier: 'फ़ॉइल गुणक',
    foilValues: '🌟 Prize=×15 • ✨ Standard=×2.5 • Normal=×1',
    formula: 'फॉर्मूला: शक्ति = आधार(दुर्लभता) × गुणक(घिसावट) × गुणक(फ़ॉइल) → गोल, न्यूनतम 1',
    foilTypes: 'फ़ॉइल प्रकार',
    foilTypesDesc: 'विशेष फ़ॉइल में उच्च गुणक होते हैं और होलोग्राफिक प्रभाव के साथ दिखाई देते हैं।',
    prizeFoil: '🌟 Prize Foil: उच्च गुणक (×15)',
    standardFoil: '✨ Standard Foil: मध्यम गुणक (×2.5)',
    powerExamples: 'त्वरित उदाहरण',
    exampleCommon: 'Common → 1',
    exampleRare: 'Rare + Standard Foil → 38',
    exampleLegendary: 'Legendary + Mint → 180',
    exampleMythic: 'Mythic + Prize Foil → 5250',
    understood: 'समझ गया',
    yourHand: 'आपका हाथ',
    dealerCards: 'डीलर के कार्ड',
    dealerTotalPower: 'कुल शक्ति',
    totalPower: 'कुल शक्ति',
    lastResult: 'अंतिम परिणाम',
    you: 'आप',
    dealer: 'डीलर',
    retryButton: 'फिर से प्रयास करें',
    cardBattle: 'कार्ड युद्ध क्षेत्र',
    battle: 'युद्ध!',
    needCards: '🛒 कार्ड चाहिए?',
    needCardsDesc: 'खेलना शुरू करने के लिए Vibe Market से कार्ड खरीदें! न्यूनतम आवश्यक: 5 कार्ड।',
    buyCards: '💳 कार्ड खरीदें',
    victoryPrize: 'यह आपका पुरस्कार है! 😏',
    defeatPrize: 'यह आपका पुरस्कार है! 😅',
    buyCardsExternal: '🛒 Vibe Market पर कार्ड खरीदें',
    pvp: 'PvP',
    playVsAI: 'AI से खेलें',
    playVsPlayer: 'खिलाड़ी से खेलें',
    autoMatch: 'ऑटो मैच',
    createRoom: 'रूम बनाएं',
    joinRoom: 'रूम में शामिल हों',
    roomCode: 'रूम कोड',
    copyCode: 'कोड कॉपी करें',
    waitingForOpponent: 'प्रतिद्वंद्वी की प्रतीक्षा...',
    opponentFound: 'प्रतिद्वंद्वी मिल गया!',
    searching: 'प्रतिद्वंद्वी खोज रहे हैं...',
    cancelSearch: 'खोज रद्द करें',
    createCustomRoom: 'कस्टम रूम बनाएं',
    enterRoomCode: 'रूम कोड दर्ज करें',
    join: 'शामिल हों',
    create: 'बनाएं',
    cancel: 'रद्द करें',
    roomCreated: 'रूम बन गया!',
    shareCode: 'यह कोड साझा करें:',
    opponent: 'प्रतिद्वंद्वी',
    back: 'वापस',
    room: 'रूम',
    ready: 'तैयार',
    confirmCards: 'कार्ड की पुष्टि करें',
    choosePvpMode: 'प्रतिद्वंद्वी खोजने का तरीका चुनें',
    profile: 'प्रोफ़ाइल',
    leaderboard: 'लीडरबोर्ड',
    matchHistory: 'मैच इतिहास',
    createProfile: 'प्रोफ़ाइल बनाएं',
    username: 'उपयोगकर्ता नाम',
    twitterHandle: 'X/Handle (वैकल्पिक)',
    twitterPlaceholder: '@आपका_twitter',
    usernamePlaceholder: 'अपना username दर्ज करें',
    save: 'सहेजें',
    edit: 'संपादित करें',
    rank: 'रैंक',
    player: 'खिलाड़ी',
    cards: 'कार्ड',
    power: 'शक्ति',
    wins: 'जीत',
    losses: 'हार',
    pveRecord: 'PvE',
    pvpRecord: 'PvP',
    inventory: 'सूची',
    stats: 'आंकड़े',
    recentMatches: 'हाल के मैच',
    noMatches: 'अभी तक कोई मैच नहीं खेला गया',
    victory: 'जीत',
    defeat: 'हार',
    vs: 'vs',
    ai: 'AI',
    updateEvery5Min: 'हर 5 मिनट में अपडेट होता है',
    usernameRequired: 'Username आवश्यक है',
    usernameInUse: 'Username पहले से उपयोग में है',
    profileCreated: 'प्रोफ़ाइल सफलतापूर्वक बनाई गई!',
    noProfile: 'रैंकिंग में दिखने के लिए प्रोफ़ाइल बनाएं',
    viewProfile: 'प्रोफ़ाइल देखें',
    shareVictory: 'जीत साझा करें',
    shareDefeat: 'हार साझा करें',
    tweetVictory: '🏆 Vibe Most Wanted में शानदार जीत!\n\n⚡ कुल शक्ति: {power}\n🎴 5 कार्डों ने युद्ध जीता\n🔥 मैं अजेय हूँ!\n\nद्वारा बनाया गया @lowprofile_eth\n🛒 कार्ड खरीदें: @vibedotmarket\n👉 मेरी पूरी प्रोफ़ाइल देखें:',
    tweetDefeat: '😤 Vibe Most Wanted में तीव्र युद्ध!\n\n⚡ उपयोग की गई शक्ति: {power}\n💪 अंत तक लड़ा लेकिन किस्मत साथ नहीं थी\n🎯 मैं बदला चाहता हूँ!\n\nद्वारा बनाया गया @lowprofile_eth\n🛒 कार्ड खरीदें: @vibedotmarket\n👉 मुझे चुनौती दें:',
    castVictory: '🏆 Vibe Most Wanted में शानदार जीत!\n\n⚡ कुल शक्ति: {power}\n🎴 5 कार्डों ने युद्ध जीता\n🔥 मैं अजेय हूँ!\n\n@jvhbo द्वारा बनाया गया\n🛒 अपने कार्ड खरीदें: @vibemarket\n👉 मेरी प्रोफ़ाइल:',
    castDefeat: '😤 Vibe Most Wanted में तीव्र युद्ध!\n\n⚡ उपयोग की गई शक्ति: {power}\n💪 अंत तक लड़ा लेकिन किस्मत साथ नहीं थी\n🎯 मैं बदला चाहता हूँ!\n\n@jvhbo द्वारा बनाया गया\n🛒 अपने कार्ड खरीदें: @vibemarket\n👉 मुझे चुनौती दें:',
    myInventory: 'मेरी सूची',
    viewStats: 'आंकड़े देखें',
    settings: 'सेटिंग्स',
    vibeMarketEasterEgg: '🎯 Nico, DM me and I will show you how to add this button',
    // Difficulty levels
    difficulty: 'कठिनाई',
    easy: 'आसान',
    medium: 'मध्यम',
    hard: 'कठिन',
    extreme: 'अत्यधिक',
    impossible: 'असंभव',
    difficultyEasy: '🟢 यादृच्छिक कार्ड',
    difficultyMedium: '🔵 संतुलित रणनीति (70% top 3)',
    difficultyHard: '🟠 शीर्ष 7 से चुनता है',
    difficultyExtreme: '🔴 शीर्ष 10 से चुनता है',
    difficultyImpossible: '🟣 बिल्कुल शीर्ष 5 सबसे मजबूत (अधिकतम शक्ति)',
    // Attack/Defense system
    battleVsAI: 'AI से लड़ाई',
    yourAttackPower: 'आपकी आक्रमण शक्ति',
    chooseYourCards: 'अपने कार्ड चुनें',
    selectAttackCards: 'अपने हमले के कार्ड चुनें',
    attackButton: '⚔️ हमला',
    attacksRemaining: '⚔️ शेष हमले:',
    saveDefenseDeck: 'रक्षा डेक सहेजें',
    defenseDeckSaved: '✓ रक्षा डेक सहेजा गया!',
    defenseCard: 'रक्षा कार्ड',
    // AI/JC Loading
    loadingBurnedCards: 'जले हुए कार्ड लोड हो रहे हैं...',
    cardsFound: 'कार्ड मिले',
    page: 'पृष्ठ',
    // Leaderboard
    opened: 'खोले गए',
    // Alert messages
    mustSetDefenseDeck: 'आपको पहले अपना रक्षा डेक सेट करना होगा!',
    mustSetDefenseDeckFull: 'आपको पहले अपना रक्षा डेक सेट करना होगा! ऊपर 5 कार्ड चुनें और "रक्षा डेक सहेजें" पर क्लिक करें।',
    allAttacksUsed: 'आपने आज के सभी 3 हमले उपयोग कर लिए हैं। हमले मध्यरात्रि UTC पर रीसेट होते हैं।',
    sortByPowerAttack: '↓ शक्ति से क्रमबद्ध करें',
    sortDefaultAttack: '⇄ डिफ़ॉल्ट क्रम'
  },
  en: {
    title: 'Vibe Most Wanted',
    connectWallet: 'Connect Wallet',
    reloadNfts: 'Reload NFTs',
    playerWins: 'You Win!',
    dealerWins: 'Dealer Wins!',
    tie: 'Tie!',
    yourNfts: 'Your Cards',
    noNfts: 'No revealed cards found.',
    selectCards: 'Select 5 cards to play',
    playHand: 'Play Hand',
    language: 'Language',
    loading: 'Loading...',
    error: 'Error',
    soundOn: 'Sound On',
    soundOff: 'Sound Off',
    musicOn: 'Music On',
    musicOff: 'Music Off',
    clearSelection: 'Clear Selection',
    selectStrongest: 'Select Strongest',
    disconnect: 'Disconnect',
    filtered: '{count} unopened card(s) filtered',
    sortByPower: 'Sort by Power',
    sortDefault: 'Default Order',
    tutorial: 'Tutorial',
    connectTitle: 'Connect your wallet',
    connectDescription: 'Connect to load your revealed cards from this contract and build your hand.',
    tutorialTitle: 'How to Play Vibe Most Wanted',
    howToPlay: 'Game Rules',
    howToPlayDesc: '1. You need AT LEAST 5 CARDS to play\n2. Select exactly 5 cards to build your hand\n3. Click "Play Hand" to enter the battle arena\n4. The dealer will randomly draw 5 cards from your remaining collection\n5. Highest total power WINS! May the best hand prevail!',
    needCards: 'Need Cards?',
    needCardsDesc: 'Start your journey in the arena! Buy cards on Vibe Market to build your ultimate deck. Minimum 5 cards required to play.',
    buyCards: 'Buy Cards on Vibe Market',
    powerCalc: 'How Power Works',
    powerCalcDesc: 'Every card has a power level calculated by multiplying three attributes: Rarity × Wear × Foil',
    rarityBase: '• Rarity (Base Power)',
    rarityValues: 'Common=1 • Uncommon=8 • Rare=15 • Epic=60 • Legendary=150 • Mythic=350',
    wearMultiplier: '• Wear Condition (Multiplier)',
    wearValues: 'Pristine=×1.4 • Mint=×1.2 • Normal & Others=×1.0',
    foilMultiplier: '• Foil Type (Multiplier)',
    foilValues: '🌟 Prize Foil=×15 • ✨ Standard Foil=×2.5 • Normal=×1',
    prizeFoil: 'Prize Foil: Ultra-rare holographic effect with ×15 power boost!',
    standardFoil: 'Standard Foil: Shiny finish with ×2.5 power boost',
    powerExamples: 'Power Examples',
    exampleCommon: 'Common (normal) = 1 × 1 × 1 = 1 power',
    exampleRare: 'Rare + Standard Foil = 15 × 1 × 2.5 = 38 power',
    exampleLegendary: 'Legendary + Mint = 150 × 1.2 × 1 = 180 power',
    exampleMythic: 'Mythic + Prize Foil = 350 × 1 × 15 = 5,250 power! 🔥',
    victoryPrize: 'This is your prize! 😏',
    defeatPrize: 'This is your prize! 😅',
    buyCardsExternal: '🛒 Buy Cards on Vibe Market',
    understood: 'Start Playing!',
    pvp: 'PvP',
    playVsAI: 'Play vs AI',
    playVsPlayer: 'Play vs Player',
    autoMatch: 'Auto Match',
    createRoom: 'Create Room',
    joinRoom: 'Join Room',
    roomCode: 'Room Code',
    copyCode: 'Copy Code',
    waitingForOpponent: 'Waiting for opponent...',
    opponentFound: 'Opponent found!',
    searching: 'Searching for opponent...',
    cancelSearch: 'Cancel Search',
    createCustomRoom: 'Create Custom Room',
    enterRoomCode: 'Enter room code',
    join: 'Join',
    create: 'Create',
    cancel: 'Cancel',
    roomCreated: 'Room created!',
    shareCode: 'Share this code:',
    opponent: 'Opponent',
    back: 'Back',
    room: 'Room',
    ready: 'Ready',
    confirmCards: 'Confirm Cards',
    choosePvpMode: 'Choose how to find opponent',
    yourHand: 'Your Hand',
    dealerCards: 'Dealer Cards',
    dealerTotalPower: 'Total Power',
    totalPower: 'TOTAL POWER',
    lastResult: 'LAST RESULT',
    you: 'You',
    dealer: 'Dealer',
    retryButton: 'Try Again',
    cardBattle: 'Card Battle Arena',
    battle: 'BATTLE!',
    profile: 'Profile',
    leaderboard: 'Leaderboard',
    matchHistory: 'Match History',
    createProfile: 'Create Profile',
    username: 'Username',
    twitterHandle: 'X/Handle (optional)',
    twitterPlaceholder: '@your_handle',
    usernamePlaceholder: 'Enter your username',
    save: 'Save',
    edit: 'Edit',
    rank: 'Rank',
    player: 'Player',
    cards: 'Cards',
    power: 'Power',
    wins: 'Wins',
    losses: 'Losses',
    pveRecord: 'PvE',
    pvpRecord: 'PvP',
    inventory: 'Inventory',
    stats: 'Statistics',
    recentMatches: 'Recent Matches',
    noMatches: 'No matches played yet',
    victory: 'Victory',
    defeat: 'Defeat',
    vs: 'vs',
    ai: 'AI',
    updateEvery5Min: 'Updates every 5 minutes',
    usernameRequired: 'Username is required',
    usernameInUse: 'Username is already in use',
    profileCreated: 'Profile created successfully!',
    noProfile: 'Create a profile to appear in the ranking',
    viewProfile: 'View Profile',
    shareVictory: 'Share Victory',
    shareDefeat: 'Share Battle',
    tweetVictory: '🏆 EPIC VICTORY in Vibe Most Wanted!\n\n⚡ Total Power: {power}\n🎴 5 cards dominated the battle\n🔥 I am unstoppable!\n\nCreated by @lowprofile_eth\n🛒 Buy cards: @vibedotmarket\n👉 Check my profile:',
    tweetDefeat: '😤 INTENSE BATTLE in Vibe Most Wanted!\n\n⚡ Power used: {power}\n💪 Fought till the end but luck was not on my side\n🎯 I want a rematch!\n\nCreated by @lowprofile_eth\n🛒 Buy cards: @vibedotmarket\n👉 Challenge me:',
    castVictory: '🏆 EPIC VICTORY in Vibe Most Wanted!\n\n⚡ Total Power: {power}\n🎴 5 cards dominated the battle\n🔥 I am unstoppable!\n\nCreated by @jvhbo\n🛒 Buy your cards: @vibemarket\n👉 Check my profile:',
    castDefeat: '😤 INTENSE BATTLE in Vibe Most Wanted!\n\n⚡ Power used: {power}\n💪 Fought till the end but luck was not on my side\n🎯 I want a rematch!\n\nCreated by @jvhbo\n🛒 Buy your cards: @vibemarket\n👉 Challenge me:',
    myInventory: 'My Inventory',
    viewStats: 'View Stats',
    settings: 'Settings',
    vibeMarketEasterEgg: '🎯 Nico, DM me and I will show you how to add this button',
    // Difficulty levels
    difficulty: 'Difficulty',
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    extreme: 'Extreme',
    impossible: 'Impossible',
    difficultyEasy: '🟢 Random cards',
    difficultyMedium: '🔵 Balanced strategy (70% top 3)',
    difficultyHard: '🟠 Picks from top 7',
    difficultyExtreme: '🔴 Picks from top 10',
    difficultyImpossible: '🟣 EXACTLY top 5 strongest (MAX POWER)',
    // Attack/Defense system
    battleVsAI: 'Battle vs AI',
    yourAttackPower: 'Your Attack Power',
    chooseYourCards: 'Choose Your Cards',
    selectAttackCards: 'Select your attack cards',
    attackButton: '⚔️ Attack',
    attacksRemaining: '⚔️ Attacks Remaining:',
    saveDefenseDeck: 'Save Defense Deck',
    defenseDeckSaved: '✓ Defense Deck Saved!',
    defenseCard: 'Defense Card',
    // AI/JC Loading
    loadingBurnedCards: 'Loading Burned Cards...',
    cardsFound: 'cards found',
    page: 'Page',
    // Leaderboard
    opened: 'Opened',
    // Alert messages
    mustSetDefenseDeck: 'You must set your Defense Deck first!',
    mustSetDefenseDeckFull: 'You must set your Defense Deck first! Select 5 cards above and click "Save Defense Deck".',
    allAttacksUsed: 'You have used all 3 attacks for today. Attacks reset at midnight UTC.',
    sortByPowerAttack: '↓ Sort by Power',
    sortDefaultAttack: '⇄ Default Order'
  },
  es: {
    title: 'Vibe Most Wanted',
    connectWallet: 'Conectar Billetera',
    reloadNfts: 'Recargar NFTs',
    playerWins: '¡Ganaste!',
    dealerWins: '¡Dealer Gana!',
    tie: '¡Empate!',
    yourNfts: 'Tus Cartas',
    noNfts: 'No se encontraron cartas reveladas.',
    selectCards: 'Selecciona 5 cartas para jugar',
    playHand: 'Jugar Mano',
    language: 'Idioma',
    loading: 'Cargando...',
    error: 'Error',
    soundOn: 'Sonido Activado',
    soundOff: 'Sonido Desactivado',
    musicOn: 'Música Activada',
    musicOff: 'Música Desactivada',
    clearSelection: 'Limpiar Selección',
    selectStrongest: 'Seleccionar Más Fuertes',
    disconnect: 'Desconectar',
    filtered: '{count} carta(s) sin abrir filtradas',
    sortByPower: 'Ordenar por Poder',
    sortDefault: 'Orden Predeterminado',
    tutorial: 'Tutorial',
    connectTitle: 'Conecta tu billetera',
    connectDescription: 'Conéctate para cargar tus cartas reveladas de este contrato y armar tu mano.',
    tutorialTitle: 'Cómo Jugar Vibe Most Wanted',
    howToPlay: 'Cómo jugar',
    howToPlayDesc: 'Elige exactamente 5 cartas y haz clic en "Jugar Mano". El Dealer toma 5 cartas aleatorias del resto de tu colección. Gana el mayor poder total.',
    powerCalc: 'Cálculo de Poder',
    powerCalcDesc: 'El poder depende de rareza, desgaste y tipo de foil.',
    rarityBase: 'Base por rareza',
    rarityValues: 'Common=1 • Uncommon=8 • Rare=15 • Epic=60 • Legendary=150 • Mythic=350',
    wearMultiplier: 'Multiplicador por desgaste',
    wearValues: 'Pristine=×1.4 • Mint=×1.2 • Otros=×1.0',
    foilMultiplier: 'Multiplicador por foil',
    foilValues: '🌟 Prize=×15 • ✨ Standard=×2.5 • Normal=×1',
    formula: 'Fórmula: poder = base(rareza) × mult(desgaste) × mult(foil) → redondeado, mín 1',
    foilTypes: 'Tipos de foil',
    foilTypesDesc: 'Los foils especiales tienen multiplicadores mayores y aparecen con efecto holográfico.',
    prizeFoil: '🌟 Prize Foil: multiplicador alto (×15)',
    standardFoil: '✨ Standard Foil: multiplicador medio (×2.5)',
    powerExamples: 'Ejemplos rápidos',
    exampleCommon: 'Common → 1',
    exampleRare: 'Rare + Standard Foil → 38',
    exampleLegendary: 'Legendary + Mint → 180',
    exampleMythic: 'Mythic + Prize Foil → 5250',
    understood: 'Entendido',
    yourHand: 'Tu Mano',
    dealerCards: 'Cartas del Dealer',
    dealerTotalPower: 'Poder Total',
    totalPower: 'PODER TOTAL',
    lastResult: 'ÚLTIMO RESULTADO',
    you: 'Tú',
    dealer: 'Dealer',
    retryButton: 'Intentar de Nuevo',
    cardBattle: 'Arena de Cartas',
    battle: '¡BATALLA!',
    needCards: '🛒 ¿Necesitas Cartas?',
    needCardsDesc: '¡Compra cartas en Vibe Market para empezar a jugar! Mínimo requerido: 5 cartas.',
    buyCards: '💳 Comprar Cartas',
    victoryPrize: '¡Este es tu premio! 😏',
    defeatPrize: '¡Este es tu premio! 😅',
    buyCardsExternal: '🛒 Comprar Cartas en Vibe Market',
    pvp: 'PvP',
    playVsAI: 'Jugar vs IA',
    playVsPlayer: 'Jugar vs Jugador',
    autoMatch: 'Búsqueda Automática',
    createRoom: 'Crear Sala',
    joinRoom: 'Unirse a Sala',
    roomCode: 'Código de Sala',
    copyCode: 'Copiar Código',
    waitingForOpponent: 'Esperando oponente...',
    opponentFound: '¡Oponente encontrado!',
    searching: 'Buscando oponente...',
    cancelSearch: 'Cancelar Búsqueda',
    createCustomRoom: 'Crear Sala Personalizada',
    enterRoomCode: 'Ingresa código de sala',
    join: 'Unirse',
    create: 'Crear',
    cancel: 'Cancelar',
    roomCreated: '¡Sala creada!',
    shareCode: 'Comparte este código:',
    opponent: 'Oponente',
    back: 'Volver',
    room: 'Sala',
    ready: 'Listo',
    confirmCards: 'Confirmar Cartas',
    choosePvpMode: 'Elige cómo encontrar oponente',
    profile: 'Perfil',
    leaderboard: 'Clasificación',
    matchHistory: 'Historial',
    createProfile: 'Crear Perfil',
    username: 'Nombre de Usuario',
    twitterHandle: 'X/Handle (opcional)',
    twitterPlaceholder: '@tu_handle',
    usernamePlaceholder: 'Ingresa tu username',
    save: 'Guardar',
    edit: 'Editar',
    rank: 'Rango',
    player: 'Jugador',
    cards: 'Cartas',
    power: 'Poder',
    wins: 'Victorias',
    losses: 'Derrotas',
    pveRecord: 'PvE',
    pvpRecord: 'PvP',
    inventory: 'Inventario',
    stats: 'Estadísticas',
    recentMatches: 'Partidas Recientes',
    noMatches: 'No has jugado ninguna partida aún',
    victory: 'Victoria',
    defeat: 'Derrota',
    vs: 'vs',
    ai: 'IA',
    updateEvery5Min: 'Se actualiza cada 5 minutos',
    usernameRequired: 'El username es obligatorio',
    usernameInUse: 'El username ya está en uso',
    profileCreated: '¡Perfil creado exitosamente!',
    noProfile: 'Crea un perfil para aparecer en la clasificación',
    viewProfile: 'Ver Perfil',
    shareVictory: 'Compartir Victoria',
    shareDefeat: 'Compartir Batalla',
    tweetVictory: '🏆 ¡VICTORIA ÉPICA en Vibe Most Wanted!\n\n⚡ Poder Total: {power}\n🎴 5 cartas dominaron la batalla\n🔥 ¡Soy imparable!\n\nCreado por @lowprofile_eth\n🛒 Compra cartas: @vibedotmarket\n👉 Mira mi perfil:',
    tweetDefeat: '😤 ¡Batalla INTENSA en Vibe Most Wanted!\n\n⚡ Poder usado: {power}\n💪 Luché hasta el final pero la suerte no estaba de mi lado\n🎯 ¡Quiero revancha!\n\nCreado por @lowprofile_eth\n🛒 Compra cartas: @vibedotmarket\n👉 Desafíame:',
    castVictory: '🏆 ¡VICTORIA ÉPICA en Vibe Most Wanted!\n\n⚡ Poder Total: {power}\n🎴 5 cartas dominaron la batalla\n🔥 ¡Soy imparable!\n\nCreado por @jvhbo\n🛒 Compra tus cartas: @vibemarket\n👉 Mira mi perfil:',
    castDefeat: '😤 ¡Batalla INTENSA en Vibe Most Wanted!\n\n⚡ Poder usado: {power}\n💪 Luché hasta el final pero la suerte no estaba de mi lado\n🎯 ¡Quiero revancha!\n\nCreado por @jvhbo\n🛒 Compra tus cartas: @vibemarket\n👉 Desafíame:',
    myInventory: 'Mi Inventario',
    viewStats: 'Ver Estadísticas',
    settings: 'Configuración',
    vibeMarketEasterEgg: '🎯 Nico, envíame un DM y te mostraré cómo agregar este botón',
    // Difficulty levels
    difficulty: 'Dificultad',
    easy: 'Fácil',
    medium: 'Medio',
    hard: 'Difícil',
    extreme: 'Extremo',
    impossible: 'Imposible',
    difficultyEasy: '🟢 Cartas aleatorias',
    difficultyMedium: '🔵 Estrategia balanceada (70% top 3)',
    difficultyHard: '🟠 Elige de las top 7',
    difficultyExtreme: '🔴 Elige de las top 10',
    difficultyImpossible: '🟣 EXACTAMENTE las top 5 más fuertes (PODER MÁXIMO)',
    // Attack/Defense system
    battleVsAI: 'Batalla vs IA',
    yourAttackPower: 'Tu Poder de Ataque',
    chooseYourCards: 'Elige Tus Cartas',
    selectAttackCards: 'Selecciona tus cartas de ataque',
    attackButton: '⚔️ Atacar',
    attacksRemaining: '⚔️ Ataques Restantes:',
    saveDefenseDeck: 'Guardar Mazo de Defensa',
    defenseDeckSaved: '✓ ¡Mazo de Defensa Guardado!',
    defenseCard: 'Carta de Defensa',
    // AI/JC Loading
    loadingBurnedCards: 'Cargando Cartas Quemadas...',
    cardsFound: 'cartas encontradas',
    page: 'Página',
    // Leaderboard
    opened: 'Abiertas',
    // Alert messages
    mustSetDefenseDeck: '¡Debes configurar tu Mazo de Defensa primero!',
    mustSetDefenseDeckFull: '¡Debes configurar tu Mazo de Defensa primero! Selecciona 5 cartas arriba y haz clic en "Guardar Mazo de Defensa".',
    allAttacksUsed: 'Has usado todos los 3 ataques de hoy. Los ataques se reinician a medianoche UTC.',
    sortByPowerAttack: '↓ Ordenar por Poder',
    sortDefaultAttack: '⇄ Orden Predeterminado'
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
  let base = 1;
  const r = rarity.toLowerCase();
  if (r.includes('mythic')) base = 350;
  else if (r.includes('legend')) base = 150;
  else if (r.includes('epic')) base = 60;
  else if (r.includes('rare')) base = 15;
  else if (r.includes('uncommon')) base = 8;
  else base = 1;
  let wearMult = 1.0;
  const w = wear.toLowerCase();
  if (w.includes('pristine')) wearMult = 1.4;
  else if (w.includes('mint')) wearMult = 1.2;
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
  let revealedNfts: any[] = [];
  let pageKey: string | undefined = undefined;
  let pageCount = 0;
  const maxPages = 70; // Get all pages to fetch all ~859 opened cards
  const targetRevealed = 900; // Target all opened cards (~859 total)

  do {
    pageCount++;
    console.log(`   Fetching page ${pageCount}... (${revealedNfts.length} revealed so far)`);
    const url: string = `https://${CHAIN}.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTsForOwner?owner=${owner}&contractAddresses[]=${contract}&withMetadata=true&pageSize=100${pageKey ? `&pageKey=${pageKey}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API falhou: ${res.status}`);
    const json = await res.json();

    // Filter unopened cards immediately to save memory
    const pageNfts = json.ownedNfts || [];
    const revealed = pageNfts.filter((nft: any) => {
      const attrs = nft?.raw?.metadata?.attributes || nft?.metadata?.attributes || [];
      const rarityAttr = attrs.find((a: any) => a.trait_type?.toLowerCase() === 'rarity');
      const rarity = rarityAttr?.value || '';
      return rarity.toLowerCase() !== 'unopened';
    });

    revealedNfts = revealedNfts.concat(revealed);
    console.log(`   → Found ${revealed.length} revealed cards on this page`);

    // Report progress
    if (onProgress) {
      onProgress(pageCount, revealedNfts.length);
    }

    pageKey = json.pageKey;

    // Stop if we have enough revealed cards
    if (revealedNfts.length >= targetRevealed) {
      console.log(`   ✅ Reached ${revealedNfts.length} revealed cards, stopping early`);
      break;
    }
  } while (pageKey && pageCount < maxPages);

  console.log(`   📊 Total: ${revealedNfts.length} revealed cards from ${pageCount} pages`);
  return revealedNfts;
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
    if (r.includes('mythic')) return 'ring-vintage-gold shadow-gold-lg';
    if (r.includes('epic')) return 'ring-vintage-silver shadow-neon';
    if (r.includes('rare')) return 'ring-vintage-burnt-gold shadow-gold';
    return 'ring-vintage-charcoal shadow-lg';
  };

  const getFoilEffect = (foil: string) => {
    const f = (foil || '').toLowerCase();
    if (f.includes('prize')) return 'prize-foil';
    if (f.includes('standard')) return 'standard-foil';
    return '';
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
  const foilEffect = getFoilEffect(foilValue);
  const isPrizeFoil = foilValue.toLowerCase().includes('prize');

  // Debug Prize Foil
  if (foilValue && foilValue.toLowerCase().includes('prize')) {
    console.log(`🌟 Prize Foil Card #${nft.tokenId}:`, {
      foilValue,
      foilEffect,
      isPrizeFoil,
      hasEffect: !!foilEffect
    });
  }

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

        @keyframes goldGlow {
          0%, 100% {
            box-shadow: 0 0 15px rgba(255, 215, 0, 0.5), 0 0 30px rgba(255, 215, 0, 0.3);
            filter: brightness(1);
          }
          50% {
            box-shadow: 0 0 25px rgba(255, 215, 0, 0.8), 0 0 50px rgba(255, 215, 0, 0.5);
            filter: brightness(1.1);
          }
        }

        .legendary-card {
          animation: goldGlow 2s ease-in-out infinite;
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

        .card-reflection {
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.3), transparent);
          pointer-events: none;
          opacity: 0;
        }

        .group:hover .card-reflection {
          animation: cardReflection 1.5s ease-in-out;
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

        .prize-foil {
          background:
            linear-gradient(
              90deg,
              transparent 0%,
              rgba(255, 255, 255, 0.4) 45%,
              rgba(255, 255, 255, 0.6) 50%,
              rgba(255, 255, 255, 0.4) 55%,
              transparent 100%
            ),
            linear-gradient(
              45deg,
              #ff0080 0%,
              #ff3366 8%,
              #ff8c00 16%,
              #ffb84d 24%,
              #ffd700 32%,
              #80ff00 40%,
              #00ff80 48%,
              #00ffff 56%,
              #0080ff 64%,
              #4d4dff 72%,
              #8000ff 80%,
              #cc00ff 88%,
              #ff00ff 96%,
              #ff0080 100%
            );
          background-size: 300% 100%, 600% 600%;
          animation: holographic 8s ease-in-out infinite, rainbowShine 6s ease-in-out infinite;
          mix-blend-mode: overlay;
          pointer-events: none;
          opacity: 0.7;
        }
        
        .standard-foil {
          background: linear-gradient(
            135deg,
            rgba(150, 220, 255, 0.7) 0%,
            rgba(220, 150, 255, 0.7) 25%,
            rgba(150, 255, 220, 0.7) 50%,
            rgba(255, 200, 150, 0.7) 75%,
            rgba(150, 220, 255, 0.7) 100%
          );
          background-size: 400% 400%;
          animation: holographic 4s ease-in-out infinite;
          mix-blend-mode: overlay;
          pointer-events: none;
          opacity: 0.8;
          filter: brightness(1.2) saturate(1.3);
        }
        
        .prize-card-ring {
          animation: prizeGlow 2s ease-in-out infinite;
        }
      `}</style>
      
      <div className={`relative group transition-all duration-300 ${selected ? 'scale-95' : 'hover:scale-105'} cursor-pointer`} onClick={handleClick} style={{filter: 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.6))'}}>
        <div className={`relative overflow-hidden rounded-xl ${
          selected ? `ring-4 ${getRarityRing(nft.rarity || '')} shadow-xl` :
          'ring-2 ring-vintage-deep-black/50 hover:ring-vintage-gold/50'
        } ${(nft.rarity || '').toLowerCase().includes('legend') || (nft.rarity || '').toLowerCase().includes('mythic') ? 'legendary-card' : ''}`} style={{boxShadow: 'inset 0 0 10px rgba(255, 215, 0, 0.1)'}}>
          <img src={currentSrc} alt={`#${tid}`} className="w-full aspect-[2/3] object-cover bg-vintage-deep-black pointer-events-none" loading="lazy" onError={() => { if (imgError < fallbacks.length - 1) setImgError(imgError + 1); }} />

          {/* Card Reflection on Hover */}
          <div className="card-reflection"></div>

          {foilEffect && (
            <div className={`absolute inset-0 ${foilEffect}`}></div>
          )}

          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <a href={`https://opensea.io/assets/base/${CONTRACT_ADDRESS}/${tid}`} target="_blank" rel="noopener noreferrer" className="bg-vintage-neon-blue hover:bg-blue-500 text-white text-xs px-2 py-1 rounded-lg shadow-lg font-bold" onClick={(e) => e.stopPropagation()}>OS</a>
          </div>
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
      </div>
    </>
  );
});

export default function TCGPage() {
  const [lang, setLang] = useState<string>('en');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [musicEnabled, setMusicEnabled] = useState<boolean>(true);
  const [musicVolume, setMusicVolume] = useState<number>(0.1); // Volume padrão 10%
  const [showTutorial, setShowTutorial] = useState<boolean>(false);
  const [sortByPower, setSortByPower] = useState<boolean>(false);
  const [sortAttackByPower, setSortAttackByPower] = useState<boolean>(false);
  const [address, setAddress] = useState<string | null>(null);
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

  // AI Difficulty (only 3 levels now)
  const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  // Profile States
  const [currentView, setCurrentView] = useState<'game' | 'profile' | 'leaderboard'>('game');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showCreateProfile, setShowCreateProfile] = useState<boolean>(false);
  const [profileUsername, setProfileUsername] = useState<string>('');
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
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

  const t = useCallback((key: string, params: Record<string, any> = {}) => {
    let text = (translations as any)[lang][key] || key;
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, String(v));
    });
    return text;
  }, [lang]);

  // Carregar estado da música do localStorage na montagem
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMusicEnabled = localStorage.getItem('musicEnabled');
      const savedMusicVolume = localStorage.getItem('musicVolume');

      if (savedMusicEnabled !== null) {
        setMusicEnabled(savedMusicEnabled === 'true');
      }
      if (savedMusicVolume !== null) {
        setMusicVolume(parseFloat(savedMusicVolume));
      }
    }
  }, []);

  // Salvar estado da música no localStorage e controlar reprodução
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('musicEnabled', musicEnabled.toString());

      if (musicEnabled) {
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
        console.log('✅ Twitter connected via popup:', event.data.username);
        if (address) {
          // Reload profile from Firebase to get the updated Twitter handle
          ProfileService.getProfile(address).then((profile) => {
            if (profile) {
              setUserProfile(profile);
              console.log('✅ Profile reloaded with Twitter:', profile.twitter);
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

  const toggleMusic = useCallback(async () => {
    await AudioManager.init();
    if (soundEnabled) {
      if (!musicEnabled) AudioManager.toggleOn();
      else AudioManager.toggleOff();
    }
    setMusicEnabled(!musicEnabled);
  }, [musicEnabled, soundEnabled]);

  const connectWallet = useCallback(async () => {
    if (soundEnabled) AudioManager.buttonSuccess();
    try {
      // Tenta usar Farcaster SDK primeiro (para mini apps)
      if (sdk && typeof sdk.wallet !== 'undefined') {
        try {
          const farcasterAddress = await sdk.wallet.ethProvider.request({
            method: "eth_requestAccounts"
          });
          if (farcasterAddress && farcasterAddress[0]) {
            setAddress(farcasterAddress[0]);
            localStorage.setItem('connectedAddress', farcasterAddress[0].toLowerCase());
            if (soundEnabled) AudioManager.buttonSuccess();
            console.log('✅ Conectado via Farcaster SDK:', farcasterAddress[0]);
            return;
          }
        } catch (farcasterError) {
          console.log('⚠️ Farcaster wallet não disponível, tentando MetaMask...');
        }
      }

      // Fallback para MetaMask (para uso fora do Farcaster)
      const eth = (window as any).ethereum;
      if (!eth) {
        if (soundEnabled) AudioManager.buttonError();
        alert("Install MetaMask or open in Farcaster app!");
        return;
      }
      const accounts = await eth.request({ method: "eth_requestAccounts" });
      if (accounts[0]) {
        setAddress(accounts[0]);
        localStorage.setItem('connectedAddress', accounts[0].toLowerCase());
        if (soundEnabled) AudioManager.buttonSuccess();
        console.log('✅ Conectado via MetaMask:', accounts[0]);
      }
    } catch (e: any) {
      if (soundEnabled) AudioManager.buttonError();
      setErrorMsg("Failed: " + e.message);
    }
  }, [soundEnabled]);

  const disconnectWallet = useCallback(() => {
    if (soundEnabled) AudioManager.buttonNav();
    setAddress(null);
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
  }, [soundEnabled]);

  const loadNFTs = useCallback(async () => {
    if (!address) return;
    try {
      setStatus("fetching");
      setErrorMsg(null);
      const raw = await fetchNFTs(address);

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

      const revealed = enrichedRaw.filter((n) => !isUnrevealed(n));
      const filtered = enrichedRaw.length - revealed.length;
      setFilteredCount(filtered);

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
    } catch (e: any) {
      setStatus("failed");
      setErrorMsg(e.message);
    }
  }, [address]);

  useEffect(() => {
    if (address) loadNFTs();
  }, [address, loadNFTs]);

  const loadJCNFTs = useCallback(async () => {
    try {
      // Check cache first (expires after 30 days for long-term storage)
      const cacheKey = 'jc_deck_cache_v3';
      const cacheTimeKey = 'jc_deck_cache_time_v3';
      const cached = localStorage.getItem(cacheKey);
      const cacheTime = localStorage.getItem(cacheTimeKey);
      const thirtyDays = 30 * 24 * 60 * 60 * 1000; // 30 days cache

      if (cached && cacheTime && (Date.now() - parseInt(cacheTime)) < thirtyDays) {
        console.log('⚡ Loading JC deck from cache!');
        const cachedData = JSON.parse(cached);
        setJcNfts(cachedData);
        setJcNftsLoading(false);
        console.log('✅ JC NFTs loaded from cache:', cachedData.length, 'cards');
        return;
      }

      console.log('⚡ Loading JC NFTs from wallet:', JC_WALLET_ADDRESS);
      console.log('   Using JC contract:', JC_CONTRACT_ADDRESS);
      const revealed = await fetchNFTs(JC_WALLET_ADDRESS, JC_CONTRACT_ADDRESS, (page, cards) => {
        setJcLoadingProgress({ page, cards });
      });
      console.log(`📦 Fetched ${revealed.length} revealed NFTs, processing...`);

      // Extract images directly from Alchemy response
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

      console.log(`⚡ Processed ${processed.length} cards with images`);
      setJcNfts(processed);
      setJcNftsLoading(false);
      setJcLoadingProgress(null);

      // Save to cache (30 days)
      try {
        localStorage.setItem(cacheKey, JSON.stringify(processed));
        localStorage.setItem(cacheTimeKey, Date.now().toString());
        console.log('💾 JC deck saved to cache (expires in 30 days)');
      } catch (e) {
        console.log('⚠️  Failed to cache JC deck:', e);
      }

      console.log('✅ JC NFTs loaded:', processed.length, 'cards');
    } catch (e: any) {
      console.error('❌ Error loading JC NFTs:', e);
      setJcNftsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJCNFTs();
  }, [loadJCNFTs]);

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

  const playHand = useCallback(() => {
    if (selectedCards.length !== HAND_SIZE_CONST || isBattling) return;
    setIsBattling(true);
    setShowBattleScreen(true);
    setBattlePhase('cards');
    setBattleOpponentName(t('dealer')); // Reset to Dealer for PvE
    setShowLossPopup(false);
    setShowWinPopup(false);
    setResult('');
    setPlayerPower(0);
    setDealerPower(0);

    if (soundEnabled) AudioManager.playHand();

    const playerTotal = selectedCards.reduce((sum, c) => sum + (c.power || 0), 0);
    // Use remaining cards from player's deck (not selected)
    const available = nfts.filter(n => !selectedCards.find(s => s.tokenId === n.tokenId));

    console.log('🎮 BATTLE DEBUG:');
    console.log('  available cards:', available.length);
    console.log('  Top 5 strongest:', available.sort((a, b) => (b.power || 0) - (a.power || 0)).slice(0, 5).map(c => ({ tokenId: c.tokenId, power: c.power, rarity: c.rarity })));

    if (available.length < HAND_SIZE_CONST) {
      alert(t('noNfts'));
      setIsBattling(false);
      setShowBattleScreen(false);
      return;
    }

    const shuffled = [...available].sort(() => Math.random() - 0.5);
    const sorted = [...available].sort((a, b) => (b.power || 0) - (a.power || 0));

    let pickedDealer: any[] = [];

    // Different strategies based on difficulty
    switch (aiDifficulty) {
      case 'easy':
        // GEY: Completely random selection (weakest difficulty)
        pickedDealer = shuffled.slice(0, HAND_SIZE_CONST);
        break;

      case 'medium':
        // GOONER: Mix of strong and random cards
        // Pick 3 from top 7, then 2 completely random
        const strongCards = sorted.slice(0, 7);
        const shuffledStrong = [...strongCards].sort(() => Math.random() - 0.5);
        pickedDealer = shuffledStrong.slice(0, 3);

        // Add 2 random cards from remaining deck
        const remaining = available.filter(card =>
          !pickedDealer.find(picked => picked.tokenId === card.tokenId)
        );
        const shuffledRemaining = [...remaining].sort(() => Math.random() - 0.5);
        pickedDealer = [...pickedDealer, ...shuffledRemaining.slice(0, 2)];
        break;

      case 'hard':
        // GIGACHAD: EXATAMENTE as top 5 mais fortes (PODER MÁXIMO)
        pickedDealer = sorted.slice(0, HAND_SIZE_CONST);
        break;
    }

    setTimeout(() => {
      setDealerCards(pickedDealer);
      if (soundEnabled) AudioManager.shuffle();
    }, 1000);

    const dealerTotal = pickedDealer.reduce((sum, c) => sum + (c.power || 0), 0);
    
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
      console.log('🎮 RESULTADO:', { playerTotal, dealerTotal });

      let matchResult: 'win' | 'loss' | 'tie';

      if (playerTotal > dealerTotal) {
        console.log('✅ JOGADOR VENCEU!');
        matchResult = 'win';
        setResult(t('playerWins'));
      } else if (playerTotal < dealerTotal) {
        console.log('❌ DEALER VENCEU!');
        matchResult = 'loss';
        setResult(t('dealerWins'));
      } else {
        console.log('🤝 EMPATE!');
        matchResult = 'tie';
        setResult(t('tie'));
      }

      // Record PvE match if user has profile
      if (userProfile && address) {
        ProfileService.recordMatch(
          address,
          'pve',
          matchResult,
          playerTotal,
          dealerTotal,
          selectedCards,
          pickedDealer
        ).then(() => {
          // Reload match history
          ProfileService.getMatchHistory(address, 20).then(setMatchHistory);
        }).catch(err => console.error('Error recording match:', err));
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
          opponentName: 'JC',
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
      const tokenIds = selectedCards.map(card => card.tokenId);
      await ProfileService.saveDefenseDeck(address, tokenIds);

      if (soundEnabled) AudioManager.buttonSuccess();
      setShowDefenseDeckSaved(true);

      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowDefenseDeckSaved(false);
      }, 3000);

      // Reload profile to get updated defense deck
      const updatedProfile = await ProfileService.getProfile(address);
      if (updatedProfile) {
        setUserProfile(updatedProfile);
      }
    } catch (error) {
      console.error('Error saving defense deck:', error);
      alert('Error saving defense deck. Please try again.');
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

  // Firebase Room Listener - Escuta mudanças na sala em tempo real
  useEffect(() => {
    if (pvpMode === 'inRoom' && roomCode) {
      console.log('🎧 Firebase listener started for room:', roomCode);
      let battleStarted = false; // Flag para evitar executar batalha múltiplas vezes
      let hasSeenRoom = false; // Flag para rastrear se já vimos a sala pelo menos uma vez

      const unsubscribe = PvPService.watchRoom(roomCode, (room) => {
        if (room) {
          hasSeenRoom = true; // Marca que vimos a sala
          console.log('🔄 Room update received:', {
            hostReady: room.host.ready,
            guestReady: room.guest?.ready,
            roomStatus: room.status,
            battleStarted
          });
          setCurrentRoom(room);

          // Se ambos os jogadores estiverem prontos, inicia a batalha
          if (room.host.ready && room.guest?.ready && room.status === 'ready' && !battleStarted) {
            battleStarted = true; // Marca que a batalha já iniciou
            console.log('✅ Ambos jogadores prontos! Iniciando batalha...');

            // Determina quem é o jogador local e quem é o oponente
            const isHost = room.host.address === address;
            const playerCards = isHost ? room.host.cards : room.guest.cards;
            const opponentCards = isHost ? room.guest.cards : room.host.cards;
            const playerPower = isHost ? room.host.power : room.guest.power;
            const opponentPower = isHost ? room.guest.power : room.host.power;
            const opponentAddress = isHost ? room.guest.address : room.host.address;
            const opponentName = isHost ? (room.guest.username || 'Guest') : (room.host.username || 'Host');
            const opponentTwitter = isHost ? room.guest.twitter : room.host.twitter;

            // Executa a batalha PvP com animações (igual PVE)
            setIsBattling(true);
            setShowBattleScreen(true);
            setBattlePhase('cards');
            setBattleOpponentName(opponentName); // Show PvP opponent username
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
                ProfileService.recordMatch(
                  address,
                  'pvp',
                  matchResult,
                  playerPower,
                  opponentPower,
                  playerCards,
                  opponentCards,
                  opponentAddress
                ).then(() => {
                  ProfileService.getMatchHistory(address, 20).then(setMatchHistory);
                }).catch(err => console.error('Error recording PvP match:', err));
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

                // Fecha a sala PVP e volta ao menu após ver o resultado
                setTimeout(async () => {
                  // Deleta a sala do Firebase se for o host
                  if (currentRoom && roomCode && address && address === currentRoom.host.address) {
                    try {
                      await PvPService.leaveRoom(roomCode, address);
                      console.log('✅ Room deleted after battle ended');
                    } catch (err) {
                      console.error('❌ Error deleting room:', err);
                    }
                  }

                  setPvpMode(null);
                  setGameMode(null);
                  setRoomCode('');
                  setCurrentRoom(null);
                  setSelectedCards([]);
                }, 5000);
              }, 2000);
            }, 3500);
          }
        } else {
          // Sala não existe - só volta ao menu se já vimos a sala antes (foi deletada)
          // Se nunca vimos, pode estar sendo criada ainda (race condition)
          if (hasSeenRoom) {
            console.log('⚠️ Sala foi deletada, voltando ao menu');
            setPvpMode('pvpMenu');
            setRoomCode('');
            setCurrentRoom(null);
          } else {
            console.log('⏳ Aguardando sala ser criada...');
          }
        }
      });

      return () => {
        unsubscribe();
      };
    }
  }, [pvpMode, roomCode, address, soundEnabled]);

  // Auto Match Listener - Detecta quando uma sala é criada para o jogador
  useEffect(() => {
    if (pvpMode === 'autoMatch' && isSearching && address) {
      console.log('🔍 Starting matchmaking listener for:', address);

      const unsubscribe = PvPService.watchMatchmaking(address, (roomCode) => {
        if (roomCode) {
          console.log('✅ Match found! Room:', roomCode);
          setRoomCode(roomCode);
          setPvpMode('inRoom');
          setIsSearching(false);
        } else {
          console.log('⚠️ Matchmaking cancelled or failed');
          setIsSearching(false);
          setPvpMode('pvpMenu');
        }
      });

      // Heartbeat - atualiza timestamp a cada 10 segundos para manter entrada ativa
      const heartbeatInterval = setInterval(async () => {
        try {
          const { ref: dbRef, update } = await import('firebase/database');
          const { getDatabase } = await import('firebase/database');
          const db = getDatabase();
          // Usa update() em vez de set() para NÃO sobrescrever roomCode se existir
          await update(dbRef(db, `matchmaking/${address}`), {
            timestamp: Date.now()
          });
          console.log('💓 Matchmaking heartbeat sent');
        } catch (err) {
          console.error('❌ Heartbeat error:', err);
        }
      }, 10000); // A cada 10 segundos

      return () => {
        console.log('🛑 Stopping matchmaking listener and heartbeat');
        unsubscribe();
        clearInterval(heartbeatInterval);
        // Nota: não chamamos cancelMatchmaking aqui porque:
        // 1. Se entramos em sala, watchMatchmaking já remove (linha 316 do firebase.ts)
        // 2. Se cancelamos manualmente, o botão Cancel já chama cancelMatchmaking
        // 3. Entradas antigas são limpadas automaticamente pelo cleanup (30s)
      };
    }
  }, [pvpMode, isSearching, address]);

  // Farcaster SDK - Call ready() when app loads
  useEffect(() => {
    const initFarcasterSDK = async () => {
      try {
        await sdk.actions.ready();
        console.log('✅ Farcaster SDK ready called');
      } catch (error) {
        console.error('❌ Error calling Farcaster ready:', error);
      }
    };

    initFarcasterSDK();
  }, []);

  // Load user profile when wallet connects
  useEffect(() => {
    if (address) {
      setIsLoadingProfile(true);
      ProfileService.getProfile(address).then((profile) => {

        setUserProfile(profile);
        setIsLoadingProfile(false);

        // Load match history
        if (profile) {
          ProfileService.getMatchHistory(address, 20).then(setMatchHistory);
        }
      });
    } else {
      setUserProfile(null);
      setMatchHistory([]);
    }
  }, [address]);

  // Update profile stats when NFTs change
  useEffect(() => {
    if (address && userProfile && nfts.length > 0) {
      const totalPower = nfts.reduce((sum, nft) => sum + (nft.power || 0), 0);
      const openedCards = nfts.filter(nft => !isUnrevealed(nft)).length;
      const unopenedCards = nfts.filter(nft => isUnrevealed(nft)).length;

      // Update stats and reload profile to show updated values
      ProfileService.updateStats(address, nfts.length, openedCards, unopenedCards, totalPower)
        .then(() => {
          // Reload profile to get updated stats
          return ProfileService.getProfile(address);
        })
        .then((updatedProfile) => {
          if (updatedProfile) {
            setUserProfile(updatedProfile);
          }
        })
        .catch((error) => {
          console.error('Error updating profile stats:', error);
        });
    }
  }, [address, userProfile, nfts]);

  // Load leaderboard with 5-minute refresh
  useEffect(() => {
    const loadLeaderboard = () => {
      ProfileService.getLeaderboard().then(setLeaderboard);
    };

    loadLeaderboard();
    const interval = setInterval(loadLeaderboard, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  // Cleanup old rooms and matchmaking entries periodically
  useEffect(() => {
    // Run cleanup immediately on mount
    PvPService.cleanupOldRooms().catch(err => console.error('Cleanup error:', err));

    // Run cleanup every 2 minutes
    const cleanupInterval = setInterval(() => {
      PvPService.cleanupOldRooms().catch(err => console.error('Cleanup error:', err));
    }, 2 * 60 * 1000);

    return () => clearInterval(cleanupInterval);
  }, []);

  // Calculate attacks remaining based on UTC date
  useEffect(() => {
    if (!userProfile) {
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
      // New day, reset to max attacks
      setAttacksRemaining(maxAttacks);
    }
  }, [userProfile, maxAttacks]);

  return (
    <div className="min-h-screen bg-vintage-deep-black text-vintage-ice p-4 lg:p-6">
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
                  onChange={(e) => setLang(e.target.value)}
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
                              await ProfileService.updateUsername(address!, newUsername);

                              // Recarrega o perfil
                              const updatedProfile = await ProfileService.getProfile(address!);
                              setUserProfile(updatedProfile);

                              setShowChangeUsername(false);
                              setNewUsername('');

                              if (soundEnabled) AudioManager.buttonSuccess();
                              alert(`Username successfully changed to @${newUsername}!`);
                            } catch (err: any) {
                              console.error('Error changing username:', err);
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
                          console.log('🔵 Calling Twitter OAuth API...');

                          // Call our API to get Twitter OAuth URL
                          const response = await fetch(`/api/auth/twitter?address=${address}`);
                          console.log('📡 Response status:', response.status);

                          const data = await response.json();
                          console.log('📦 Response data:', data);

                          if (data.url) {
                            console.log('✅ Got OAuth URL, opening popup...');
                            console.log('🔗 URL:', data.url);

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
                            console.error('❌ No URL in response');
                            throw new Error('Failed to get OAuth URL');
                          }
                        } catch (error) {
                          console.error('❌ Twitter OAuth error:', error);
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

      {showBattleScreen && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[300]">
          <div className="w-full max-w-6xl p-8">
            <style>{`
              @keyframes slideInLeft {
                from { transform: translateX(-100%) rotate(-10deg); opacity: 0; }
                to { transform: translateX(0) rotate(0); opacity: 1; }
              }
              @keyframes slideInRight {
                from { transform: translateX(100%) rotate(10deg); opacity: 0; }
                to { transform: translateX(0) rotate(0); opacity: 1; }
              }
              @keyframes cardClash {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-20px); }
                75% { transform: translateX(20px); }
              }
              @keyframes shake {
                0%, 100% { transform: rotate(0deg); }
                25% { transform: rotate(-5deg); }
                75% { transform: rotate(5deg); }
              }
              @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
              }
            `}</style>

            <h2 className="text-3xl md:text-5xl font-bold text-center mb-8 md:mb-12 text-yellow-400 animate-pulse uppercase tracking-wider">
              {t('battle')}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-8">
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-vintage-neon-blue mb-3 md:mb-4 text-center">{t('you')}</h3>
                <div className="grid grid-cols-5 gap-1 md:gap-2" style={{ animation: battlePhase === 'clash' ? 'cardClash 0.5s ease-in-out infinite' : 'slideInLeft 0.5s ease' }}>
                  {selectedCards.map((c, i) => (
                    <div key={i} className="relative aspect-[2/3] rounded-lg overflow-hidden ring-2 ring-cyan-500 shadow-lg shadow-cyan-500/50">
                      <img src={c.imageUrl} alt={`#${c.tokenId}`} className="w-full h-full object-cover" loading="eager" />
                      <div className="absolute top-0 left-0 bg-cyan-500 text-white text-xs font-bold px-1 md:px-2 py-1 rounded-br">{c.power}</div>
                    </div>
                  ))}
                </div>
                {battlePhase === 'result' && (
                  <div className="mt-3 md:mt-4 text-center">
                    <p className="text-3xl md:text-4xl font-bold text-vintage-neon-blue animate-pulse">{playerPower}</p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xl md:text-2xl font-bold text-red-400 mb-3 md:mb-4 text-center">{battleOpponentName}</h3>
                <div className="grid grid-cols-5 gap-1 md:gap-2" style={{ animation: battlePhase === 'clash' ? 'cardClash 0.5s ease-in-out infinite' : 'slideInRight 0.5s ease' }}>
                  {dealerCards.map((c, i) => (
                    <div key={i} className="relative aspect-[2/3] rounded-lg overflow-hidden ring-2 ring-red-500 shadow-lg shadow-red-500/50">
                      <img src={c.imageUrl} alt={`#${c.tokenId}`} className="w-full h-full object-cover" loading="eager" />
                      <div className="absolute top-0 left-0 bg-red-500 text-white text-xs font-bold px-1 md:px-2 py-1 rounded-br">{c.power}</div>
                    </div>
                  ))}
                </div>
                {battlePhase === 'result' && (
                  <div className="mt-3 md:mt-4 text-center">
                    <p className="text-3xl md:text-4xl font-bold text-red-400 animate-pulse">{dealerPower}</p>
                  </div>
                )}
              </div>
            </div>

            {battlePhase === 'result' && result && (
              <div className="text-center">
                <div className={`text-3xl md:text-6xl font-bold animate-[shake_0.5s_ease] ${
                  result === t('playerWins') ? 'text-green-400' :
                  result === t('dealerWins') ? 'text-red-400' :
                  'text-yellow-400'
                }`}>
                  {result}
                </div>
              </div>
            )}

            {battlePhase === 'clash' && (
              <div className="text-center text-4xl animate-pulse">
                💥 💥 💥
              </div>
            )}
          </div>
        </div>
      )}

      {/* PvE Card Selection Modal */}
      {showPveCardSelection && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[150] p-4 overflow-y-auto">
          <div className="bg-vintage-charcoal rounded-2xl border-2 border-vintage-neon-blue max-w-4xl w-full p-8 shadow-neon my-8">
            <h2 className="text-3xl font-display font-bold text-center mb-2 text-vintage-neon-blue">
              SELECT YOUR CARDS
            </h2>
            <p className="text-center text-vintage-burnt-gold mb-6 text-sm font-modern">
              Choose {HAND_SIZE_CONST} cards to battle vs AI ({pveSelectedCards.length}/{HAND_SIZE_CONST} selected)
            </p>

            {/* Selected Cards Display */}
            <div className="mb-6 p-4 bg-vintage-black/50 rounded-xl border border-vintage-neon-blue/50">
              <div className="grid grid-cols-5 gap-2">
                {pveSelectedCards.map((card, i) => (
                  <div key={i} className="relative aspect-[2/3] rounded-lg overflow-hidden ring-2 ring-vintage-neon-blue shadow-lg">
                    <img src={card.imageUrl} alt={`#${card.tokenId}`} className="w-full h-full object-cover" />
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

            {/* Difficulty Selector */}
            <div className="mb-4 bg-vintage-charcoal/50 rounded-xl p-4 border border-vintage-gold/30">
              <p className="text-center text-vintage-gold text-sm font-modern mb-3">⚔️ JC DIFFICULTY ⚔️</p>
              <div className="grid grid-cols-3 gap-2">
                {(['easy', 'medium', 'hard'] as const).map((diff) => (
                  <button
                    key={diff}
                    onClick={() => {
                      if (soundEnabled) AudioManager.buttonClick();
                      setAiDifficulty(diff);
                    }}
                    className={`px-2 py-2 rounded text-xs font-bold transition-all ${
                      aiDifficulty === diff
                        ? diff === 'easy' ? 'bg-green-500 text-white shadow-lg scale-105'
                        : diff === 'medium' ? 'bg-blue-500 text-white shadow-lg scale-105'
                        : 'bg-orange-500 text-white shadow-lg scale-105'
                        : 'bg-vintage-black/50 text-vintage-burnt-gold border border-vintage-gold/20 hover:border-vintage-gold/50'
                    }`}
                  >
                    {diff === 'easy' ? '🏳️‍🌈'
                    : diff === 'medium' ? '💀'
                    : '💪'}
                    <br/>
                    <span className="text-[9px]">
                      {diff === 'easy' ? 'GEY'
                      : diff === 'medium' ? 'GOONER'
                      : 'GIGACHAD'}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-center text-vintage-burnt-gold/70 text-[10px] mt-2 font-modern">
                {aiDifficulty === 'easy' && '🟢 5 random cards'}
                {aiDifficulty === 'medium' && '🔵 3 from top 7 + 2 random'}
                {aiDifficulty === 'hard' && '🟠 EXACTLY top 5 strongest (MAX POWER)'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => {
                  if (pveSelectedCards.length === HAND_SIZE_CONST) {
                    setSelectedCards(pveSelectedCards);
                    setShowPveCardSelection(false);
                    setGameMode('ai');
                    setPvpMode(null);
                    playHand();
                  }
                }}
                disabled={pveSelectedCards.length !== HAND_SIZE_CONST}
                className={`w-full px-6 py-4 rounded-xl font-display font-bold text-lg transition-all uppercase tracking-wide ${
                  pveSelectedCards.length === HAND_SIZE_CONST
                    ? 'bg-vintage-neon-blue hover:bg-vintage-neon-blue/80 text-vintage-black shadow-neon hover:scale-105'
                    : 'bg-vintage-black/50 text-vintage-gold/40 cursor-not-allowed border border-vintage-gold/20'
                }`}
              >
                Battle! ({pveSelectedCards.length}/{HAND_SIZE_CONST})
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
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[150] p-4 overflow-y-auto">
          <div className="bg-vintage-charcoal rounded-2xl border-2 border-red-600 max-w-4xl w-full p-4 shadow-lg shadow-red-600/50 my-4 max-h-[95vh] overflow-y-auto">
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
                  if (attackSelectedCards.length !== HAND_SIZE_CONST || !targetPlayer) return;

                  // Fetch defender's actual NFTs to get real power values (including unopened)
                  let defenderNFTs: any[] = [];
                  try {
                    // Fetch ALL NFTs without filtering by rarity (defense deck may include any cards)
                    const url: string = `https://${CHAIN}.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTsForOwner?owner=${targetPlayer.address}&contractAddresses[]=${CONTRACT_ADDRESS}&withMetadata=true&pageSize=100`;
                    const res = await fetch(url);
                    if (!res.ok) throw new Error(`API failed: ${res.status}`);
                    const json = await res.json();
                    defenderNFTs = json.ownedNfts || [];
                    console.log('🔍 Defender NFTs loaded:', defenderNFTs.length);
                    console.log('🔍 Defense deck tokenIds:', targetPlayer.defenseDeck);
                    console.log('🔍 Fetching from address:', targetPlayer.address);
                  } catch (error) {
                    console.error('Error fetching defender NFTs:', error);
                  }

                  // Create defender card objects (hidden cards with card back)
                  const cardBackUrl = 'data:image/svg+xml;base64,' + btoa(`
                    <svg width="300" height="420" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" style="stop-color:#8B0000;stop-opacity:1" />
                          <stop offset="100%" style="stop-color:#4B0000;stop-opacity:1" />
                        </linearGradient>
                      </defs>
                      <rect width="300" height="420" fill="url(#grad)" rx="20"/>
                      <rect x="20" y="20" width="260" height="380" fill="none" stroke="#FFD700" stroke-width="4" rx="15"/>
                      <circle cx="150" cy="210" r="80" fill="none" stroke="#FFD700" stroke-width="3"/>
                      <text x="150" y="230" font-family="Arial" font-size="60" fill="#FFD700" text-anchor="middle" font-weight="bold">?</text>
                    </svg>
                  `);

                  const defenderCards = (targetPlayer.defenseDeck || []).map((tokenId, i) => {
                    // Find the actual card from defender's NFTs (compare as strings to handle type mismatch)
                    const actualCard = defenderNFTs.find(nft => String(nft.tokenId) === String(tokenId));
                    console.log(`🔍 Card ${i}: tokenId=${tokenId}, found=${!!actualCard}, imageUrl=${actualCard?.imageUrl?.substring(0, 50)}`);
                    return {
                      tokenId: tokenId,
                      imageUrl: actualCard?.imageUrl || cardBackUrl,
                      power: actualCard ? calcPower(actualCard) : 20, // Use real power or fallback to 20
                      name: actualCard?.name || `Defense Card #${i + 1}`
                    };
                  });

                  // Set up battle
                  setSelectedCards(attackSelectedCards);
                  setDealerCards(defenderCards);
                  setBattleOpponentName(targetPlayer.username); // Show enemy username
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
                        await ProfileService.updateProfile(address, {
                          attacksToday: (userProfile.attacksToday || 0) + 1,
                          lastAttackDate: todayUTC,
                          'stats.attackWins': (userProfile.stats.attackWins || 0) + (matchResult === 'win' ? 1 : 0),
                          'stats.attackLosses': (userProfile.stats.attackLosses || 0) + (matchResult === 'loss' ? 1 : 0),
                        });

                        await ProfileService.updateProfile(targetPlayer.address, {
                          'stats.defenseWins': (targetPlayer.stats.defenseWins || 0) + (matchResult === 'loss' ? 1 : 0),
                          'stats.defenseLosses': (targetPlayer.stats.defenseLosses || 0) + (matchResult === 'win' ? 1 : 0),
                        });

                        await ProfileService.recordMatch(
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

                        await ProfileService.recordMatch(
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

                        const updatedProfile = await ProfileService.getProfile(address);
                        if (updatedProfile) {
                          setUserProfile(updatedProfile);
                        }
                      } catch (error) {
                        console.error('Attack error:', error);
                      }
                    }

                    // Close battle and show result
                    setTimeout(() => {
                      setIsBattling(false);
                      setShowBattleScreen(false);
                      setBattlePhase('cards');
                      setAttackSelectedCards([]);

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
                disabled={attackSelectedCards.length !== HAND_SIZE_CONST}
                className={`w-full px-6 py-4 rounded-xl font-display font-bold text-lg transition-all uppercase tracking-wide ${
                  attackSelectedCards.length === HAND_SIZE_CONST
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/50 hover:scale-105'
                    : 'bg-vintage-black/50 text-vintage-gold/40 cursor-not-allowed border border-vintage-gold/20'
                }`}
              >
                ⚔️ Attack! ({attackSelectedCards.length}/{HAND_SIZE_CONST})
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
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[150] p-4">
          <div className="bg-vintage-charcoal rounded-2xl border-2 border-vintage-gold max-w-md w-full p-8 shadow-gold">
            <h2 className="text-3xl font-display font-bold text-center mb-2 text-vintage-gold">
              {t('selectMode') || 'SELECT MODE'}
            </h2>
            <p className="text-center text-vintage-burnt-gold mb-8 text-sm font-modern">
              {t('chooseBattleMode') || 'CHOOSE YOUR BATTLE MODE'}
            </p>

            <div className="space-y-4">
              {/* Difficulty Selector */}
              <div className="bg-vintage-charcoal/50 rounded-xl p-4 border border-vintage-gold/30">
                <p className="text-center text-vintage-gold text-sm font-modern mb-3">JC DIFFICULTY</p>
                <div className="grid grid-cols-3 gap-2">
                  {(['easy', 'medium', 'hard'] as const).map((diff) => (
                    <button
                      key={diff}
                      onClick={() => {
                        if (soundEnabled) AudioManager.buttonClick();
                        setAiDifficulty(diff);
                      }}
                      className={`px-2 py-2 rounded text-xs font-bold transition-all ${
                        aiDifficulty === diff
                          ? diff === 'easy' ? 'bg-green-500 text-white shadow-lg scale-105'
                          : diff === 'medium' ? 'bg-blue-500 text-white shadow-lg scale-105'
                          : 'bg-orange-500 text-white shadow-lg scale-105'
                          : 'bg-vintage-black/50 text-vintage-burnt-gold border border-vintage-gold/20 hover:border-vintage-gold/50'
                      }`}
                    >
                      {diff === 'easy' ? '🏳️‍🌈'
                      : diff === 'medium' ? '💀'
                      : '💪'}
                      <br/>
                      <span className="text-[9px]">
                        {diff === 'easy' ? 'GEY'
                        : diff === 'medium' ? 'GOONER'
                        : 'GIGACHAD'}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-center text-vintage-burnt-gold/70 text-[10px] mt-2 font-modern">
                  {aiDifficulty === 'easy' && '🟢 5 random cards'}
                  {aiDifficulty === 'medium' && '🔵 3 from top 7 + 2 random'}
                  {aiDifficulty === 'hard' && '🟠 EXACTLY top 5 strongest (MAX POWER)'}
                </p>
              </div>

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
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[150] p-4">
          <div className="bg-vintage-charcoal rounded-2xl border-2 border-vintage-gold max-w-md w-full p-8 shadow-gold">
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
                    const code = await PvPService.findMatch(address || '');
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
                    await PvPService.cancelMatchmaking(address || '');
                    const code = await PvPService.createRoom(address || '');
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
                  PvPService.cancelMatchmaking(address || '');
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
                PvPService.leaveRoom(roomCode, address || '');
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
                  await PvPService.cancelMatchmaking(address || '');
                  await PvPService.joinRoom(roomCode, address || '');
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
                  PvPService.leaveRoom(roomCode, address || '');
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
                  <p className="text-white text-sm font-mono">{currentRoom.host.address.slice(0, 10)}...</p>
                  <p className="text-vintage-burnt-gold text-sm">
                    {currentRoom.host.ready ? '✓ Ready' : '⏳ Selecting cards...'}
                  </p>
                </div>

                {/* Guest */}
                <div className="bg-vintage-charcoal rounded-xl p-4 border-2 border-vintage-gold/50">
                  <p className="text-vintage-gold font-bold mb-2 font-modern">{t('opponent')}</p>
                  {currentRoom.guest ? (
                    <>
                      <p className="text-white text-sm font-mono">{currentRoom.guest.address.slice(0, 10)}...</p>
                      <p className="text-vintage-burnt-gold text-sm">
                        {currentRoom.guest.ready ? '✓ Ready' : '⏳ Selecting cards...'}
                      </p>
                    </>
                  ) : (
                    <p className="text-vintage-burnt-gold text-sm">{t('waitingForOpponent')}</p>
                  )}
                </div>

                {/* Grid de Seleção de Cartas */}
                {currentRoom.guest && (() => {
                  const isHost = currentRoom.host.address === address;
                  const playerReady = isHost ? currentRoom.host.ready : currentRoom.guest.ready;

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
                {currentRoom.guest && (() => {
                  const isHost = currentRoom.host.address === address;
                  const playerReady = isHost ? currentRoom.host.ready : currentRoom.guest.ready;

                  // Só mostra botão se o jogador atual NÃO estiver pronto ainda
                  if (playerReady) return null;

                  return (
                    <button
                      onClick={async () => {
                        if (soundEnabled) AudioManager.buttonSuccess();
                        await PvPService.updateCards(roomCode, address || '', selectedCards);
                      }}
                      disabled={selectedCards.length !== 5}
                      className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition mt-4"
                    >
                      {t('confirmCards') || 'Confirm Cards'} ({selectedCards.length}/5)
                    </button>
                  );
                })()}

                {/* Mensagem de aguardo */}
                {currentRoom.guest && (() => {
                  const isHost = currentRoom.host.address === address;
                  const playerReady = isHost ? currentRoom.host.ready : currentRoom.guest.ready;
                  const opponentReady = isHost ? currentRoom.guest.ready : currentRoom.host.ready;

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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-vintage-deep-black rounded-2xl border-2 border-vintage-gold max-w-2xl max-h-[90vh] overflow-y-auto p-8 shadow-[0_0_40px_rgba(255,215,0,0.4)]">
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

      <header className="flex flex-col items-center gap-3 md:gap-6 mb-4 md:mb-8 p-3 md:p-6 bg-vintage-deep-black border-2 border-vintage-gold rounded-lg shadow-[0_0_30px_rgba(255,215,0,0.3)]">
        <div className="text-center relative">
          <div className="absolute inset-0 blur-3xl opacity-30 bg-vintage-gold rounded-full" style={{boxShadow: '0 0 80px rgba(255, 215, 0, 0.4)'}}></div>
          <h1 className="relative text-3xl md:text-5xl lg:text-6xl font-display font-black text-vintage-gold tracking-wider mb-1 md:mb-2" style={{textShadow: '0 0 20px rgba(255, 215, 0, 0.5), 0 0 40px rgba(255, 215, 0, 0.3)'}}>
            VIBE MOST WANTED
          </h1>
          <p className="relative text-xs md:text-sm text-vintage-burnt-gold font-modern tracking-[0.2em] md:tracking-[0.3em] uppercase">{t('cardBattle')}</p>
        </div>

        <a
          href="https://vibechain.com/market/vibe-most-wanted?ref=XCLR1DJ6LQTT"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 md:px-8 py-2 md:py-3 border-2 border-vintage-gold text-vintage-black font-modern font-semibold rounded-lg transition-all duration-300 shadow-gold hover:shadow-gold-lg tracking-wider flex items-center gap-2 text-sm md:text-base"
          style={{background: 'linear-gradient(145deg, #FFD700, #C9A227)'}}
        >
          <span className="text-base md:text-lg">◆</span> <span className="hidden md:inline">{t('buyCardsExternal') || 'BUY CARDS ON VIBE MARKET'}</span><span className="md:hidden">Buy Cards</span>
        </a>

        <div className="flex items-center gap-3">
          <button onClick={() => setShowTutorial(true)} className="bg-vintage-deep-black border border-vintage-gold/50 text-vintage-gold px-3 md:px-4 py-1.5 md:py-2 rounded-lg hover:bg-vintage-gold/10 transition font-medium text-sm md:text-base" title={t('tutorial')}>
            <span className="font-bold">?</span>
          </button>
        </div>
      </header>

      {!address ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="bg-vintage-charcoal backdrop-blur-lg p-8 rounded-2xl border-2 border-vintage-gold max-w-md text-center">
            <div className="text-6xl mb-4 text-vintage-gold font-display">♠</div>
            <h2 className="text-2xl font-bold mb-4 text-vintage-gold">{t('connectTitle')}</h2>
            <p className="text-vintage-burnt-gold mb-6">{t('connectDescription')}</p>
            <button onClick={connectWallet} className="w-full px-6 py-4 bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black rounded-xl shadow-gold hover:shadow-gold-lg transition-all font-display font-semibold">{t('connectWallet')}</button>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-3 md:mb-6">
            <div className="bg-vintage-charcoal/80 backdrop-blur-lg p-2 md:p-4 rounded-xl border-2 border-vintage-gold/30 shadow-gold">
              <div className="flex flex-wrap items-center justify-between gap-2 md:gap-3">
                <div className="flex items-center gap-3">
                  <p className="text-sm text-gray-300"><span className="text-vintage-neon-blue">●</span> {address.slice(0, 6)}...{address.slice(-4)}</p>
                  {filteredCount > 0 && <span className="text-xs text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded-lg">🚫 {t('filtered', { count: filteredCount })}</span>}
                </div>
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
                    onClick={loadNFTs}
                    disabled={status === 'fetching'}
                    className="px-4 py-2 bg-vintage-charcoal hover:bg-vintage-gold/20 disabled:bg-vintage-black disabled:text-vintage-burnt-gold border border-vintage-gold/50 text-vintage-gold rounded-lg text-sm font-modern font-semibold transition-all"
                    title="Refresh cards and metadata"
                  >
                    🔄 Refresh
                  </button>
                  <button
                    onClick={disconnectWallet}
                    className="px-4 py-2 bg-vintage-charcoal hover:bg-red-500/20 text-red-400 rounded-lg text-sm border border-red-500/50 font-modern font-semibold transition-all"
                  >
                    {t('disconnect')}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mb-3 md:mb-6 relative z-40">
            <div className="bg-vintage-charcoal backdrop-blur-lg rounded-xl border-2 border-vintage-gold/50 p-1.5 md:p-2 flex gap-1.5 md:gap-2">
              <button
                onClick={() => {
                  if (soundEnabled) AudioManager.buttonClick();
                  setCurrentView('game');
                }}
                className={`flex-1 px-2 md:px-6 py-2 md:py-3 rounded-lg font-modern font-semibold transition-all text-xs md:text-base ${
                  currentView === 'game'
                    ? 'bg-vintage-gold text-vintage-black shadow-gold'
                    : 'bg-vintage-black text-vintage-gold hover:bg-vintage-gold/10 border border-vintage-gold/30'
                }`}
              >
                <span className="text-base md:text-lg">♠</span> <span className="hidden sm:inline">{t('title')}</span>
              </button>
              <button
                onClick={() => {
                  if (soundEnabled) AudioManager.buttonClick();
                  setShowSettings(true);
                }}
                className="flex-1 px-2 md:px-6 py-2 md:py-3 rounded-lg font-modern font-semibold transition-all bg-vintage-black text-vintage-gold hover:bg-vintage-gold/10 border border-vintage-gold/30 text-xs md:text-base"
              >
                <span className="text-base md:text-lg">§</span> <span className="hidden sm:inline">{t('settings')}</span>
              </button>
              <button
                onClick={() => {
                  if (soundEnabled) AudioManager.buttonClick();
                  setCurrentView('leaderboard');
                }}
                className={`flex-1 px-2 md:px-6 py-2 md:py-3 rounded-lg font-modern font-semibold transition-all text-xs md:text-base ${
                  currentView === 'leaderboard'
                    ? 'bg-vintage-gold text-vintage-black shadow-gold'
                    : 'bg-vintage-black text-vintage-gold hover:bg-vintage-gold/10 border border-vintage-gold/30'
                }`}
              >
                <span className="text-base md:text-lg">♔</span> <span className="hidden sm:inline">{t('leaderboard')}</span>
              </button>
            </div>
          </div>

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
                      <div key={i} className="relative aspect-[2/3] rounded-lg overflow-hidden ring-2 ring-vintage-gold shadow-gold">
                        <img src={c.imageUrl} alt={`#${c.tokenId}`} className="w-full h-full object-cover" />
                        <div className="absolute top-0 left-0 bg-vintage-gold text-vintage-black text-xs px-1 rounded-br font-bold">{c.power}</div>
                      </div>
                    ))}
                    {[...Array(HAND_SIZE_CONST - selectedCards.length)].map((_, i) => (
                      <div key={`e-${i}`} className="aspect-[2/3] rounded-xl border-2 border-dashed border-vintage-gold/40 flex items-center justify-center text-vintage-gold/50 bg-vintage-felt-green/30">
                        <span className="text-2xl font-bold">+</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Illuminated Casino Panel for Defense Deck Button */}
                <div className="relative p-1 rounded-xl mb-4" style={{background: 'linear-gradient(145deg, #FFD700, #C9A227, #FFD700)', boxShadow: '0 0 20px rgba(255, 215, 0, 0.5), inset 0 0 10px rgba(255, 215, 0, 0.3)'}}>
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
                          <div key={i} className="relative aspect-[2/3] rounded-lg overflow-hidden ring-2 ring-red-500 shadow-lg shadow-red-500/30">
                            <img src={c.imageUrl} alt={`#${c.tokenId}`} className="w-full h-full object-cover" />
                            <div className="absolute top-0 left-0 bg-red-500 text-white text-xs px-1 rounded-br">{c.power}</div>
                          </div>
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
                          <th className="text-center p-2 md:p-4 text-vintage-burnt-gold font-semibold text-xs md:text-base hidden sm:table-cell">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboard.map((profile, index) => (
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
                            <td className="p-2 md:p-4 text-right text-yellow-400 font-bold text-base md:text-xl">{profile.stats.totalPower.toLocaleString()}</td>
                            <td className="p-2 md:p-4 text-right text-vintage-neon-blue font-semibold text-sm md:text-base hidden lg:table-cell">{profile.stats.pveWins + profile.stats.pvpWins}</td>
                            <td className="p-2 md:p-4 text-right text-red-400 font-semibold text-sm md:text-base hidden lg:table-cell">{profile.stats.pveLosses + profile.stats.pvpLosses}</td>
                            <td className="p-2 md:p-4 text-center hidden sm:table-cell">
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
                                  className={`px-3 py-1.5 rounded-lg font-modern font-semibold text-sm transition-all ${
                                    userProfile && attacksRemaining > 0 && profile.defenseDeck
                                      ? 'bg-red-600 hover:bg-red-700 text-white hover:scale-105'
                                      : 'bg-vintage-black/50 text-vintage-burnt-gold cursor-not-allowed border border-vintage-gold/20'
                                  }`}
                                >
                                  ⚔️ Attack
                                </button>
                              )}
                              {profile.address.toLowerCase() === address?.toLowerCase() && (
                                <span className="text-xs text-vintage-burnt-gold">(You)</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}



          {/* Create Profile Modal */}
          {showCreateProfile && (
            <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[150] p-4">
              <div className="bg-vintage-charcoal rounded-2xl border-2 border-vintage-gold shadow-gold border-vintage-gold max-w-md w-full p-8">
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
                      if (!profileUsername.trim()) {
                        if (soundEnabled) AudioManager.buttonError();
                        return;
                      }

                      if (soundEnabled) AudioManager.buttonClick();

                      try {
                        console.log('🔐 Firebase config check:', {
                          hasApiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
                          hasDbUrl: !!process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
                          address: address
                        });
                        
                        await ProfileService.createProfile(address!, profileUsername.trim());
                        console.log('✅ Profile created successfully!');

                        const profile = await ProfileService.getProfile(address!);
                        console.log('📊 Profile retrieved:', profile);

                        setUserProfile(profile);
                        setShowCreateProfile(false);
                        setProfileUsername('');
                        setCurrentView('game');

                        if (soundEnabled) AudioManager.buttonSuccess();
                      } catch (error: any) {
                        if (soundEnabled) AudioManager.buttonError();
                        console.error('❌ Error creating profile:', error.code, error.message);
                      }
                    }}
                    className="w-full px-6 py-3 bg-vintage-gold hover:bg-vintage-gold-dark shadow-gold text-white rounded-xl font-semibold shadow-lg transition-all hover:scale-105"
                  >
                    {t('save')}
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
    </div>
  );
}