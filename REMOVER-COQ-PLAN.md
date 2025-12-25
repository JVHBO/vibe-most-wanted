# Plano: Remover Coleção COQ (Coquettish) do Site

## Resumo
Remover completamente a coleção Coquettish do VIBE Most Wanted, incluindo raid bosses, social quests, filtros, mecha arena, docs e todos os dados relacionados.

## Arquivos a Modificar (27 arquivos)

### 1. Configuração Principal da Coleção
- [ ] `lib/collections.ts` - Linhas 8, 175-186: Remover tipo e config da coleção

### 2. Raid Boss System
- [ ] `lib/raid-boss/boss-cards.ts`:
  - Linhas 47, 63, 79, 95, 111: Remover da rotação de bosses
  - Linhas 130, 146, 162, 178, 194: Remover da ordem de raridade
  - Linhas 444-496: Remover COQUETTISH_BOSSES (5 bosses)
  - Linha 1079: Remover do ALL_BOSS_CARDS mapping

### 3. Social Quests (Missões de Seguir Devs)
- [ ] `lib/socialQuests.ts`:
  - Linhas 146-158: Remover quest follow_satoshinaka (dev do COQ)
  - Linha 169: Mudar `collection: 'coquettish'` para `collection: 'meowverse'` (denkurhq é dev do Meowverse)
- [ ] `convex/socialQuests.ts` - Linha 25: Remover reward config do follow_satoshinaka

### 4. Arena Cards (Mecha Arena)
- [ ] `lib/arena-cards.ts`:
  - Linhas 997-1229: Remover 30 COQUETTISH_CARDS
  - Linha 2486: Remover do export
- [ ] `convex/arenaCardsData.ts` - Linhas 909-1124: Remover cards
- [ ] `public/data/arena-cards.json` - Linhas 906-1121: Remover cards

### 5. Daily Buff System
- [ ] `lib/dailyBuff.ts` - Linha 14: Remover 'coquettish' do ARENA_COLLECTIONS

### 6. Profile/Stats (coqPower)
- [ ] `lib/convex-profile.ts` - Linha 39: Remover coqPower field
- [ ] `convex/schema.ts` - Linha 39: Remover coqPower do schema
- [ ] `convex/profiles.ts` - Linhas 533, 830: Remover coqPower

### 7. Price Hooks
- [ ] `lib/hooks/useCollectionPrices.ts`:
  - Linha 62: Remover contract
  - Linha 79: Remover display info
  - Linha 157: Remover usePrice hook
  - Linha 178: Remover do return
- [ ] `app/api/cron/save-prices/route.ts` - Linha 59: Remover contract

### 8. Poker Battle System
- [ ] `convex/pokerBattle.ts` - Linha 1627: Remover da lista de coleções
- [ ] `convex/roundBetting.ts` - Linha 26: Remover da lista

### 9. UI - Filtros/Dropdowns
- [ ] `app/page.tsx`:
  - Linhas 1494-1495: Remover contract detection
  - Linhas 3141-3142: Remover power accumulation
  - Linha 3146: Remover coqPower do type
  - Linhas 3579, 5378: Remover `<option value="coquettish">COQ</option>`
- [ ] `app/leaderboard/page.tsx` - Linha 1205: Remover dropdown option
- [ ] `app/profile/[username]/page.tsx` - Linha 1015: Remover dropdown option

### 10. Components
- [ ] `components/CpuArenaModal.tsx` - Linha 33: Remover collection info
- [ ] `components/PokerBattleTable.tsx` - Linhas 31, 56: Remover image/display refs
- [ ] `components/NotEnoughCardsGuide.tsx` - Linha 22: Remover marketplace URL
- [ ] `components/PriceTicker.tsx` - Linhas 15, 33: Remover refs

### 11. Data Files
- [ ] `public/data/collections.json` - Linhas 7, 23: Remover das listas

### 12. Assets
- [ ] `public/images/raid-bosses/coquettish/` - Deletar pasta inteira (5 imagens)
- [ ] `.gitignore` - Linha 205: Remover exceção da pasta

### 13. Documentation
- [ ] `app/docs/page.tsx` - Linha 298: Remover `<span>💋 Coquettish</span>`

### 14. Test Pages (opcional)
- [ ] `app/test-covers/page.tsx` - Linhas 12, 28: Remover refs

## Dados Importantes
- **Contract Address**: `0xcdc74eeedc5ede1ef6033f22e8f0401af5b561ea`
- **Dev FID**: satoshinaka (203754) - único dev real do COQ
- **Total Cards**: 30 arena + 5 boss = 35 cards

## Ordem de Execução
1. Convex files primeiro (schema, profiles, socialQuests, pokerBattle, roundBetting, arenaCardsData)
2. Lib files (collections, arena-cards, boss-cards, dailyBuff, socialQuests, convex-profile, hooks)
3. Components (CpuArenaModal, PokerBattleTable, NotEnoughCardsGuide, PriceTicker)
4. Pages (page.tsx, leaderboard, profile)
5. API routes (save-prices)
6. Data files (JSON)
7. Assets (imagens)
8. Deploy Convex + Vercel

## Notas
- Após remover, fazer deploy do Convex com `--env-file .env.prod`
- Verificar se não quebra nenhuma query existente
- Os usuários que têm cards COQ ainda vão ter, mas não aparecerão mais no jogo
