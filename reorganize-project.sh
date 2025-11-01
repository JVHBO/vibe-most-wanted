#!/bin/bash

# 🗂️ VIBE MOST WANTED - PROJECT REORGANIZATION SCRIPT
# Data: 2025-11-01
# ATENÇÃO: Este script vai reorganizar ~50 arquivos!

set -e  # Exit on error

echo "🗂️  VIBE MOST WANTED - PROJECT REORGANIZATION"
echo "=============================================="
echo ""
echo "⚠️  ESTE SCRIPT VAI:"
echo "  1. Mover ~50 arquivos para pastas organizadas"
echo "  2. Deletar arquivos temporários"
echo "  3. Criar estrutura docs/scripts/data/configs"
echo ""
read -p "❓ Deseja continuar? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "❌ Reorganização cancelada"
    exit 1
fi

echo ""
echo "✅ Iniciando reorganização..."
echo ""

# Create directory structure
echo "📁 Criando estrutura de pastas..."
mkdir -p docs/reports docs/guides
mkdir -p scripts/debug scripts/data-fetching scripts/utils
mkdir -p data/cards data/backups
mkdir -p configs

# ETAPA 1: Mover Documentação
echo ""
echo "📚 [1/5] Movendo documentação..."

# Docs principais
[ -f "CODE-KNOTS.md" ] && mv CODE-KNOTS.md docs/ && echo "  ✓ CODE-KNOTS.md → docs/"
[ -f "ECONOMY-IMPROVEMENTS.md" ] && mv ECONOMY-IMPROVEMENTS.md docs/ && echo "  ✓ ECONOMY-IMPROVEMENTS.md → docs/"
[ -f "SECURITY.md" ] && mv SECURITY.md docs/ && echo "  ✓ SECURITY.md → docs/"

# Relatórios
[ -f "AI-DECKS-REPORT.md" ] && mv AI-DECKS-REPORT.md docs/reports/ && echo "  ✓ AI-DECKS-REPORT.md → docs/reports/"
[ -f "MECHA-GEORGE-FLOYD-RENAME-REPORT.md" ] && mv MECHA-GEORGE-FLOYD-RENAME-REPORT.md docs/reports/ && echo "  ✓ MECHA-GEORGE-FLOYD-RENAME-REPORT.md → docs/reports/"
[ -f "SESSION-SUMMARY-2025-10-26.md" ] && mv SESSION-SUMMARY-2025-10-26.md docs/reports/ && echo "  ✓ SESSION-SUMMARY-2025-10-26.md → docs/reports/"

# Guias
[ -f "FOIL-EFFECTS-IMPLEMENTATION.md" ] && mv FOIL-EFFECTS-IMPLEMENTATION.md docs/guides/ && echo "  ✓ FOIL-EFFECTS-IMPLEMENTATION.md → docs/guides/"
[ -f "README-DESIGN-UPGRADE.md" ] && mv README-DESIGN-UPGRADE.md docs/guides/ && echo "  ✓ README-DESIGN-UPGRADE.md → docs/guides/"
[ -f "VISUAL-UPGRADE-GUIDE.md" ] && mv VISUAL-UPGRADE-GUIDE.md docs/guides/ && echo "  ✓ VISUAL-UPGRADE-GUIDE.md → docs/guides/"

# ETAPA 2: Mover Scripts
echo ""
echo "🔧 [2/5] Movendo scripts..."

# Debug scripts
[ -f "check-jayabs-full-metadata.js" ] && mv check-jayabs-full-metadata.js scripts/debug/ && echo "  ✓ check-jayabs-full-metadata.js → scripts/debug/"
[ -f "check-jc-deck.js" ] && mv check-jc-deck.js scripts/debug/ && echo "  ✓ check-jc-deck.js → scripts/debug/"
[ -f "test-jayabs-profile-load.js" ] && mv test-jayabs-profile-load.js scripts/debug/ && echo "  ✓ test-jayabs-profile-load.js → scripts/debug/"
[ -f "test-convex.js" ] && mv test-convex.js scripts/debug/ && echo "  ✓ test-convex.js → scripts/debug/"
[ -f "analyze-difficulty-balance.js" ] && mv analyze-difficulty-balance.js scripts/debug/ && echo "  ✓ analyze-difficulty-balance.js → scripts/debug/"

# Data fetching scripts
for file in fetch-*.js scrape-*.js; do
    [ -f "$file" ] && mv "$file" scripts/data-fetching/ && echo "  ✓ $file → scripts/data-fetching/"
done

# Utils
[ -f "analyze-economy.js" ] && mv analyze-economy.js scripts/utils/ && echo "  ✓ analyze-economy.js → scripts/utils/"
[ -f "normalize-usernames-script.js" ] && mv normalize-usernames-script.js scripts/utils/ && echo "  ✓ normalize-usernames-script.js → scripts/utils/"
[ -f "give-all-300-coins.cjs" ] && mv give-all-300-coins.cjs scripts/utils/ && echo "  ✓ give-all-300-coins.cjs → scripts/utils/"
[ -f "merge-new-legendary-epic.js" ] && mv merge-new-legendary-epic.js scripts/utils/ && echo "  ✓ merge-new-legendary-epic.js → scripts/utils/"
[ -f "switch-design.js" ] && mv switch-design.js scripts/utils/ && echo "  ✓ switch-design.js → scripts/utils/"

# ETAPA 3: Mover Dados JSON
echo ""
echo "📦 [3/5] Movendo dados JSON..."

# Dados de cards
[ -f "jc-cards-revealed.json" ] && mv jc-cards-revealed.json data/cards/ && echo "  ✓ jc-cards-revealed.json → data/cards/"
[ -f "opensea-cards-data.json" ] && mv opensea-cards-data.json data/cards/ && echo "  ✓ opensea-cards-data.json → data/cards/"
[ -f "opensea-legendary-epic-ids.json" ] && mv opensea-legendary-epic-ids.json data/cards/ && echo "  ✓ opensea-legendary-epic-ids.json → data/cards/"
[ -f "opensea-token-ids.json" ] && mv opensea-token-ids.json data/cards/ && echo "  ✓ opensea-token-ids.json → data/cards/"

# Backups
[ -f "jc-cards-revealed-backup.json" ] && mv jc-cards-revealed-backup.json data/backups/ && echo "  ✓ jc-cards-revealed-backup.json → data/backups/"
[ -f "jc-cards-revealed-backup-full.json" ] && mv jc-cards-revealed-backup-full.json data/backups/ && echo "  ✓ jc-cards-revealed-backup-full.json → data/backups/"
[ -f "backup.json" ] && mv backup.json data/backups/ && echo "  ✓ backup.json → data/backups/"

# ETAPA 4: Mover Configs
echo ""
echo "⚙️  [4/5] Movendo configs antigos..."

[ -f "tailwind.config.ORIGINAL.js" ] && mv tailwind.config.ORIGINAL.js configs/ && echo "  ✓ tailwind.config.ORIGINAL.js → configs/"
[ -f "tailwind.config.v1-modern.js" ] && mv tailwind.config.v1-modern.js configs/ && echo "  ✓ tailwind.config.v1-modern.js → configs/"
[ -f "tailwind.config.v2-glass.js" ] && mv tailwind.config.v2-glass.js configs/ && echo "  ✓ tailwind.config.v2-glass.js → configs/"

# ETAPA 5: Deletar Temporários
echo ""
echo "🗑️  [5/5] Deletando arquivos temporários..."
echo "⚠️  ATENÇÃO: Vai deletar arquivos .env temporários!"
read -p "❓ Confirmar deleção? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    [ -f ".env.production.bak" ] && rm .env.production.bak && echo "  ✓ Deletado: .env.production.bak"
    [ -f ".env.production.tmp" ] && rm .env.production.tmp && echo "  ✓ Deletado: .env.production.tmp"
    [ -f ".env.production.new" ] && rm .env.production.new && echo "  ✓ Deletado: .env.production.new"
    [ -f ".env.vercel.check" ] && rm .env.vercel.check && echo "  ✓ Deletado: .env.vercel.check"
    [ -f ".env.vercel.production.new" ] && rm .env.vercel.production.new && echo "  ✓ Deletado: .env.vercel.production.new"
    [ -f "tsconfig.tsbuildinfo" ] && rm tsconfig.tsbuildinfo && echo "  ✓ Deletado: tsconfig.tsbuildinfo"
    [ -f ".vercel-deploy-trigger.txt" ] && rm .vercel-deploy-trigger.txt && echo "  ✓ Deletado: .vercel-deploy-trigger.txt"
    [ -f "switch-design.bat" ] && rm switch-design.bat && echo "  ✓ Deletado: switch-design.bat"
    [ -f "TESTE-VISUAL.html" ] && rm TESTE-VISUAL.html && echo "  ✓ Deletado: TESTE-VISUAL.html"
else
    echo "  ⏭️  Pulando deleção de arquivos temporários"
fi

# FINAL
echo ""
echo "=============================================="
echo "✅ REORGANIZAÇÃO COMPLETA!"
echo ""
echo "📊 Nova estrutura:"
echo "  docs/            - Toda documentação"
echo "  scripts/         - Scripts organizados por tipo"
echo "  data/            - Dados JSON e backups"
echo "  configs/         - Configs antigos"
echo ""
echo "🔍 Próximos passos:"
echo "  1. Rodar 'npm run build' para verificar"
echo "  2. Testar scripts movidos"
echo "  3. Commit das mudanças"
echo ""
