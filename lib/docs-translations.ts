// Translations for the /docs page

export type DocsSupportedLanguage = 'pt-BR' | 'en' | 'es' | 'hi' | 'ru' | 'zh-CN' | 'id' | 'fr' | 'ja' | 'it';

export const docsTranslations = {
  "pt-BR": {
    // Navigation
    backToGame: "Voltar ao Jogo",
    documentation: "Documentação",
    subtitle: "Guia completo do $VBMS - Tudo que você precisa saber",
    sections: "Seções",

    // Section titles
    economy: "Economia",
    battles: "Batalhas",
    achievements: "Conquistas",
    quests: "Missões",
    cards: "Cartas",
    faq: "FAQ",
    aura: "Aura XP",
    socialquests: "Missões Sociais",
    arbitrum: "Arbitrum",
    vibemail: "VibeMail",
    miniappframe: "Miniapp Frame",
    pendingrecovery: "Recuperação Pendente",

    // Economy section
    economyTitle: "Sistema de Economia",
    economyIntro: "$VBMS é uma coleção de Liquid Trading Cards (LTC) no Vibe Market, inspirada nas cartas de baralho Most Wanted do Iraque. O jogo tem duas moedas: Coins (moeda in-game ganha jogando) e $VBMS (token blockchain). 100.000 $VBMS = 1 pack. Atualmente em presale - compre/venda $VBMS pelo DEX no app.",

    howToEarnCoins: "Como Ganhar Moedas",
    earnPve: "PvE (Jogador vs IA)",
    earnPveDesc: "Dificuldades: GEY (+2), GOOFY (+5), GOONER (+10), GANGSTER (+20), GIGACHAD (+40)",
    earnPvp: "PvP (Jogador vs Jogador)",
    earnPvpDesc: "Vitória: +100 moedas (bônus por ranking). Derrota: -20 moedas. Empate: 0 moedas",
    earnAttack: "Modo Ataque",
    earnAttackDesc: "Até 5 ataques/dia. Vitória rouba pontos de honor do oponente. GRÁTIS!",
    earnAchievements: "Conquistas",
    earnAchievementsDesc: "63 conquistas disponíveis totalizando 302.300 moedas",
    earnQuests: "Missões Diárias e Semanais",
    earnQuestsDesc: "Complete objetivos para ganhar moedas extras",

    dailyLimit: "Limite Diário",
    dailyLimitDesc: "Você pode ganhar no máximo 1.500 moedas por dia (PvE + PvP + Conquistas)",

    entryFees: "Taxas de Entrada",
    entryFeeAttack: "Modo Ataque: GRÁTIS!",
    entryFeePvp: "PvP: 20 moedas por partida",
    entryFeePve: "PvE: Grátis (sem taxa)",

    // Battles section
    battlesTitle: "Sistema de Batalhas",
    battlesIntro: "Escolha entre 3 modos de batalha, cada um com suas próprias regras e recompensas.",

    pveMode: "PvE - Jogador vs IA",
    pveModeDesc: "Batalhe contra a IA (Dealer) em 5 níveis de dificuldade. Sem taxa de entrada.",
    pveDifficulties: "Dificuldades",
    pveGey: "GEY (+2 moedas)",
    pveTop: "GOOFY (+5 moedas)",
    pveG: "GOONER (+10 moedas)",
    pveMid: "GANGSTER (+20 moedas)",
    pveGigachad: "GIGACHAD (+40 moedas)",

    pvpMode: "PvP - Jogador vs Jogador",
    pvpModeDesc: "Batalhas em tempo real contra outros jogadores. Crie ou entre em salas. Taxa de entrada: 20 moedas.",
    pvpRewards: "Recompensas PvP",
    pvpWin: "Vitória: +100 moedas (bônus se o oponente for melhor rankeado)",
    pvpLoss: "Derrota: -20 moedas (reduzido se o oponente for melhor)",
    pvpTie: "Empate: 0 moedas",

    attackMode: "Modo Ataque",
    attackModeDesc: "Ataque jogadores do ranking para roubar seus pontos de honor. Limite de 5 ataques por dia. GRÁTIS!",
    attackHow: "Como Funciona",
    attackStep1: "Escolha um oponente do leaderboard",
    attackStep2: "Suas 5 cartas vs deck de defesa do oponente",
    attackStep3: "Vitória rouba pontos, derrota não perde moedas extras",

    // Achievements section
    achievementsTitle: "Sistema de Conquistas",
    achievementsIntro: "63 conquistas disponíveis que recompensam você por coletar cartas raras e completar objetivos.",
    totalRewards: "Total de Recompensas: 302.300 moedas",
    achievementCount: "63 conquistas",

    rarityAchievements: "Conquistas de Raridade",
    rarityDesc: "Colete cartas de diferentes raridades (Common, Rare, Epic, Legendary, Mythic)",
    rarityCount: "27 conquistas baseadas em raridade",

    wearAchievements: "Conquistas de Condição",
    wearDesc: "Colete cartas em diferentes condições (Pristine, Mint, Lightly Played, Moderately Played, Heavily Played)",
    wearCount: "18 conquistas baseadas em condição",

    foilAchievements: "Conquistas de Foil",
    foilDesc: "Colete cartas especiais foil que brilham",
    foilCount: "6 conquistas de cartas foil",

    progressiveAchievements: "Conquistas Progressivas",
    progressiveDesc: "48 conquistas baseadas em milestones de coleção (10, 25, 50, 100 cartas)",

    // Quests section
    questsTitle: "Sistema de Missões",
    questsIntro: "Complete missões diárias e semanais para ganhar moedas extras.",

    dailyQuests: "Missões Diárias",
    dailyQuestsDesc: "Resetam todo dia à meia-noite UTC",
    dailyQuest1: "Defesa da Fortaleza: +100 moedas por vencer 1 defesa PvP",

    weeklyQuests: "Missões Semanais",
    weeklyQuestsDesc: "Resetam toda segunda-feira às 00:00 UTC",
    weeklyQuest1: "Total de Partidas: Jogue 50 partidas (PvE, PvP, Ataque) - 500 moedas",
    weeklyQuest2: "Vitórias em Ataque: Vença 10 ataques - 800 moedas",
    weeklyQuest3: "Vitórias em Defesa: Defenda com sucesso 5 vezes - 300 moedas",
    weeklyQuest4: "Sequência PvE: Vença 10 partidas PvE seguidas - 1.000 moedas",

    weeklyRewards: "Recompensas Semanais",
    weeklyRewardsDesc: "Distribuídas automaticamente todo domingo às 00:00 UTC baseado no seu ranking de poder total",
    weeklyTier1: "1º Lugar: 1.000 moedas",
    weeklyTier2: "2º Lugar: 750 moedas",
    weeklyTier3: "3º Lugar: 500 moedas",
    weeklyTier4: "4º-10º Lugar: 300 moedas cada",

    // Cards section
    cardsTitle: "Sistema de Cartas",
    cardsIntro: "$VBMS usa Liquid Trading Cards (LTC) - um novo paradigma em colecionáveis digitais. Diferente de NFTs tradicionais, LTCs podem ser negociadas instantaneamente com liquidez garantida. Cada carta tem atributos únicos que determinam seu poder em batalha.",

    cardAttributes: "Atributos das Cartas",
    cardRarity: "Raridade",
    cardRarityDesc: "Common (5), Rare (20), Epic (80), Legendary (240), Mythic (800) - valores de poder base",
    cardWear: "Condição (Wear)",
    cardWearDesc: "Pristine (×1.8), Mint (×1.4), Lightly Played (×1.0), Moderately Played (×1.0), Heavily Played (×1.0)",
    cardFoil: "Foil",
    cardFoilDesc: "Prize Foil (×15), Standard Foil (×2.5), No Foil (×1.0) - multiplicadores de poder",

    powerCalculation: "Cálculo de Poder",
    powerFormula: "Poder = Poder Base × Multiplicador Foil × Multiplicador Condição",
    powerExample: "Exemplo: Mythic (800) × Prize Foil (15.0) × Pristine (1.8) = 21.600 poder",

    defenseDeck: "Deck de Defesa",
    defenseDeckDesc: "Configure suas 5 melhores cartas para defender quando outros jogadores atacarem você. Atualize sempre que conseguir cartas mais fortes!",

    featuredCollections: "Coleções em Destaque",
    featuredCollectionsDesc: "Colaborações com criadores do Vibe Market. Essas cartas podem ser usadas como as cartas $VBMS, seguindo o mesmo sistema de cálculo de poder.",

    nothingPacks: "Nothing Packs",
    nothingPacksDesc: "Cartas não-NFT que podem ser compradas com $VBMS e também queimadas (burn) para recuperar parte do valor.",

    // FAQ section
    faqTitle: "Perguntas Frequentes",

    faq1Q: "Preciso pagar para jogar?",
    faq1A: "Não! PvE e Ataque são totalmente grátis. PvP tem uma pequena taxa de entrada (20 moedas) que você pode ganhar jogando PvE.",

    faq2Q: "Como consigo mais cartas?",
    faq2A: "Compre packs no Vibe Market ou abra seus packs fechados. Você também pode negociar cartas com outros jogadores.",

    faq3Q: "Posso perder moedas?",
    faq3A: "Em PvE, você não perde moedas. Em PvP, você perde 20 moedas se perder (menos se o oponente for muito melhor). No Modo Ataque, é GRÁTIS!",

    faq4Q: "Quanto tempo demora uma partida?",
    faq4A: "PvE: instantâneo. PvP: 1-3 minutos. Ataque: instantâneo.",

    faq5Q: "O que é o ranking de poder total?",
    faq5A: "Seu poder total é a soma do poder das suas 5 cartas mais fortes. Este valor determina sua posição no leaderboard e quanto você pode ganhar nas recompensas semanais.",

    faq6Q: "Posso atacar o mesmo jogador várias vezes?",
    faq6A: "Sim, mas você tem apenas 5 ataques por dia no total, então use com sabedoria!",

    faq7Q: "Como funcionam as conquistas?",
    faq7A: "Conquistas são desbloqueadas automaticamente quando você atinge os critérios (coletar certas cartas). Você precisa clicar em 'Claim' para receber as moedas.",

    faq8Q: "O que acontece se eu não defender um ataque?",
    faq8A: "Seu deck de defesa automaticamente luta por você. Configure suas 5 melhores cartas no deck de defesa!",

    // Poker Battle section
    pokerBattle: "Batalha de Poker",
    pokerIntro: "Jogue poker contra CPU ou outros jogadores usando apostas em VBMS.",
    pokerStakes: "Apostas",
    pokerRules: "Regras",
    pokerRule1: "Melhor de 5 rodadas - Quem vencer 4 rodadas vence a partida",
    pokerRule2: "Vencedor leva 95% do pot (5% taxa da casa)",
    pokerRule3: "Seguro na blockchain (contrato VBMS na Base)",
    pokerRule4: "Partidas PvP são ao vivo - ambos jogam simultaneamente",

    // Mecha Arena section
    mechaArena: "Mecha Arena",
    mechaIntro: "Assista batalhas CPU vs CPU e aposte no resultado! Espetale batalhas épicas entre oponentes de IA.",
    mechaHowItWorks: "Como Funciona",
    mechaStep1: "Escolha entre 13 coleções diferentes de arena",
    mechaStep2: "Duas CPUs batalham automaticamente usando cartas daquela coleção",
    mechaStep3: "Deposite VBMS para ganhar créditos de aposta",
    mechaStep4: "Aposte em cada rodada (1-7) com odds crescentes",
    mechaStep5: "Pagamentos instantâneos quando as rodadas terminam",
    mechaBettingOdds: "Odds de Aposta",
    mechaRounds13: "Rodadas 1-3: 1.5x odds",
    mechaRounds45: "Rodadas 4-5: 1.8x odds",
    mechaRounds67: "Rodadas 6-7: 2.0x odds",
    mechaTieBet: "Aposta em Empate: 3.5x odds",
    mechaDailyBoost: "Boost Diário",
    mechaDailyBoostDesc: "Todo dia, uma coleção recebe +0.5x bônus nas odds! Procure o emblema HOT.",
    mechaCollections: "Coleções",

    // Raid Boss section
    raidBoss: "Raid Boss",
    raidBossIntro: "Junte-se a outros jogadores para derrotar chefes poderosos e ganhar recompensas exclusivas!",
    raidHowItWorks: "Como Funciona",
    raidStep1: "Chefes aparecem em um cronograma rotativo",
    raidStep2: "Selecione cartas da sua coleção para atacar",
    raidStep3: "Cause dano baseado no poder das suas cartas",
    raidStep4: "Contribua para o esforço da comunidade",
    raidStep5: "Ganhe recompensas baseadas na sua contribuição de dano",
    raidRewards: "Recompensas",
    raidReward1: "Moedas Coins baseadas no dano causado",
    raidReward2: "Recompensas bônus para os maiores contribuidores",
    raidReward3: "Conquistas especiais por derrotar chefes",
    raidTips: "Dicas",
    raidTip1: "Use cartas de alto poder para máximo dano",
    raidTip2: "Cartas da coleção do chefe causam dano extra",
    raidTip3: "Coordene com outros jogadores para kills mais rápidas",

    // VibeFID section
    vibeFID: "🆔 VibeFID",
    vibeFIDIntro: "VibeFID é uma carta NFT única baseada na sua identidade Farcaster. Seu Neynar Score (engajamento e reputação no Farcaster) determina a raridade da carta, enquanto seu número FID determina os traits visuais.",
    vibeFIDHowItWorks: "Como Funciona",
    vibeFIDStep1: "Conecte sua conta Farcaster",
    vibeFIDStep2: "Seu Neynar Score determina a raridade (baseado em seguidores, casts, reações)",
    vibeFIDStep3: "Seu número FID determina naipe, foil e condição",
    vibeFIDStep4: "Pague 0.0003 ETH para mintar sua carta VibeFID única na Base",
    vibeFIDNeynarScore: "Neynar Score → Raridade",
    vibeFIDMythic: "Mythic (≥ 0.99): 800 poder base - Top 1% usuários Farcaster",
    vibeFIDLegendary: "Legendary (≥ 0.90): 240 poder base - Top 10%",
    vibeFIDEpic: "Epic (≥ 0.79): 80 poder base - Top 21%",
    vibeFIDRare: "Rare (≥ 0.70): 20 poder base - Top 30%",
    vibeFIDCommon: "Common (< 0.70): 5 poder base",
    vibeFIDTraits: "FID → Traits",
    vibeFIDOG: "≤ 5,000 (OG): Prize Foil garantido + condição Pristine",
    vibeFIDTier2: "5,001 - 20,000: Alta chance de Prize Foil",
    vibeFIDTier3: "20,001 - 100,000: Chances mistas para traits raros",
    vibeFIDTier4: "> 100,000: Distribuição padrão de traits",
    vibeFIDBenefits: "Benefícios para Holders VibeFID",
    vibeFIDBenefit1: "Boost de Poder: Cartas VibeFID recebem multiplicadores de poder bônus em batalhas",
    vibeFIDBenefit2: "Energia Infinita: Sua carta VibeFID nunca fica sem energia - sempre pronta para batalhar",
    vibeFIDBenefit3: "Sem Restrição de Deck: Pode ser usada em qualquer deck independente de restrições de coleção",

    // Aura XP section
    auraIntro: "Aura XP é o sistema de experiência permanente do VMW. Cada ação no jogo ganha Aura XP que nunca reseta. Quanto mais XP você acumula, mais benefícios e limites maiores você desbloqueia.",
    auraHowItWorks: "Como Funciona",
    auraStep1: "Ganhe Aura XP jogando batalhas, completando missões e reivindicando recompensas",
    auraStep2: "Seu Aura XP é permanente — nunca reseta e acumula para sempre",
    auraStep3: "Weekly Aura reseta todo domingo para o leaderboard semanal",
    auraStep4: "Cada tier desbloqueia benefícios: mais spins na roleta e limites maiores de claim",
    auraTiers: "Tiers de Aura",
    auraHuman: "Human",
    auraGreatApe: "Grande Macaco",
    auraSSJ1: "SSJ1",
    auraSSJ2: "SSJ2",
    auraSSJ3: "SSJ3",
    auraSSJ4: "SSJ4",
    auraSSJGod: "SSJ God",
    auraSSJBlue: "SSJ Blue",
    auraBenefits: "Benefícios",
    auraBenefit1: "Spins bônus na roleta por tier (SSJ1: +1 até SSJBlue: +10)",
    auraBenefit2: "Limite diário de claim maior (Human: 100k até SSJBlue: 750k $VBMS)",
    auraBenefit3: "Badge de tier visível no perfil com barra de progresso",

    // Social Quests section
    socialquestsIntro: "Missões sociais são tarefas comunitárias: seguir contas, repostar anúncios e participar de eventos. Complete-as para ganhar $VBMS bônus.",
    socialquestsHowItWorks: "Como Funciona",
    socialquestsStep1: "Acesse a aba Missões Sociais em Quests",
    socialquestsStep2: "Veja as missões disponíveis com requisitos e recompensas",
    socialquestsStep3: "Complete a missão e clique em Claim para receber sua recompensa",
    socialquestsRewards: "Recompensas",
    socialquestsReward1: "Missões VBMS: recompensas em $VBMS (painel dourado)",
    socialquestsReward2: "Missões ARB Creators: recompensas especiais (painel azul)",
    socialquestsReward3: "Missões giram automaticamente quando novas são adicionadas",

    // Arbitrum section
    arbitrumIntro: "A rede Arbitrum está integrada ao VMW para certas ações. Algumas missões sociais requerem uma transação na Arbitrum como prova on-chain.",
    arbitrumHowItWorks: "Como Funciona",
    arbitrumStep1: "Certas missões sociais exigem uma TX na rede Arbitrum como prova",
    arbitrumStep2: "Troque para a rede Arbitrum na sua carteira antes de enviar",
    arbitrumStep3: "Após a TX confirmada, a missão é verificada automaticamente",
    arbitrumBenefits: "Por que Arbitrum?",
    arbitrumBenefit1: "Taxas ultra-baixas — transações custam frações de centavo",
    arbitrumBenefit2: "Confirmações rápidas — geralmente menos de 1 segundo",
    arbitrumBenefit3: "Compatível com carteiras Ethereum existentes (MetaMask, Rabby, etc.)",

    // VibeMail section
    vibemailIntro: "VibeMail é o sistema de mensagens do VMW. Envie cartas personalizadas com texto formatado, cores, sons e voz para outros jogadores.",
    vibemailHowItWorks: "Como Funciona",
    vibemailStep1: "Acesse VibeMail na seção Quests",
    vibemailStep2: "Clique em Nova Carta e escolha o destinatário",
    vibemailStep3: "Escreva sua mensagem com formatação, cores e efeitos especiais",
    vibemailStep4: "Envie e o destinatário recebe na caixa de entrada",
    vibemailFeatures: "Recursos",
    vibemailFeature1: "Texto colorido com comandos {c:#cor}",
    vibemailFeature2: "Sons do myinstants via proxy integrado",
    vibemailFeature3: "Gravação de voz diretamente no app",
    vibemailFeature4: "Imagens e layouts personalizados",
  },
  "en": {
    // Navigation
    backToGame: "Back to Game",
    documentation: "Documentation",
    subtitle: "Complete $VBMS guide - Everything you need to know",
    sections: "Sections",

    // Section titles
    economy: "Economy",
    battles: "Battles",
    achievements: "Achievements",
    quests: "Quests",
    cards: "Cards",
    faq: "FAQ",
    aura: "Aura XP",
    socialquests: "Social Quests",
    arbitrum: "Arbitrum",
    vibemail: "VibeMail",
    miniappframe: "Miniapp Frame",
    pendingrecovery: "Pending Recovery",

    // Economy section
    economyTitle: "Economy System",
    economyIntro: "$VBMS is a Liquid Trading Cards (LTC) collection on Vibe Market, inspired by the Most Wanted Iraqi playing cards. The game has two currencies: Coins (in-game currency earned by playing) and $VBMS (blockchain token). 100,000 $VBMS = 1 pack. Currently in presale - buy/sell $VBMS through the in-app DEX.",

    howToEarnCoins: "How to Earn Coins",
    earnPve: "PvE (Player vs AI)",
    earnPveDesc: "Difficulties: GEY (+2), GOOFY (+5), GOONER (+10), GANGSTER (+20), GIGACHAD (+40)",
    earnPvp: "PvP (Player vs Player)",
    earnPvpDesc: "Win: +100 coins (rank bonus). Loss: -20 coins. Tie: 0 coins",
    earnAttack: "Attack Mode",
    earnAttackDesc: "Up to 5 attacks/day. Win steals opponent's honor points. FREE!",
    earnAchievements: "Achievements",
    earnAchievementsDesc: "63 achievements available totaling 302,300 coins",
    earnQuests: "Daily and Weekly Quests",
    earnQuestsDesc: "Complete objectives to earn extra coins",

    dailyLimit: "Daily Limit",
    dailyLimitDesc: "You can earn a maximum of 1,500 coins per day (PvE + PvP + Achievements)",

    entryFees: "Entry Fees",
    entryFeeAttack: "Attack Mode: FREE!",
    entryFeePvp: "PvP: 20 coins per match",
    entryFeePve: "PvE: Free (no fee)",

    // Battles section
    battlesTitle: "Battle System",
    battlesIntro: "Choose from 3 battle modes, each with its own rules and rewards.",

    pveMode: "PvE - Player vs AI",
    pveModeDesc: "Battle against AI (Dealer) in 5 difficulty levels. No entry fee.",
    pveDifficulties: "Difficulties",
    pveGey: "GEY (+2 coins)",
    pveTop: "GOOFY (+5 coins)",
    pveG: "GOONER (+10 coins)",
    pveMid: "GANGSTER (+20 coins)",
    pveGigachad: "GIGACHAD (+40 coins)",

    pvpMode: "PvP - Player vs Player",
    pvpModeDesc: "Real-time battles against other players. Create or join rooms. Entry fee: 20 coins.",
    pvpRewards: "PvP Rewards",
    pvpWin: "Win: +100 coins (bonus if opponent is higher ranked)",
    pvpLoss: "Loss: -20 coins (reduced if opponent is higher)",
    pvpTie: "Tie: 0 coins",

    attackMode: "Attack Mode",
    attackModeDesc: "Attack leaderboard players to steal their honor points. Limit of 5 attacks per day. FREE!",
    attackHow: "How It Works",
    attackStep1: "Choose an opponent from the leaderboard",
    attackStep2: "Your 5 cards vs opponent's defense deck",
    attackStep3: "Win steals points, loss doesn't cost extra coins",

    // Achievements section
    achievementsTitle: "Achievement System",
    achievementsIntro: "63 achievements available that reward you for collecting rare cards and completing objectives.",
    totalRewards: "Total Rewards: 302,300 coins",
    achievementCount: "63 achievements",

    rarityAchievements: "Rarity Achievements",
    rarityDesc: "Collect cards of different rarities (Common, Rare, Epic, Legendary, Mythic)",
    rarityCount: "27 rarity-based achievements",

    wearAchievements: "Wear Achievements",
    wearDesc: "Collect cards in different conditions (Pristine, Mint, Lightly Played, Moderately Played, Heavily Played)",
    wearCount: "18 wear-based achievements",

    foilAchievements: "Foil Achievements",
    foilDesc: "Collect special shiny foil cards",
    foilCount: "6 foil card achievements",

    progressiveAchievements: "Progressive Achievements",
    progressiveDesc: "48 achievements based on collection milestones (10, 25, 50, 100 cards)",

    // Quests section
    questsTitle: "Quest System",
    questsIntro: "Complete daily and weekly quests to earn extra coins.",

    dailyQuests: "Daily Quests",
    dailyQuestsDesc: "Reset every day at midnight UTC",
    dailyQuest1: "Defense Fortress: +100 coins for winning 1 PvP defense",

    weeklyQuests: "Weekly Quests",
    weeklyQuestsDesc: "Reset every Monday at 00:00 UTC",
    weeklyQuest1: "Total Matches: Play 50 matches (PvE, PvP, Attack) - 500 coins",
    weeklyQuest2: "Attack Wins: Win 10 attacks - 800 coins",
    weeklyQuest3: "Defense Wins: Successfully defend 5 times - 300 coins",
    weeklyQuest4: "PvE Streak: Win 10 PvE matches in a row - 1,000 coins",

    weeklyRewards: "Weekly Rewards",
    weeklyRewardsDesc: "Automatically distributed every Sunday at 00:00 UTC based on your total power ranking",
    weeklyTier1: "1st Place: 1,000 coins",
    weeklyTier2: "2nd Place: 750 coins",
    weeklyTier3: "3rd Place: 500 coins",
    weeklyTier4: "4th-10th Place: 300 coins each",

    // Cards section
    cardsTitle: "Card System",
    cardsIntro: "$VBMS uses Liquid Trading Cards (LTC) - a new paradigm in digital collectibles. Unlike traditional NFTs, LTCs can be traded instantly with guaranteed liquidity. Each card has unique attributes that determine its battle power.",

    cardAttributes: "Card Attributes",
    cardRarity: "Rarity",
    cardRarityDesc: "Common (5), Rare (20), Epic (80), Legendary (240), Mythic (800) - base power values",
    cardWear: "Wear Condition",
    cardWearDesc: "Pristine (×1.8), Mint (×1.4), Lightly Played (×1.0), Moderately Played (×1.0), Heavily Played (×1.0)",
    cardFoil: "Foil",
    cardFoilDesc: "Prize Foil (×15), Standard Foil (×2.5), No Foil (×1.0) - power multipliers",

    powerCalculation: "Power Calculation",
    powerFormula: "Power = Base Power × Foil Multiplier × Wear Multiplier",
    powerExample: "Example: Mythic (800) × Prize Foil (15.0) × Pristine (1.8) = 21,600 power",

    defenseDeck: "Defense Deck",
    defenseDeckDesc: "Set up your 5 best cards to defend when other players attack you. Update whenever you get stronger cards!",

    featuredCollections: "Featured Collections",
    featuredCollectionsDesc: "Collaborations with Vibe Market creators. These cards can be used just like $VBMS cards, following the same power calculation system.",

    nothingPacks: "Nothing Packs",
    nothingPacksDesc: "Non-NFT cards that can be purchased with $VBMS and also burned to recover part of the value.",

    // FAQ section
    faqTitle: "Frequently Asked Questions",

    faq1Q: "Do I need to pay to play?",
    faq1A: "No! PvE and Attack are completely free. PvP has a small entry fee (20 coins) that you can earn by playing PvE.",

    faq2Q: "How do I get more cards?",
    faq2A: "Buy packs on Vibe Market or open your unopened packs. You can also trade cards with other players.",

    faq3Q: "Can I lose coins?",
    faq3A: "In PvE, you don't lose coins. In PvP, you lose 20 coins if you lose (less if opponent is much better). Attack Mode is FREE!",

    faq4Q: "How long does a match take?",
    faq4A: "PvE: instant. PvP: 1-3 minutes. Attack: instant.",

    faq5Q: "What is the total power ranking?",
    faq5A: "Your total power is the sum of your 5 strongest cards' power. This value determines your leaderboard position and how much you can earn in weekly rewards.",

    faq6Q: "Can I attack the same player multiple times?",
    faq6A: "Yes, but you only have 5 attacks per day total, so use them wisely!",

    faq7Q: "How do achievements work?",
    faq7A: "Achievements are automatically unlocked when you meet the criteria (collect certain cards). You need to click 'Claim' to receive the coins.",

    faq8Q: "What happens if I don't defend an attack?",
    faq8A: "Your defense deck automatically fights for you. Set up your 5 best cards in the defense deck!",

    // Poker Battle section
    pokerBattle: "Poker Battle",
    pokerIntro: "Play poker against CPU or other players using VBMS stakes.",
    pokerStakes: "Stakes",
    pokerRules: "Rules",
    pokerRule1: "Best of 5 rounds - First to win 4 rounds wins the match",
    pokerRule2: "Winner takes 95% of pot (5% house fee)",
    pokerRule3: "Blockchain secured (VBMS contract on Base)",
    pokerRule4: "PvP matches are live - both players play simultaneously",

    // Mecha Arena section
    mechaArena: "Mecha Arena",
    mechaIntro: "Watch CPU vs CPU battles and bet on the outcome! Spectate epic card battles between AI opponents.",
    mechaHowItWorks: "How It Works",
    mechaStep1: "Choose from 13 different arena collections",
    mechaStep2: "Two CPUs battle automatically using cards from that collection",
    mechaStep3: "Deposit VBMS to get betting credits",
    mechaStep4: "Bet on each round (1-7) with growing odds",
    mechaStep5: "Instant payouts when rounds resolve",
    mechaBettingOdds: "Betting Odds",
    mechaRounds13: "Rounds 1-3: 1.5x odds",
    mechaRounds45: "Rounds 4-5: 1.8x odds",
    mechaRounds67: "Rounds 6-7: 2.0x odds",
    mechaTieBet: "Tie Bet: 3.5x odds",
    mechaDailyBoost: "Daily Boost",
    mechaDailyBoostDesc: "Every day, one arena collection gets +0.5x bonus odds! Look for the HOT badge.",
    mechaCollections: "Collections",

    // Raid Boss section
    raidBoss: "Raid Boss",
    raidBossIntro: "Team up with other players to defeat powerful bosses and earn exclusive rewards!",
    raidHowItWorks: "How It Works",
    raidStep1: "Bosses appear on a rotating schedule",
    raidStep2: "Select cards from your collection to attack",
    raidStep3: "Deal damage based on your card power",
    raidStep4: "Contribute to the community effort",
    raidStep5: "Earn rewards based on damage contribution",
    raidRewards: "Rewards",
    raidReward1: "Coins coins based on damage dealt",
    raidReward2: "Bonus rewards for top contributors",
    raidReward3: "Special achievements for boss defeats",
    raidTips: "Tips",
    raidTip1: "Use high-power cards for maximum damage",
    raidTip2: "Cards from the boss collection deal extra damage",
    raidTip3: "Coordinate with other players for faster kills",

    // VibeFID section
    vibeFID: "🆔 VibeFID",
    vibeFIDIntro: "VibeFID is a unique NFT card based on your Farcaster identity. Your Neynar Score (Farcaster engagement and reputation) determines your card's rarity, while your FID number determines the visual traits.",
    vibeFIDHowItWorks: "How It Works",
    vibeFIDStep1: "Connect your Farcaster account",
    vibeFIDStep2: "Your Neynar Score determines card rarity (based on followers, casts, reactions)",
    vibeFIDStep3: "Your FID number determines suit, foil, and wear traits",
    vibeFIDStep4: "Pay 0.0003 ETH to mint your unique VibeFID card on Base",
    vibeFIDNeynarScore: "Neynar Score → Rarity",
    vibeFIDMythic: "Mythic (≥ 0.99): 800 base power - Top 1% Farcaster users",
    vibeFIDLegendary: "Legendary (≥ 0.90): 240 base power - Top 10%",
    vibeFIDEpic: "Epic (≥ 0.79): 80 base power - Top 21%",
    vibeFIDRare: "Rare (≥ 0.70): 20 base power - Top 30%",
    vibeFIDCommon: "Common (< 0.70): 5 base power",
    vibeFIDTraits: "FID → Traits",
    vibeFIDOG: "≤ 5,000 (OG): Guaranteed Prize Foil + Pristine condition",
    vibeFIDTier2: "5,001 - 20,000: High chance for Prize Foil",
    vibeFIDTier3: "20,001 - 100,000: Mixed chances for rare traits",
    vibeFIDTier4: "> 100,000: Standard trait distribution",
    vibeFIDBenefits: "VibeFID Holder Benefits",
    vibeFIDBenefit1: "Power Boost: VibeFID cards receive bonus power multipliers in battles",
    vibeFIDBenefit2: "Infinite Energy: Your VibeFID card never runs out of energy - always ready to battle",
    vibeFIDBenefit3: "No Deck Restriction: Can be used in any deck regardless of collection restrictions",

    // Aura XP section
    auraIntro: "Aura XP is VMW's permanent experience system. Every in-game action earns Aura XP that never resets. The more XP you accumulate, the more benefits and higher limits you unlock.",
    auraHowItWorks: "How It Works",
    auraStep1: "Earn Aura XP by playing battles, completing quests and claiming rewards",
    auraStep2: "Your Aura XP is permanent — it never resets and accumulates forever",
    auraStep3: "Weekly Aura resets every Sunday for the weekly leaderboard",
    auraStep4: "Each tier unlocks benefits: more roulette spins and higher claim limits",
    auraTiers: "Aura Tiers",
    auraHuman: "Human",
    auraGreatApe: "Great Ape",
    auraSSJ1: "SSJ1",
    auraSSJ2: "SSJ2",
    auraSSJ3: "SSJ3",
    auraSSJ4: "SSJ4",
    auraSSJGod: "SSJ God",
    auraSSJBlue: "SSJ Blue",
    auraBenefits: "Benefits",
    auraBenefit1: "Bonus roulette spins per tier (SSJ1: +1 up to SSJBlue: +10)",
    auraBenefit2: "Higher daily claim limit (Human: 100k up to SSJBlue: 750k $VBMS)",
    auraBenefit3: "Tier badge visible on your profile with progress bar",

    // Social Quests section
    socialquestsIntro: "Social quests are community tasks: follow accounts, reshare announcements and participate in events. Complete them to earn bonus $VBMS.",
    socialquestsHowItWorks: "How It Works",
    socialquestsStep1: "Access the Social Quests tab in Quests",
    socialquestsStep2: "See available quests with their requirements and rewards",
    socialquestsStep3: "Complete the quest and click Claim to receive your reward",
    socialquestsRewards: "Rewards",
    socialquestsReward1: "VBMS quests: rewards in $VBMS (gold panel)",
    socialquestsReward2: "ARB Creators quests: special rewards (blue panel)",
    socialquestsReward3: "Quests rotate automatically when new ones are added",

    // Arbitrum section
    arbitrumIntro: "The Arbitrum network is integrated with VMW for certain actions. Some social quests require a transaction on Arbitrum as on-chain proof.",
    arbitrumHowItWorks: "How It Works",
    arbitrumStep1: "Certain social quests require a TX on the Arbitrum network as proof",
    arbitrumStep2: "Switch to the Arbitrum network in your wallet before sending",
    arbitrumStep3: "After the TX is confirmed, the quest is verified automatically",
    arbitrumBenefits: "Why Arbitrum?",
    arbitrumBenefit1: "Ultra-low fees — transactions cost fractions of a cent",
    arbitrumBenefit2: "Fast confirmations — usually less than 1 second",
    arbitrumBenefit3: "Compatible with existing Ethereum wallets (MetaMask, Rabby, etc.)",

    // VibeMail section
    vibemailIntro: "VibeMail is VMW's messaging system. Send personalized letters with formatted text, colors, sounds and voice to other players.",
    vibemailHowItWorks: "How It Works",
    vibemailStep1: "Access VibeMail in the Quests section",
    vibemailStep2: "Click New Letter and choose the recipient",
    vibemailStep3: "Write your message with formatting, colors and special effects",
    vibemailStep4: "Send it and the recipient receives it in their inbox",
    vibemailFeatures: "Features",
    vibemailFeature1: "Colored text with {c:#color} commands",
    vibemailFeature2: "Sounds from myinstants via integrated proxy",
    vibemailFeature3: "Voice recording directly in the app",
    vibemailFeature4: "Custom images and layouts",
  },
  "es": {
    // Navigation
    backToGame: "Volver al Juego",
    documentation: "Documentación",
    subtitle: "Guía completa de $VBMS - Todo lo que necesitas saber",
    sections: "Secciones",

    // Section titles
    economy: "Economía",
    battles: "Batallas",
    achievements: "Logros",
    quests: "Misiones",
    cards: "Cartas",
    faq: "Preguntas Frecuentes",

    // Economy section
    economyTitle: "Sistema de Economía",
    economyIntro: "$VBMS es una colección de Liquid Trading Cards (LTC) en Vibe Market, inspirada en las cartas Most Wanted de Irak. El juego tiene dos monedas: Coins (moneda in-game) y $VBMS (token blockchain). 100.000 $VBMS = 1 pack. Actualmente en preventa - compra/vende $VBMS en el DEX de la app.",

    howToEarnCoins: "Cómo Ganar Monedas",
    earnPve: "PvE (Jugador vs IA)",
    earnPveDesc: "Dificultades: GEY (+2), GOOFY (+5), GOONER (+10), GANGSTER (+20), GIGACHAD (+40)",
    earnPvp: "PvP (Jugador vs Jugador)",
    earnPvpDesc: "Victoria: +100 monedas (bono por ranking). Derrota: -20 monedas. Empate: 0 monedas",
    earnAttack: "Modo Ataque",
    earnAttackDesc: "Hasta 5 ataques/día. Victoria roba puntos de honor del oponente. ¡GRATIS!",
    earnAchievements: "Logros",
    earnAchievementsDesc: "63 logros disponibles con un total de 302,300 monedas",
    earnQuests: "Misiones Diarias y Semanales",
    earnQuestsDesc: "Completa objetivos para ganar monedas extras",

    dailyLimit: "Límite Diario",
    dailyLimitDesc: "Puedes ganar un máximo de 1,500 monedas por día (PvE + PvP + Logros)",

    entryFees: "Tarifas de Entrada",
    entryFeeAttack: "Modo Ataque: ¡GRATIS!",
    entryFeePvp: "PvP: 20 monedas por partida",
    entryFeePve: "PvE: Gratis (sin tarifa)",

    // Battles section
    battlesTitle: "Sistema de Batallas",
    battlesIntro: "Elige entre 3 modos de batalla, cada uno con sus propias reglas y recompensas.",

    pveMode: "PvE - Jugador vs IA",
    pveModeDesc: "Batalla contra la IA (Dealer) en 5 niveles de dificultad. Sin tarifa de entrada.",
    pveDifficulties: "Dificultades",
    pveGey: "GEY (+2 monedas)",
    pveTop: "GOOFY (+5 monedas)",
    pveG: "GOONER (+10 monedas)",
    pveMid: "GANGSTER (+20 monedas)",
    pveGigachad: "GIGACHAD (+40 monedas)",

    pvpMode: "PvP - Jugador vs Jugador",
    pvpModeDesc: "Batallas en tiempo real contra otros jugadores. Crea o únete a salas. Tarifa de entrada: 20 monedas.",
    pvpRewards: "Recompensas PvP",
    pvpWin: "Victoria: +100 monedas (bono si el oponente tiene mejor ranking)",
    pvpLoss: "Derrota: -20 monedas (reducido si el oponente es mejor)",
    pvpTie: "Empate: 0 monedas",

    attackMode: "Modo Ataque",
    attackModeDesc: "Ataca a jugadores de la tabla de clasificación para robar sus puntos de honor. Límite de 5 ataques por día. ¡GRATIS!",
    attackHow: "Cómo Funciona",
    attackStep1: "Elige un oponente de la tabla de clasificación",
    attackStep2: "Tus 5 cartas vs mazo de defensa del oponente",
    attackStep3: "Victoria roba puntos, derrota no cuesta monedas extra",

    // Achievements section
    achievementsTitle: "Sistema de Logros",
    achievementsIntro: "63 logros disponibles que te recompensan por coleccionar cartas raras y completar objetivos.",
    totalRewards: "Recompensas Totales: 302,300 monedas",
    achievementCount: "63 logros",

    rarityAchievements: "Logros de Rareza",
    rarityDesc: "Colecciona cartas de diferentes rarezas (Común, Raro, Épico, Legendario, Mítico)",
    rarityCount: "27 logros basados en rareza",

    wearAchievements: "Logros de Condición",
    wearDesc: "Colecciona cartas en diferentes condiciones (Impecable, Mint, Ligeramente Jugada, Moderadamente Jugada, Muy Jugada)",
    wearCount: "18 logros basados en condición",

    foilAchievements: "Logros de Foil",
    foilDesc: "Colecciona cartas foil especiales brillantes",
    foilCount: "6 logros de cartas foil",

    progressiveAchievements: "Logros Progresivos",
    progressiveDesc: "48 logros basados en hitos de colección (10, 25, 50, 100 cartas)",

    // Quests section
    questsTitle: "Sistema de Misiones",
    questsIntro: "Completa misiones diarias y semanales para ganar monedas extras.",

    dailyQuests: "Misiones Diarias",
    dailyQuestsDesc: "Se reinician cada día a medianoche UTC",
    dailyQuest1: "Fortaleza de Defensa: +100 monedas por ganar 1 defensa PvP",

    weeklyQuests: "Misiones Semanales",
    weeklyQuestsDesc: "Se reinician cada lunes a las 00:00 UTC",
    weeklyQuest1: "Total de Partidas: Juega 50 partidas (PvE, PvP, Ataque) - 500 monedas",
    weeklyQuest2: "Victorias en Ataque: Gana 10 ataques - 800 monedas",
    weeklyQuest3: "Victorias en Defensa: Defiende exitosamente 5 veces - 300 monedas",
    weeklyQuest4: "Racha PvE: Gana 10 partidas PvE seguidas - 1,000 monedas",

    weeklyRewards: "Recompensas Semanales",
    weeklyRewardsDesc: "Distribuidas automáticamente cada domingo a las 00:00 UTC según tu clasificación de poder total",
    weeklyTier1: "1er Lugar: 1,000 monedas",
    weeklyTier2: "2do Lugar: 750 monedas",
    weeklyTier3: "3er Lugar: 500 monedas",
    weeklyTier4: "4to-10mo Lugar: 300 monedas cada uno",

    // Cards section
    cardsTitle: "Sistema de Cartas",
    cardsIntro: "$VBMS usa Liquid Trading Cards (LTC) - un nuevo paradigma en coleccionables digitales. A diferencia de los NFTs tradicionales, las LTCs pueden intercambiarse instantáneamente con liquidez garantizada. Cada carta tiene atributos únicos que determinan su poder en batalla.",

    cardAttributes: "Atributos de Cartas",
    cardRarity: "Rareza",
    cardRarityDesc: "Común (5), Raro (20), Épico (80), Legendario (240), Mítico (800) - valores de poder base",
    cardWear: "Condición (Wear)",
    cardWearDesc: "Impecable (×1.8), Mint (×1.4), Ligeramente Jugada (×1.0), Moderadamente Jugada (×1.0), Muy Jugada (×1.0)",
    cardFoil: "Foil",
    cardFoilDesc: "Prize Foil (×15), Standard Foil (×2.5), No Foil (×1.0) - multiplicadores de poder",

    powerCalculation: "Cálculo de Poder",
    powerFormula: "Poder = Poder Base × Multiplicador Foil × Multiplicador Condición",
    powerExample: "Ejemplo: Mítico (800) × Prize Foil (15.0) × Impecable (1.8) = 21,600 poder",

    defenseDeck: "Mazo de Defensa",
    defenseDeckDesc: "Configura tus 5 mejores cartas para defender cuando otros jugadores te ataquen. ¡Actualiza cuando consigas cartas más fuertes!",

    featuredCollections: "Colecciones Destacadas",
    featuredCollectionsDesc: "Colaboraciones con creadores de Vibe Market. Estas cartas pueden usarse como las de $VBMS, siguiendo el mismo sistema de cálculo de poder.",

    nothingPacks: "Nothing Packs",
    nothingPacksDesc: "Cartas no-NFT que pueden comprarse con $VBMS y también quemarse para recuperar parte del valor.",

    // FAQ section
    faqTitle: "Preguntas Frecuentes",

    faq1Q: "¿Necesito pagar para jugar?",
    faq1A: "¡No! PvE y Ataque son completamente gratis. PvP tiene una pequeña tarifa de entrada (20 monedas) que puedes ganar jugando PvE.",

    faq2Q: "¿Cómo consigo más cartas?",
    faq2A: "Compra packs en Vibe Market o abre tus packs sin abrir. También puedes intercambiar cartas con otros jugadores.",

    faq3Q: "¿Puedo perder monedas?",
    faq3A: "En PvE, no pierdes monedas. En PvP, pierdes 20 monedas si pierdes (menos si el oponente es mucho mejor). ¡Modo Ataque es GRATIS!",

    faq4Q: "¿Cuánto dura una partida?",
    faq4A: "PvE: instantáneo. PvP: 1-3 minutos. Ataque: instantáneo.",

    faq5Q: "¿Qué es la clasificación de poder total?",
    faq5A: "Tu poder total es la suma del poder de tus 5 cartas más fuertes. Este valor determina tu posición en la tabla de clasificación y cuánto puedes ganar en recompensas semanales.",

    faq6Q: "¿Puedo atacar al mismo jugador varias veces?",
    faq6A: "Sí, pero solo tienes 5 ataques por día en total, ¡así que úsalos sabiamente!",

    faq7Q: "¿Cómo funcionan los logros?",
    faq7A: "Los logros se desbloquean automáticamente cuando cumples los criterios (coleccionar ciertas cartas). Necesitas hacer clic en 'Reclamar' para recibir las monedas.",

    faq8Q: "¿Qué pasa si no defiendo un ataque?",
    faq8A: "Tu mazo de defensa lucha automáticamente por ti. ¡Configura tus 5 mejores cartas en el mazo de defensa!",

    // Poker Battle section
    pokerBattle: "Batalla de Poker",
    pokerIntro: "Juega poker contra CPU u otros jugadores usando apuestas en VBMS.",
    pokerStakes: "Apuestas",
    pokerRules: "Reglas",
    pokerRule1: "Mejor de 5 rondas - El primero en ganar 4 rondas gana la partida",
    pokerRule2: "El ganador se lleva el 95% del pot (5% comisión de la casa)",
    pokerRule3: "Asegurado en blockchain (contrato VBMS en Base)",
    pokerRule4: "Las partidas PvP son en vivo - ambos juegan simultáneamente",

    // Mecha Arena section
    mechaArena: "Mecha Arena",
    mechaIntro: "¡Mira batallas CPU vs CPU y apuesta en el resultado! Espectea batallas épicas entre oponentes de IA.",
    mechaHowItWorks: "Cómo Funciona",
    mechaStep1: "Elige entre 13 colecciones de arena diferentes",
    mechaStep2: "Dos CPUs batallan automáticamente usando cartas de esa colección",
    mechaStep3: "Deposita VBMS para obtener créditos de apuesta",
    mechaStep4: "Apuesta en cada ronda (1-7) con probabilidades crecientes",
    mechaStep5: "Pagos instantáneos cuando las rondas terminan",
    mechaBettingOdds: "Probabilidades de Apuesta",
    mechaRounds13: "Rondas 1-3: 1.5x probabilidades",
    mechaRounds45: "Rondas 4-5: 1.8x probabilidades",
    mechaRounds67: "Rondas 6-7: 2.0x probabilidades",
    mechaTieBet: "Apuesta de Empate: 3.5x probabilidades",
    mechaDailyBoost: "Boost Diario",
    mechaDailyBoostDesc: "¡Cada día, una colección de arena recibe +0.5x bonus en probabilidades! Busca la insignia HOT.",
    mechaCollections: "Colecciones",

    // Raid Boss section
    raidBoss: "Raid Boss",
    raidBossIntro: "¡Únete a otros jugadores para derrotar jefes poderosos y ganar recompensas exclusivas!",
    raidHowItWorks: "Cómo Funciona",
    raidStep1: "Los jefes aparecen en un horario rotativo",
    raidStep2: "Selecciona cartas de tu colección para atacar",
    raidStep3: "Causa daño basado en el poder de tus cartas",
    raidStep4: "Contribuye al esfuerzo de la comunidad",
    raidStep5: "Gana recompensas basadas en tu contribución de daño",
    raidRewards: "Recompensas",
    raidReward1: "Monedas Coins basadas en el daño causado",
    raidReward2: "Recompensas bonus para los mayores contribuidores",
    raidReward3: "Logros especiales por derrotar jefes",
    raidTips: "Consejos",
    raidTip1: "Usa cartas de alto poder para máximo daño",
    raidTip2: "Las cartas de la colección del jefe causan daño extra",
    raidTip3: "Coordina con otros jugadores para kills más rápidas",

    // VibeFID section
    vibeFID: "🆔 VibeFID",
    vibeFIDIntro: "VibeFID es una carta NFT única basada en tu identidad Farcaster. Tu Neynar Score (engagement y reputación en Farcaster) determina la rareza de la carta, mientras que tu número FID determina los rasgos visuales.",
    vibeFIDHowItWorks: "Cómo Funciona",
    vibeFIDStep1: "Conecta tu cuenta de Farcaster",
    vibeFIDStep2: "Tu Neynar Score determina la rareza (basado en seguidores, casts, reacciones)",
    vibeFIDStep3: "Tu número FID determina el palo, foil y condición",
    vibeFIDStep4: "Paga 0.0003 ETH para mintear tu carta VibeFID única en Base",
    vibeFIDNeynarScore: "Neynar Score → Rareza",
    vibeFIDMythic: "Mítico (≥ 0.99): 800 poder base - Top 1% usuarios Farcaster",
    vibeFIDLegendary: "Legendario (≥ 0.90): 240 poder base - Top 10%",
    vibeFIDEpic: "Épico (≥ 0.79): 80 poder base - Top 21%",
    vibeFIDRare: "Raro (≥ 0.70): 20 poder base - Top 30%",
    vibeFIDCommon: "Común (< 0.70): 5 poder base",
    vibeFIDTraits: "FID → Rasgos",
    vibeFIDOG: "≤ 5,000 (OG): Prize Foil garantizado + condición Pristine",
    vibeFIDTier2: "5,001 - 20,000: Alta probabilidad de Prize Foil",
    vibeFIDTier3: "20,001 - 100,000: Probabilidades mixtas para rasgos raros",
    vibeFIDTier4: "> 100,000: Distribución estándar de rasgos",
    vibeFIDBenefits: "Beneficios para Holders de VibeFID",
    vibeFIDBenefit1: "Boost de Poder: Las cartas VibeFID reciben multiplicadores de poder bonus en batallas",
    vibeFIDBenefit2: "Energía Infinita: Tu carta VibeFID nunca se queda sin energía - siempre lista para batallar",
    vibeFIDBenefit3: "Sin Restricción de Mazo: Puede usarse en cualquier mazo sin importar restricciones de colección",
  },
  "hi": {
    // Navigation
    backToGame: "गेम पर वापस जाएं",
    documentation: "दस्तावेज़ीकरण",
    subtitle: "$VBMS की पूरी गाइड - वह सब कुछ जो आपको जानने की ज़रूरत है",
    sections: "अनुभाग",

    // Section titles
    economy: "अर्थव्यवस्था",
    battles: "लड़ाइयाँ",
    achievements: "उपलब्धियाँ",
    quests: "मिशन",
    cards: "कार्ड",
    faq: "अक्सर पूछे जाने वाले प्रश्न",

    // Economy section (abbreviated for brevity - full translation recommended)
    economyTitle: "अर्थव्यवस्था प्रणाली",
    economyIntro: "$VBMS एक Liquid Trading Cards (LTC) संग्रह है Vibe Market पर, इराक के Most Wanted कार्ड से प्रेरित। गेम में दो मुद्राएं हैं: Coins (इन-गेम) और $VBMS (ब्लॉकचेन टोकन)। 100,000 $VBMS = 1 पैक। वर्तमान में प्रीसेल में - ऐप के DEX पर $VBMS खरीदें/बेचें।",

    howToEarnCoins: "सिक्के कैसे कमाएं",
    earnPve: "PvE (खिलाड़ी बनाम AI)",
    earnPveDesc: "30 जीत/दिन तक। कठिनाइयाँ: GEY (+2), GOOFY (+5), GOONER (+10), GANGSTER (+20), GIGACHAD (+40)",
    earnPvp: "PvP (खिलाड़ी बनाम खिलाड़ी)",
    earnPvpDesc: "जीत: +100 सिक्के (रैंक बोनस)। हार: -20 सिक्के। टाई: 0 सिक्के",
    earnAttack: "हमला मोड",
    earnAttackDesc: "5 हमले/दिन तक। जीत विरोधी के सम्मान अंक चुराती है। मुफ़्त!",
    earnAchievements: "उपलब्धियाँ",
    earnAchievementsDesc: "63 उपलब्धियाँ उपलब्ध हैं जिनमें कुल 302,300 सिक्के हैं",
    earnQuests: "दैनिक और साप्ताहिक मिशन",
    earnQuestsDesc: "अतिरिक्त सिक्के कमाने के लिए उद्देश्य पूरे करें",

    dailyLimit: "दैनिक सीमा",
    dailyLimitDesc: "आप प्रति दिन अधिकतम 1,500 सिक्के कमा सकते हैं (PvE + PvP + उपलब्धियाँ)",

    entryFees: "प्रवेश शुल्क",
    entryFeeAttack: "हमला मोड: मुफ़्त!",
    entryFeePvp: "PvP: 20 सिक्के प्रति मैच",
    entryFeePve: "PvE: मुफ़्त (कोई शुल्क नहीं)",

    // Shortened for brevity - remaining sections would follow similar pattern
    battlesTitle: "लड़ाई प्रणाली",
    battlesIntro: "3 लड़ाई मोड में से चुनें, प्रत्येक के अपने नियम और पुरस्कार हैं।",

    achievementsTitle: "उपलब्धि प्रणाली",
    achievementsIntro: "63 उपलब्धियाँ उपलब्ध हैं जो आपको दुर्लभ कार्ड इकट्ठा करने और उद्देश्य पूरे करने के लिए पुरस्कृत करती हैं।",

    questsTitle: "मिशन प्रणाली",
    questsIntro: "अतिरिक्त सिक्के कमाने के लिए दैनिक और साप्ताहिक मिशन पूरे करें।",

    cardsTitle: "कार्ड प्रणाली",
    cardsIntro: "$VBMS Liquid Trading Cards (LTC) का उपयोग करता है - डिजिटल संग्रहणीय में एक नया प्रतिमान। पारंपरिक NFTs के विपरीत, LTCs को गारंटीड लिक्विडिटी के साथ तुरंत ट्रेड किया जा सकता है। प्रत्येक कार्ड में अद्वितीय विशेषताएं हैं।",

    faqTitle: "अक्सर पूछे जाने वाले प्रश्न",

    // Key FAQ items
    faq1Q: "क्या मुझे खेलने के लिए भुगतान करना होगा?",
    faq1A: "नहीं! PvE और हमला मोड पूरी तरह से मुफ़्त हैं। PvP में एक छोटा प्रवेश शुल्क (20 सिक्के) है जो आप PvE खेलकर कमा सकते हैं।",

    // Abbreviated remaining entries for space
    pveMode: "PvE - खिलाड़ी बनाम AI",
    pvpMode: "PvP - खिलाड़ी बनाम खिलाड़ी",
    attackMode: "हमला मोड",
    dailyQuests: "दैनिक मिशन",
    weeklyQuests: "साप्ताहिक मिशन",
    weeklyRewards: "साप्ताहिक पुरस्कार",
    pveModeDesc: "5 कठिनाई स्तरों में AI (डीलर) के खिलाफ लड़ें। कोई प्रवेश शुल्क नहीं। सिक्के कमाने के लिए प्रति दिन 30 जीत की सीमा।",
    pvpModeDesc: "अन्य खिलाड़ियों के खिलाफ वास्तविक समय की लड़ाई। कमरे बनाएं या शामिल हों। प्रवेश शुल्क: 20 सिक्के।",
    attackModeDesc: "लीडरबोर्ड खिलाड़ियों पर हमला करके उनके सम्मान अंक चुराएं। प्रति दिन 5 हमलों की सीमा। मुफ़्त!",
    pveDifficulties: "कठिनाइयाँ",
    pveGey: "GEY (+2 सिक्के)",
    pveTop: "GOOFY (+5 सिक्के)",
    pveG: "GOONER (+10 सिक्के)",
    pveMid: "GANGSTER (+20 सिक्के)",
    pveGigachad: "GIGACHAD (+40 सिक्के)",
    pvpRewards: "PvP पुरस्कार",
    pvpWin: "जीत: +100 सिक्के (यदि विरोधी उच्च रैंक है तो बोनस)",
    pvpLoss: "हार: -20 सिक्के (यदि विरोधी बेहतर है तो कम)",
    pvpTie: "टाई: 0 सिक्के",
    attackHow: "यह कैसे काम करता है",
    attackStep1: "लीडरबोर्ड से एक विरोधी चुनें",
    attackStep2: "आपके 5 कार्ड बनाम विरोधी की रक्षा डेक",
    attackStep3: "जीत अंक चुराती है, हार अतिरिक्त सिक्के नहीं लेती",
    totalRewards: "कुल पुरस्कार: 302,300 सिक्के",
    achievementCount: "63 उपलब्धियाँ",
    rarityAchievements: "दुर्लभता उपलब्धियाँ",
    rarityDesc: "विभिन्न दुर्लभताओं के कार्ड इकट्ठा करें (सामान्य, दुर्लभ, महाकाव्य, पौराणिक, मिथकीय)",
    rarityCount: "27 दुर्लभता-आधारित उपलब्धियाँ",
    wearAchievements: "स्थिति उपलब्धियाँ",
    wearDesc: "विभिन्न स्थितियों में कार्ड इकट्ठा करें (बेदाग, मिंट, हल्का खेला, मध्यम खेला, भारी खेला)",
    wearCount: "18 स्थिति-आधारित उपलब्धियाँ",
    foilAchievements: "फ़ॉयल उपलब्धियाँ",
    foilDesc: "विशेष चमकदार फ़ॉयल कार्ड इकट्ठा करें",
    foilCount: "6 फ़ॉयल कार्ड उपलब्धियाँ",
    progressiveAchievements: "प्रगतिशील उपलब्धियाँ",
    progressiveDesc: "संग्रह मील के पत्थर पर आधारित 48 उपलब्धियाँ (10, 25, 50, 100 कार्ड)",
    dailyQuestsDesc: "हर दिन मध्यरात्रि UTC पर रीसेट हों",
    dailyQuest1: "रक्षा किला: 1 PvP रक्षा जीतने पर +100 सिक्के",
    weeklyQuestsDesc: "हर सोमवार 00:00 UTC पर रीसेट हों",
    weeklyQuest1: "कुल मैच: 50 मैच खेलें (PvE, PvP, हमला) - 500 सिक्के",
    weeklyQuest2: "हमला जीत: 10 हमले जीतें - 800 सिक्के",
    weeklyQuest3: "रक्षा जीत: 5 बार सफलतापूर्वक रक्षा करें - 300 सिक्के",
    weeklyQuest4: "PvE लकीर: लगातार 10 PvE मैच जीतें - 1,000 सिक्के",
    weeklyRewardsDesc: "हर रविवार 00:00 UTC पर आपकी कुल शक्ति रैंकिंग के आधार पर स्वचालित रूप से वितरित",
    weeklyTier1: "1st स्थान: 1,000 सिक्के",
    weeklyTier2: "2nd स्थान: 750 सिक्के",
    weeklyTier3: "3rd स्थान: 500 सिक्के",
    weeklyTier4: "4th-10th स्थान: 300 सिक्के प्रत्येक",
    cardAttributes: "कार्ड विशेषताएं",
    cardRarity: "दुर्लभता",
    cardRarityDesc: "सामान्य (5), दुर्लभ (20), महाकाव्य (80), पौराणिक (240), मिथकीय (800) - आधार शक्ति मान",
    cardWear: "स्थिति (Wear)",
    cardWearDesc: "बेदाग (×1.8), मिंट (×1.4), हल्का खेला (×1.0), मध्यम खेला (×1.0), भारी खेला (×1.0)",
    cardFoil: "फ़ॉयल",
    cardFoilDesc: "Prize Foil (×15), Standard Foil (×2.5), No Foil (×1.0) - शक्ति गुणक",
    powerCalculation: "शक्ति गणना",
    powerFormula: "शक्ति = आधार शक्ति × फ़ॉयल गुणक × स्थिति गुणक",
    powerExample: "उदाहरण: मिथकीय (800) × Prize Foil (15.0) × बेदाग (1.8) = 21,600 शक्ति",
    defenseDeck: "रक्षा डेक",
    defenseDeckDesc: "जब अन्य खिलाड़ी आप पर हमला करें तो रक्षा के लिए अपने 5 सर्वश्रेष्ठ कार्ड सेट करें। जब भी आपको मजबूत कार्ड मिलें तो अपडेट करें!",
    featuredCollections: "फीचर्ड कलेक्शंस",
    featuredCollectionsDesc: "Vibe Market क्रिएटर्स के साथ सहयोग। ये कार्ड VMW कार्ड की तरह उपयोग किए जा सकते हैं।",
    nothingPacks: "Nothing Packs",
    nothingPacksDesc: "गैर-NFT कार्ड जो $VBMS से खरीदे और बर्न किए जा सकते हैं।",
    faq2Q: "मुझे और कार्ड कैसे मिलें?",
    faq2A: "Vibe Market पर पैक खरीदें या अपने बिना खोले पैक खोलें। आप अन्य खिलाड़ियों के साथ कार्ड का व्यापार भी कर सकते हैं।",
    faq3Q: "क्या मैं सिक्के खो सकता हूं?",
    faq3A: "PvE में, आप सिक्के नहीं खोते। PvP में, आप हारने पर 20 सिक्के खो देते हैं (कम अगर विरोधी बहुत बेहतर है)। हमला मोड मुफ़्त है!",
    faq4Q: "एक मैच में कितना समय लगता है?",
    faq4A: "PvE: तुरंत। PvP: 1-3 मिनट। हमला: तुरंत।",
    faq5Q: "कुल शक्ति रैंकिंग क्या है?",
    faq5A: "आपकी कुल शक्ति आपके 5 सबसे मजबूत कार्डों की शक्ति का योग है। यह मान आपकी लीडरबोर्ड स्थिति निर्धारित करता है और आप साप्ताहिक पुरस्कारों में कितना कमा सकते हैं।",
    faq6Q: "क्या मैं एक ही खिलाड़ी पर कई बार हमला कर सकता हूं?",
    faq6A: "हाँ, लेकिन आपके पास कुल मिलाकर केवल प्रति दिन 5 हमले हैं, इसलिए उन्हें बुद्धिमानी से उपयोग करें!",
    faq7Q: "उपलब्धियाँ कैसे काम करती हैं?",
    faq7A: "जब आप मानदंडों को पूरा करते हैं (कुछ कार्ड इकट्ठा करते हैं) तो उपलब्धियाँ स्वचालित रूप से अनलॉक हो जाती हैं। सिक्के प्राप्त करने के लिए आपको 'दावा करें' पर क्लिक करना होगा।",
    faq8Q: "अगर मैं हमले का बचाव नहीं करता तो क्या होता है?",
    faq8A: "आपकी रक्षा डेक स्वचालित रूप से आपके लिए लड़ती है। रक्षा डेक में अपने 5 सर्वश्रेष्ठ कार्ड सेट करें!",

    // Poker Battle section
    pokerBattle: "पोकर बैटल",
    pokerIntro: "CPU या अन्य खिलाड़ियों के खिलाफ VBMS स्टेक्स का उपयोग करके पोकर खेलें।",
    pokerStakes: "स्टेक्स",
    pokerRules: "नियम",
    pokerRule1: "5 राउंड में से बेस्ट - 4 राउंड जीतने वाला मैच जीतता है",
    pokerRule2: "विजेता पॉट का 95% लेता है (5% हाउस फीस)",
    pokerRule3: "ब्लॉकचेन सुरक्षित (Base पर VBMS कॉन्ट्रैक्ट)",
    pokerRule4: "PvP मैच लाइव हैं - दोनों खिलाड़ी एक साथ खेलते हैं",

    // Mecha Arena section
    mechaArena: "मेका अरीना",
    mechaIntro: "CPU vs CPU बैटल देखें और परिणाम पर दांव लगाएं! AI विरोधियों के बीच महाकाव्य कार्ड बैटल देखें।",
    mechaHowItWorks: "यह कैसे काम करता है",
    mechaStep1: "13 विभिन्न अरीना संग्रहों में से चुनें",
    mechaStep2: "दो CPU उस संग्रह के कार्ड का उपयोग करके स्वचालित रूप से लड़ते हैं",
    mechaStep3: "बेटिंग क्रेडिट पाने के लिए VBMS जमा करें",
    mechaStep4: "बढ़ती हुई संभावनाओं के साथ प्रत्येक राउंड (1-7) पर दांव लगाएं",
    mechaStep5: "राउंड समाप्त होने पर तत्काल भुगतान",
    mechaBettingOdds: "बेटिंग ऑड्स",
    mechaRounds13: "राउंड 1-3: 1.5x ऑड्स",
    mechaRounds45: "राउंड 4-5: 1.8x ऑड्स",
    mechaRounds67: "राउंड 6-7: 2.0x ऑड्स",
    mechaTieBet: "टाई बेट: 3.5x ऑड्स",
    mechaDailyBoost: "डेली बूस्ट",
    mechaDailyBoostDesc: "हर दिन, एक अरीना संग्रह को +0.5x बोनस ऑड्स मिलता है! HOT बैज देखें।",
    mechaCollections: "संग्रह",

    // Raid Boss section
    raidBoss: "रेड बॉस",
    raidBossIntro: "शक्तिशाली बॉस को हराने और विशेष पुरस्कार अर्जित करने के लिए अन्य खिलाड़ियों के साथ टीम बनाएं!",
    raidHowItWorks: "यह कैसे काम करता है",
    raidStep1: "बॉस घूर्णन शेड्यूल पर दिखाई देते हैं",
    raidStep2: "हमला करने के लिए अपने संग्रह से कार्ड चुनें",
    raidStep3: "अपने कार्ड पावर के आधार पर नुकसान पहुंचाएं",
    raidStep4: "समुदाय के प्रयास में योगदान करें",
    raidStep5: "नुकसान के योगदान के आधार पर पुरस्कार अर्जित करें",
    raidRewards: "पुरस्कार",
    raidReward1: "पहुंचाए गए नुकसान के आधार पर Coins सिक्के",
    raidReward2: "शीर्ष योगदानकर्ताओं के लिए बोनस पुरस्कार",
    raidReward3: "बॉस हराने के लिए विशेष उपलब्धियां",
    raidTips: "टिप्स",
    raidTip1: "अधिकतम नुकसान के लिए उच्च-शक्ति वाले कार्ड का उपयोग करें",
    raidTip2: "बॉस संग्रह के कार्ड अतिरिक्त नुकसान करते हैं",
    raidTip3: "तेज किल के लिए अन्य खिलाड़ियों के साथ समन्वय करें",

    // VibeFID section
    vibeFID: "🆔 VibeFID",
    vibeFIDIntro: "अपने Farcaster ID के आधार पर अद्वितीय ट्रेडिंग कार्ड बनाएं! आपका Neynar Score आपके कार्ड की दुर्लभता निर्धारित करता है।",
    vibeFIDHowItWorks: "यह कैसे काम करता है",
    vibeFIDStep1: "अपना VibeFID कार्ड मिंट करने के लिए Farcaster से कनेक्ट करें (0.0003 ETH)",
    vibeFIDStep2: "आपका Neynar Score कार्ड की दुर्लभता निर्धारित करता है",
    vibeFIDStep3: "उच्च स्कोर = उच्च दुर्लभता और अधिक शक्ति",
    vibeFIDStep4: "तुरंत बैटल में उपयोग करें और विशेष लाभ प्राप्त करें",
    vibeFIDNeynarScore: "Neynar Score → दुर्लभता",
    vibeFIDMythic: "मिथकीय (≥ 0.99): 800 आधार शक्ति",
    vibeFIDLegendary: "पौराणिक (≥ 0.90): 240 आधार शक्ति",
    vibeFIDEpic: "महाकाव्य (≥ 0.79): 80 आधार शक्ति",
    vibeFIDRare: "दुर्लभ (≥ 0.70): 20 आधार शक्ति",
    vibeFIDCommon: "सामान्य (< 0.70): 5 आधार शक्ति",
    vibeFIDTraits: "Neynar Score → गुण",
    vibeFIDOG: "≥ 0.99 (मिथकीय): गारंटीड Prize Foil + Pristine स्थिति",
    vibeFIDTier2: "≥ 0.90 (पौराणिक): Prize Foil के लिए उच्च संभावना",
    vibeFIDTier3: "≥ 0.79 (महाकाव्य): दुर्लभ गुणों के लिए मिश्रित संभावनाएं",
    vibeFIDTier4: "< 0.79: मानक गुण वितरण",
    vibeFIDBenefits: "VibeFID धारकों के लाभ",
    vibeFIDBenefit1: "पावर बूस्ट: VibeFID कार्ड बैटल में बोनस पावर गुणक प्राप्त करते हैं",
    vibeFIDBenefit2: "अनंत ऊर्जा: आपका VibeFID कार्ड कभी भी ऊर्जा से बाहर नहीं होता - हमेशा बैटल के लिए तैयार",
    vibeFIDBenefit3: "कोई डेक प्रतिबंध नहीं: संग्रह प्रतिबंधों की परवाह किए बिना किसी भी डेक में उपयोग किया जा सकता है",
  },
  "ru": {
    // Navigation
    backToGame: "Вернуться к игре",
    documentation: "Документация",
    subtitle: "Полное руководство $VBMS - Все, что вам нужно знать",
    sections: "Разделы",

    // Section titles
    economy: "Экономика",
    battles: "Битвы",
    achievements: "Достижения",
    quests: "Квесты",
    cards: "Карты",
    faq: "Часто задаваемые вопросы",

    // Economy section (abbreviated - full translation recommended)
    economyTitle: "Экономическая система",
    economyIntro: "$VBMS - коллекция Liquid Trading Cards (LTC) на Vibe Market, вдохновлённая картами Most Wanted Ирака. В игре две валюты: Coins (внутриигровая) и $VBMS (блокчейн-токен). 100,000 $VBMS = 1 пак. Сейчас в пресейле - покупайте/продавайте $VBMS через DEX в приложении.",

    howToEarnCoins: "Как заработать монеты",
    earnPve: "PvE (Игрок против ИИ)",
    earnPveDesc: "До 30 побед/день. Сложности: GEY (+2), GOOFY (+5), GOONER (+10), GANGSTER (+20), GIGACHAD (+40)",
    earnPvp: "PvP (Игрок против игрока)",
    earnPvpDesc: "Победа: +100 монет (бонус за ранг). Поражение: -20 монет. Ничья: 0 монет",
    earnAttack: "Режим атаки",
    earnAttackDesc: "До 5 атак/день. Победа крадет очки чести противника. БЕСПЛАТНО!",
    earnAchievements: "Достижения",
    earnAchievementsDesc: "63 достижения на общую сумму 302,300 монет",
    earnQuests: "Ежедневные и еженедельные квесты",
    earnQuestsDesc: "Выполняйте задания, чтобы заработать дополнительные монеты",

    dailyLimit: "Дневной лимит",
    dailyLimitDesc: "Вы можете заработать максимум 1,500 монет в день (PvE + PvP + Достижения)",

    entryFees: "Входная плата",
    entryFeeAttack: "Режим атаки: БЕСПЛАТНО!",
    entryFeePvp: "PvP: 20 монет за матч",
    entryFeePve: "PvE: Бесплатно (без платы)",

    // Battles section (abbreviated)
    battlesTitle: "Система битв",
    battlesIntro: "Выберите один из 3 режимов битвы, каждый со своими правилами и наградами.",

    pveMode: "PvE - Игрок против ИИ",
    pveModeDesc: "Сражайтесь против ИИ (Дилера) на 5 уровнях сложности. Без входной платы. Лимит 30 побед в день для заработка монет.",
    pveDifficulties: "Сложности",
    pveGey: "GEY (+2 монеты)",
    pveTop: "GOOFY (+5 монет)",
    pveG: "GOONER (+10 монет)",
    pveMid: "GANGSTER (+20 монет)",
    pveGigachad: "GIGACHAD (+40 монет)",

    pvpMode: "PvP - Игрок против игрока",
    pvpModeDesc: "Битвы в реальном времени против других игроков. Создайте или присоединитесь к комнатам. Входная плата: 20 монет.",
    pvpRewards: "Награды PvP",
    pvpWin: "Победа: +100 монет (бонус, если противник выше рангом)",
    pvpLoss: "Поражение: -20 монет (меньше, если противник сильнее)",
    pvpTie: "Ничья: 0 монет",

    attackMode: "Режим атаки",
    attackModeDesc: "Атакуйте игроков из таблицы лидеров, чтобы украсть их очки чести. Лимит 5 атак в день. БЕСПЛАТНО!",
    attackHow: "Как это работает",
    attackStep1: "Выберите противника из таблицы лидеров",
    attackStep2: "Ваши 5 карт против защитной колоды противника",
    attackStep3: "Победа крадет очки, поражение не стоит дополнительных монет",

    // Achievements section (abbreviated)
    achievementsTitle: "Система достижений",
    achievementsIntro: "63 достижения, которые награждают вас за сбор редких карт и выполнение задач.",
    totalRewards: "Общие награды: 302,300 монет",
    achievementCount: "63 достижения",

    rarityAchievements: "Достижения по редкости",
    rarityDesc: "Собирайте карты разной редкости (Обычный, Редкий, Эпический, Легендарный, Мифический)",
    rarityCount: "27 достижений по редкости",

    wearAchievements: "Достижения по состоянию",
    wearDesc: "Собирайте карты в разных состояниях (Идеальное, Mint, Слегка играная, Средне играная, Сильно играная)",
    wearCount: "18 достижений по состоянию",

    foilAchievements: "Фольгированные достижения",
    foilDesc: "Собирайте специальные блестящие фольгированные карты",
    foilCount: "6 достижений фольгированных карт",

    progressiveAchievements: "Прогрессивные достижения",
    progressiveDesc: "48 достижений на основе вех коллекции (10, 25, 50, 100 карт)",

    // Quests section (abbreviated)
    questsTitle: "Система квестов",
    questsIntro: "Выполняйте ежедневные и еженедельные квесты, чтобы заработать дополнительные монеты.",

    dailyQuests: "Ежедневные квесты",
    dailyQuestsDesc: "Сбрасываются каждый день в полночь UTC",
    dailyQuest1: "Крепость защиты: +100 монет за победу в 1 защите PvP",

    weeklyQuests: "Еженедельные квесты",
    weeklyQuestsDesc: "Сбрасываются каждый понедельник в 00:00 UTC",
    weeklyQuest1: "Всего матчей: Сыграйте 50 матчей (PvE, PvP, Атака) - 500 монет",
    weeklyQuest2: "Победы в атаке: Выиграйте 10 атак - 800 монет",
    weeklyQuest3: "Победы в защите: Успешно защититесь 5 раз - 300 монет",
    weeklyQuest4: "Серия PvE: Выиграйте 10 матчей PvE подряд - 1,000 монет",

    weeklyRewards: "Еженедельные награды",
    weeklyRewardsDesc: "Автоматически распределяются каждое воскресенье в 00:00 UTC на основе вашего рейтинга общей мощности",
    weeklyTier1: "1-е место: 1,000 монет",
    weeklyTier2: "2-е место: 750 монет",
    weeklyTier3: "3-е место: 500 монет",
    weeklyTier4: "4-10 места: 300 монет каждому",

    // Cards section (abbreviated)
    cardsTitle: "Система карт",
    cardsIntro: "$VBMS использует Liquid Trading Cards (LTC) - новую парадигму цифровых коллекционных предметов. В отличие от традиционных NFT, LTC можно мгновенно обменивать с гарантированной ликвидностью. Каждая карта имеет уникальные атрибуты.",

    cardAttributes: "Атрибуты карт",
    cardRarity: "Редкость",
    cardRarityDesc: "Обычный (5), Редкий (20), Эпический (80), Легендарный (240), Мифический (800) - базовые значения мощности",
    cardWear: "Состояние (Wear)",
    cardWearDesc: "Идеальное (×1.8), Mint (×1.4), Слегка играная (×1.0), Средне играная (×1.0), Сильно играная (×1.0)",
    cardFoil: "Фольга",
    cardFoilDesc: "Prize Foil (×15), Standard Foil (×2.5), No Foil (×1.0) - множители мощности",

    powerCalculation: "Расчет мощности",
    powerFormula: "Мощность = Базовая мощность × Множитель фольги × Множитель состояния",
    powerExample: "Пример: Мифический (800) × Prize Foil (15.0) × Идеальное (1.8) = 21,600 мощности",

    defenseDeck: "Защитная колода",
    defenseDeckDesc: "Установите свои 5 лучших карт для защиты, когда другие игроки атакуют вас. Обновляйте, когда получаете более сильные карты!",

    featuredCollections: "Избранные Коллекции",
    featuredCollectionsDesc: "Коллаборации с создателями Vibe Market. Эти карты можно использовать как карты VMW.",

    nothingPacks: "Nothing Packs",
    nothingPacksDesc: "Не-NFT карты, которые можно купить за $VBMS и сжечь для возврата части стоимости.",

    // FAQ section (abbreviated)
    faqTitle: "Часто задаваемые вопросы",

    faq1Q: "Нужно ли платить, чтобы играть?",
    faq1A: "Нет! PvE и режим атаки полностью бесплатны. PvP имеет небольшую входную плату (20 монет), которую вы можете заработать, играя в PvE.",

    faq2Q: "Как получить больше карт?",
    faq2A: "Покупайте паки на Vibe Market или открывайте свои неоткрытые паки. Вы также можете обменивать карты с другими игроками.",

    faq3Q: "Могу ли я потерять монеты?",
    faq3A: "В PvE вы не теряете монеты. В PvP вы теряете 20 монет при поражении (меньше, если противник намного сильнее). Режим атаки БЕСПЛАТЕН!",

    faq4Q: "Сколько длится матч?",
    faq4A: "PvE: мгновенно. PvP: 1-3 минуты. Атака: мгновенно.",

    faq5Q: "Что такое рейтинг общей мощности?",
    faq5A: "Ваша общая мощность - это сумма мощности ваших 5 сильнейших карт. Это значение определяет вашу позицию в таблице лидеров и сколько вы можете заработать в еженедельных наградах.",

    faq6Q: "Могу ли я атаковать одного и того же игрока несколько раз?",
    faq6A: "Да, но у вас всего 5 атак в день, так что используйте их мудро!",

    faq7Q: "Как работают достижения?",
    faq7A: "Достижения автоматически разблокируются, когда вы выполняете критерии (собираете определенные карты). Вам нужно нажать 'Получить', чтобы получить монеты.",

    faq8Q: "Что происходит, если я не защищаюсь от атаки?",
    faq8A: "Ваша защитная колода автоматически сражается за вас. Установите свои 5 лучших карт в защитную колоду!",

    // Poker Battle section
    pokerBattle: "Покер Баттл",
    pokerIntro: "Играйте в покер против CPU или других игроков, используя ставки VBMS.",
    pokerStakes: "Ставки",
    pokerRules: "Правила",
    pokerRule1: "Лучший из 5 раундов - Первый, кто выиграет 4 раунда, выигрывает матч",
    pokerRule2: "Победитель забирает 95% банка (5% комиссия дома)",
    pokerRule3: "Защищено блокчейном (контракт VBMS на Base)",
    pokerRule4: "PvP матчи живые - оба игрока играют одновременно",

    // Mecha Arena section
    mechaArena: "Меха Арена",
    mechaIntro: "Смотрите битвы CPU против CPU и делайте ставки на результат! Наблюдайте за эпическими карточными сражениями между AI противниками.",
    mechaHowItWorks: "Как это работает",
    mechaStep1: "Выберите одну из 13 различных коллекций арены",
    mechaStep2: "Два CPU автоматически сражаются, используя карты из этой коллекции",
    mechaStep3: "Внесите VBMS, чтобы получить кредиты для ставок",
    mechaStep4: "Делайте ставки на каждый раунд (1-7) с растущими шансами",
    mechaStep5: "Мгновенные выплаты при завершении раундов",
    mechaBettingOdds: "Коэффициенты ставок",
    mechaRounds13: "Раунды 1-3: коэффициент 1.5x",
    mechaRounds45: "Раунды 4-5: коэффициент 1.8x",
    mechaRounds67: "Раунды 6-7: коэффициент 2.0x",
    mechaTieBet: "Ставка на ничью: коэффициент 3.5x",
    mechaDailyBoost: "Ежедневный бонус",
    mechaDailyBoostDesc: "Каждый день одна коллекция арены получает +0.5x бонус к коэффициентам! Ищите значок HOT.",
    mechaCollections: "Коллекции",

    // Raid Boss section
    raidBoss: "Рейд Босс",
    raidBossIntro: "Объединяйтесь с другими игроками, чтобы победить могущественных боссов и получить эксклюзивные награды!",
    raidHowItWorks: "Как это работает",
    raidStep1: "Боссы появляются по ротационному расписанию",
    raidStep2: "Выбирайте карты из своей коллекции для атаки",
    raidStep3: "Наносите урон на основе силы ваших карт",
    raidStep4: "Вносите вклад в общие усилия сообщества",
    raidStep5: "Получайте награды на основе вклада в урон",
    raidRewards: "Награды",
    raidReward1: "Монеты Coins на основе нанесенного урона",
    raidReward2: "Бонусные награды для топ-контрибьютеров",
    raidReward3: "Специальные достижения за победу над боссами",
    raidTips: "Советы",
    raidTip1: "Используйте карты высокой силы для максимального урона",
    raidTip2: "Карты из коллекции босса наносят дополнительный урон",
    raidTip3: "Координируйтесь с другими игроками для более быстрых убийств",

    // VibeFID section
    vibeFID: "🆔 VibeFID",
    vibeFIDIntro: "VibeFID - это уникальная NFT-карта на основе вашей Farcaster личности. Ваш Neynar Score (вовлечённость и репутация в Farcaster) определяет редкость карты, а номер FID определяет визуальные характеристики.",
    vibeFIDHowItWorks: "Как это работает",
    vibeFIDStep1: "Подключите свой аккаунт Farcaster",
    vibeFIDStep2: "Ваш Neynar Score определяет редкость карты (на основе подписчиков, постов, реакций)",
    vibeFIDStep3: "Ваш номер FID определяет масть, фольгу и состояние",
    vibeFIDStep4: "Заплатите 0.0003 ETH для чеканки уникальной карты VibeFID на Base",
    vibeFIDNeynarScore: "Neynar Score → Редкость",
    vibeFIDMythic: "Мифический (≥ 0.99): 800 базовой силы - Топ 1% пользователей Farcaster",
    vibeFIDLegendary: "Легендарный (≥ 0.90): 240 базовой силы - Топ 10%",
    vibeFIDEpic: "Эпический (≥ 0.79): 80 базовой силы - Топ 21%",
    vibeFIDRare: "Редкий (≥ 0.70): 20 базовой силы - Топ 30%",
    vibeFIDCommon: "Обычный (< 0.70): 5 базовой силы",
    vibeFIDTraits: "FID → Характеристики",
    vibeFIDOG: "≤ 5,000 (OG): Гарантированный Prize Foil + Pristine состояние",
    vibeFIDTier2: "5,001 - 20,000: Высокий шанс на Prize Foil",
    vibeFIDTier3: "20,001 - 100,000: Смешанные шансы на редкие характеристики",
    vibeFIDTier4: "> 100,000: Стандартное распределение характеристик",
    vibeFIDBenefits: "Преимущества владельца VibeFID",
    vibeFIDBenefit1: "Бонус силы: Карты VibeFID получают бонусные множители силы в битвах",
    vibeFIDBenefit2: "Бесконечная энергия: Ваша карта VibeFID никогда не теряет энергию - всегда готова к битве",
    vibeFIDBenefit3: "Без ограничений колоды: Может использоваться в любой колоде независимо от ограничений коллекции",
  },
  "zh-CN": {
    // Navigation
    backToGame: "返回游戏",
    documentation: "文档",
    subtitle: "$VBMS 完整指南 - 您需要知道的一切",
    sections: "部分",

    // Section titles
    economy: "经济",
    battles: "战斗",
    achievements: "成就",
    quests: "任务",
    cards: "卡牌",
    faq: "常见问题",

    // Economy section (abbreviated)
    economyTitle: "经济系统",
    economyIntro: "$VBMS是Vibe Market上的Liquid Trading Cards (LTC)收藏，灵感来自伊拉克通缉令扑克牌。游戏有两种货币：Coins（游戏内）和$VBMS（区块链代币）。100,000 $VBMS = 1个卡包。目前处于预售阶段 - 通过应用内DEX买卖$VBMS。",

    howToEarnCoins: "如何赚取金币",
    earnPve: "PvE (玩家对AI)",
    earnPveDesc: "每天最多30场胜利。难度：GEY (+2)、GOOFY (+5)、GOONER (+10)、GANGSTER (+20)、GIGACHAD (+40)",
    earnPvp: "PvP (玩家对玩家)",
    earnPvpDesc: "胜利: +100 金币 (排名加成)。失败: -20 金币。平局: 0 金币",
    earnAttack: "攻击模式",
    earnAttackDesc: "每天最多5次攻击。胜利窃取对手荣誉积分。免费！",
    earnAchievements: "成就",
    earnAchievementsDesc: "63项成就，总计302,300金币",
    earnQuests: "每日和每周任务",
    earnQuestsDesc: "完成目标以赚取额外金币",

    dailyLimit: "每日限制",
    dailyLimitDesc: "您每天最多可以赚取1,500金币 (PvE + PvP + 成就)",

    entryFees: "入场费",
    entryFeeAttack: "攻击模式: 免费！",
    entryFeePvp: "PvP: 每场20金币",
    entryFeePve: "PvE: 免费 (无费用)",

    // Battles section (abbreviated)
    battlesTitle: "战斗系统",
    battlesIntro: "从3种战斗模式中选择，每种都有自己的规则和奖励。",

    pveMode: "PvE - 玩家对AI",
    pveModeDesc: "在5个难度级别对抗AI (庄家)。无入场费。每天最多30场胜利以赚取金币。",
    pveDifficulties: "难度",
    pveGey: "GEY (+2 金币)",
    pveTop: "GOOFY (+5 金币)",
    pveG: "GOONER (+10 金币)",
    pveMid: "GANGSTER (+20 金币)",
    pveGigachad: "GIGACHAD (+40 金币)",

    pvpMode: "PvP - 玩家对玩家",
    pvpModeDesc: "与其他玩家实时战斗。创建或加入房间。入场费：20金币。",
    pvpRewards: "PvP 奖励",
    pvpWin: "胜利: +100 金币 (如果对手排名更高有加成)",
    pvpLoss: "失败: -20 金币 (如果对手更强则减少)",
    pvpTie: "平局: 0 金币",

    attackMode: "攻击模式",
    attackModeDesc: "攻击排行榜玩家窃取他们的荣誉积分。每天限制5次攻击。免费！",
    attackHow: "如何运作",
    attackStep1: "从排行榜选择对手",
    attackStep2: "您的5张卡牌对抗对手的防守卡组",
    attackStep3: "胜利窃取积分，失败不花费额外金币",

    // Achievements section (abbreviated)
    achievementsTitle: "成就系统",
    achievementsIntro: "63项成就奖励您收集稀有卡牌和完成目标。",
    totalRewards: "总奖励: 302,300 金币",
    achievementCount: "63 项成就",

    rarityAchievements: "稀有度成就",
    rarityDesc: "收集不同稀有度的卡牌 (普通、稀有、史诗、传说、神话)",
    rarityCount: "27项基于稀有度的成就",

    wearAchievements: "状态成就",
    wearDesc: "收集不同状态的卡牌 (完美、Mint、轻度使用、中度使用、重度使用)",
    wearCount: "18项基于状态的成就",

    foilAchievements: "闪卡成就",
    foilDesc: "收集特殊闪亮的闪卡",
    foilCount: "6项闪卡成就",

    progressiveAchievements: "渐进式成就",
    progressiveDesc: "48项基于收藏里程碑的成就 (10、25、50、100张卡牌)",

    // Quests section (abbreviated)
    questsTitle: "任务系统",
    questsIntro: "完成每日和每周任务以赚取额外金币。",

    dailyQuests: "每日任务",
    dailyQuestsDesc: "每天UTC午夜重置",
    dailyQuest1: "防御堡垒: 赢得1场PvP防守 +100 金币",

    weeklyQuests: "每周任务",
    weeklyQuestsDesc: "每周一 00:00 UTC 重置",
    weeklyQuest1: "总比赛: 进行50场比赛 (PvE, PvP, 攻击) - 500 金币",
    weeklyQuest2: "攻击胜利: 赢得10场攻击 - 800 金币",
    weeklyQuest3: "防守胜利: 成功防守5次 - 300 金币",
    weeklyQuest4: "PvE连胜: 连续赢得10场PvE比赛 - 1,000 金币",

    weeklyRewards: "每周奖励",
    weeklyRewardsDesc: "每周日 00:00 UTC 根据您的总力量排名自动分发",
    weeklyTier1: "第1名: 1,000 金币",
    weeklyTier2: "第2名: 750 金币",
    weeklyTier3: "第3名: 500 金币",
    weeklyTier4: "第4-10名: 每人300 金币",

    // Cards section (abbreviated)
    cardsTitle: "卡牌系统",
    cardsIntro: "$VBMS使用Liquid Trading Cards (LTC) - 数字收藏品的新范式。与传统NFT不同，LTC可以即时交易并保证流动性。每张卡牌都有独特的属性决定其战斗力。",

    cardAttributes: "卡牌属性",
    cardRarity: "稀有度",
    cardRarityDesc: "普通 (5)、稀有 (20)、史诗 (80)、传说 (240)、神话 (800) - 基础力量值",
    cardWear: "状态 (Wear)",
    cardWearDesc: "完美 (×1.8)、Mint (×1.4)、轻度使用 (×1.0)、中度使用 (×1.0)、重度使用 (×1.0)",
    cardFoil: "闪卡",
    cardFoilDesc: "Prize Foil (×15)、Standard Foil (×2.5)、No Foil (×1.0) - 力量倍数",

    powerCalculation: "力量计算",
    powerFormula: "力量 = 基础力量 × 闪卡倍数 × 状态倍数",
    powerExample: "示例: 神话 (800) × Prize Foil (15.0) × 完美 (1.8) = 21,600 力量",

    defenseDeck: "防守卡组",
    defenseDeckDesc: "设置您最好的5张卡牌，当其他玩家攻击您时进行防守。获得更强卡牌时立即更新！",

    featuredCollections: "精选系列",
    featuredCollectionsDesc: "与Vibe Market创作者的合作。这些卡牌可以像VMW卡牌一样使用。",
    nothingPacks: "Nothing Packs",
    nothingPacksDesc: "非NFT卡牌，可用$VBMS购买并燃烧以回收部分价值。",

    // FAQ section (abbreviated)
    faqTitle: "常见问题",

    faq1Q: "我需要付费才能玩吗？",
    faq1A: "不需要！PvE和攻击模式完全免费。PvP有小额入场费 (20金币)，您可以通过玩PvE赚取。",

    faq2Q: "如何获得更多卡牌？",
    faq2A: "在Vibe Market购买卡包或打开您未开封的卡包。您也可以与其他玩家交易卡牌。",

    faq3Q: "我会失去金币吗？",
    faq3A: "在PvE中，您不会失去金币。在PvP中，如果您输了会失去20金币 (如果对手强很多则减少)。攻击模式免费！",

    faq4Q: "一场比赛需要多长时间？",
    faq4A: "PvE: 即时。PvP: 1-3分钟。攻击: 即时。",

    faq5Q: "什么是总力量排名？",
    faq5A: "您的总力量是您5张最强卡牌的力量总和。此值决定您的排行榜位置以及您在每周奖励中可以赚取多少。",

    faq6Q: "我可以多次攻击同一个玩家吗？",
    faq6A: "可以，但您每天总共只有5次攻击，所以要明智使用！",

    faq7Q: "成就如何运作？",
    faq7A: "当您满足标准 (收集特定卡牌) 时，成就会自动解锁。您需要点击'领取'以获得金币。",

    faq8Q: "如果我不防守攻击会发生什么？",
    faq8A: "您的防守卡组会自动为您战斗。在防守卡组中设置您最好的5张卡牌！",

    // Poker Battle section
    pokerBattle: "扑克对战",
    pokerIntro: "使用VBMS筹码与CPU或其他玩家进行扑克游戏。",
    pokerStakes: "筹码",
    pokerRules: "规则",
    pokerRule1: "5局3胜 - 先赢4局者获胜",
    pokerRule2: "赢家获得95%奖池（5%平台费）",
    pokerRule3: "区块链安全保障（Base链上VBMS合约）",
    pokerRule4: "PvP比赛实时进行 - 双方同时游戏",

    // Mecha Arena section
    mechaArena: "机甲竞技场",
    mechaIntro: "观看CPU对战CPU的战斗并下注结果！观看AI对手之间史诗般的卡牌战斗。",
    mechaHowItWorks: "如何运作",
    mechaStep1: "从13个不同的竞技场收藏中选择",
    mechaStep2: "两个CPU使用该收藏的卡牌自动战斗",
    mechaStep3: "存入VBMS获得投注积分",
    mechaStep4: "在每轮（1-7）以递增赔率下注",
    mechaStep5: "回合结束时即时支付",
    mechaBettingOdds: "投注赔率",
    mechaRounds13: "第1-3轮：1.5倍赔率",
    mechaRounds45: "第4-5轮：1.8倍赔率",
    mechaRounds67: "第6-7轮：2.0倍赔率",
    mechaTieBet: "平局投注：3.5倍赔率",
    mechaDailyBoost: "每日加成",
    mechaDailyBoostDesc: "每天，一个竞技场收藏获得+0.5倍赔率加成！寻找HOT标志。",
    mechaCollections: "收藏",

    // Raid Boss section
    raidBoss: "突袭Boss",
    raidBossIntro: "与其他玩家组队击败强大的Boss并赚取独家奖励！",
    raidHowItWorks: "如何运作",
    raidStep1: "Boss按轮换时间表出现",
    raidStep2: "从您的收藏中选择卡牌进行攻击",
    raidStep3: "根据您的卡牌力量造成伤害",
    raidStep4: "为社区努力做出贡献",
    raidStep5: "根据伤害贡献获得奖励",
    raidRewards: "奖励",
    raidReward1: "根据造成的伤害获得Coins金币",
    raidReward2: "顶级贡献者的额外奖励",
    raidReward3: "击败Boss的特殊成就",
    raidTips: "提示",
    raidTip1: "使用高力量卡牌造成最大伤害",
    raidTip2: "Boss收藏中的卡牌造成额外伤害",
    raidTip3: "与其他玩家协调以更快击杀",

    // VibeFID section
    vibeFID: "🆔 VibeFID",
    vibeFIDIntro: "铸造您独特的Farcaster身份卡！您的Neynar分数决定稀有度，铸造价格0.0003 ETH。",
    vibeFIDHowItWorks: "如何运作",
    vibeFIDStep1: "通过Farcaster连接以铸造您的VibeFID卡",
    vibeFIDStep2: "您的Neynar分数决定卡牌稀有度",
    vibeFIDStep3: "您的FID号码决定闪卡和磨损特性",
    vibeFIDStep4: "较低的FID = 更好的稀有特性机会",
    vibeFIDNeynarScore: "Neynar分数 → 稀有度",
    vibeFIDMythic: "神话 (≥ 0.99): 800基础力量",
    vibeFIDLegendary: "传说 (≥ 0.90): 240基础力量",
    vibeFIDEpic: "史诗 (≥ 0.79): 80基础力量",
    vibeFIDRare: "稀有 (≥ 0.70): 20基础力量",
    vibeFIDCommon: "普通 (< 0.70): 5基础力量",
    vibeFIDTraits: "FID → 特性",
    vibeFIDOG: "≤ 5,000 (OG): 100% Prize Foil + 100% Pristine",
    vibeFIDTier2: "5,001 - 20,000: 80% Prize Foil, 90% Pristine",
    vibeFIDTier3: "20,001 - 100,000: 混合机会",
    vibeFIDTier4: "> 100,000: 较低的稀有特性机会",
    vibeFIDBenefits: "VibeFID福利",
    vibeFIDBenefit1: "力量加成: 所有卡牌+10%力量",
    vibeFIDBenefit2: "无限能量: 战斗无能量限制",
    vibeFIDBenefit3: "无卡组限制: 在卡组中使用任何卡牌",
  },
  "id": {
    // Navigation
    backToGame: "Kembali ke Game",
    documentation: "Dokumentasi",
    subtitle: "Panduan lengkap $VBMS - Semua yang perlu kamu ketahui",
    sections: "Bagian",

    // Section titles
    economy: "Ekonomi",
    battles: "Pertempuran",
    achievements: "Prestasi",
    quests: "Misi",
    cards: "Kartu",
    faq: "FAQ",

    // Economy section
    economyTitle: "Sistem Ekonomi",
    economyIntro: "$VBMS adalah koleksi Liquid Trading Cards (LTC) di Vibe Market, terinspirasi kartu Most Wanted Irak. Game ini punya dua mata uang: Coins (koin in-game dari bermain) dan $VBMS (token blockchain). 100.000 $VBMS = 1 pack. Saat ini presale - beli/jual $VBMS melalui DEX in-app.",

    howToEarnCoins: "Cara Dapat Koin",
    earnPve: "PvE (Pemain vs AI)",
    earnPveDesc: "Sampai 30 menang/hari. Kesulitan: GEY (+2), GOOFY (+5), GOONER (+10), GANGSTER (+20), GIGACHAD (+40)",
    earnPvp: "PvP (Pemain vs Pemain)",
    earnPvpDesc: "Menang: +100 koin (bonus rank). Kalah: -20 koin. Seri: 0 koin",
    earnAttack: "Mode Serangan",
    earnAttackDesc: "Sampai 5 serangan/hari. Menang mencuri poin kehormatan lawan. GRATIS!",
    earnAchievements: "Prestasi",
    earnAchievementsDesc: "63 prestasi tersedia total 302.300 koin",
    earnQuests: "Misi Harian dan Mingguan",
    earnQuestsDesc: "Selesaikan tujuan untuk dapat koin ekstra",

    dailyLimit: "Batas Harian",
    dailyLimitDesc: "Kamu bisa dapat maksimal 1.500 koin per hari (PvE + PvP + Prestasi)",

    entryFees: "Biaya Masuk",
    entryFeeAttack: "Mode Serangan: GRATIS!",
    entryFeePvp: "PvP: 20 koin per pertandingan",
    entryFeePve: "PvE: Gratis (tanpa biaya)",

    // Battles section
    battlesTitle: "Sistem Pertempuran",
    battlesIntro: "Pilih dari 3 mode pertempuran, masing-masing dengan aturan dan hadiah sendiri.",

    pveMode: "PvE - Pemain vs AI",
    pveModeDesc: "Lawan AI (Dealer) di 5 level kesulitan. Tanpa biaya masuk. Batas 30 menang per hari untuk dapat koin.",
    pveDifficulties: "Kesulitan",
    pveGey: "GEY (+2 koin)",
    pveTop: "GOOFY (+5 koin)",
    pveG: "GOONER (+10 koin)",
    pveMid: "GANGSTER (+20 koin)",
    pveGigachad: "GIGACHAD (+40 koin)",

    pvpMode: "PvP - Pemain vs Pemain",
    pvpModeDesc: "Pertempuran real-time dengan pemain lain. Buat atau gabung ruangan. Biaya masuk: 20 koin.",
    pvpRewards: "Hadiah PvP",
    pvpWin: "Menang: +100 koin (bonus jika lawan lebih tinggi)",
    pvpLoss: "Kalah: -20 koin (dikurangi jika lawan lebih kuat)",
    pvpTie: "Seri: 0 koin",

    attackMode: "Mode Serangan",
    attackModeDesc: "Serang pemain papan peringkat untuk mencuri poin kehormatan mereka. Batas 5 serangan per hari. GRATIS!",
    attackHow: "Cara Kerja",
    attackStep1: "Pilih lawan dari papan peringkat",
    attackStep2: "5 kartumu vs deck pertahanan lawan",
    attackStep3: "Menang mencuri poin, kalah tidak biaya ekstra koin",

    // Achievements section
    achievementsTitle: "Sistem Prestasi",
    achievementsIntro: "63 prestasi tersedia yang memberi hadiah untuk mengumpulkan kartu langka dan menyelesaikan tujuan.",
    totalRewards: "Total Hadiah: 302.300 koin",
    achievementCount: "63 prestasi",

    rarityAchievements: "Prestasi Kelangkaan",
    rarityDesc: "Kumpulkan kartu berbagai kelangkaan (Common, Rare, Epic, Legendary, Mythic)",
    rarityCount: "27 prestasi kelangkaan",

    wearAchievements: "Prestasi Kondisi",
    wearDesc: "Kumpulkan kartu berbagai kondisi (Pristine, Mint, Lightly Played, Moderately Played, Heavily Played)",
    wearCount: "18 prestasi kondisi",

    foilAchievements: "Prestasi Foil",
    foilDesc: "Kumpulkan kartu foil kilau spesial",
    foilCount: "6 prestasi kartu foil",

    progressiveAchievements: "Prestasi Progresif",
    progressiveDesc: "48 prestasi berdasarkan milestone koleksi (10, 25, 50, 100 kartu)",

    // Quests section
    questsTitle: "Sistem Misi",
    questsIntro: "Selesaikan misi harian dan mingguan untuk dapat koin ekstra.",

    dailyQuests: "Misi Harian",
    dailyQuestsDesc: "Reset setiap hari pukul 00:00 UTC",
    dailyQuest1: "Benteng Pertahanan: +100 koin untuk menang 1 pertahanan PvP",

    weeklyQuests: "Misi Mingguan",
    weeklyQuestsDesc: "Reset setiap Senin pukul 00:00 UTC",
    weeklyQuest1: "Total Pertandingan: Main 50 pertandingan (PvE, PvP, Serangan) - 500 koin",
    weeklyQuest2: "Menang Serangan: Menang 10 serangan - 800 koin",
    weeklyQuest3: "Menang Pertahanan: Berhasil pertahanan 5 kali - 300 koin",
    weeklyQuest4: "Streak PvE: Menang 10 pertandingan PvE berturut-turut - 1.000 koin",

    weeklyRewards: "Hadiah Mingguan",
    weeklyRewardsDesc: "Otomatis dibagikan setiap Minggu pukul 00:00 UTC berdasarkan ranking total power kamu",
    weeklyTier1: "Peringkat 1: 1.000 koin",
    weeklyTier2: "Peringkat 2: 750 koin",
    weeklyTier3: "Peringkat 3: 500 koin",
    weeklyTier4: "Peringkat 4-10: 300 koin masing-masing",

    // Cards section
    cardsTitle: "Sistem Kartu",
    cardsIntro: "$VBMS menggunakan Liquid Trading Cards (LTC) - paradigma baru dalam koleksi digital. Berbeda dengan NFT tradisional, LTC bisa diperdagangkan instan dengan likuiditas terjamin. Setiap kartu punya atribut unik yang menentukan kekuatan pertempuran.",

    cardAttributes: "Atribut Kartu",
    cardRarity: "Kelangkaan",
    cardRarityDesc: "Common (5), Rare (20), Epic (80), Legendary (240), Mythic (800) - nilai power dasar",
    cardWear: "Kondisi",
    cardWearDesc: "Pristine (×1.8), Mint (×1.4), Lightly Played (×1.0), Moderately Played (×1.0), Heavily Played (×1.0)",
    cardFoil: "Foil",
    cardFoilDesc: "Prize Foil (×15), Standard Foil (×2.5), No Foil (×1.0) - pengali power",

    powerCalculation: "Perhitungan Power",
    powerFormula: "Power = Power Dasar × Pengali Foil × Pengali Kondisi",
    powerExample: "Contoh: Mythic (800) × Prize Foil (15.0) × Pristine (1.8) = 21.600 power",

    defenseDeck: "Deck Pertahanan",
    defenseDeckDesc: "Atur 5 kartu terbaikmu untuk pertahanan saat pemain lain menyerang. Update kapan dapat kartu lebih kuat!",

    featuredCollections: "Koleksi Unggulan",
    featuredCollectionsDesc: "Kolaborasi dengan kreator Vibe Market. Kartu-kartu ini bisa digunakan seperti kartu $VBMS, mengikuti sistem perhitungan power yang sama.",

    nothingPacks: "Nothing Packs",
    nothingPacksDesc: "Kartu non-NFT yang bisa dibeli dengan $VBMS dan juga dibakar untuk pulihkan sebagian nilai.",

    // FAQ section
    faqTitle: "Pertanyaan Umum",

    faq1Q: "Apakah saya harus bayar untuk main?",
    faq1A: "Tidak! PvE dan Serangan sepenuhnya gratis. PvP punya biaya masuk kecil (20 koin) yang bisa kamu dapat dari main PvE.",

    faq2Q: "Bagaimana cara dapat lebih banyak kartu?",
    faq2A: "Beli pack di Vibe Market atau buka pack yang belum dibuka. Kamu juga bisa tukar kartu dengan pemain lain.",

    faq3Q: "Bisa kehilangan koin?",
    faq3A: "Di PvE, kamu tidak kehilangan koin. Di PvP, kamu kehilangan 20 koin jika kalah (lebih sedikit jika lawan jauh lebih baik). Mode Serangan GRATIS!",

    faq4Q: "Berapa lama satu pertandingan?",
    faq4A: "PvE: instan. PvP: 1-3 menit. Serangan: instan.",

    faq5Q: "Apa itu ranking total power?",
    faq5A: "Total power kamu adalah jumlah power dari 5 kartu terkuatmu. Nilai ini menentukan posisi papan peringkat dan berapa banyak yang bisa kamu dapat di hadiah mingguan.",

    faq6Q: "Bisa menyerang pemain yang sama beberapa kali?",
    faq6A: "Ya, tapi kamu hanya punya 5 serangan per hari total, jadi gunakan dengan bijak!",

    faq7Q: "Bagaimana cara kerja prestasi?",
    faq7A: "Prestasi otomatis terbuka saat kamu memenuhi kriteria (kumpulkan kartu tertentu). Kamu perlu klik 'Klaim' untuk terima koin.",

    faq8Q: "Apa yang terjadi jika saya tidak pertahankan serangan?",
    faq8A: "Deck pertahananmu otomatis bertempur untukmu. Atur 5 kartu terbaikmu di deck pertahanan!",

    // Poker Battle section
    pokerBattle: "Poker Battle",
    pokerIntro: "Main poker lawan CPU atau pemain lain menggunakan taruhan VBMS.",
    pokerStakes: "Taruhan",
    pokerRules: "Aturan",
    pokerRule1: "Best of 5 ronde - Pertama menang 4 ronde menang pertandingan",
    pokerRule2: "Pemenang ambil 95% pot (5% biaya house)",
    pokerRule3: "Diamankan blockchain (kontrak VBMS di Base)",
    pokerRule4: "Pertandingan PvP live - kedua pemain main bersamaan",

    // Mecha Arena section
    mechaArena: "Arena Mecha",
    mechaIntro: "Tonton pertempuran CPU vs CPU dan taruhan hasilnya! Saksikan pertempuran kartu epik antara lawan AI.",
    mechaHowItWorks: "Cara Kerja",
    mechaStep1: "Pilih dari 13 koleksi arena berbeda",
    mechaStep2: "Dua CPU bertarung otomatis menggunakan kartu dari koleksi itu",
    mechaStep3: "Deposit VBMS untuk dapat kredit taruhan",
    mechaStep4: "Taruhan di setiap ronde (1-7) dengan odds bertambah",
    mechaStep5: "Pembayaran instan saat ronde selesai",
    mechaBettingOdds: "Odds Taruhan",
    mechaRounds13: "Ronde 1-3: odds 1.5x",
    mechaRounds45: "Ronde 4-5: odds 1.8x",
    mechaRounds67: "Ronde 6-7: odds 2.0x",
    mechaTieBet: "Taruhan Seri: odds 3.5x",
    mechaDailyBoost: "Boost Harian",
    mechaDailyBoostDesc: "Setiap hari, satu koleksi arena dapat bonus odds +0.5x! Cari badge HOT.",
    mechaCollections: "Koleksi",

    // Raid Boss section
    raidBoss: "Raid Boss",
    raidBossIntro: "Bekerja sama dengan pemain lain untuk kalahkan bos kuat dan dapat hadiah eksklusif!",
    raidHowItWorks: "Cara Kerja",
    raidStep1: "Bos muncul sesuai jadwal rotasi",
    raidStep2: "Pilih kartu dari koleksimu untuk menyerang",
    raidStep3: "Berikan damage berdasarkan power kartumu",
    raidStep4: "Berkontribusi pada usaha komunitas",
    raidStep5: "Dapat hadiah berdasarkan kontribusi damage",
    raidRewards: "Hadiah",
    raidReward1: "Koin Coins berdasarkan damage yang diberikan",
    raidReward2: "Hadiah bonus untuk kontributor teratas",
    raidReward3: "Prestasi spesial untuk kalahkan bos",
    raidTips: "Tips",
    raidTip1: "Gunakan kartu power tinggi untuk damage maksimal",
    raidTip2: "Kartu dari koleksi bos memberikan damage ekstra",
    raidTip3: "Koordinasi dengan pemain lain untuk kill lebih cepat",

    // VibeFID section
    vibeFID: "🆔 VibeFID",
    vibeFIDIntro: "VibeFID adalah kartu NFT unik berdasarkan identitas Farcaster kamu. Neynar Score (engagement dan reputasi Farcaster) menentukan kelangkaan kartu, sedangkan nomor FID menentukan traits visual.",
    vibeFIDHowItWorks: "Cara Kerja",
    vibeFIDStep1: "Hubungkan akun Farcaster kamu",
    vibeFIDStep2: "Neynar Score menentukan kelangkaan kartu (berdasarkan followers, casts, reactions)",
    vibeFIDStep3: "Nomor FID menentukan suit, foil, dan traits kondisi",
    vibeFIDStep4: "Bayar 0.0003 ETH untuk mint kartu VibeFID unik di Base",
    vibeFIDNeynarScore: "Neynar Score → Kelangkaan",
    vibeFIDMythic: "Mythic (≥ 0.99): 800 power dasar - Top 1% pengguna Farcaster",
    vibeFIDLegendary: "Legendary (≥ 0.90): 240 power dasar - Top 10%",
    vibeFIDEpic: "Epic (≥ 0.79): 80 power dasar - Top 21%",
    vibeFIDRare: "Rare (≥ 0.70): 20 power dasar - Top 30%",
    vibeFIDCommon: "Common (< 0.70): 5 power dasar",
    vibeFIDTraits: "FID → Traits",
    vibeFIDOG: "≤ 5,000 (OG): Prize Foil + kondisi Pristine terjamin",
    vibeFIDTier2: "5,001 - 20,000: Peluang tinggi untuk Prize Foil",
    vibeFIDTier3: "20,001 - 100,000: Peluang campuran untuk traits langka",
    vibeFIDTier4: "> 100,000: Distribusi trait standar",
    vibeFIDBenefits: "Manfaat Pemilik VibeFID",
    vibeFIDBenefit1: "Boost Power: Kartu VibeFID dapat bonus pengali power di pertempuran",
    vibeFIDBenefit2: "Energi Tak Terbatas: Kartu VibeFID tidak pernah kehabisan energi - selalu siap bertempur",
    vibeFIDBenefit3: "Tanpa Batasan Deck: Bisa digunakan di deck manapun tanpa batasan koleksi",
  },
  "fr": {
    // Navigation
    backToGame: "Retour au Jeu",
    documentation: "Documentation",
    subtitle: "Guide complet de $VBMS - Tout ce que vous devez savoir",
    sections: "Sections",

    // Section titles
    economy: "Économie",
    battles: "Combats",
    achievements: "Succès",
    quests: "Quêtes",
    cards: "Cartes",
    faq: "FAQ",

    // Economy section
    economyTitle: "Système Économique",
    economyIntro: "$VBMS est une collection de Liquid Trading Cards (LTC) sur Vibe Market, inspirée des cartes Most Wanted irakiennes. Le jeu a deux devises : Coins (monnaie in-game gagnée en jouant) et $VBMS (token blockchain). 100 000 $VBMS = 1 pack. Actuellement en prévente - achetez/vendez $VBMS via le DEX in-app.",

    howToEarnCoins: "Comment Gagner des Pièces",
    earnPve: "PvE (Joueur vs IA)",
    earnPveDesc: "Difficultés : GEY (+2), GOOFY (+5), GOONER (+10), GANGSTER (+20), GIGACHAD (+40)",
    earnPvp: "PvP (Joueur vs Joueur)",
    earnPvpDesc: "Victoire : +100 pièces (bonus de rang). Défaite : -20 pièces. Égalité : 0 pièce",
    earnAttack: "Mode Attaque",
    earnAttackDesc: "Jusqu'à 5 attaques/jour. Victoire vole les points d'honneur de l'adversaire. GRATUIT !",
    earnAchievements: "Succès",
    earnAchievementsDesc: "63 succès disponibles totalisant 302 300 pièces",
    earnQuests: "Quêtes Quotidiennes et Hebdomadaires",
    earnQuestsDesc: "Complétez des objectifs pour gagner des pièces supplémentaires",

    dailyLimit: "Limite Quotidienne",
    dailyLimitDesc: "Vous pouvez gagner un maximum de 1 500 pièces par jour (PvE + PvP + Succès)",

    entryFees: "Frais d'Entrée",
    entryFeeAttack: "Mode Attaque : GRATUIT !",
    entryFeePvp: "PvP : 20 pièces par match",
    entryFeePve: "PvE : Gratuit (pas de frais)",

    // Battles section
    battlesTitle: "Système de Combat",
    battlesIntro: "Choisissez parmi 3 modes de combat, chacun avec ses propres règles et récompenses.",

    pveMode: "PvE - Joueur vs IA",
    pveModeDesc: "Combattez l'IA (Dealer) sur 5 niveaux de difficulté. Pas de frais d'entrée.",
    pveDifficulties: "Difficultés",
    pveGey: "GEY (+2 pièces)",
    pveTop: "GOOFY (+5 pièces)",
    pveG: "GOONER (+10 pièces)",
    pveMid: "GANGSTER (+20 pièces)",
    pveGigachad: "GIGACHAD (+40 pièces)",

    pvpMode: "PvP - Joueur vs Joueur",
    pvpModeDesc: "Combats en temps réel contre d'autres joueurs. Créez ou rejoignez des salons. Frais d'entrée : 20 pièces.",
    pvpRewards: "Récompenses PvP",
    pvpWin: "Victoire : +100 pièces (bonus si adversaire mieux classé)",
    pvpLoss: "Défaite : -20 pièces (réduit si adversaire plus fort)",
    pvpTie: "Égalité : 0 pièce",

    attackMode: "Mode Attaque",
    attackModeDesc: "Attaquez les joueurs du classement pour voler leurs points d'honneur. Limite de 5 attaques par jour. GRATUIT !",
    attackHow: "Comment ça marche",
    attackStep1: "Choisissez un adversaire dans le classement",
    attackStep2: "Vos 5 cartes contre le deck défensif de l'adversaire",
    attackStep3: "Victoire vole des points, défaite ne coûte pas de pièces supplémentaires",

    // Achievements section
    achievementsTitle: "Système de Succès",
    achievementsIntro: "63 succès disponibles qui vous récompensent pour collecter des cartes rares et accomplir des objectifs.",
    totalRewards: "Récompenses Totales : 302 300 pièces",
    achievementCount: "63 succès",

    rarityAchievements: "Succès de Rareté",
    rarityDesc: "Collectez des cartes de différentes raretés (Common, Rare, Epic, Legendary, Mythic)",
    rarityCount: "27 succès de rareté",

    wearAchievements: "Succès d'Usure",
    wearDesc: "Collectez des cartes dans différentes conditions (Pristine, Mint, Lightly Played, Moderately Played, Heavily Played)",
    wearCount: "18 succès d'usure",

    foilAchievements: "Succès Foil",
    foilDesc: "Collectez des cartes foil brillantes spéciales",
    foilCount: "6 succès de cartes foil",

    progressiveAchievements: "Succès Progressifs",
    progressiveDesc: "48 succès basés sur les étapes de collection (10, 25, 50, 100 cartes)",

    // Quests section
    questsTitle: "Système de Quêtes",
    questsIntro: "Complétez des quêtes quotidiennes et hebdomadaires pour gagner des pièces supplémentaires.",

    dailyQuests: "Quêtes Quotidiennes",
    dailyQuestsDesc: "Réinitialisées chaque jour à minuit UTC",
    dailyQuest1: "Forteresse de Défense : +100 pièces pour 1 victoire en défense PvP",

    weeklyQuests: "Quêtes Hebdomadaires",
    weeklyQuestsDesc: "Réinitialisées chaque lundi à 00:00 UTC",
    weeklyQuest1: "Matchs Totaux : Jouez 50 matchs (PvE, PvP, Attaque) - 500 pièces",
    weeklyQuest2: "Victoires en Attaque : Gagnez 10 attaques - 800 pièces",
    weeklyQuest3: "Victoires en Défense : Défendez avec succès 5 fois - 300 pièces",
    weeklyQuest4: "Série PvE : Gagnez 10 matchs PvE d'affilée - 1 000 pièces",

    weeklyRewards: "Récompenses Hebdomadaires",
    weeklyRewardsDesc: "Distribuées automatiquement chaque dimanche à 00:00 UTC selon votre classement de puissance totale",
    weeklyTier1: "1ère Place : 1 000 pièces",
    weeklyTier2: "2ème Place : 750 pièces",
    weeklyTier3: "3ème Place : 500 pièces",
    weeklyTier4: "4ème-10ème Place : 300 pièces chacun",

    // Cards section
    cardsTitle: "Système de Cartes",
    cardsIntro: "$VBMS utilise des Liquid Trading Cards (LTC) - un nouveau paradigme dans les collections numériques. Contrairement aux NFTs traditionnels, les LTCs peuvent être échangés instantanément avec une liquidité garantie. Chaque carte a des attributs uniques qui déterminent sa puissance de combat.",

    cardAttributes: "Attributs de Carte",
    cardRarity: "Rareté",
    cardRarityDesc: "Common (5), Rare (20), Epic (80), Legendary (240), Mythic (800) - valeurs de puissance de base",
    cardWear: "Condition d'Usure",
    cardWearDesc: "Pristine (×1.8), Mint (×1.4), Lightly Played (×1.0), Moderately Played (×1.0), Heavily Played (×1.0)",
    cardFoil: "Foil",
    cardFoilDesc: "Prize Foil (×15), Standard Foil (×2.5), No Foil (×1.0) - multiplicateurs de puissance",

    powerCalculation: "Calcul de Puissance",
    powerFormula: "Puissance = Puissance de Base × Multiplicateur Foil × Multiplicateur Usure",
    powerExample: "Exemple : Mythic (800) × Prize Foil (15.0) × Pristine (1.8) = 21 600 puissance",

    defenseDeck: "Deck de Défense",
    defenseDeckDesc: "Configurez vos 5 meilleures cartes pour vous défendre quand d'autres joueurs vous attaquent. Mettez à jour dès que vous obtenez des cartes plus fortes !",

    featuredCollections: "Collections en Vedette",
    featuredCollectionsDesc: "Collaborations avec les créateurs de Vibe Market. Ces cartes peuvent être utilisées comme les cartes $VBMS, suivant le même système de calcul de puissance.",

    nothingPacks: "Nothing Packs",
    nothingPacksDesc: "Cartes non-NFT achetables avec $VBMS et pouvant être brûlées pour récupérer une partie de la valeur.",

    // FAQ section
    faqTitle: "Questions Fréquentes",

    faq1Q: "Dois-je payer pour jouer ?",
    faq1A: "Non ! PvE et Attaque sont entièrement gratuits. Le PvP a un petit frais d'entrée (20 pièces) que vous pouvez gagner en jouant au PvE.",

    faq2Q: "Comment obtenir plus de cartes ?",
    faq2A: "Achetez des packs sur Vibe Market ou ouvrez vos packs non ouverts. Vous pouvez aussi échanger des cartes avec d'autres joueurs.",

    faq3Q: "Puis-je perdre des pièces ?",
    faq3A: "En PvE, vous ne perdez pas de pièces. En PvP, vous perdez 20 pièces si vous perdez (moins si l'adversaire est bien meilleur). Le Mode Attaque est GRATUIT !",

    faq4Q: "Combien de temps dure un match ?",
    faq4A: "PvE : instantané. PvP : 1-3 minutes. Attaque : instantané.",

    faq5Q: "Qu'est-ce que le classement de puissance totale ?",
    faq5A: "Votre puissance totale est la somme de la puissance de vos 5 cartes les plus fortes. Cette valeur détermine votre position au classement et combien vous pouvez gagner en récompenses hebdomadaires.",

    faq6Q: "Puis-je attaquer le même joueur plusieurs fois ?",
    faq6A: "Oui, mais vous n'avez que 5 attaques par jour au total, utilisez-les judicieusement !",

    faq7Q: "Comment fonctionnent les succès ?",
    faq7A: "Les succès sont automatiquement débloqués quand vous remplissez les critères (collectez certaines cartes). Vous devez cliquer 'Réclamer' pour recevoir les pièces.",

    faq8Q: "Que se passe-t-il si je ne défends pas une attaque ?",
    faq8A: "Votre deck de défense combat automatiquement pour vous. Configurez vos 5 meilleures cartes dans le deck de défense !",

    // Poker Battle section
    pokerBattle: "Poker Battle",
    pokerIntro: "Jouez au poker contre le CPU ou d'autres joueurs avec des mises VBMS.",
    pokerStakes: "Mises",
    pokerRules: "Règles",
    pokerRule1: "Meilleur des 5 rounds - Le premier à gagner 4 rounds gagne le match",
    pokerRule2: "Le gagnant prend 95% du pot (5% de frais de maison)",
    pokerRule3: "Sécurisé par blockchain (contrat VBMS sur Base)",
    pokerRule4: "Les matchs PvP sont en direct - les deux joueurs jouent simultanément",

    // Mecha Arena section
    mechaArena: "Arène Mecha",
    mechaIntro: "Regardez des combats CPU vs CPU et pariez sur le résultat ! Assistez à des combats de cartes épiques entre adversaires IA.",
    mechaHowItWorks: "Comment ça marche",
    mechaStep1: "Choisissez parmi 13 collections d'arène différentes",
    mechaStep2: "Deux CPUs combattent automatiquement avec les cartes de cette collection",
    mechaStep3: "Déposez des VBMS pour obtenir des crédits de paris",
    mechaStep4: "Pariez sur chaque round (1-7) avec des cotes croissantes",
    mechaStep5: "Paiements instantanés quand les rounds se résolvent",
    mechaBettingOdds: "Cotes de Paris",
    mechaRounds13: "Rounds 1-3 : cotes 1.5x",
    mechaRounds45: "Rounds 4-5 : cotes 1.8x",
    mechaRounds67: "Rounds 6-7 : cotes 2.0x",
    mechaTieBet: "Pari Égalité : cotes 3.5x",
    mechaDailyBoost: "Boost Quotidien",
    mechaDailyBoostDesc: "Chaque jour, une collection d'arène obtient +0.5x bonus de cotes ! Cherchez le badge HOT.",
    mechaCollections: "Collections",

    // Raid Boss section
    raidBoss: "Raid Boss",
    raidBossIntro: "Faites équipe avec d'autres joueurs pour vaincre des boss puissants et gagner des récompenses exclusives !",
    raidHowItWorks: "Comment ça marche",
    raidStep1: "Les boss apparaissent selon un calendrier rotatif",
    raidStep2: "Sélectionnez des cartes de votre collection pour attaquer",
    raidStep3: "Infligez des dégâts basés sur la puissance de vos cartes",
    raidStep4: "Contribuez à l'effort communautaire",
    raidStep5: "Gagnez des récompenses basées sur votre contribution en dégâts",
    raidRewards: "Récompenses",
    raidReward1: "Pièces Coins basées sur les dégâts infligés",
    raidReward2: "Récompenses bonus pour les meilleurs contributeurs",
    raidReward3: "Succès spéciaux pour avoir vaincu des boss",
    raidTips: "Conseils",
    raidTip1: "Utilisez des cartes à haute puissance pour un maximum de dégâts",
    raidTip2: "Les cartes de la collection du boss infligent des dégâts supplémentaires",
    raidTip3: "Coordonnez-vous avec d'autres joueurs pour des kills plus rapides",

    // VibeFID section
    vibeFID: "🆔 VibeFID",
    vibeFIDIntro: "VibeFID est une carte NFT unique basée sur votre identité Farcaster. Votre Score Neynar (engagement et réputation Farcaster) détermine la rareté de votre carte, tandis que votre numéro FID détermine les traits visuels.",
    vibeFIDHowItWorks: "Comment ça marche",
    vibeFIDStep1: "Connectez votre compte Farcaster",
    vibeFIDStep2: "Votre Score Neynar détermine la rareté de la carte (basé sur followers, casts, réactions)",
    vibeFIDStep3: "Votre numéro FID détermine les traits de couleur, foil et usure",
    vibeFIDStep4: "Payez 0.0003 ETH pour mint votre carte VibeFID unique sur Base",
    vibeFIDNeynarScore: "Score Neynar → Rareté",
    vibeFIDMythic: "Mythic (≥ 0.99) : 800 puissance de base - Top 1% des utilisateurs Farcaster",
    vibeFIDLegendary: "Legendary (≥ 0.90) : 240 puissance de base - Top 10%",
    vibeFIDEpic: "Epic (≥ 0.79) : 80 puissance de base - Top 21%",
    vibeFIDRare: "Rare (≥ 0.70) : 20 puissance de base - Top 30%",
    vibeFIDCommon: "Common (< 0.70) : 5 puissance de base",
    vibeFIDTraits: "FID → Traits",
    vibeFIDOG: "≤ 5,000 (OG) : Prize Foil + condition Pristine garantis",
    vibeFIDTier2: "5,001 - 20,000 : Haute chance pour Prize Foil",
    vibeFIDTier3: "20,001 - 100,000 : Chances mixtes pour traits rares",
    vibeFIDTier4: "> 100,000 : Distribution standard des traits",
    vibeFIDBenefits: "Avantages des Détenteurs VibeFID",
    vibeFIDBenefit1: "Boost de Puissance : Les cartes VibeFID reçoivent des multiplicateurs de puissance bonus en combat",
    vibeFIDBenefit2: "Énergie Infinie : Votre carte VibeFID ne manque jamais d'énergie - toujours prête à combattre",
    vibeFIDBenefit3: "Sans Restriction de Deck : Peut être utilisée dans n'importe quel deck sans restriction de collection",
  },
  "it": {
    // Navigation
    backToGame: "Torna al Gioco",
    documentation: "Documentazione",
    subtitle: "Guida completa $VBMS - Tutto quello che devi sapere",
    sections: "Sezioni",

    // Section titles
    economy: "Economia",
    battles: "Battaglie",
    achievements: "Obiettivi",
    quests: "Missioni",
    cards: "Carte",
    faq: "FAQ",

    // Economy section
    economyTitle: "Sistema Economico",
    economyIntro: "$VBMS è una collezione di Liquid Trading Cards (LTC) su Vibe Market, ispirata alle carte Most Wanted irachene. Il gioco ha due valute: Coins (valuta in-game guadagnata giocando) e $VBMS (token blockchain). 100.000 $VBMS = 1 pack. Attualmente in presale - compra/vendi $VBMS tramite il DEX in-app.",

    howToEarnCoins: "Come Guadagnare Monete",
    earnPve: "PvE (Giocatore vs IA)",
    earnPveDesc: "Difficoltà: GEY (+2), GOOFY (+5), GOONER (+10), GANGSTER (+20), GIGACHAD (+40)",
    earnPvp: "PvP (Giocatore vs Giocatore)",
    earnPvpDesc: "Vittoria: +100 monete (bonus classifica). Sconfitta: -20 monete. Pareggio: 0 monete",
    earnAttack: "Modalità Attacco",
    earnAttackDesc: "Fino a 5 attacchi/giorno. Vittoria ruba punti onore avversario. GRATIS!",
    earnAchievements: "Obiettivi",
    earnAchievementsDesc: "63 obiettivi disponibili per un totale di 302.300 monete",
    earnQuests: "Missioni Giornaliere e Settimanali",
    earnQuestsDesc: "Completa obiettivi per guadagnare monete extra",

    dailyLimit: "Limite Giornaliero",
    dailyLimitDesc: "Puoi guadagnare un massimo di 1.500 monete al giorno (PvE + PvP + Obiettivi)",

    entryFees: "Quote d'Ingresso",
    entryFeeAttack: "Modalità Attacco: GRATIS!",
    entryFeePvp: "PvP: 20 monete per partita",
    entryFeePve: "PvE: Gratis (nessuna quota)",

    // Battles section
    battlesTitle: "Sistema di Battaglia",
    battlesIntro: "Scegli tra 3 modalità di battaglia, ognuna con le proprie regole e ricompense.",

    pveMode: "PvE - Giocatore vs IA",
    pveModeDesc: "Combatti contro l'IA (Dealer) in 5 livelli di difficoltà. Nessuna quota d'ingresso.",
    pveDifficulties: "Difficoltà",
    pveGey: "GEY (+2 monete)",
    pveTop: "GOOFY (+5 monete)",
    pveG: "GOONER (+10 monete)",
    pveMid: "GANGSTER (+20 monete)",
    pveGigachad: "GIGACHAD (+40 monete)",

    pvpMode: "PvP - Giocatore vs Giocatore",
    pvpModeDesc: "Battaglie in tempo reale contro altri giocatori. Crea o unisciti alle stanze. Quota d'ingresso: 20 monete.",
    pvpRewards: "Ricompense PvP",
    pvpWin: "Vittoria: +100 monete (bonus se avversario è più in alto in classifica)",
    pvpLoss: "Sconfitta: -20 monete (ridotte se avversario è più forte)",
    pvpTie: "Pareggio: 0 monete",

    attackMode: "Modalità Attacco",
    attackModeDesc: "Attacca i giocatori in classifica per rubare i loro punti onore. Limite di 5 attacchi al giorno. GRATIS!",
    attackHow: "Come Funziona",
    attackStep1: "Scegli un avversario dalla classifica",
    attackStep2: "Le tue 5 carte vs il mazzo di difesa dell'avversario",
    attackStep3: "Vincere ruba punti, perdere non costa monete extra",

    // Achievements section
    achievementsTitle: "Sistema Obiettivi",
    achievementsIntro: "63 obiettivi disponibili che ti premiano per collezionare carte rare e completare obiettivi.",
    totalRewards: "Ricompense Totali: 302.300 monete",
    achievementCount: "63 obiettivi",

    rarityAchievements: "Obiettivi Rarità",
    rarityDesc: "Colleziona carte di diverse rarità (Comune, Rara, Epica, Leggendaria, Mitica)",
    rarityCount: "27 obiettivi basati sulla rarità",

    wearAchievements: "Obiettivi Usura",
    wearDesc: "Colleziona carte in diverse condizioni (Pristine, Mint, Leggermente Usata, Moderatamente Usata, Molto Usata)",
    wearCount: "18 obiettivi basati sull'usura",

    foilAchievements: "Obiettivi Foil",
    foilDesc: "Colleziona carte foil lucide speciali",
    foilCount: "6 obiettivi carte foil",

    progressiveAchievements: "Obiettivi Progressivi",
    progressiveDesc: "48 obiettivi basati su traguardi collezione (10, 25, 50, 100 carte)",

    // Quests section
    questsTitle: "Sistema Missioni",
    questsIntro: "Completa missioni giornaliere e settimanali per guadagnare monete extra.",

    dailyQuests: "Missioni Giornaliere",
    dailyQuestsDesc: "Si resettano ogni giorno a mezzanotte UTC",
    dailyQuest1: "Fortezza di Difesa: +100 monete per vincere 1 difesa PvP",

    weeklyQuests: "Missioni Settimanali",
    weeklyQuestsDesc: "Si resettano ogni lunedì alle 00:00 UTC",
    weeklyQuest1: "Partite Totali: Gioca 50 partite (PvE, PvP, Attacco) - 500 monete",
    weeklyQuest2: "Vittorie Attacco: Vinci 10 attacchi - 800 monete",
    weeklyQuest3: "Vittorie Difesa: Difendi con successo 5 volte - 300 monete",
    weeklyQuest4: "Serie PvE: Vinci 10 partite PvE di fila - 1.000 monete",

    weeklyRewards: "Ricompense Settimanali",
    weeklyRewardsDesc: "Distribuite automaticamente ogni domenica alle 00:00 UTC in base alla tua classifica potenza totale",
    weeklyTier1: "1° Posto: 1.000 monete",
    weeklyTier2: "2° Posto: 750 monete",
    weeklyTier3: "3° Posto: 500 monete",
    weeklyTier4: "4°-10° Posto: 300 monete ciascuno",

    // Cards section
    cardsTitle: "Sistema Carte",
    cardsIntro: "$VBMS usa Liquid Trading Cards (LTC) - un nuovo paradigma nei collezionabili digitali. A differenza degli NFT tradizionali, le LTC possono essere scambiate istantaneamente con liquidità garantita. Ogni carta ha attributi unici che determinano la sua potenza in battaglia.",

    cardAttributes: "Attributi Carta",
    cardRarity: "Rarità",
    cardRarityDesc: "Comune (5), Rara (20), Epica (80), Leggendaria (240), Mitica (800) - valori potenza base",
    cardWear: "Condizione Usura",
    cardWearDesc: "Pristine (×1.8), Mint (×1.4), Leggermente Usata (×1.0), Moderatamente Usata (×1.0), Molto Usata (×1.0)",
    cardFoil: "Foil",
    cardFoilDesc: "Prize Foil (×15), Standard Foil (×2.5), No Foil (×1.0) - moltiplicatori potenza",

    powerCalculation: "Calcolo Potenza",
    powerFormula: "Potenza = Potenza Base × Moltiplicatore Foil × Moltiplicatore Usura",
    powerExample: "Esempio: Mitica (800) × Prize Foil (15.0) × Pristine (1.8) = 21.600 potenza",

    defenseDeck: "Mazzo Difesa",
    defenseDeckDesc: "Imposta le tue 5 carte migliori per difenderti quando altri giocatori ti attaccano. Aggiorna ogni volta che ottieni carte più forti!",

    featuredCollections: "Collezioni in Evidenza",
    featuredCollectionsDesc: "Collaborazioni con i creatori di Vibe Market. Queste carte possono essere usate come le carte $VBMS, seguendo lo stesso sistema di calcolo potenza.",

    nothingPacks: "Nothing Packs",
    nothingPacksDesc: "Carte non-NFT che possono essere acquistate con $VBMS e anche bruciate per recuperare parte del valore.",

    // FAQ section
    faqTitle: "Domande Frequenti",

    faq1Q: "Devo pagare per giocare?",
    faq1A: "No! PvE e Attacco sono completamente gratis. PvP ha una piccola quota d'ingresso (20 monete) che puoi guadagnare giocando PvE.",

    faq2Q: "Come ottengo più carte?",
    faq2A: "Compra pacchetti su Vibe Market o apri i tuoi pacchetti non aperti. Puoi anche scambiare carte con altri giocatori.",

    faq3Q: "Posso perdere monete?",
    faq3A: "In PvE, non perdi monete. In PvP, perdi 20 monete se perdi (meno se l'avversario è molto più forte). Modalità Attacco è GRATIS!",

    faq4Q: "Quanto dura una partita?",
    faq4A: "PvE: istantanea. PvP: 1-3 minuti. Attacco: istantaneo.",

    faq5Q: "Cos'è la classifica potenza totale?",
    faq5A: "La tua potenza totale è la somma della potenza delle tue 5 carte più forti. Questo valore determina la tua posizione in classifica e quanto puoi guadagnare nelle ricompense settimanali.",

    faq6Q: "Posso attaccare lo stesso giocatore più volte?",
    faq6A: "Sì, ma hai solo 5 attacchi al giorno in totale, quindi usali con saggezza!",

    faq7Q: "Come funzionano gli obiettivi?",
    faq7A: "Gli obiettivi vengono sbloccati automaticamente quando soddisfi i criteri (colleziona certe carte). Devi cliccare 'Riscatta' per ricevere le monete.",

    faq8Q: "Cosa succede se non difendo un attacco?",
    faq8A: "Il tuo mazzo difesa combatte automaticamente per te. Imposta le tue 5 carte migliori nel mazzo difesa!",

    // Poker Battle section
    pokerBattle: "Battaglia Poker",
    pokerIntro: "Gioca a poker contro CPU o altri giocatori usando puntate VBMS.",
    pokerStakes: "Puntate",
    pokerRules: "Regole",
    pokerRule1: "Migliore su 5 round - Il primo a vincere 4 round vince la partita",
    pokerRule2: "Il vincitore prende il 95% del piatto (5% commissione casa)",
    pokerRule3: "Sicurezza blockchain (contratto VBMS su Base)",
    pokerRule4: "Le partite PvP sono dal vivo - entrambi i giocatori giocano simultaneamente",

    // Mecha Arena section
    mechaArena: "Arena Mecha",
    mechaIntro: "Guarda battaglie CPU vs CPU e scommetti sul risultato! Osserva epiche battaglie di carte tra avversari IA.",
    mechaHowItWorks: "Come Funziona",
    mechaStep1: "Scegli tra 13 diverse collezioni dell'arena",
    mechaStep2: "Due CPU combattono automaticamente usando carte da quella collezione",
    mechaStep3: "Deposita VBMS per ottenere crediti scommessa",
    mechaStep4: "Scommetti su ogni round (1-7) con quote crescenti",
    mechaStep5: "Pagamenti istantanei quando i round si risolvono",
    mechaBettingOdds: "Quote Scommesse",
    mechaRounds13: "Round 1-3: quote 1.5x",
    mechaRounds45: "Round 4-5: quote 1.8x",
    mechaRounds67: "Round 6-7: quote 2.0x",
    mechaTieBet: "Scommessa Pareggio: quote 3.5x",
    mechaDailyBoost: "Boost Giornaliero",
    mechaDailyBoostDesc: "Ogni giorno, una collezione dell'arena ottiene +0.5x quote bonus! Cerca il badge HOT.",
    mechaCollections: "Collezioni",

    // Raid Boss section
    raidBoss: "Raid Boss",
    raidBossIntro: "Unisci le forze con altri giocatori per sconfiggere potenti boss e guadagnare ricompense esclusive!",
    raidHowItWorks: "Come Funziona",
    raidStep1: "I boss appaiono secondo una programmazione rotante",
    raidStep2: "Seleziona carte dalla tua collezione per attaccare",
    raidStep3: "Infliggi danni in base alla potenza delle tue carte",
    raidStep4: "Contribuisci allo sforzo della comunità",
    raidStep5: "Guadagna ricompense in base al contributo di danno",
    raidRewards: "Ricompense",
    raidReward1: "Monete Coins in base ai danni inflitti",
    raidReward2: "Ricompense bonus per i migliori contributori",
    raidReward3: "Obiettivi speciali per le sconfitte dei boss",
    raidTips: "Consigli",
    raidTip1: "Usa carte ad alta potenza per massimizzare i danni",
    raidTip2: "Le carte dalla collezione del boss infliggono danni extra",
    raidTip3: "Coordinati con altri giocatori per uccisioni più veloci",

    // VibeFID section
    vibeFID: "🆔 VibeFID",
    vibeFIDIntro: "VibeFID è una carta NFT unica basata sulla tua identità Farcaster. Il tuo Punteggio Neynar (coinvolgimento e reputazione Farcaster) determina la rarità della tua carta, mentre il tuo numero FID determina i tratti visivi.",
    vibeFIDHowItWorks: "Come Funziona",
    vibeFIDStep1: "Connetti il tuo account Farcaster",
    vibeFIDStep2: "Il tuo Punteggio Neynar determina la rarità della carta (basato su follower, cast, reazioni)",
    vibeFIDStep3: "Il tuo numero FID determina i tratti di seme, foil e usura",
    vibeFIDStep4: "Paga 0.0003 ETH per mintare la tua carta VibeFID unica su Base",
    vibeFIDNeynarScore: "Punteggio Neynar → Rarità",
    vibeFIDMythic: "Mitica (≥ 0.99): 800 potenza base - Top 1% utenti Farcaster",
    vibeFIDLegendary: "Leggendaria (≥ 0.90): 240 potenza base - Top 10%",
    vibeFIDEpic: "Epica (≥ 0.79): 80 potenza base - Top 21%",
    vibeFIDRare: "Rara (≥ 0.70): 20 potenza base - Top 30%",
    vibeFIDCommon: "Comune (< 0.70): 5 potenza base",
    vibeFIDTraits: "FID → Tratti",
    vibeFIDOG: "≤ 5.000 (OG): Prize Foil garantito + condizione Pristine",
    vibeFIDTier2: "5.001 - 20.000: Alta probabilità di Prize Foil",
    vibeFIDTier3: "20.001 - 100.000: Probabilità miste per tratti rari",
    vibeFIDTier4: "> 100.000: Distribuzione tratti standard",
    vibeFIDBenefits: "Vantaggi Possessori VibeFID",
    vibeFIDBenefit1: "Boost Potenza: Le carte VibeFID ricevono moltiplicatori bonus di potenza in battaglia",
    vibeFIDBenefit2: "Energia Infinita: La tua carta VibeFID non esaurisce mai l'energia - sempre pronta a combattere",
    vibeFIDBenefit3: "Nessuna Restrizione Mazzo: Può essere usata in qualsiasi mazzo senza restrizioni di collezione",
  },
};

export type DocsTranslationKey = keyof typeof docsTranslations['en'];
