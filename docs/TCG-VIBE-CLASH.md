# Vibe Clash - TCG Mode

## Visão Geral

Modo TCG simples e divertido com as 52-54 cartas do jogo.

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

## Sistema de Tipos (Naipes)

4 tipos elementais + 1 neutro:

```
🔥 Fogo > 🌿 Natureza > 💧 Água > 🔥 Fogo
⚡ Neutro (sem vantagem/desvantagem)
```

### Vantagem de Tipo
- Tipo forte contra outro = **+50% power**
- Tipo fraco contra outro = poder normal (sem penalidade)
- Neutro vs qualquer = poder normal

### Exemplo
- Carta Fogo (Power 50) vs Carta Natureza (Power 60)
- Fogo tem vantagem: 50 × 1.5 = 75
- Fogo vence (75 > 60)

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

## Fluxo de Jogo - Exemplo

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
