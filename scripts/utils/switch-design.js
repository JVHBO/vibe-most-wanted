#!/usr/bin/env node

/**
 * 🎨 Script para trocar entre versões de design
 *
 * Uso:
 *   node switch-design.js original
 *   node switch-design.js v1        (Moderna e Minimalista)
 *   node switch-design.js v2        (Premium Glassmorphism)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const VERSIONS = {
  original: {
    name: 'Original (Vintage Casino)',
    tailwind: 'tailwind.config.ORIGINAL.js',
    css: 'app/globals.ORIGINAL.css',
    description: '🎰 Design vintage casino com dourado vibrante'
  },
  v1: {
    name: 'Versão 1 - Moderna e Minimalista',
    tailwind: 'tailwind.config.v1-modern.js',
    css: 'app/globals.v1-modern.css',
    description: '✨ Design limpo e profissional com cores suaves'
  },
  v2: {
    name: 'Versão 2 - Premium Glassmorphism',
    tailwind: 'tailwind.config.v2-glass.js',
    css: 'app/globals.v2-glass.css',
    description: '💎 Design ultra-moderno com efeitos de vidro'
  }
};

function printHelp() {
  console.log('\n🎨 Vibe Most Wanted - Design Switcher\n');
  console.log('Versões disponíveis:\n');

  Object.entries(VERSIONS).forEach(([key, value]) => {
    console.log(`  ${key.padEnd(10)} - ${value.name}`);
    console.log(`  ${' '.repeat(13)} ${value.description}\n`);
  });

  console.log('Uso:');
  console.log('  node switch-design.js [versão]\n');
  console.log('Exemplos:');
  console.log('  node switch-design.js original');
  console.log('  node switch-design.js v1');
  console.log('  node switch-design.js v2\n');
}

function backupOriginals() {
  const tailwindOriginal = 'tailwind.config.ORIGINAL.js';
  const cssOriginal = 'app/globals.ORIGINAL.css';

  // Backup Tailwind config
  if (!fs.existsSync(tailwindOriginal)) {
    if (fs.existsSync('tailwind.config.js')) {
      console.log('📦 Fazendo backup do tailwind.config.js original...');
      fs.copyFileSync('tailwind.config.js', tailwindOriginal);
    }
  }

  // Backup globals.css
  if (!fs.existsSync(cssOriginal)) {
    if (fs.existsSync('app/globals.css')) {
      console.log('📦 Fazendo backup do globals.css original...');
      fs.copyFileSync('app/globals.css', cssOriginal);
    }
  }
}

function switchVersion(versionKey) {
  const version = VERSIONS[versionKey];

  if (!version) {
    console.error(`❌ Versão "${versionKey}" não encontrada!`);
    printHelp();
    process.exit(1);
  }

  console.log(`\n🔄 Trocando para: ${version.name}`);
  console.log(`   ${version.description}\n`);

  // Verificar se os arquivos existem
  if (!fs.existsSync(version.tailwind)) {
    console.error(`❌ Arquivo não encontrado: ${version.tailwind}`);
    process.exit(1);
  }

  if (!fs.existsSync(version.css)) {
    console.error(`❌ Arquivo não encontrado: ${version.css}`);
    process.exit(1);
  }

  try {
    // Fazer backup dos originais se necessário
    backupOriginals();

    // Copiar arquivos
    console.log('📝 Aplicando tailwind.config.js...');
    fs.copyFileSync(version.tailwind, 'tailwind.config.js');

    console.log('📝 Aplicando globals.css...');
    fs.copyFileSync(version.css, 'app/globals.css');

    console.log('\n✅ Design trocado com sucesso!\n');

    // Instruções pós-instalação
    console.log('📋 Próximos passos:\n');
    console.log('   1. Pare o servidor (Ctrl+C se estiver rodando)');
    console.log('   2. Limpe o cache: rmdir /s /q .next  (Windows)');
    console.log('                  ou: rm -rf .next      (Linux/Mac)');
    console.log('   3. Inicie novamente: npm run dev');
    console.log('   4. Recarregue o navegador (Ctrl+Shift+R)\n');

    // Oferecer limpeza automática
    console.log('💡 Deseja limpar o cache automaticamente? (Isso vai parar o servidor)');
    console.log('   Digite: node switch-design.js clean\n');

  } catch (error) {
    console.error('❌ Erro ao trocar versão:', error.message);
    process.exit(1);
  }
}

function cleanCache() {
  console.log('\n🧹 Limpando cache do Next.js...\n');

  try {
    // Tentar remover .next
    if (fs.existsSync('.next')) {
      if (process.platform === 'win32') {
        execSync('rmdir /s /q .next', { stdio: 'inherit' });
      } else {
        execSync('rm -rf .next', { stdio: 'inherit' });
      }
      console.log('✅ Cache limpo com sucesso!\n');
    } else {
      console.log('ℹ️  Nenhum cache encontrado (.next não existe)\n');
    }

    console.log('Agora execute: npm run dev\n');

  } catch (error) {
    console.error('❌ Erro ao limpar cache:', error.message);
    console.log('\n💡 Tente manualmente:');
    if (process.platform === 'win32') {
      console.log('   rmdir /s /q .next');
    } else {
      console.log('   rm -rf .next');
    }
    console.log('\n');
  }
}

function showCurrentVersion() {
  console.log('\n🔍 Detectando versão atual...\n');

  try {
    const tailwindContent = fs.readFileSync('tailwind.config.js', 'utf8');

    if (tailwindContent.includes('VERSÃO 1: MODERNA')) {
      console.log('📌 Versão atual: Versão 1 - Moderna e Minimalista ✨\n');
    } else if (tailwindContent.includes('VERSÃO 2: PREMIUM GLASSMORPHISM')) {
      console.log('📌 Versão atual: Versão 2 - Premium Glassmorphism 💎\n');
    } else {
      console.log('📌 Versão atual: Original (Vintage Casino) 🎰\n');
    }
  } catch (error) {
    console.log('❌ Não foi possível detectar a versão atual\n');
  }
}

// Main
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
  printHelp();
  showCurrentVersion();
  process.exit(0);
}

const command = args[0].toLowerCase();

if (command === 'clean') {
  cleanCache();
} else if (command === 'current' || command === 'status') {
  showCurrentVersion();
} else {
  switchVersion(command);
}
