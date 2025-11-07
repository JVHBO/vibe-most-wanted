# 🗂️ PLANO DE REORGANIZAÇÃO - Vibe Most Wanted

**Data**: 2025-11-01
**Status**: ⏳ PENDING APPROVAL

---

## 📋 RESUMO

Total de arquivos a mover/organizar: **~50 arquivos**

### Problemas Identificados:
1. ❌ 5 arquivos `.env` temporários no root
2. ❌ 15+ scripts de teste/debug dispersos
3. ❌ 10+ arquivos JSON de dados no root
4. ❌ 4 configs do Tailwind
5. ❌ 12+ arquivos de documentação dispersos

---

## 🎯 ESTRUTURA PROPOSTA

```
vibe-most-wanted/
├── docs/                          # ✅ Toda documentação aqui
│   ├── KNOWLEDGE-BASE.md
│   ├── CODE-KNOTS.md
│   ├── ECONOMY-IMPROVEMENTS.md
│   ├── SECURITY.md
│   ├── reports/                   # Sub-pasta para relatórios específicos
│   │   ├── AI-DECKS-REPORT.md
│   │   ├── MECHA-GEORGE-FLOYD-RENAME-REPORT.md
│   │   └── SESSION-SUMMARY-2025-10-26.md
│   └── guides/                    # Sub-pasta para guias
│       ├── README-DESIGN-UPGRADE.md
│       ├── VISUAL-UPGRADE-GUIDE.md
│       └── FOIL-EFFECTS-IMPLEMENTATION.md
│
├── scripts/
│   ├── debug/                     # ✅ Scripts de debugging
│   │   ├── check-jayabs-full-metadata.js
│   │   ├── check-jc-deck.js
│   │   ├── test-jayabs-profile-load.js
│   │   ├── test-convex.js
│   │   └── analyze-difficulty-balance.js
│   │
│   ├── data-fetching/            # ✅ Scripts de fetch/scrape
│   │   ├── fetch-metadata-from-opensea-ids.js
│   │   ├── fetch-quicknode.js
│   │   ├── fetch-reservoir-api.js
│   │   ├── fetch-simplehash-api.js
│   │   ├── fetch-simplehash-with-key.js
│   │   ├── fetch-via-base-rpc.js
│   │   ├── scrape-opensea.js
│   │   ├── scrape-opensea-legendary-epic.js
│   │   └── scrape-opensea-no-common.js
│   │
│   └── utils/                     # ✅ Utilitários gerais
│       ├── analyze-economy.js
│       ├── normalize-usernames-script.js
│       ├── give-all-300-coins.cjs
│       ├── merge-new-legendary-epic.js
│       └── switch-design.js
│
├── data/
│   ├── cards/                     # ✅ Dados de cards
│   │   ├── jc-cards-revealed.json
│   │   ├── opensea-cards-data.json
│   │   ├── opensea-legendary-epic-ids.json
│   │   └── opensea-token-ids.json
│   │
│   └── backups/                   # ✅ Backups antigos
│       ├── jc-cards-revealed-backup.json
│       ├── jc-cards-revealed-backup-full.json
│       └── backup.json
│
├── configs/                       # ✅ Configs antigos do Tailwind
│   ├── tailwind.config.ORIGINAL.js
│   ├── tailwind.config.v1-modern.js
│   └── tailwind.config.v2-glass.js
│
└── [arquivos importantes no root]
    ├── tailwind.config.js         # ✅ Config atual FICA
    ├── package.json               # ✅ FICA
    ├── next.config.js             # ✅ FICA
    ├── README.md                  # ✅ FICA
    ├── .env.local                 # ✅ FICA
    ├── .env.production            # ✅ FICA
    └── .gitignore                 # ✅ FICA
```

---

## 🗑️ ARQUIVOS A DELETAR

### Arquivos .env Temporários (BACKUP PRIMEIRO!)
```bash
.env.production.bak
.env.production.tmp
.env.production.new
.env.vercel.check
.env.vercel.production.new
```

### Arquivos de Build Temporários
```bash
tsconfig.tsbuildinfo           # Pode ser regenerado
.vercel-deploy-trigger.txt     # Trigger temporário
```

### Scripts de Teste Antigos
```bash
switch-design.bat              # Versão Windows do switch-design.js
TESTE-VISUAL.html              # Teste visual já concluído
```

---

## 📦 COMANDOS DE REORGANIZAÇÃO

### Etapa 1: Mover Documentação
```bash
# Docs principais
mv CODE-KNOTS.md docs/
mv ECONOMY-IMPROVEMENTS.md docs/
mv SECURITY.md docs/
mv FOIL-EFFECTS-IMPLEMENTATION.md docs/guides/

# Relatórios
mv AI-DECKS-REPORT.md docs/reports/
mv MECHA-GEORGE-FLOYD-RENAME-REPORT.md docs/reports/
mv SESSION-SUMMARY-2025-10-26.md docs/reports/

# Guias
mv README-DESIGN-UPGRADE.md docs/guides/
mv VISUAL-UPGRADE-GUIDE.md docs/guides/
```

### Etapa 2: Mover Scripts
```bash
# Debug scripts
mv check-jayabs-full-metadata.js scripts/debug/
mv check-jc-deck.js scripts/debug/
mv test-jayabs-profile-load.js scripts/debug/
mv test-convex.js scripts/debug/
mv analyze-difficulty-balance.js scripts/debug/

# Data fetching scripts
mv fetch-*.js scripts/data-fetching/
mv scrape-*.js scripts/data-fetching/

# Utils
mv analyze-economy.js scripts/utils/
mv normalize-usernames-script.js scripts/utils/
mv give-all-300-coins.cjs scripts/utils/
mv merge-new-legendary-epic.js scripts/utils/
mv switch-design.js scripts/utils/
```

### Etapa 3: Mover Dados JSON
```bash
# Dados de cards
mv jc-cards-revealed.json data/cards/
mv opensea-cards-data.json data/cards/
mv opensea-legendary-epic-ids.json data/cards/
mv opensea-token-ids.json data/cards/

# Backups
mv jc-cards-revealed-backup*.json data/backups/
mv backup.json data/backups/
```

### Etapa 4: Mover Configs
```bash
# Tailwind configs antigos
mv tailwind.config.ORIGINAL.js configs/
mv tailwind.config.v1-modern.js configs/
mv tailwind.config.v2-glass.js configs/
```

### Etapa 5: Deletar Temporários
```bash
# ATENÇÃO: Fazer backup primeiro!
rm .env.production.bak
rm .env.production.tmp
rm .env.production.new
rm .env.vercel.check
rm .env.vercel.production.new
rm tsconfig.tsbuildinfo
rm .vercel-deploy-trigger.txt
rm switch-design.bat
rm TESTE-VISUAL.html
```

---

## ⚠️ ARQUIVOS QUE FICAM NO ROOT

Estes são essenciais e devem permanecer no root:

✅ **Configs Ativos**:
- `package.json`
- `package-lock.json`
- `next.config.js`
- `tsconfig.json`
- `tailwind.config.js` (atual)
- `postcss.config.js`
- `vercel.json`
- `firebase.json`
- `.firebaserc`

✅ **Ambiente**:
- `.env.local`
- `.env.production`
- `.env.vercel`
- `.env.vercel.production`

✅ **Git**:
- `.gitignore`
- `README.md`

---

## 📝 PENDÊNCIAS TÉCNICAS (do CODE-KNOTS.md)

### 🔴 High Priority
1. **Race Conditions** - Profile updates (app/page.tsx:2414-2436)
2. **Attack Flow** - Missing transaction grouping (app/page.tsx:3722-3754)

### 🟡 Medium Priority
1. **Error Handling** - PvP room creation (app/page.tsx:1470-1489)
2. **Hardcoded Values** - HAND_SIZE constant (app/page.tsx:multiple)
3. **Pattern Inconsistency** - CardViewer modal (app/page.tsx:4670-4700)

### 🟢 Pendências de Features
1. **Weekly Rewards System** - Não implementado (ECONOMY-IMPROVEMENTS.md:337-342)
2. **Farcaster Notifications** - ✅ Parcialmente feito (coins adicionados)

---

## 🚀 EXECUÇÃO

**ANTES DE EXECUTAR:**
1. ✅ Commit todos os changes atuais
2. ✅ Criar backup da pasta completa
3. ✅ Verificar que nada vai quebrar

**Comando para executar tudo de uma vez:**
```bash
# Será criado um script bash automatizado
bash reorganize-project.sh
```

---

## ✅ CHECKLIST PÓS-REORGANIZAÇÃO

- [ ] Build do Next.js passa
- [ ] Deploy no Vercel funciona
- [ ] Scripts em `scripts/` ainda funcionam
- [ ] Documentação está acessível
- [ ] Nenhum import quebrado
- [ ] .gitignore atualizado se necessário
- [ ] README.md atualizado com nova estrutura
