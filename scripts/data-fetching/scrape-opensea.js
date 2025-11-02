const playwright = require('playwright');
const fs = require('fs');

const OPENSEA_URL = 'https://opensea.io/collection/vibe-most-wanted?traits=[{"traitType":"Status","values":["Burned"]},{"traitType":"Rarity","values":["Legendary","Common","Rare","Epic"]}]';

console.log('🔍 Fazendo scraping do OpenSea...');
console.log('   URL:', OPENSEA_URL);

async function scrapeOpenSea() {
  const browser = await playwright.chromium.launch({
    headless: false,
    args: ['--start-maximized']
  });
  const context = await browser.newContext({
    viewport: null // Use full window size
  });
  const page = await context.newPage();

  try {
    console.log('\n1️⃣ Abrindo página do OpenSea em tela cheia...');
    await page.goto(OPENSEA_URL, { waitUntil: 'networkidle', timeout: 60000 });

    console.log('2️⃣ Aguardando página carregar...');
    await page.waitForTimeout(5000);

    console.log('3️⃣ Procurando botão de Table View...');
    // Tentar clicar no botão de table view
    try {
      // Procurar por botão que muda para table view
      await page.click('[aria-label*="table" i]', { timeout: 5000 });
      console.log('   ✓ Modo Table ativado!');
      await page.waitForTimeout(2000);
    } catch (e) {
      console.log('   ⚠️ Não encontrou botão de table view, tentando outro seletor...');
      try {
        // Tentar clicar em qualquer botão de view
        await page.click('button[aria-label*="view" i]', { timeout: 5000 });
        await page.waitForTimeout(2000);
      } catch (e2) {
        console.log('   ⚠️ Continuando sem modo table...');
      }
    }

    console.log('4️⃣ Aguardando cards carregarem...');
    await page.waitForTimeout(3000);

    // Scroll para carregar mais items - coletar IDs durante o scroll
    console.log('3️⃣ Scrolling e coletando IDs (vai demorar ~10 minutos)...');

    const allTokenIds = new Set();
    let noNewIdsCount = 0;

    for (let i = 0; i < 500; i++) {
      // Coletar IDs visíveis ANTES de scrollar
      const newIds = await page.evaluate(() => {
        const links = document.querySelectorAll('a[href*="/item/base/0xf14c1dc8ce5fe65413379f76c43fa1460c31e728/"]');
        const ids = [];
        links.forEach(link => {
          const match = link.href.match(/\/item\/base\/0xf14c1dc8ce5fe65413379f76c43fa1460c31e728\/(\d+)/);
          if (match && match[1]) {
            ids.push(match[1]);
          }
        });
        return ids;
      });

      const beforeSize = allTokenIds.size;
      newIds.forEach(id => allTokenIds.add(id));
      const afterSize = allTokenIds.size;

      // Se não encontrou novos IDs
      if (beforeSize === afterSize) {
        noNewIdsCount++;
        if (noNewIdsCount > 20) {
          console.log('   Não há mais cards novas, finalizando...');
          break;
        }
      } else {
        noNewIdsCount = 0;
      }

      if (i % 10 === 0) {
        console.log(`   Scroll ${i}/500 - ${allTokenIds.size} token IDs únicos coletados`);
      }

      // Scroll
      await page.evaluate(() => window.scrollBy(0, 1500));
      await page.waitForTimeout(800);
    }

    console.log('4️⃣ Finalizando coleta...');

    const tokenIds = Array.from(allTokenIds).sort((a, b) => parseInt(a) - parseInt(b));
    console.log(`   Total de ${tokenIds.length} token IDs únicos coletados`);

    // Criar cardData com os token IDs
    const cardData = tokenIds.map(tokenId => ({
      tokenId,
      name: `Card #${tokenId}`,
      link: `https://opensea.io/item/base/0xf14c1dc8ce5fe65413379f76c43fa1460c31e728/${tokenId}`
    }))

    console.log(`\n✅ Extraídos ${cardData.length} cards com token IDs`);

    // Salvar token IDs
    fs.writeFileSync('opensea-token-ids.json', JSON.stringify(tokenIds, null, 2));
    console.log(`💾 Token IDs salvos em: opensea-token-ids.json`);

    // Salvar dados completos
    fs.writeFileSync('opensea-cards-data.json', JSON.stringify(cardData, null, 2));
    console.log(`💾 Dados completos salvos em: opensea-cards-data.json`);

    await browser.close();

    return tokenIds;

  } catch (error) {
    console.error('❌ Erro:', error.message);
    await browser.close();
    throw error;
  }
}

scrapeOpenSea().catch(console.error);
