# VBMSPokerBattleV4 - Fix para permitir múltiplas battles

## 🎯 Objetivo
Permitir que players criem novas battles sem precisar chamar finishBattle TX.

## 📝 Mudanças no contrato

### Arquivo: `VBMSPokerBattleV4.sol`

**LINHA 85-87 - ANTES:**
```solidity
function createBattle(uint256 stake) external nonReentrant returns (uint256) {
    if (stake < minStake || stake > maxStake) revert InvalidStakeAmount();
    if (activeBattles[msg.sender] != 0) revert AlreadyInBattle(); // ❌ REMOVER ESTA LINHA
```

**LINHA 85-87 - DEPOIS:**
```solidity
function createBattle(uint256 stake) external nonReentrant returns (uint256) {
    if (stake < minStake || stake > maxStake) revert InvalidStakeAmount();
    // ✅ REMOVIDO: Verificação de activeBattles - permite criar nova battle sempre
    // A validação de "uma battle ativa por vez" agora é feita no backend Convex
```

**LINHA 122-123 - ANTES:**
```solidity
function joinBattle(uint256 battleId) external nonReentrant {
    Battle storage battle = battles[battleId];

    if (battle.id == 0) revert BattleNotFound();
    if (battle.status != BattleStatus.WAITING) revert BattleNotWaiting();
    if (battle.player1 == msg.sender) revert CannotJoinOwnBattle();
    if (activeBattles[msg.sender] != 0) revert AlreadyInBattle(); // ❌ REMOVER ESTA LINHA
```

**LINHA 122-123 - DEPOIS:**
```solidity
function joinBattle(uint256 battleId) external nonReentrant {
    Battle storage battle = battles[battleId];

    if (battle.id == 0) revert BattleNotFound();
    if (battle.status != BattleStatus.WAITING) revert BattleNotWaiting();
    if (battle.player1 == msg.sender) revert CannotJoinOwnBattle();
    // ✅ REMOVIDO: Verificação de activeBattles - permite entrar em battle sempre
```

## 🚀 Como aplicar

### Opção A: Deploy novo contrato V5 (RECOMENDADO)
1. Copiar `VBMSPokerBattleV4.sol` → `VBMSPokerBattleV5.sol`
2. Fazer as mudanças acima
3. Deploy via Remix
4. Atualizar endereço em `lib/contracts.ts`

### Opção B: Usar contrato V4 como está
Se não quiser fazer deploy novo, o sistema funcionará com validação apenas no Convex.
Players podem criar múltiplas battles no contrato, mas o Convex/Frontend impede isso.

## ⚠️ Importante
Após deploy do novo contrato, atualizar:
```typescript
// lib/contracts.ts
VBMSPokerBattle: '0x...NOVO_ENDERECO_V5...'
```
