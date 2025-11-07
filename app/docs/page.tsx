"use client";

import { useState } from "react";

type DocSection = "economy" | "inbox" | "battles" | "achievements" | "quests";

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState<DocSection>("economy");

  const sections = [
    { id: "economy" as DocSection, label: "💰 Economia", icon: "💰" },
    { id: "inbox" as DocSection, label: "📥 Inbox de Moedas", icon: "📥" },
    { id: "battles" as DocSection, label: "⚔️ Batalhas", icon: "⚔️" },
    { id: "achievements" as DocSection, label: "🏆 Conquistas", icon: "🏆" },
    { id: "quests" as DocSection, label: "🎯 Missões", icon: "🎯" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-vintage-rich-black via-vintage-deep-black to-vintage-rich-black p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-vintage-gold mb-2">
            📚 Documentação
          </h1>
          <p className="text-vintage-gold/60">
            Guia completo do Vibe Most Wanted
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-vintage-deep-black/50 border border-vintage-gold/30 rounded-lg p-4 sticky top-4">
              <h3 className="text-vintage-gold font-bold mb-4">Seções</h3>
              <nav className="space-y-2">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left px-4 py-2 rounded-lg transition-all ${
                      activeSection === section.id
                        ? "bg-vintage-gold text-vintage-deep-black font-bold"
                        : "text-vintage-gold/70 hover:bg-vintage-gold/10"
                    }`}
                  >
                    <span className="mr-2">{section.icon}</span>
                    {section.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3">
            <div className="bg-vintage-deep-black/50 border border-vintage-gold/30 rounded-lg p-6">
              {activeSection === "economy" && <EconomyDocs />}
              {activeSection === "inbox" && <InboxDocs />}
              {activeSection === "battles" && <BattlesDocs />}
              {activeSection === "achievements" && <AchievementsDocs />}
              {activeSection === "quests" && <QuestsDocs />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EconomyDocs() {
  return (
    <div className="space-y-6 text-vintage-gold/90">
      <div>
        <h2 className="text-2xl font-bold text-vintage-gold mb-4">
          💰 Sistema de Economia
        </h2>
        <p className="mb-4">
          O Vibe Most Wanted possui um sistema de moedas virtuais ($TESTVBMS)
          que você ganha jogando e pode usar para participar de partidas ranqueadas.
        </p>
      </div>

      <div>
        <h3 className="text-xl font-bold text-vintage-gold mb-3">
          Como Ganhar Moedas
        </h3>
        <div className="space-y-3">
          <div className="bg-vintage-deep-black/30 p-4 rounded-lg">
            <h4 className="font-bold mb-2">🎮 Batalhas PvE (contra IA)</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Gey: 5 moedas por vitória</li>
              <li>Goofy: 15 moedas por vitória</li>
              <li>Gooner: 30 moedas por vitória</li>
              <li>Gangster: 60 moedas por vitória</li>
              <li>Gigachad: 120 moedas por vitória</li>
            </ul>
            <p className="text-xs text-vintage-gold/60 mt-2">
              ⚠️ Limite: 30 vitórias por dia, máximo de 3.500 moedas diárias
            </p>
          </div>

          <div className="bg-vintage-deep-black/30 p-4 rounded-lg">
            <h4 className="font-bold mb-2">⚔️ Batalhas PvP (Ranqueada)</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Vitória: +100 moedas (base)</li>
              <li>Derrota: -20 moedas</li>
              <li>Custo de entrada: 20 moedas</li>
              <li>Bônus por rank: até 2x em vitórias contra jogadores mais fortes</li>
            </ul>
            <p className="text-xs text-vintage-gold/60 mt-2">
              ⚠️ Limite: 10 partidas ranqueadas por dia
            </p>
          </div>

          <div className="bg-vintage-deep-black/30 p-4 rounded-lg">
            <h4 className="font-bold mb-2">🎯 Modo Ataque (Leaderboard)</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Vitória: +100 moedas (base)</li>
              <li>Derrota: -20 moedas</li>
              <li>GRÁTIS - sem custo de entrada!</li>
              <li>Bônus por rank: até 2x em vitórias</li>
            </ul>
            <p className="text-xs text-vintage-gold/60 mt-2">
              ⚠️ Limite: 5 ataques por dia
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-bold text-vintage-gold mb-3">
          📊 Bônus Diários e Semanais
        </h3>
        <div className="bg-vintage-deep-black/30 p-4 rounded-lg">
          <ul className="space-y-2 text-sm">
            <li>🆕 Primeira vitória PvE: +50 moedas</li>
            <li>⚔️ Primeira partida PvP: +100 moedas</li>
            <li>📅 Login diário: +25 moedas</li>
            <li>🔥 Sequência de 3 vitórias: +150 moedas</li>
            <li>🔥 Sequência de 5 vitórias: +300 moedas</li>
            <li>🔥 Sequência de 10 vitórias: +750 moedas</li>
            <li>🏆 Recompensas semanais do Leaderboard (até 1.000 moedas)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function InboxDocs() {
  return (
    <div className="space-y-6 text-vintage-gold/90">
      <div>
        <h2 className="text-2xl font-bold text-vintage-gold mb-4">
          📥 Sistema de Inbox de Moedas
        </h2>
        <p className="mb-4">
          O Inbox permite que você acumule suas recompensas e as colete quando
          quiser, ao invés de recebê-las imediatamente após cada batalha.
        </p>
      </div>

      <div>
        <h3 className="text-xl font-bold text-vintage-gold mb-3">
          Como Funciona
        </h3>
        <div className="space-y-3">
          <div className="bg-vintage-deep-black/30 p-4 rounded-lg">
            <h4 className="font-bold mb-2">1️⃣ Ganhe uma Batalha</h4>
            <p className="text-sm">
              Após vencer uma batalha PvE, PvP, ou Ataque, você verá uma tela
              de escolha com duas opções.
            </p>
          </div>

          <div className="bg-vintage-deep-black/30 p-4 rounded-lg">
            <h4 className="font-bold mb-2">2️⃣ Escolha Como Receber</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>
                <strong>💰 Coletar Agora:</strong> As moedas vão direto para
                seu saldo disponível
              </li>
              <li>
                <strong>📥 Guardar para Depois:</strong> As moedas vão para seu
                Inbox
              </li>
            </ul>
          </div>

          <div className="bg-vintage-deep-black/30 p-4 rounded-lg">
            <h4 className="font-bold mb-2">3️⃣ Colete do Inbox Quando Quiser</h4>
            <p className="text-sm mb-2">
              Clique no ícone 💰 no topo da tela para ver seu Inbox. Quando
              estiver pronto, colete todas as moedas de uma vez!
            </p>
            <p className="text-xs text-vintage-gold/60">
              💡 As moedas ficam seguras no Inbox até você decidir coletá-las
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-bold text-vintage-gold mb-3">
          ✨ Vantagens do Inbox
        </h3>
        <div className="bg-vintage-deep-black/30 p-4 rounded-lg">
          <ul className="space-y-2 text-sm">
            <li>✅ Acumule recompensas de múltiplas batalhas</li>
            <li>✅ Colete tudo de uma vez quando precisar</li>
            <li>✅ Visualize facilmente quanto você acumulou</li>
            <li>✅ Controle total sobre quando usar suas moedas</li>
            <li>✅ Notificação visual quando há moedas no Inbox</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function BattlesDocs() {
  return (
    <div className="space-y-6 text-vintage-gold/90">
      <div>
        <h2 className="text-2xl font-bold text-vintage-gold mb-4">
          ⚔️ Sistema de Batalhas
        </h2>
        <p className="mb-4">
          Três modos de jogo disponíveis: PvE (contra IA), PvP (contra
          jogadores), e Modo Ataque (Leaderboard).
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-vintage-deep-black/30 p-4 rounded-lg">
          <h3 className="text-xl font-bold mb-3">🎮 PvE - Player vs Environment</h3>
          <p className="text-sm mb-3">Enfrente oponentes controlados por IA em 5 níveis de dificuldade.</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Totalmente GRÁTIS</li>
            <li>5 dificuldades: Gey, Goofy, Gooner, Gangster, Gigachad</li>
            <li>Limite: 30 vitórias/dia, 3.500 moedas/dia</li>
            <li>Ótimo para praticar e ganhar moedas</li>
          </ul>
        </div>

        <div className="bg-vintage-deep-black/30 p-4 rounded-lg">
          <h3 className="text-xl font-bold mb-3">⚔️ PvP - Player vs Player</h3>
          <p className="text-sm mb-3">Enfrente outros jogadores em tempo real.</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li><strong>Ranqueada:</strong> Custa 20 moedas, ganha 100+ moedas na vitória</li>
            <li><strong>Casual:</strong> Grátis, sem recompensas, apenas diversão</li>
            <li>Limite: 10 partidas ranqueadas/dia</li>
            <li>Bônus por diferença de rank</li>
          </ul>
        </div>

        <div className="bg-vintage-deep-black/30 p-4 rounded-lg">
          <h3 className="text-xl font-bold mb-3">🎯 Modo Ataque</h3>
          <p className="text-sm mb-3">Desafie os 10 melhores jogadores do Leaderboard.</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Totalmente GRÁTIS</li>
            <li>Ganhe até 200 moedas por vitória (com bônus de rank)</li>
            <li>Limite: 5 ataques/dia</li>
            <li>Estratégia: atacar jogadores com rank muito superior dá mais bônus!</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function AchievementsDocs() {
  return (
    <div className="space-y-6 text-vintage-gold/90">
      <div>
        <h2 className="text-2xl font-bold text-vintage-gold mb-4">
          🏆 Sistema de Conquistas
        </h2>
        <p className="mb-4">
          Complete conquistas para ganhar moedas extras! Mais de 302.000 moedas disponíveis através de 64 conquistas.
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-vintage-deep-black/30 p-4 rounded-lg">
          <h3 className="text-lg font-bold mb-2">💎 Colecionadores de Raridade</h3>
          <p className="text-sm mb-2">Colete cartas de diferentes raridades</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Common Collector (1 Common) - 50 moedas</li>
            <li>Rare Collector (1 Rare) - 100 moedas</li>
            <li>Epic Collector (1 Epic) - 200 moedas</li>
            <li>Legendary Collector (1 Legendary) - 500 moedas</li>
            <li>Mythic Collector (1 Mythic) - 1.000 moedas</li>
          </ul>
        </div>

        <div className="bg-vintage-deep-black/30 p-4 rounded-lg">
          <h3 className="text-lg font-bold mb-2">✨ Colecionadores de Condição</h3>
          <p className="text-sm mb-2">Colete cartas em condições pristinas</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Pristine Collector (1) - 300 moedas</li>
            <li>Mint Collector (1) - 250 moedas</li>
            <li>Pristine Hoarder (10) - 1.000 moedas</li>
            <li>Pristine Master (50) - 5.000 moedas</li>
            <li>Pristine Legend (100) - 15.000 moedas</li>
          </ul>
        </div>

        <div className="bg-vintage-deep-black/30 p-4 rounded-lg">
          <h3 className="text-lg font-bold mb-2">🎴 Colecionadores de Foil</h3>
          <p className="text-sm mb-2">Colete variantes foil raras</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Shiny Collector (1 Standard Foil) - 200 moedas</li>
            <li>Prize Winner (1 Prize Foil) - 500 moedas</li>
            <li>Prize Legend (50 Prize Foils) - 10.000 moedas</li>
          </ul>
        </div>

        <div className="bg-vintage-deep-black/30 p-4 rounded-lg">
          <h3 className="text-lg font-bold mb-2">📊 Conquistas Progressivas</h3>
          <p className="text-sm">39 conquistas baseadas em milestones de coleção</p>
        </div>
      </div>
    </div>
  );
}

function QuestsDocs() {
  return (
    <div className="space-y-6 text-vintage-gold/90">
      <div>
        <h2 className="text-2xl font-bold text-vintage-gold mb-4">
          🎯 Sistema de Missões
        </h2>
        <p className="mb-4">
          Complete missões diárias e semanais para ganhar moedas extras!
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-vintage-deep-black/30 p-4 rounded-lg">
          <h3 className="text-lg font-bold mb-2">📅 Missões Diárias</h3>
          <p className="text-sm mb-3">
            UMA missão global por dia. Todos os jogadores têm a mesma missão.
          </p>
          <p className="text-sm mb-2">Exemplos de missões:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Ganhe 3 batalhas PvE</li>
            <li>Derrote o Gigachad</li>
            <li>Jogue 5 partidas</li>
            <li>Ganhe com poder máximo de 600</li>
          </ul>
          <p className="text-xs text-vintage-gold/60 mt-2">
            💰 Recompensas: 150-600 moedas
          </p>
        </div>

        <div className="bg-vintage-deep-black/30 p-4 rounded-lg">
          <h3 className="text-lg font-bold mb-2">📆 Missões Semanais</h3>
          <p className="text-sm mb-3">
            4 missões pessoais que resetam toda Domingo às 00:00 UTC
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>20 vitórias em ataques - 300 moedas</li>
            <li>30 partidas totais - 200 moedas</li>
            <li>10 vitórias defensivas - 400 moedas</li>
            <li>Sequência de 10 PvE - 500 moedas</li>
          </ul>
          <p className="text-xs text-vintage-gold/60 mt-2">
            💰 Total semanal: até 1.400 moedas
          </p>
        </div>

        <div className="bg-vintage-deep-black/30 p-4 rounded-lg">
          <h3 className="text-lg font-bold mb-2">🏆 Recompensas do Leaderboard</h3>
          <p className="text-sm mb-3">
            Recompensas semanais para os TOP 10 do leaderboard
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>🥇 1º lugar: 1.000 moedas</li>
            <li>🥈 2º lugar: 750 moedas</li>
            <li>🥉 3º lugar: 500 moedas</li>
            <li>⭐ 4º-10º: 300 moedas cada</li>
          </ul>
          <p className="text-xs text-vintage-gold/60 mt-2">
            ⚠️ Você precisa coletar manualmente as recompensas do leaderboard na aba Missões
          </p>
        </div>
      </div>
    </div>
  );
}
