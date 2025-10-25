# 🔧 Wallet Connection Troubleshooting

**Data**: 2025-10-25

---

## 🐛 Erros Comuns e Soluções

### ❌ Erro: "Cannot redefine property: ethereum"

**Sintomas**:
```
Uncaught TypeError: Cannot redefine property: ethereum
at Object.defineProperty (<anonymous>)
at window.addEventListener.once (extension.js:1)
```

**Causa**:
Este é um **conflito entre múltiplas extensões de wallet** tentando definir `window.ethereum` ao mesmo tempo.

Acontece quando você tem instalado:
- 🦊 MetaMask
- 💰 Coinbase Wallet
- 🐰 Rabby Wallet
- 🌈 Rainbow
- Ou outras extensões de wallet

Cada extensão tenta "definir" `window.ethereum` para si, mas apenas a primeira consegue. As outras geram este erro.

**⚠️ Importante**: Este erro **NÃO quebra a funcionalidade**! É apenas um warning no console.

---

### ✅ Solução: Desativar Extensões Extras

**Opção 1: Desativar extensões não usadas**
1. Vá em `chrome://extensions/` (ou `edge://extensions/`)
2. Desative temporariamente as wallets que você **não** vai usar
3. Mantenha apenas **uma wallet ativa**
4. Recarregue a página

**Opção 2: Usar RainbowKit para escolher**
- RainbowKit detecta automaticamente todas as wallets
- Escolha qual usar no modal de conexão
- Ignore o erro no console (não afeta nada)

**Opção 3: Usar modo anônimo**
- Abra aba anônima
- Ative apenas a extensão que quer usar
- Teste sem conflitos

---

### ❌ Problema: Botão "Connect Wallet" Fica em Loading Infinito

**Sintomas**:
- Clicou "Disconnect"
- Agora não consegue reconectar
- Botão fica "Loading..." infinito

**Causa**: Cache de estado da wallet anterior

**Solução**: ✅ **CORRIGIDO no commit `85780d1`**

Se ainda acontecer:
1. Limpe localStorage: F12 → Application → Local Storage → Clear
2. Recarregue a página (Ctrl+R)
3. Clique "Connect Wallet" novamente

---

### ❌ Erro: CORS/Network Blocked (Coinbase Analytics)

**Sintomas**:
```
POST https://ccr-lite.coinbase.com/metrics net::ERR_BLOCKED_BY_CLIENT
POST https://api.coinbase.com/metrics net::ERR_BLOCKED_BY_CLIENT
```

**Causa**:
- AdBlocker ou extensão de privacidade bloqueando analytics da Coinbase
- Coinbase Wallet tenta enviar métricas de uso

**Impacto**: ⚠️ **Nenhum!** Analytics são opcionais.

**Solução**:
- Ignore os erros (não afetam o jogo)
- Ou desative AdBlocker temporariamente
- Ou use wallet diferente (MetaMask, Rainbow)

---

### ❌ Problema: Não Consigo Ver Minhas Cartas

**Possíveis Causas**:

**1. Wallet errada conectada**
- Verifique se conectou a wallet certa
- Cartas NFT estão na wallet que você comprou
- Troque de wallet no RainbowKit se necessário

**2. Chain errada (não Base)**
- O jogo é na **Base network**
- RainbowKit avisa se você está em chain errada
- Clique para mudar para Base

**3. Cartas não reveladas**
- Site só mostra cartas **reveladas**
- Cartas "unopened" são filtradas
- Abra suas cartas no Vibe Market primeiro

---

## 🔍 Debug Passo-a-Passo

### Verificar Conexão:

1. **Abra o console** (F12)
2. **Verifique logs**:
   ```
   ✅ Auto-connected Farcaster wallet: 0x...  (se Farcaster)
   🔌 Desconectado                             (se desconectou)
   ```

3. **Verifique endereço**:
   - Deve aparecer no canto superior direito
   - Formato: `0x1234...5678`

4. **Verifique network**:
   - Deve estar em **Base**
   - RainbowKit mostra aviso se errado

---

## 🎯 Checklist de Conexão

Antes de reportar problema:

- [ ] Tenho wallet instalada (MetaMask/Rainbow/Coinbase)
- [ ] Estou na **Base network**
- [ ] Endereço aparece no canto superior direito
- [ ] Limpei cache/localStorage (se necessário)
- [ ] Tentei desativar outras extensões de wallet
- [ ] Recarreguei a página (Ctrl+R)

---

## 🆘 Ainda Com Problemas?

### Desktop:
1. Limpe localStorage (F12 → Application → Clear)
2. Feche todas as abas do site
3. Reabra em aba anônima
4. Ative apenas uma extensão de wallet
5. Tente conectar novamente

### Farcaster Miniapp:
1. Feche o miniapp completamente
2. Reabra pelo Farcaster
3. Site deve conectar automaticamente
4. Se não, reporte no GitHub

---

## 📊 Wallets Testadas e Funcionando

| Wallet | Desktop | Mobile | Status |
|--------|---------|--------|--------|
| MetaMask | ✅ | ✅ | Funciona |
| Rainbow | ✅ | ✅ | Funciona |
| Coinbase | ✅ | ✅ | Funciona |
| Rabby | ✅ | ❌ | Desktop only |
| Trust Wallet | ⚠️ | ✅ | Via WalletConnect |
| Ledger | ✅ | ❌ | Desktop only |
| Farcaster | ❌ | ✅ | Miniapp only |

✅ = Testado e funcionando
⚠️ = Funciona mas com limitações
❌ = Não suportado/não testado

---

## 🔗 Links Úteis

- **RainbowKit Docs**: https://rainbowkit.com
- **Wagmi Docs**: https://wagmi.sh
- **Base Network**: https://base.org
- **WalletConnect**: https://walletconnect.com

---

**💡 Dica**: A maioria dos erros de wallet são causados por conflitos entre extensões. Desative as que não está usando!
