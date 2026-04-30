# VBMS Pool V2 - melhorias e migracao

Data: 2026-04-30

## Contexto

Contrato atual analisado:

- Pool atual: `0x062b914668f3fd35c3ae02e699cb82e1cf4be18b`
- Token VBMS na Base: `0xb03439567cd22f278b21e1ffcdfb8e1696763827`
- Owner atual: `0x2a9585Da40dE004d6Ff0f5F12cfe726BD2f98B52`
- Backend signer atual: `0x21c8AbF88f15f1a43CC42a78C8f616a3C2370A70`

O contrato atual nao mostrou uma falha obvia de saque sem assinatura valida do backend. O risco principal esta no desenho operacional: uma unica chave de signer consegue autorizar claims, o owner e uma EOA, as assinaturas nao usam EIP-712 com dominio forte, nao existe vencimento de assinatura e nao existe limite global diario de saida do pool.

## Falhas e riscos que devem ser corrigidos

1. Owner EOA: se a carteira owner for comprometida, o atacante pode trocar signer, pausar/despausar, alterar limites, blacklist e fazer operacoes administrativas.
2. Signer unico: se a chave de backend signer vazar, o atacante pode gerar assinaturas validas para muitas carteiras e drenar o pool respeitando apenas limites por usuario.
3. Assinatura sem EIP-712: a assinatura atual nao fica ligada explicitamente ao `chainId`, ao contrato verificador, ao tipo de claim e ao prazo de validade.
4. Sem prazo de validade: uma assinatura antiga continua valida ate o nonce ser usado.
5. Nonce global simples: funciona contra replay basico, mas e menos auditavel que um `claimId` unico gerado pelo backend para cada recompensa.
6. Sem limite global diario: varias carteiras diferentes podem sacar em paralelo ate esvaziar o saldo do contrato.
7. Limites altos demais para o saldo atual: `maxClaimAmount` e `dailyClaimLimit` estao acima do saldo observado do pool, entao nao protegem contra drenagem se o signer for abusado.
8. Emergency withdraw amplo: no contrato atual o owner consegue retirar fundos. Isso deve ficar atras de role de tesouraria e preferencialmente so quando o contrato estiver pausado.
9. Rastreio limitado por tipo de recompensa: o evento atual nao separa claramente slot, roulette, quest, inbox, betting, admin adjustment etc.
10. O contrato atual nao e "total on-chain": a geracao de recompensas continua fora da chain, no backend/Convex. O contrato atual valida o claim, mas nao calcula todo o saldo jogavel dentro da blockchain.

## Contrato novo criado

Arquivo: `contracts/src/VBMSPoolV2.sol`

Principais melhorias:

- Assinatura EIP-712 com dominio `VBMSPoolV2`, versao `1`, `chainId` e endereco do contrato.
- Claim estruturado: `Claim(address player,uint256 amount,bytes32 claimId,uint8 claimType,uint256 deadline)`.
- `claimId` unico por recompensa, impedindo replay e melhorando auditoria.
- `deadline` obrigatorio para assinatura expirar.
- `claimType` para separar origem da recompensa nos eventos.
- Roles separadas com `AccessControl`:
  - `DEFAULT_ADMIN_ROLE`
  - `CLAIM_SIGNER_ROLE`
  - `PAUSER_ROLE`
  - `LIMIT_MANAGER_ROLE`
  - `BLACKLIST_MANAGER_ROLE`
  - `TREASURY_ROLE`
- Pausa operacional com `Pausable`.
- Protecao de reentrancia com `ReentrancyGuard`.
- Blacklist individual e em lote.
- Limite diario por usuario.
- Limite global diario de saida do pool.
- Limite maximo por claim como percentual do saldo do pool.
- Saque de emergencia permitido somente quando pausado e apenas por `TREASURY_ROLE`.

## Migracao recomendada

1. Criar uma multisig para admin e treasury. Nao usar EOA como owner/admin final.
2. Gerar uma chave nova para `CLAIM_SIGNER_ROLE`; nao reutilizar a chave antiga.
3. Deployar `VBMSPoolV2` na Base usando o mesmo token VBMS.
4. Conceder roles para multisig e signer novo.
5. Atualizar backend para assinar EIP-712 com este tipo:

```solidity
Claim(address player,uint256 amount,bytes32 claimId,uint8 claimType,uint256 deadline)
```

6. Atualizar frontend/backend para chamar:

```solidity
claimVBMS(uint256 amount, bytes32 claimId, uint8 claimType, uint256 deadline, bytes signature)
```

7. Usar `claimType` padronizado:

```text
1 = slot
2 = roulette
3 = quest
4 = inbox
5 = betting
6 = admin_adjustment
```

8. Financiar o V2 gradualmente. Nao transferir saldo grande antes de testar claims reais com valores pequenos.
9. Reduzir limites do pool antigo enquanto a migracao nao terminar.
10. Pausar ou deixar com saldo minimo o pool antigo depois que o app estiver usando o V2.

## Configuracao inicial sugerida

Valores padrao do contrato V2:

- Claim minimo: `100 VBMS`
- Claim maximo: `200,000 VBMS`
- Limite diario por usuario: `500,000 VBMS`
- Limite global diario: `2,000,000 VBMS`
- Limite por claim sobre o saldo do pool: `50%`

Para o saldo atual observado do pool antigo, o ideal e comecar com limites menores que esses e aumentar depois de observar operacao real por alguns dias.

## Sobre contrato "total on-chain"

O `VBMSPoolV2` deixa o claim muito mais seguro, mas ainda segue o modelo atual: o backend calcula recompensas e o contrato liquida o pagamento com assinatura.

Para um sistema realmente total on-chain, onde os players geram recompensas e dao claim com toda regra dentro do contrato, seria necessario migrar tambem a logica de geracao de recompensas. Existem dois caminhos:

1. On-chain completo: o contrato registra as acoes do jogador, calcula recompensas e paga claims. E mais transparente, mas pode ficar caro em gas e exige redesenhar slot, quest, raid, betting e demais modos.
2. Raiz Merkle por periodo: o backend publica uma raiz de recompensas por rodada/dia, e cada usuario faz claim com prova Merkle. E mais barato e auditavel, mas ainda depende do backend para montar a raiz.

Recomendacao pragmatica: usar `VBMSPoolV2` agora para travar o risco de claim, e planejar uma V3/Merkle se o objetivo for remover a confianca no backend de recompensas.

## Acoes imediatas

- Migrar admin/treasury para multisig.
- Rotacionar signer.
- Baixar limites do contrato antigo enquanto a migracao nao termina.
- Manter logs de claim por `claimId`, `claimType`, usuario, valor, assinatura, txHash e status.
- Criar alerta se o limite global diario chegar perto de 70%.
- Criar alerta para muitas carteiras novas fazendo claim em curto intervalo.
