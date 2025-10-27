# Como configurar SimpleHash para buscar todas as 3,224 cards

## Situação atual:
- ✅ Temos 1,373 cards do contrato secundário
- ❌ Faltam ~1,851 cards do contrato principal
- ❌ APIs gratuitas não indexam o contrato principal corretamente

## Solução: SimpleHash API

### Passo 1: Criar conta no SimpleHash

1. Acesse: https://simplehash.com
2. Clique em "Sign Up" ou "Get Started"
3. Crie uma conta (pode usar Google/GitHub)

### Passo 2: Obter API Key

1. Após login, vá para o Dashboard
2. Procure por "API Keys" no menu lateral
3. Copie sua API Key (formato: `simplehash_xxxxxxxxxxxxx`)

### Passo 3: Configurar a API Key

**Opção A - Variável de ambiente (recomendado):**
```bash
set SIMPLEHASH_API_KEY=sua_key_aqui
```

**Opção B - Editar o arquivo:**
1. Abra o arquivo `fetch-simplehash-with-key.js`
2. Na linha 5, cole sua API key:
```javascript
const SIMPLEHASH_API_KEY = 'sua_key_aqui';
```

### Passo 4: Executar o script

```bash
cd vibe-most-wanted
node fetch-simplehash-with-key.js
```

O script vai:
- Buscar TODAS as NFTs do contrato principal
- Filtrar apenas as burned com rarity válida
- Calcular o power de cada uma
- Salvar em `jc-cards-revealed.json`
- Mostrar as top 10 mais fortes e total de Legendary

## Limites do tier gratuito:

- ✅ 100,000 requests/mês
- ✅ 3 requests/segundo
- ✅ Suficiente para ~10,000 NFTs

Para buscar 10,000 NFTs (50 por página = 200 páginas):
- Tempo estimado: ~2 minutos
- Requests usados: 200 (de 100,000)

## Se der erro 401 (Unauthorized):

- Verifique se a API key está correta
- Confirme que copiou a key completa (inclui o prefixo)
- Tente criar uma nova API key no dashboard

## Alternativas se SimpleHash não funcionar:

1. **QuickNode** (https://quicknode.com)
   - Free tier: 100M credits/mês
   - Setup mais complexo (precisa criar endpoint)

2. **Moralis** (https://moralis.com)
   - Plano pago: $49/mês
   - API mais robusta

## Próximos passos após obter as cards:

1. ✅ Verificar se tem 13+ Legendary
2. ✅ Confirmar top 5 power
3. ✅ Atualizar o jogo com o deck completo
