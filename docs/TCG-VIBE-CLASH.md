# Vibe Clash - TCG Mode

## Visão Geral

Modo TCG estilo **Marvel Snap** - simples, intuitivo e divertido.

---

## 🎯 DECISÕES TOMADAS (22/01/2026 - Atualizado)

### Estilo de Jogo: Marvel Snap
- ✅ **Simultâneo** - Ambos jogadores escolhem cartas ao mesmo tempo
- ✅ **3 Lanes** - Batalha por zonas
- ✅ **Tempo limite** - 20 segundos por turno
- ✅ **Reveal simultâneo** - Cartas aparecem ao mesmo tempo
- ✅ **Vitória** - Dominar 2/3 lanes no final
- ✅ **6 Turnos** - Energia 1→2→3→4→5→6
- ✅ **Sem dado** - Power puro decide (simples)
- ✅ **Sem vantagem de tipo** - Naipes não dão bônus (simples)

### Composição do Deck
- ✅ **15 cartas** total
- ✅ **Mínimo 8 VBMS** (NFT)
- ✅ **Máximo 7 Nothing** (cartas de pack grátis)

### Sistema de Draw
- ✅ **Mão inicial**: 3 cartas (aleatório do deck)
- ✅ **Draw por turno**: 1 carta
- ✅ **Turno 1**: VBMS garantido no draw
- ✅ **Turnos 2-6**: Aleatório do deck
- ✅ **Total visto**: 9 de 15 cartas (60%)

### Sistema de Sacrifício Nothing 🔥

**Da Mão:**
| Ação | Efeito |
|------|--------|
| Sacrificar Nothing da mão | Descarta e compra outra carta (cycle) |

**Do Lane:**
| Ação | Efeito |
|------|--------|
| Sacrificar Nothing do lane | Remove carta e dá buff em outra carta |

### Buff por Sacrifício do Lane

**Base (por rarity da Nothing sacrificada):**
| Rarity | Buff base |
|--------|-----------|
| Common | +power da carta |
| Rare | +power da carta |
| Epic | +power da carta |
| Legendary | +power da carta |

**Multiplicador por Foil:**
| Foil | Multiplicador | Extra |
|------|---------------|-------|
| None | ×1 | - |
| Standard | ×1.5 | - |
| Prize | ×2 | + efeito especial |

**Efeitos Especiais Prize Foil (por rarity):**
| Rarity + Prize | Efeito Especial |
|----------------|-----------------|
| Common Prize | Carta buffada fica protegida 1 turno |
| Rare Prize | Compra 1 carta extra |
| Epic Prize | Buff espalha pro lane inteiro |
| Legendary Prize | Copia habilidade de VBMS adjacente |

### Diferença VBMS vs Nothing

| Aspecto | VBMS | Nothing |
|---------|------|---------|
| **Power** | 100% | 50% |
| **Habilidades** | Únicas por personagem | Não tem |
| **Sacrifício** | Não pode | Pode (mão ou lane) |
| **Valor** | NFT real | Grátis de packs |
| **Mínimo no deck** | 8 | 0 |
| **Máximo no deck** | 15 | 7 |

### Fluxo do Turno
```
1. Fase Draw: Compra 1 carta (T1 = VBMS garantido)
2. Fase Action (20 seg):
   - Jogar cartas nos lanes
   - Sacrificar Nothing da mão (cycle)
   - Sacrificar Nothing do lane (buff)
3. Fase Reveal: Cartas aparecem simultaneamente
4. Fase Resolution: Calcular power dos lanes
5. Próximo turno (ou fim se turno 6)
```

### Fim do Jogo
- Após turno 6, compara power total em cada lane
- Quem dominar 2/3 lanes vence
- Empate em lane = ninguém domina aquele lane

---

## 📊 Schema Convex (Implementado)

### Tabelas
- `tcgMatches` - Partidas em andamento
- `tcgDecks` - Decks salvos dos jogadores
- `tcgHistory` - Histórico de partidas

### Status do Match
```
waiting → deck-select → in-progress → finished
                                   → cancelled
```

---

## ❓ DECISÕES PENDENTES

### Custo de Energia por Rarity
| Rarity | Custo sugerido |
|--------|----------------|
| Common | 1 |
| Rare | 2 |
| Epic | 3 |
| Legendary | 4-5 |
| Mythic | 6 |

### Habilidades VBMS
- Cada personagem tem habilidade única?
- Ou habilidades por raridade?
- Lista de 53 habilidades a criar

### Economia
- Entry fee pra jogar?
- Rewards pro vencedor?
- Ranking/Leaderboard TCG?

---

## Referência Original (abaixo)

---

## Regras Básicas

### Setup
- **Deck**: 20 cartas (das 52-54 disponíveis)
- **Mão inicial**: 5 cartas
- **Vida**: 20 HP cada jogador

### Turno
1. Compra 1 carta
2. Joga 1 carta (ataca direto o oponente)
3. Oponente pode **defender** jogando uma carta da mão

### Combate
- **Se defende**: maior power vence, perdedor descarta a carta
- **Se não defende**: dano = power da carta atacante direto no HP
- **Empate**: ambos descartam

### Condição de Vitória
- Reduzir HP do oponente a 0
- Ou: oponente não tem cartas para jogar (mão + deck vazios)

---

## Sistema de Tipos (Naipes) ♠️♥️♦️♣️

**Usamos os naipes das cartas como tipos!**

### Os 4 Naipes
| Naipe | Símbolo | Estilo de jogo |
|-------|---------|----------------|
| ♥️ **Hearts** | Copas | Agressivo, dano direto |
| ♦️ **Diamonds** | Ouros | Controle, manipulação |
| ♣️ **Clubs** | Paus | Defesa, resistência |
| ♠️ **Spades** | Espadas | Versatil, efeitos únicos |

### Vantagem de Tipo (Opcional)
```
♥️ Hearts > ♣️ Clubs > ♦️ Diamonds > ♠️ Spades > ♥️ Hearts
```
- Vantagem = +25% power
- Desvantagem = normal (sem penalidade)

### Sinergia de Naipe
**Cartas do mesmo naipe no mesmo lane:**
- 2 cartas = +10% power cada
- 3+ cartas = +20% power cada

### Distribuição (52 cartas, 13 por naipe)
Cada naipe tem:
- 1 Ás (???)
- 5 Commons (2-6)
- 2 Rares (7-8)
- 3 Epics (9-J)
- 1 Legendary (Q)
- 1 Mythic (K)

---

## Habilidades - CADA CARTA TEM HABILIDADE ÚNICA!

**IMPORTANTE**: Cada um dos 40+ personagens terá sua própria habilidade única no TCG!

### Ideias de Tipos de Habilidades:
- **Ofensivas**: Dano extra, penetra defesa, ataque duplo
- **Defensivas**: Bloqueia dano, cura HP, escudo
- **Utilitárias**: Comprar carta, descartar carta inimiga, ver mão do oponente
- **Passivas**: Buff permanente enquanto em campo/mão
- **Ativas**: Efeito único quando jogada (one-time)

### TODO: Definir habilidade para cada personagem
Ver `data/vmw-characters.json` para lista completa.

Exemplos (a definir):
| Personagem | Crime | Habilidade TCG (sugestão) |
|------------|-------|---------------------------|
| antonio (Legendary) | Left brain handles logic... | ??? |
| tukka (Legendary) | Cock-twister | ??? |
| brian armstrong (Epic) | Clark Kent... | ??? |
| zurkchad (Epic) | JC's alterego... | ??? |
| lombra (Epic) | Certified dick knower | ??? |
| smolemaru (Rare) | Creative mind... | ??? |
| dan romero (Common) | Too cute to harm | ??? |
| claude (Common) | Computing... Clauding... | ??? |

### Antiga ideia (DESCARTADO - era por raridade):
~~| Raridade | Habilidade |~~
~~| Common | Nenhuma |~~
~~| Rare | +2 HP se vencer |~~
~~| Epic | Compra +1 carta se vencer |~~
~~| Legendary | Ataca 2x |~~

**Agora: cada carta = habilidade única!**

---

## Bônus de Foil

| Foil | Efeito Especial |
|------|-----------------|
| Prize Foil | Uma vez por jogo: ataque não pode ser defendido |
| Standard Foil | +20% power permanente |
| Sem Foil | Nenhum bônus |

---

## Sistema de Sorte - Dado de RPG 🎲

### Dados Disponíveis
| Dado | Range | Uso |
|------|-------|-----|
| d4 | 1-4 | Bônus pequeno |
| d6 | 1-6 | Padrão |
| d8 | 1-8 | Médio |
| d10 | 1-10 | Alto |
| d12 | 1-12 | Muito alto |
| d20 | 1-20 | Crítico/Especial |

### Quando Rolar?
**OPÇÕES (A DECIDIR):**

**Opção A - Rolar em todo ataque:**
- Atacante rola dado → adiciona ao power
- Defensor rola dado → adiciona ao power
- Empates resolvidos por nova rolagem

**Opção B - Rolar só em empates:**
- Combate normal primeiro
- Se empate → ambos rolam d20
- Maior resultado vence

**Opção C - Dado por raridade:**
| Raridade | Dado |
|----------|------|
| Common | d4 |
| Rare | d6 |
| Epic | d8 |
| Legendary | d12 |
| Mythic | d20 |
- Carta mais rara = mais chance de luck bonus

**Opção D - Dado como habilidade:**
- Algumas cartas têm habilidade "Roll d6: +resultado ao power"
- Não é automático, é skill específica

### Crítico (Natural 20 / Max Roll)
- Rolar o máximo do dado = **CRÍTICO**
- Efeito crítico: ???
  - Dano dobrado?
  - Ignora defesa?
  - Compra carta extra?

### Falha Crítica (Natural 1)
- Rolar 1 = **FALHA**
- Efeito falha: ???
  - Perde o turno?
  - Descarta carta extra?
  - Dano reduzido pela metade?

---

## Modelo de Jogo - OPÇÕES

### Opção 1: Estilo War (original)
- Turno alternado
- Joga 1 carta, oponente defende
- HP system (20 HP cada)

### Opção 2: Estilo Marvel Snap ⭐
**Referência:** Marvel Snap (mobile, muito popular)

**Estrutura:**
- 3 Lanes (locais de batalha)
- 6 turnos total
- Cada turno: compra 1, joga cartas nos lanes
- Final: quem dominar 2/3 lanes vence

**Energia por turno:**
| Turno | Energia |
|-------|---------|
| 1 | 1 |
| 2 | 2 |
| 3 | 3 |
| 4 | 4 |
| 5 | 5 |
| 6 | 6 |

**Custo das cartas (por rarity):**
| Rarity | Custo | Power médio |
|--------|-------|-------------|
| Common | 1-2 | 30-50 |
| Rare | 2-3 | 50-80 |
| Epic | 3-4 | 80-120 |
| Legendary | 5-6 | 120-180 |
| Mythic | 6 | 180-250 |

**Foils no Snap-style:**
| Foil | Efeito |
|------|--------|
| Prize | Habilidade especial única |
| Standard | +20% power |
| None | Normal |

---

## Sistema de Efeitos - TODAS as cartas têm efeito!

### Tipos de Efeitos
| Tipo | Quando ativa | Exemplo |
|------|--------------|---------|
| **On Reveal** | Quando joga a carta | "Ganhe +10 power para cada carta no lane" |
| **Ongoing** | Sempre ativo enquanto em jogo | "+5 power para cartas aliadas aqui" |
| **On Destroy** | Quando a carta é destruída | "Dê +20 power a uma carta aleatória" |
| **Sacrifice** | Descarte esta carta para... | "Descarte: +30 power a outra carta" |

### Efeitos por Rarity
| Rarity | Complexidade do efeito |
|--------|------------------------|
| Common | Efeitos simples, condicionais |
| Rare | On Reveal úteis |
| Epic | Ongoing ou combos |
| Legendary | Game-changing |
| Mythic | Win conditions |

---

## Cartas NOTHING - Sistema de Sacrifício 🔥

**Filosofia:** Nothing cards = combustível/suporte, VMW cards = fighters principais

### O que são Nothing cards?
- Cartas grátis de packs (não são NFTs)
- Mais fracas que VMW
- MAS: têm mecânica de SACRIFÍCIO

### Mecânica de Sacrifício
**Nothing cards podem ser sacrificadas para:**

| Sacrifício | Efeito |
|------------|--------|
| **Fuel** | Descarte Nothing → +1 energia neste turno |
| **Boost** | Descarte Nothing → +20 power em carta VMW |
| **Draw** | Descarte 2 Nothing → Compre 1 carta |
| **Revive** | Descarte 3 Nothing → Recupere 1 carta VMW do descarte |

### Balanceamento VMW vs Nothing
| Aspecto | VMW | Nothing |
|---------|-----|---------|
| Power base | 100% | 50% |
| Efeitos | Únicos por personagem | Genéricos por rarity |
| Sacrificável | Não | Sim |
| Valor | NFT real | Grátis |

### Sinergia VMW + Nothing
**Ideia:** Decks mistos funcionam melhor!
- Nothing dá suporte/fuel
- VMW são as cartas de impacto
- Incentiva ter ambas coleções

### Exemplo de combo:
```
Turno 3 (3 energia):
- Sacrifica Nothing Common → ganha +1 energia (agora tem 4)
- Joga TUKKA (Legendary, custo 4) no turno 3!
- Vantagem: jogou Legendary 2 turnos antes do normal
```

### Deck Building sugerido (12 cartas):
- 4-6 Nothing (fuel/sacrifício)
- 4-6 VMW Common/Rare (base)
- 1-2 VMW Epic/Legendary (finishers)

**Vantagens:**
- Partidas rápidas (2-3 min)
- Simples de entender
- Funciona bem mobile
- Não precisa esperar oponente (joga simultâneo)

**Exemplo de partida:**
```
=== TURNO 6 (FINAL) ===

LANE 1          LANE 2          LANE 3
[Tukka 150⭐]   [Claude 40]     [vazio]
Prize Foil

vs              vs              vs

[Dan 35]        [Gozaru 30]     [Antonio 144]
[Vlady 25]      [Ink 30]        (120 + 20% foil)
────────        ────────        ────────
150 vs 60       40 vs 60        0 vs 144
P1 VENCE ✓      P2 VENCE ✓      P2 VENCE ✓

Resultado: Player 2 vence (2/3 lanes)
```

---

## Fluxo de Jogo - Exemplo (Modelo War)

```
=== INÍCIO ===
João: 20 HP | Mão: 5 cartas | Deck: 15 cartas
Maria: 20 HP | Mão: 5 cartas | Deck: 15 cartas

=== TURNO 1 (João) ===
João compra 1 carta (mão: 6)
João joga: Carta Fogo (Power 50, Common)
Maria decide: DEFENDER com Carta Água (Power 40, Rare)

Combate:
- Fogo > Água (vantagem de tipo)
- João: 50 × 1.5 = 75
- Maria: 40
- Resultado: João VENCE

Maria descarta Carta Água
João mantém Carta Fogo (volta pra mão? ou descarta também?)
> REGRA: Vencedor também descarta a carta usada

=== TURNO 2 (Maria) ===
Maria compra 1 carta (mão: 5)
Maria joga: Carta Epic Natureza (Power 60)
João decide: NÃO DEFENDER

Dano direto:
- João perde 60 HP
- João: 20 - 60 = -40 HP

=== FIM ===
Maria VENCE!
```

---

## Estratégias Básicas

### Construção de Deck
- Balancear tipos para não ser countered facilmente
- Incluir cartas de alta raridade para habilidades
- Prize Foils são game-changers, usar com sabedoria

### Durante o Jogo
- Defender com cartas fracas, guardar fortes para atacar
- Usar vantagem de tipo para maximizar trades
- Legendary cards: atacar quando oponente tem mão vazia

---

## Parâmetros para Balanceamento

Valores que podem ser ajustados:

| Parâmetro | Valor Atual | Notas |
|-----------|-------------|-------|
| Deck size | 20 | Aumentar = jogos mais longos |
| Mão inicial | 5 | Aumentar = mais opções iniciais |
| HP inicial | 20 | Aumentar = jogos mais longos |
| Bônus de tipo | +50% | Aumentar = tipos mais importantes |
| Rare HP bonus | +2 | - |
| Foil power bonus | +20% | - |

---

## Coleções Utilizadas

**IMPORTANTE**: O TCG usa APENAS estas coleções:

| Coleção | Cartas | Tipo | Traits |
|---------|--------|------|--------|
| **Vibe Most Wanted** | 52 cartas únicas | NFT (on-chain) | Name, Crime, Rarity, Foil, Wear |
| **Nothing** | ? cartas | Packs (não-NFT) | Rarity, Foil, Wear |

### Traits VMW (Vibe Most Wanted)

**52 personagens únicos**, cada um com:
- **Name**: Nome do personagem (único, fixo)
- **Crime**: Tipo de crime (único, fixo) - pode definir elemento/tipo no TCG
- **Rarity**: FIXA por personagem (ex: Goofy Romero = sempre Legendary)

**Variáveis por "print":**
- **Foil**: Prize, Standard, None (pode variar)
- **Wear**: Pristine, Mint, Lightly Played, Moderately Played, Heavily Played (pode variar)

**Exemplo:**
```
Goofy Romero
├── Name: Goofy Romero (FIXO)
├── Crime: ??? (FIXO)
├── Rarity: Legendary (FIXO)
├── Foil: Prize / Standard / None (VARIA por mint)
└── Wear: Pristine → Heavily Played (VARIA por mint)
```

**Lista Completa: 52 Personagens** (fonte: baccarat/page.tsx)

| Rank | Hearts | Diamonds | Clubs | Spades |
|------|--------|----------|-------|--------|
| **A** | anon | linda xied | vitalik jumpterin | jesse |
| **2** | rachel | claude | gozaru | ink |
| **3** | casa | groko | rizkybegitu | thosmur |
| **4** | brainpasta | gaypt | dan romero | morlacos |
| **5** | landmine | linux | joonx | don filthy |
| **6** | pooster | john porn | scum | vlady |
| **7** | smolemaru | ventra | bradymck | shills |
| **8** | betobutter | qrcodo | loground | melted |
| **9** | sartocrates | 0xdeployer | lombra jr | vibe intern |
| **10** | jack the sniper | beeper | horsefarts | jc denton |
| **J** | zurkchad | slaterg | brian armstrong | nftkid |
| **Q** | antonio | goofy romero | tukka | chilipepper |
| **K** | miguel | naughty santa | ye | nico |

**Distribuição de Raridade (estimada - precisa verificar no vibechain):**
- **Mythic?**: K cards (miguel, naughty santa, ye, nico) - NÃO MINTADOS AINDA
- **Legendary**: Q cards (antonio, goofy romero, tukka, chilipepper)
- **Epic**: 9, 10, J cards
- **Rare**: 7, 8 cards
- **Common**: 2-6 cards
- **???**: A cards (anon, linda xied, vitalik jumpterin, jesse)

**Arquivos:**
- `data/vmw-characters.json` - 40 personagens mintados (on-chain)
- `data/vmw-characters-complete.json` - 52 personagens completos (do baccarat)

### Sistema de Carregamento de Cards (TCG)

**NÃO mapear todos os 10k+ tokens!** Fazer por demanda:

1. **Player conecta wallet**
2. **Busca tokens VMW do player** (via Alchemy getNFTsForOwner)
3. **Para cada token** → busca metadata do wield.xyz:
   - `https://build.wield.xyz/vibe/boosterbox/metadata/vibe-most-wanted/{tokenId}`
   - Extrai: name, rarity, foil, wear
4. **Salva/cache** só os cards do player
5. **Usa no TCG** - deck building, batalhas, etc.

**Vantagens:**
- Não precisa mapear 10k+ tokens
- Funciona com cartas novas mintadas
- Cartas não mintadas não aparecem (correto!)

**Endpoint metadata:**
```
GET https://build.wield.xyz/vibe/boosterbox/metadata/vibe-most-wanted/{tokenId}

Response:
{
  "attributes": [
    { "trait_type": "name", "value": "nicogay" },
    { "trait_type": "Rarity", "value": "Legendary" },
    { "trait_type": "Foil", "value": "None" },
    { "trait_type": "Wear", "value": "Lightly Played" }
  ]
}
```

### Trait Crime
**IGNORAR POR ENQUANTO** - Cada Name tem seu Crime fixo (relação 1:1).
Crime é só flavor text do personagem, não afeta gameplay.

### Sistema de Tipos/Elementos para TCG
**A DECIDIR** - Como definir o tipo de cada carta:

| Opção | Descrição |
|-------|-----------|
| **Por Naipe** | Hearts=Fogo, Diamonds=Água, Clubs=Natureza, Spades=Neutro |
| **Por Rank** | Baixos=Fogo, Médios=Água, Altos=Natureza, Figuras=Neutro |
| **Manual** | Definir tipo individualmente para cada personagem |

### Traits Nothing
- **Rarity**: Common, Rare, Epic, Legendary, Mythic
- **Foil**: Prize, Standard, None
- **Wear**: Pristine, Mint, Lightly Played, Moderately Played, Heavily Played

### Diferença Principal
- **Vibe Most Wanted**: NFTs reais, valor on-chain
- **Nothing**: Cartas de packs, não são NFTs

### Balanceamento: Nothing deve ser mais fraca

**A DECIDIR** - Opções de como fazer Nothing inferior:

| Opção | Descrição | Impacto |
|-------|-----------|---------|
| **1. Multiplicador Power** | Nothing tem 50-70% do power | Simples, direto |
| **2. Sem Habilidades** | Nothing não ganha habilidades de raridade | VMW tem edge estratégico |
| **3. Limite no Deck** | Máx X cartas Nothing por deck (ex: 5 de 20) | Força ter VMW |
| **4. Desvantagem Tipo** | Nothing nunca tem vantagem de tipo | VMW domina combate |
| **5. Perde Empates** | VMW sempre vence empate contra Nothing | Desempate automático |
| **6. Combo** | Juntar várias opções acima | Mais complexo |

**Justificativa**: VMW são NFTs com valor real, Nothing são grátis de packs. Faz sentido VMW ser superior no jogo.

---

## Integração com Sistema Atual

### Usa do sistema existente:
- ✅ Power das cartas (já calculado)
- ✅ Rarity (Common → Mythic)
- ✅ Foil (Prize, Standard, None)
- ✅ Collections: Vibe Most Wanted + Nothing

### Precisa adicionar:
- ❌ Tipo/Elemento para cada carta das coleções VMW e Nothing
- ❌ UI de batalha TCG
- ❌ Matchmaking TCG
- ❌ Deck builder (20 cartas)

### Mapeamento de Tipos (sugestão)

Definir tipo baseado em atributos da carta ou manualmente:

**Opção A - Por Atributo da Carta**
Usar um atributo existente (ex: background, trait) para determinar tipo

**Opção B - Distribuição Manual**
Dividir as ~54 cartas em:
- 🔥 Fogo: ~13 cartas
- 💧 Água: ~13 cartas
- 🌿 Natureza: ~13 cartas
- ⚡ Neutro: ~13 cartas + 2 especiais (Mythic?)

**Opção C - Por Coleção**
- Vibe Most Wanted = 2 tipos (Fogo + Natureza)
- Nothing = 2 tipos (Água + Neutro)

---

## TODO - Implementação

### Concluído
- [x] **Extração de traits** - `PlayerCardsContext.tsx` agora extrai:
  - `character`: nome do personagem (trait "name" - ex: "nicogay", "tukka")
  - `rarity`: raridade da carta
  - `foil`: tipo de foil (Prize, Standard, None)
  - `wear`: condição da carta (Pristine → Heavily Played)

### Pendente
- [ ] Definir tipos/elementos para todas as 52-54 cartas
- [ ] Definir habilidade única para cada personagem
- [ ] Schema: nova tabela `tcgMatches` ou reusar `matches`
- [ ] Backend: lógica de combate TCG
- [ ] Frontend: UI de batalha
- [ ] Matchmaking: fila ou convite
- [ ] Rewards: definir economia (entry fee, prizes)
- [ ] Balanceamento: implementar penalidade para Nothing cards

---

## Notas de Design

**Por que esse sistema funciona:**
1. **Simples** - Uma carta por turno, fácil de entender
2. **Decisões** - Defender agora ou guardar para atacar?
3. **Estratégia** - Composição de deck importa
4. **Rápido** - Partidas de 3-5 minutos
5. **Reusa sistema** - Power, rarity, foil já existem

**Inspirações:**
- Simplicidade de War/Batalha
- Tipos de Pokémon
- Habilidades de Hearthstone (simplificadas)
