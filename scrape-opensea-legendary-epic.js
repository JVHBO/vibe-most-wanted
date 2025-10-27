const playwright = require('playwright');
const fs = require('fs');

const OPENSEA_URL = 'https://opensea.io/collection/vibe-most-wanted?traits=[{"traitType":"Status","values":["Burned"]},{"traitType":"Rarity","values":["Legendary","Epic"]}]';

console.log('🔍 Fazendo scraping do OpenSea (APENAS Legendary + Epic)...');
console.log('   URL:', OPENSEA_URL);

async function scrapeOpenSea() {
  const browser = await playwright.chromium.launch({
    headless: false,
    args: ['--start-maximized']
  });
  const context = await browser.newContext({
    viewport: null
  });
  const page = await context.newPage();

  try {
    console.log('\n1️⃣ Abrindo página do OpenSea em tela cheia...');
    await page.goto(OPENSEA_URL, { waitUntil: 'networkidle', timeout: 60000 });

    console.log('2️⃣ Aguardando página carregar...');
    await page.waitForTimeout(5000);

    console.log('3️⃣ Procurando botão de Table View...');
    try {
      await page.click('[aria-label*="table" i]', { timeout: 5000 });
      console.log('   ✓ Modo Table ativado!');
      await page.waitForTimeout(2000);
    } catch (e) {
      console.log('   ⚠️ Continuando sem modo table...');
    }

    console.log('4️⃣ Aguardando cards carregarem...');
    await page.waitForTimeout(3000);

    console.log('5️⃣ Scrolling e coletando IDs (Legendary+Epic)...');

    const allTokenIds = new Set();
    let noNewIdsCount = 0;

    for (let i = 0; i < 100; i++) {
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
        console.log(`   Scroll ${i}/100 - ${allTokenIds.size} token IDs (Legendary+Epic)`);
      }

      await page.evaluate(() => window.scrollBy(0, 1500));
      await page.waitForTimeout(800);
    }

    const tokenIds = Array.from(allTokenIds).sort((a, b) => parseInt(a) - parseInt(b));
    console.log(`\n✅ Coletados ${tokenIds.length} token IDs (Legendary+Epic)`);

    // Salvar
    fs.writeFileSync('opensea-legendary-epic-ids.json', JSON.stringify(tokenIds, null, 2));
    console.log(`💾 Salvo em: opensea-legendary-epic-ids.json`);

    await browser.close();
    return tokenIds;

  } catch (error) {
    console.error('❌ Erro:', error.message);
    await browser.close();
    throw error;
  }
}

scrapeOpenSea().catch(console.error);
