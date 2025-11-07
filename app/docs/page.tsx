"use client";

import { useState } from "react";
import Link from "next/link";
import NextImage from "next/image";

type DocSection = "economy" | "battles" | "achievements" | "quests" | "cards" | "faq";

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState<DocSection>("economy");

  const sections = [
    { id: "economy" as DocSection, label: "Economia", icon: "/images/icons/coins.svg" },
    { id: "battles" as DocSection, label: "Batalhas", icon: "/images/icons/battle.svg" },
    { id: "achievements" as DocSection, label: "Conquistas", icon: "/images/icons/achievement.svg" },
    { id: "quests" as DocSection, label: "Missões", icon: "/images/icons/mission.svg" },
    { id: "cards" as DocSection, label: "Cartas", icon: "/images/icons/cards.svg" },
    { id: "faq" as DocSection, label: "FAQ", icon: "/images/icons/help.svg" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-vintage-rich-black via-vintage-deep-black to-vintage-rich-black p-4">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-vintage-gold hover:text-vintage-orange transition mb-6"
        >
          <span className="text-xl">←</span>
          <span className="font-modern">Voltar ao Jogo</span>
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-vintage-gold mb-2 flex items-center justify-center gap-3">
            <NextImage src="/images/icons/help.svg" alt="Docs" width={48} height={48} />
            Documentação
          </h1>
          <p className="text-vintage-burnt-gold font-modern">
            Guia completo do Vibe Most Wanted - Tudo que você precisa saber
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-vintage-charcoal/80 backdrop-blur-lg border-2 border-vintage-gold/30 rounded-xl p-4 sticky top-4 shadow-gold">
              <h3 className="text-vintage-gold font-display font-bold mb-4 flex items-center gap-2">
                <NextImage src="/images/icons/stats.svg" alt="Menu" width={20} height={20} />
                Seções
              </h3>
              <nav className="space-y-2">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left px-4 py-2 rounded-lg transition-all font-modern flex items-center gap-2 ${
                      activeSection === section.id
                        ? "bg-gradient-to-r from-vintage-gold to-vintage-gold-dark text-vintage-black font-bold shadow-gold"
                        : "text-vintage-gold/70 hover:bg-vintage-gold/10 border border-vintage-gold/20"
                    }`}
                  >
                    <NextImage src={section.icon} alt={section.label} width={20} height={20} />
                    {section.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3">
            <div className="bg-vintage-charcoal/80 backdrop-blur-lg border-2 border-vintage-gold/30 rounded-xl p-6 shadow-gold">
              {activeSection === "economy" && <EconomyDocs />}
              {activeSection === "battles" && <BattlesDocs />}
              {activeSection === "achievements" && <AchievementsDocs />}
              {activeSection === "quests" && <QuestsDocs />}
              {activeSection === "cards" && <CardsDocs />}
              {activeSection === "faq" && <FAQDocs />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EconomyDocs() {
  return (
    <div className="space-y-6 text-vintage-ice font-modern">
      <div>
        <h2 className="text-3xl font-display font-bold text-vintage-gold mb-4 flex items-center gap-2">
          <NextImage src="/images/icons/coins.svg" alt="Economy" width={32} height={32} />
          Sistema de Economia
        </h2>
        <p className="mb-4 leading-relaxed">
          O Vibe Most Wanted possui um sistema de moedas virtuais (<span className="text-vintage-gold font-bold">$TESTVBMS</span>)
          que você ganha jogando e pode usar para participar de partidas ranqueadas.
        </p>
      </div>

      <div>
        <h3 className="text-2xl font-display font-bold text-vintage-gold mb-3 flex items-center gap-2">
          <NextImage src="/images/icons/victory.svg" alt="Win" width={24} height={24} />
          Como Ganhar Moedas
        </h3>
        <div className="space-y-4">
          <div className="bg-vintage-deep-black/60 border-2 border-vintage-gold/20 p-5 rounded-lg hover:border-vintage-gold/40 transition-colors">
            <h4 className="font-bold text-lg mb-3 text-vintage-gold flex items-center gap-2">
              <NextImage src="/images/icons/battle.svg" alt="PvE" width={20} height={20} />
              Batalhas PvE (contra IA)
            </h4>
            <ul className="list-disc list-inside space-y-2 text-sm leading-relaxed">
              <li><span className="font-bold text-vintage-gold">Gey:</span> 5 moedas por vitória</li>
              <li><span className="font-bold text-vintage-gold">Goofy:</span> 15 moedas por vitória</li>
              <li><span className="font-bold text-vintage-gold">Gooner:</span> 30 moedas por vitória</li>
              <li><span className="font-bold text-vintage-gold">Gangster:</span> 60 moedas por vitória</li>
              <li><span className="font-bold text-vintage-gold">Gigachad:</span> 120 moedas por vitória</li>
            </ul>
            <div className="mt-3 p-3 bg-orange-900/20 border border-orange-500/30 rounded-lg">
              <p className="text-xs text-orange-300 flex items-start gap-2">
                <span>⚠️</span>
                <span><strong>Limite:</strong> 30 vitórias por dia, máximo de 3.500 moedas diárias</span>
              </p>
            </div>
          </div>

          <div className="bg-vintage-deep-black/60 border-2 border-vintage-gold/20 p-5 rounded-lg hover:border-vintage-gold/40 transition-colors">
            <h4 className="font-bold text-lg mb-3 text-vintage-gold flex items-center gap-2">
              <NextImage src="/images/icons/battle.svg" alt="PvP" width={20} height={20} />
              Batalhas PvP (Ranqueada)
            </h4>
            <ul className="list-disc list-inside space-y-2 text-sm leading-relaxed">
              <li><span className="font-bold text-green-400">Vitória:</span> +100 moedas (base)</li>
              <li><span className="font-bold text-red-400">Derrota:</span> -20 moedas</li>
              <li><span className="font-bold text-vintage-gold">Custo de entrada:</span> 20 moedas</li>
              <li><span className="font-bold text-vintage-gold">Bônus por rank:</span> até 2x em vitórias contra jogadores mais fortes</li>
            </ul>
            <div className="mt-3 p-3 bg-orange-900/20 border border-orange-500/30 rounded-lg">
              <p className="text-xs text-orange-300 flex items-start gap-2">
                <span>⚠️</span>
                <span><strong>Limite:</strong> 10 partidas ranqueadas por dia</span>
              </p>
            </div>
          </div>

          <div className="bg-vintage-deep-black/60 border-2 border-vintage-gold/20 p-5 rounded-lg hover:border-vintage-gold/40 transition-colors">
            <h4 className="font-bold text-lg mb-3 text-vintage-gold flex items-center gap-2">
              <NextImage src="/images/icons/victory.svg" alt="Attack" width={20} height={20} />
              Modo Ataque (Leaderboard)
            </h4>
            <ul className="list-disc list-inside space-y-2 text-sm leading-relaxed">
              <li><span className="font-bold text-green-400">Vitória:</span> +100 moedas (base)</li>
              <li><span className="font-bold text-red-400">Derrota:</span> -20 moedas</li>
              <li><span className="font-bold text-green-500">GRÁTIS</span> - sem custo de entrada!</li>
              <li><span className="font-bold text-vintage-gold">Bônus por rank:</span> até 2x em vitórias</li>
            </ul>
            <div className="mt-3 p-3 bg-orange-900/20 border border-orange-500/30 rounded-lg">
              <p className="text-xs text-orange-300 flex items-start gap-2">
                <span>⚠️</span>
                <span><strong>Limite:</strong> 5 ataques por dia</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-2xl font-display font-bold text-vintage-gold mb-3 flex items-center gap-2">
          <NextImage src="/images/icons/achievement.svg" alt="Bonus" width={24} height={24} />
          Bônus Diários e Semanais
        </h3>
        <div className="bg-vintage-deep-black/60 border-2 border-vintage-gold/20 p-5 rounded-lg">
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <NextImage src="/images/icons/victory.svg" alt="First Win" width={16} height={16} className="mt-0.5" />
              <span><strong className="text-vintage-gold">Primeira vitória PvE:</strong> +50 moedas</span>
            </li>
            <li className="flex items-start gap-3">
              <NextImage src="/images/icons/battle.svg" alt="First PvP" width={16} height={16} className="mt-0.5" />
              <span><strong className="text-vintage-gold">Primeira partida PvP:</strong> +100 moedas</span>
            </li>
            <li className="flex items-start gap-3">
              <NextImage src="/images/icons/mission.svg" alt="Login" width={16} height={16} className="mt-0.5" />
              <span><strong className="text-vintage-gold">Login diário:</strong> +25 moedas</span>
            </li>
            <li className="flex items-start gap-3">
              <NextImage src="/images/icons/achievement.svg" alt="Streak 3" width={16} height={16} className="mt-0.5" />
              <span><strong className="text-vintage-gold">Sequência de 3 vitórias:</strong> +150 moedas</span>
            </li>
            <li className="flex items-start gap-3">
              <NextImage src="/images/icons/achievement.svg" alt="Streak 5" width={16} height={16} className="mt-0.5" />
              <span><strong className="text-vintage-gold">Sequência de 5 vitórias:</strong> +300 moedas</span>
            </li>
            <li className="flex items-start gap-3">
              <NextImage src="/images/icons/achievement.svg" alt="Streak 10" width={16} height={16} className="mt-0.5" />
              <span><strong className="text-vintage-gold">Sequência de 10 vitórias:</strong> +750 moedas</span>
            </li>
            <li className="flex items-start gap-3">
              <NextImage src="/images/icons/stats.svg" alt="Leaderboard" width={16} height={16} className="mt-0.5" />
              <span><strong className="text-vintage-gold">Recompensas semanais do Leaderboard:</strong> até 1.000 moedas</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function BattlesDocs() {
  return (
    <div className="space-y-6 text-vintage-ice font-modern">
      <div>
        <h2 className="text-3xl font-display font-bold text-vintage-gold mb-4 flex items-center gap-2">
          <NextImage src="/images/icons/battle.svg" alt="Battles" width={32} height={32} />
          Sistema de Batalhas
        </h2>
        <p className="mb-4 leading-relaxed">
          Três modos de jogo disponíveis: <span className="text-vintage-gold font-bold">PvE</span> (contra IA),
          <span className="text-vintage-gold font-bold"> PvP</span> (contra jogadores), e
          <span className="text-vintage-gold font-bold"> Modo Ataque</span> (Leaderboard).
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-vintage-deep-black/60 border-2 border-vintage-gold/20 p-5 rounded-lg hover:border-vintage-gold/40 transition-colors">
          <h3 className="text-xl font-display font-bold mb-3 text-vintage-gold flex items-center gap-2">
            <NextImage src="/images/icons/battle.svg" alt="PvE" width={24} height={24} />
            PvE - Player vs Environment
          </h3>
          <p className="text-sm mb-3 leading-relaxed">Enfrente oponentes controlados por IA em 5 níveis de dificuldade.</p>
          <ul className="list-disc list-inside space-y-2 text-sm leading-relaxed">
            <li className="text-green-400 font-bold">Totalmente GRÁTIS</li>
            <li>5 dificuldades: Gey, Goofy, Gooner, Gangster, Gigachad</li>
            <li>Limite: 30 vitórias/dia, 3.500 moedas/dia</li>
            <li>Ótimo para praticar e ganhar moedas</li>
          </ul>
        </div>

        <div className="bg-vintage-deep-black/60 border-2 border-vintage-gold/20 p-5 rounded-lg hover:border-vintage-gold/40 transition-colors">
          <h3 className="text-xl font-display font-bold mb-3 text-vintage-gold flex items-center gap-2">
            <NextImage src="/images/icons/battle.svg" alt="PvP" width={24} height={24} />
            PvP - Player vs Player
          </h3>
          <p className="text-sm mb-3 leading-relaxed">Enfrente outros jogadores em tempo real.</p>
          <ul className="list-disc list-inside space-y-2 text-sm leading-relaxed">
            <li><strong>Ranqueada:</strong> Custa 20 moedas, ganha 100+ moedas na vitória</li>
            <li><strong>Casual:</strong> Grátis, sem recompensas, apenas diversão</li>
            <li>Limite: 10 partidas ranqueadas/dia</li>
            <li>Bônus por diferença de rank</li>
          </ul>
        </div>

        <div className="bg-vintage-deep-black/60 border-2 border-vintage-gold/20 p-5 rounded-lg hover:border-vintage-gold/40 transition-colors">
          <h3 className="text-xl font-display font-bold mb-3 text-vintage-gold flex items-center gap-2">
            <NextImage src="/images/icons/victory.svg" alt="Attack" width={24} height={24} />
            Modo Ataque
          </h3>
          <p className="text-sm mb-3 leading-relaxed">Desafie os 10 melhores jogadores do Leaderboard.</p>
          <ul className="list-disc list-inside space-y-2 text-sm leading-relaxed">
            <li className="text-green-400 font-bold">Totalmente GRÁTIS</li>
            <li>Ganhe até 200 moedas por vitória (com bônus de rank)</li>
            <li>Limite: 5 ataques/dia</li>
            <li className="text-vintage-gold"><strong>Estratégia:</strong> atacar jogadores com rank muito superior dá mais bônus!</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function AchievementsDocs() {
  return (
    <div className="space-y-6 text-vintage-ice font-modern">
      <div>
        <h2 className="text-3xl font-display font-bold text-vintage-gold mb-4 flex items-center gap-2">
          <NextImage src="/images/icons/achievement.svg" alt="Achievements" width={32} height={32} />
          Sistema de Conquistas
        </h2>
        <p className="mb-4 leading-relaxed">
          Complete conquistas para ganhar moedas extras! Mais de <span className="text-vintage-gold font-bold">302.000 moedas</span> disponíveis através de <span className="text-vintage-gold font-bold">63 conquistas</span>.
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-vintage-deep-black/60 border-2 border-vintage-gold/20 p-5 rounded-lg hover:border-vintage-gold/40 transition-colors">
          <h3 className="text-lg font-display font-bold mb-3 text-vintage-gold flex items-center gap-2">
            <NextImage src="/images/icons/cards.svg" alt="Rarity" width={20} height={20} />
            Colecionadores de Raridade
          </h3>
          <p className="text-sm mb-3 leading-relaxed">Colete cartas de diferentes raridades</p>
          <ul className="list-disc list-inside space-y-1.5 text-xs leading-relaxed">
            <li>Common Collector (1 Common) - 50 moedas</li>
            <li>Rare Collector (1 Rare) - 100 moedas</li>
            <li>Epic Collector (1 Epic) - 200 moedas</li>
            <li>Legendary Collector (1 Legendary) - 500 moedas</li>
            <li>Mythic Collector (1 Mythic) - 1.000 moedas</li>
          </ul>
        </div>

        <div className="bg-vintage-deep-black/60 border-2 border-vintage-gold/20 p-5 rounded-lg hover:border-vintage-gold/40 transition-colors">
          <h3 className="text-lg font-display font-bold mb-3 text-vintage-gold flex items-center gap-2">
            <NextImage src="/images/icons/cards.svg" alt="Condition" width={20} height={20} />
            Colecionadores de Condição
          </h3>
          <p className="text-sm mb-3 leading-relaxed">Colete cartas em condições pristinas</p>
          <ul className="list-disc list-inside space-y-1.5 text-xs leading-relaxed">
            <li>Pristine Collector (1) - 300 moedas</li>
            <li>Pristine Hoarder (10) - 1.000 moedas</li>
            <li>Pristine Master (50) - 5.000 moedas</li>
            <li>Pristine Legend (100) - 15.000 moedas</li>
          </ul>
        </div>

        <div className="bg-vintage-deep-black/60 border-2 border-vintage-gold/20 p-5 rounded-lg hover:border-vintage-gold/40 transition-colors">
          <h3 className="text-lg font-display font-bold mb-3 text-vintage-gold flex items-center gap-2">
            <NextImage src="/images/icons/cards.svg" alt="Foil" width={20} height={20} />
            Colecionadores de Foil
          </h3>
          <p className="text-sm mb-3 leading-relaxed">Colete variantes foil raras</p>
          <ul className="list-disc list-inside space-y-1.5 text-xs leading-relaxed">
            <li>Shiny Collector (1 Standard Foil) - 200 moedas</li>
            <li>Prize Winner (1 Prize Foil) - 500 moedas</li>
            <li>Prize Legend (50 Prize Foils) - 10.000 moedas</li>
          </ul>
        </div>

        <div className="bg-vintage-deep-black/60 border-2 border-vintage-gold/20 p-5 rounded-lg hover:border-vintage-gold/40 transition-colors">
          <h3 className="text-lg font-display font-bold mb-3 text-vintage-gold flex items-center gap-2">
            <NextImage src="/images/icons/stats.svg" alt="Progressive" width={20} height={20} />
            Conquistas Progressivas
          </h3>
          <p className="text-sm leading-relaxed">48 conquistas baseadas em milestones de coleção - 6 por categoria (Common, Rare, Epic, Legendary, Mythic, Pristine, Standard Foil, Prize Foil)</p>
        </div>
      </div>
    </div>
  );
}

function QuestsDocs() {
  return (
    <div className="space-y-6 text-vintage-ice font-modern">
      <div>
        <h2 className="text-3xl font-display font-bold text-vintage-gold mb-4 flex items-center gap-2">
          <NextImage src="/images/icons/mission.svg" alt="Quests" width={32} height={32} />
          Sistema de Missões
        </h2>
        <p className="mb-4 leading-relaxed">
          Complete missões diárias e semanais para ganhar moedas extras!
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-vintage-deep-black/60 border-2 border-vintage-gold/20 p-5 rounded-lg hover:border-vintage-gold/40 transition-colors">
          <h3 className="text-lg font-display font-bold mb-3 text-vintage-gold flex items-center gap-2">
            <NextImage src="/images/icons/mission.svg" alt="Daily" width={20} height={20} />
            Missões Diárias
          </h3>
          <p className="text-sm mb-3 leading-relaxed">
            <span className="text-vintage-gold font-bold">UMA</span> missão global por dia. Todos os jogadores têm a mesma missão.
          </p>
          <p className="text-sm mb-2 font-bold text-vintage-gold">Exemplos de missões:</p>
          <ul className="list-disc list-inside space-y-1.5 text-xs leading-relaxed">
            <li>Ganhe 3 batalhas PvE</li>
            <li>Derrote o Gigachad</li>
            <li>Jogue 5 partidas</li>
            <li>Ganhe com poder máximo de 600</li>
          </ul>
          <div className="mt-3 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
            <p className="text-xs text-green-300 flex items-start gap-2">
              <NextImage src="/images/icons/coins.svg" alt="Reward" width={14} height={14} className="mt-0.5" />
              <span><strong>Recompensas:</strong> 150-600 moedas</span>
            </p>
          </div>
        </div>

        <div className="bg-vintage-deep-black/60 border-2 border-vintage-gold/20 p-5 rounded-lg hover:border-vintage-gold/40 transition-colors">
          <h3 className="text-lg font-display font-bold mb-3 text-vintage-gold flex items-center gap-2">
            <NextImage src="/images/icons/mission.svg" alt="Weekly" width={20} height={20} />
            Missões Semanais
          </h3>
          <p className="text-sm mb-3 leading-relaxed">
            <span className="text-vintage-gold font-bold">4 missões pessoais</span> que resetam toda Domingo às 00:00 UTC
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-xs leading-relaxed">
            <li>20 vitórias em ataques - 300 moedas</li>
            <li>30 partidas totais - 200 moedas</li>
            <li>10 vitórias defensivas - 400 moedas</li>
            <li>Sequência de 10 PvE - 500 moedas</li>
          </ul>
          <div className="mt-3 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
            <p className="text-xs text-green-300 flex items-start gap-2">
              <NextImage src="/images/icons/coins.svg" alt="Reward" width={14} height={14} className="mt-0.5" />
              <span><strong>Total semanal:</strong> até 1.400 moedas</span>
            </p>
          </div>
        </div>

        <div className="bg-vintage-deep-black/60 border-2 border-vintage-gold/20 p-5 rounded-lg hover:border-vintage-gold/40 transition-colors">
          <h3 className="text-lg font-display font-bold mb-3 text-vintage-gold flex items-center gap-2">
            <NextImage src="/images/icons/achievement.svg" alt="Leaderboard" width={20} height={20} />
            Recompensas do Leaderboard
          </h3>
          <p className="text-sm mb-3 leading-relaxed">
            Recompensas semanais para os <span className="text-vintage-gold font-bold">TOP 10</span> do leaderboard
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-xs leading-relaxed">
            <li>🥇 1º lugar: 1.000 moedas</li>
            <li>🥈 2º lugar: 750 moedas</li>
            <li>🥉 3º lugar: 500 moedas</li>
            <li>⭐ 4º-10º: 300 moedas cada</li>
          </ul>
          <div className="mt-3 p-3 bg-orange-900/20 border border-orange-500/30 rounded-lg">
            <p className="text-xs text-orange-300 flex items-start gap-2">
              <span>⚠️</span>
              <span>Você precisa coletar manualmente as recompensas do leaderboard na aba Missões</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CardsDocs() {
  return (
    <div className="space-y-6 text-vintage-ice font-modern">
      <div>
        <h2 className="text-3xl font-display font-bold text-vintage-gold mb-4 flex items-center gap-2">
          <NextImage src="/images/icons/cards.svg" alt="Cards" width={32} height={32} />
          Sistema de Cartas
        </h2>
        <p className="mb-4 leading-relaxed">
          Entenda como funcionam as cartas, raridades, condições e variantes do Vibe Most Wanted.
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-vintage-deep-black/60 border-2 border-vintage-gold/20 p-5 rounded-lg hover:border-vintage-gold/40 transition-colors">
          <h3 className="text-lg font-display font-bold mb-3 text-vintage-gold">Raridades</h3>
          <p className="text-sm mb-3 leading-relaxed">As cartas são divididas em 5 níveis de raridade:</p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-3">
              <span className="px-2 py-1 bg-gray-600 text-white rounded text-xs font-bold">Common</span>
              <span>Mais comuns, menor poder</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-bold">Rare</span>
              <span>Raras, poder médio</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="px-2 py-1 bg-purple-600 text-white rounded text-xs font-bold">Epic</span>
              <span>Épicas, alto poder</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="px-2 py-1 bg-yellow-600 text-white rounded text-xs font-bold">Legendary</span>
              <span>Lendárias, poder muito alto</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="px-2 py-1 bg-red-600 text-white rounded text-xs font-bold">Mythic</span>
              <span>Míticas, poder máximo</span>
            </li>
          </ul>
        </div>

        <div className="bg-vintage-deep-black/60 border-2 border-vintage-gold/20 p-5 rounded-lg hover:border-vintage-gold/40 transition-colors">
          <h3 className="text-lg font-display font-bold mb-3 text-vintage-gold">Condições</h3>
          <p className="text-sm mb-3 leading-relaxed">O estado de conservação das cartas afeta seu valor:</p>
          <ul className="space-y-1.5 text-xs leading-relaxed">
            <li><strong className="text-vintage-gold">Pristine:</strong> Perfeita condição (mais rara e valiosa)</li>
            <li><strong className="text-vintage-gold">Mint:</strong> Quase perfeita</li>
            <li><strong className="text-vintage-gold">Near Mint:</strong> Excelente estado</li>
            <li><strong className="text-vintage-gold">Excellent:</strong> Bom estado</li>
            <li><strong className="text-vintage-gold">Good:</strong> Estado aceitável</li>
            <li><strong className="text-vintage-gold">Played:</strong> Mostrandosinais de uso</li>
            <li><strong className="text-vintage-gold">Poor:</strong> Muito desgastada</li>
          </ul>
        </div>

        <div className="bg-vintage-deep-black/60 border-2 border-vintage-gold/20 p-5 rounded-lg hover:border-vintage-gold/40 transition-colors">
          <h3 className="text-lg font-display font-bold mb-3 text-vintage-gold">Variantes Foil</h3>
          <p className="text-sm mb-3 leading-relaxed">Versões especiais com efeitos visuais:</p>
          <ul className="space-y-1.5 text-xs leading-relaxed">
            <li><strong className="text-vintage-gold">Standard Foil:</strong> Brilho holográfico padrão</li>
            <li><strong className="text-vintage-gold">Prize Foil:</strong> Variante especial de torneio (mais rara)</li>
          </ul>
        </div>

        <div className="bg-vintage-deep-black/60 border-2 border-vintage-gold/20 p-5 rounded-lg hover:border-vintage-gold/40 transition-colors">
          <h3 className="text-lg font-display font-bold mb-3 text-vintage-gold">Como Conseguir Cartas</h3>
          <ul className="list-disc list-inside space-y-1.5 text-xs leading-relaxed">
            <li>Compre packs no <a href="https://vibechain.com/market/vibe-most-wanted" className="text-vintage-gold hover:text-vintage-orange underline" target="_blank" rel="noopener noreferrer">Vibe Market</a></li>
            <li>Abra packs selados que você já possui</li>
            <li>Troque com outros jogadores (em breve)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function FAQDocs() {
  return (
    <div className="space-y-6 text-vintage-ice font-modern">
      <div>
        <h2 className="text-3xl font-display font-bold text-vintage-gold mb-4 flex items-center gap-2">
          <NextImage src="/images/icons/help.svg" alt="FAQ" width={32} height={32} />
          Perguntas Frequentes (FAQ)
        </h2>
      </div>

      <div className="space-y-4">
        <div className="bg-vintage-deep-black/60 border-2 border-vintage-gold/20 p-5 rounded-lg hover:border-vintage-gold/40 transition-colors">
          <h3 className="text-lg font-display font-bold mb-2 text-vintage-gold">Por que minhas cartas não aparecem?</h3>
          <p className="text-sm leading-relaxed">
            Cartas recém-abertas levam 5-10 minutos para aparecer no site porque a metadata precisa ser indexada pela blockchain.
            Isso é normal e sempre acontece! Recarregue a página após alguns minutos.
          </p>
        </div>

        <div className="bg-vintage-deep-black/60 border-2 border-vintage-gold/20 p-5 rounded-lg hover:border-vintage-gold/40 transition-colors">
          <h3 className="text-lg font-display font-bold mb-2 text-vintage-gold">Como funciona o sistema de poder das cartas?</h3>
          <p className="text-sm leading-relaxed">
            O poder de cada carta é determinado por sua raridade. Cartas mais raras têm poder maior.
            A batalha é vencida pela equipe com maior poder total.
          </p>
        </div>

        <div className="bg-vintage-deep-black/60 border-2 border-vintage-gold/20 p-5 rounded-lg hover:border-vintage-gold/40 transition-colors">
          <h3 className="text-lg font-display font-bold mb-2 text-vintage-gold">Posso perder moedas jogando?</h3>
          <p className="text-sm leading-relaxed">
            Sim, mas apenas em modos competitivos. Em <strong>PvP ranqueadas</strong> e <strong>Modo Ataque</strong>, você perde 20 moedas por derrota.
            Em <strong>PvE</strong> (contra IA), você <strong className="text-green-400">não perde moedas</strong> - apenas não ganha nada se perder.
            Por isso PvE é ótimo para treinar sem riscos!
          </p>
        </div>

        <div className="bg-vintage-deep-black/60 border-2 border-vintage-gold/20 p-5 rounded-lg hover:border-vintage-gold/40 transition-colors">
          <h3 className="text-lg font-display font-bold mb-2 text-vintage-gold">Qual é a melhor estratégia para ganhar moedas?</h3>
          <p className="text-sm leading-relaxed mb-2">
            Depende do seu nível de skill:
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs leading-relaxed">
            <li><strong>Iniciantes:</strong> Foque em PvE nos níveis mais fáceis (Gey, Goofy) até juntar moedas</li>
            <li><strong>Intermediários:</strong> Tente Gangster e Gigachad para recompensas maiores</li>
            <li><strong>Avançados:</strong> Use o Modo Ataque (grátis!) contra jogadores no top do leaderboard</li>
            <li><strong>Experts:</strong> PvP ranqueada com bônus de rank pode dar até 200 moedas por vitória</li>
          </ul>
        </div>

        <div className="bg-vintage-deep-black/60 border-2 border-vintage-gold/20 p-5 rounded-lg hover:border-vintage-gold/40 transition-colors">
          <h3 className="text-lg font-display font-bold mb-2 text-vintage-gold">Como funcionam as defesas?</h3>
          <p className="text-sm leading-relaxed">
            Quando você salva um Defense Deck, outros jogadores podem atacá-lo através do Modo Ataque.
            Se sua defesa vencer, você ganha moedas automaticamente! Escolha bem suas 5 cartas mais fortes.
          </p>
        </div>

        <div className="bg-vintage-deep-black/60 border-2 border-vintage-gold/20 p-5 rounded-lg hover:border-vintage-gold/40 transition-colors">
          <h3 className="text-lg font-display font-bold mb-2 text-vintage-gold">O que são $TESTVBMS?</h3>
          <p className="text-sm leading-relaxed">
            São moedas virtuais do jogo. O nome "TEST" indica que estamos em versão de testes.
            No futuro, pode haver uma migração para moedas definitivas.
          </p>
        </div>

        <div className="bg-vintage-deep-black/60 border-2 border-vintage-gold/20 p-5 rounded-lg hover:border-vintage-gold/40 transition-colors">
          <h3 className="text-lg font-display font-bold mb-2 text-vintage-gold">Como acessar o Farcaster Miniapp?</h3>
          <p className="text-sm leading-relaxed">
            Clique no botão roxo "TRY OUR FARCASTER MINIAPP" no topo da página principal.
            Você pode jogar direto do Farcaster com a mesma conta!
          </p>
        </div>
      </div>
    </div>
  );
}
