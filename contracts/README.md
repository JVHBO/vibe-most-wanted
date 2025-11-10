# 🎯 Contratos VBMS - Sistema Completo

## 📦 Arquivos Criados

### Contratos Principais:
1. **VBMSPoolTroll.sol** - Pool de distribuição de tokens
2. **VBMSPokerBattle.sol** - Sistema de poker battles com stakes
3. **VBMSBetting.sol** - Sistema de apostas para espectadores
4. **MockERC20.sol** - Token de teste para desenvolvimento local

### Documentação:
- **ARCHITECTURE.md** - Documentação completa da arquitetura
- **DEPLOYMENT_GUIDE.md** - Guia passo a passo de deploy
- **README.md** - Este arquivo

---

## 🎮 Visão Geral dos Contratos

### 1️⃣ VBMSPoolTroll
**Arquivo:** `VBMSPoolTroll.sol`
**Propósito:** Distribuir VBMS de missões, PvE e PvP

**Features:**
- ✅ Claims com assinatura do backend
- ✅ Limites min/max configuráveis (1 - 100k VBMS)
- ✅ Sistema de pausa para emergências
- ✅ Blacklist de endereços
- ✅ Emergency withdraw (owner)
- ✅ Custom Victory ASCII art 🗿

**Transações Geradas:**
- 1 TX por claim
- ~50-80 TX/dia estimado

**Constructor:**
```solidity
constructor(
    address _vbmsToken,      // 0xb03439567cd22f278b21e1ffcdfb8e1696763827
    address _backendSigner   // Sua carteira de backend
)
```

---

### 2️⃣ VBMSPokerBattle
**Arquivo:** `VBMSPokerBattle.sol`
**Propósito:** Gerenciar poker battles com stakes em $VBMS

**Features:**
- ✅ Players depositam stakes iguais
- ✅ Vencedor leva 95% do pot
- ✅ 5% vai pro pool (reciclagem)
- ✅ Cancelamento após 10 min se ninguém entrar
- ✅ Signature verification do backend
- ✅ Stats de vitórias e earnings

**Transações Geradas:**
- 3 TX por battle (create, join, finish)
- +1 TX se cancelar
- 10 battles/dia = 30 TX
- 50 battles/dia = 150 TX

**Constructor:**
```solidity
constructor(
    address _vbmsToken,       // 0xb03439567cd22f278b21e1ffcdfb8e1696763827
    address _poolAddress,     // VBMSPoolTroll address
    address _backendSigner    // Sua carteira de backend
)
```

**Fluxo:**
```
TX 1: createBattle(100 VBMS)   → Player 1 deposita
TX 2: joinBattle(battleId)     → Player 2 deposita
      [Partida acontece off-chain]
TX 3: finishBattle(winner, sig) → Distribui winnings
```

---

### 3️⃣ VBMSBetting
**Arquivo:** `VBMSBetting.sol`
**Propósito:** Apostas de espectadores em poker battles

**Features:**
- ✅ Espectadores apostam no vencedor
- ✅ Payout 3x se acertar
- ✅ Perde tudo se errar
- ✅ 10% dos losing bets vão pro pool
- ✅ Stats de win rate
- ✅ Sistema de claims de winnings

**Transações Geradas:**
- 1 TX por aposta
- 1 TX por claim de winnings
- 100 espectadores = 100 TX (apostas) + 30 TX (claims) = **130 TX por battle!**

**Constructor:**
```solidity
constructor(
    address _vbmsToken,           // 0xb03439567cd22f278b21e1ffcdfb8e1696763827
    address _poolAddress,         // VBMSPoolTroll address
    address _backendSigner,       // Sua carteira de backend
    address _pokerBattleContract  // VBMSPokerBattle address
)
```

**Fluxo:**
```
TX 1-N: placeBet(battleId, predictedWinner, 50 VBMS)
        [Battle acontece e termina]
        resolveBets(battleId, winner, sig)
TX N+1: claimWinnings(battleId) → Winner recebe 3x
```

---

## 📊 Maximização de Transações

### Objetivo: Farcaster Miniapp Ranking UP! 📈

**Cenário: 100 usuários ativos/dia**

```
VBMSPoolTroll:      80 TX/dia
VBMSPokerBattle:    62 TX/dia
VBMSBetting:       150 TX/dia
──────────────────────────────
TOTAL:             292 TX/dia
══════════════════════════════

Monthly:  ~8,760 TX
Yearly:  ~106,580 TX
```

**Com otimizações:**
- Daily bonus: +100 TX/dia
- Micro-stakes battles: +100 TX/dia
- Free bets: +100 TX/dia
- **TOTAL OTIMIZADO: 592 TX/dia**

---

## 🚀 Deploy Order

⚠️ **IMPORTANTE:** Deploy NESTA ordem!

```
1. VBMSPoolTroll     (primeiro)
   ↓
2. VBMSPokerBattle   (precisa do Pool address)
   ↓
3. VBMSBetting       (precisa do Pool + Battle addresses)
```

### Deploy via Remix:

1. **VBMSPoolTroll:**
   ```
   _vbmsToken: 0xb03439567cd22f278b21e1ffcdfb8e1696763827
   _backendSigner: <SUA_CARTEIRA>
   ```
   → Copie o address deployado

2. **VBMSPokerBattle:**
   ```
   _vbmsToken: 0xb03439567cd22f278b21e1ffcdfb8e1696763827
   _poolAddress: <VBMSPOOLTROLL_ADDRESS>
   _backendSigner: <SUA_CARTEIRA>
   ```
   → Copie o address deployado

3. **VBMSBetting:**
   ```
   _vbmsToken: 0xb03439567cd22f278b21e1ffcdfb8e1696763827
   _poolAddress: <VBMSPOOLTROLL_ADDRESS>
   _backendSigner: <SUA_CARTEIRA>
   _pokerBattleContract: <VBMSPOKERBATTLE_ADDRESS>
   ```
   → Copie o address deployado

4. **Transferir VBMS pro pool:**
   ```solidity
   vbmsToken.transfer(
     VBMSPOOLTROLL_ADDRESS,
     1000000 * 10**18  // 1M VBMS
   )
   ```

---

## 🔐 Segurança

### ✅ Proteções Implementadas:
- ReentrancyGuard em todas funções críticas
- SafeERC20 para transfers seguros
- Ownable para funções admin
- ECDSA signature verification
- Nonce-based replay protection
- Custom errors (gas eficiente)
- Limites configuráveis

### ⚠️ Pontos de Atenção:
- **Backend signer:** Guardar private key com MUITO cuidado
- **Pool funding:** Monitorar balance do pool
- **Gas optimization:** Limitar queries em getActiveBattles()
- **Signature validation:** Backend deve validar tudo antes de assinar

### 🔒 Boas Práticas:
```bash
# .env (NUNCA commitar!)
BACKEND_SIGNER_PRIVATE_KEY=0x...
VBMS_TOKEN=0xb03439567cd22f278b21e1ffcdfb8e1696763827
VBMS_POOL_TROLL=0x...
VBMS_POKER_BATTLE=0x...
VBMS_BETTING=0x...
```

---

## 📚 Documentação Adicional

### Leitura Recomendada:
1. **ARCHITECTURE.md** - Arquitetura completa, fluxos, exemplos de código
2. **DEPLOYMENT_GUIDE.md** - Guia passo a passo de deploy via Remix
3. **VBMSPoolTroll.sol** - Leia os comentários do código
4. **VBMSPokerBattle.sol** - Fluxo completo de battles
5. **VBMSBetting.sol** - Sistema de apostas

### Exemplos de Integração Backend:
Ver `ARCHITECTURE.md` seção "Integração Backend" para:
- Criar signatures de claims
- Finalizar battles
- Resolver apostas
- Indexar eventos on-chain

---

## 🎯 Próximos Passos

### Checklist de Deploy:
- [ ] Ler DEPLOYMENT_GUIDE.md
- [ ] Testar localmente (opcional mas recomendado)
- [ ] Deploy VBMSPoolTroll via Remix
- [ ] Deploy VBMSPokerBattle via Remix
- [ ] Deploy VBMSBetting via Remix
- [ ] Verificar os 3 contratos no Basescan
- [ ] Transferir VBMS pro pool
- [ ] Atualizar .env.local com addresses
- [ ] Configurar backend signatures
- [ ] Testar integração completa
- [ ] Monitorar TX count
- [ ] PROFIT! 📈

### Futuras Melhorias:
- [ ] VBMSAchievements.sol (NFT achievements)
- [ ] Daily bonus claim (+100 TX/dia)
- [ ] Micro-stakes battles (1-10 VBMS)
- [ ] Free bet diário
- [ ] Leaderboard on-chain
- [ ] Tournament system

---

## 💡 Dicas

1. **Gas Optimization:**
   - Use `limit` parameter em `getActiveBattles()`
   - Backend deve indexar via events, não queries

2. **Backend Signatures:**
   - SEMPRE validar dados antes de assinar
   - Usar nonces únicos (timestamp + userId)
   - Nunca reusar signatures

3. **Monitoramento:**
   - Configurar alertas quando pool < 10% capacity
   - Track TX count diário via Basescan API
   - Monitor eventos para debugar issues

4. **Testing:**
   - Teste TUDO localmente primeiro
   - Use MockVBMS para testes
   - Simule battles completas (create → join → finish)

---

## 🔗 Links Úteis

- **Base Mainnet:** https://base.org
- **Basescan:** https://basescan.org
- **Remix IDE:** https://remix.ethereum.org
- **OpenZeppelin Docs:** https://docs.openzeppelin.com/contracts
- **VBMS Token:** `0xb03439567cd22f278b21e1ffcdfb8e1696763827`

---

## 📞 Suporte

Se encontrar bugs ou tiver dúvidas:
1. Leia ARCHITECTURE.md
2. Revise DEPLOYMENT_GUIDE.md
3. Verifique os comentários no código
4. Debug via Basescan explorer

---

**🚀 LETS FUCKING GO! 🚀**

Sistema completo de contratos VBMS pronto para maximizar transações on-chain e fazer o Farcaster miniapp subir no ranking! 📈🎯
