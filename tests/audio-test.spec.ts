import { expect } from '@playwright/test';
import { metaMaskFixtures } from '@synthetixio/synpress-metamask/playwright';
import walletSetup from '../synpress.config';

const test = metaMaskFixtures(walletSetup);

test.describe('Vibe Most Wanted - Audio Controls Test', () => {
  test('Conectar wallet e testar controles de áudio', async ({ page, metamask }) => {
    console.log('🌐 Abrindo site Vibe Most Wanted...');
    await page.goto('https://vibe-most-wanted.vercel.app');

    // Aguarda página carregar
    await page.waitForLoadState('networkidle');
    console.log('✅ Página carregada');

    // Clica em Connect Wallet
    console.log('🔗 Clicando em Connect Wallet...');
    const connectButton = page.getByRole('button', { name: 'Connect Wallet' });
    await connectButton.click();

    // Aguarda modal aparecer
    console.log('⏳ Aguardando modal de conexão...');
    await page.waitForSelector('[data-testid="rk-wallet-option-metaMask"]', { timeout: 10000 });

    // Clica em MetaMask
    console.log('🦊 Selecionando MetaMask...');
    await page.click('[data-testid="rk-wallet-option-metaMask"]');

    // Synpress automaticamente aprova a conexão
    console.log('✅ Conectando wallet...');
    await metamask.connectToDapp();

    // Aguarda conexão ser estabelecida
    await page.waitForTimeout(5000);

    // Tira screenshot da página conectada
    await page.screenshot({ path: 'test-results/01-connected.png', fullPage: true });
    console.log('📸 Screenshot: test-results/01-connected.png');

    // Verifica se conectou (procura pelo endereço truncado)
    const pageContent = await page.content();
    if (pageContent.includes('0xBb4c') || pageContent.includes('0xbb4c')) {
      console.log('✅ Wallet conectada com sucesso!');
    } else {
      console.log('⚠️  Não encontrei evidência de conexão, mas continuando...');
    }

    //Procura controles de áudio
    console.log('🔊 Procurando controles de áudio...');

    // Espera um pouco para a UI atualizar
    await page.waitForTimeout(3000);

    // Verifica se há controles de música
    const hasMusic = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasMusic: text.includes('MUSIC') || text.includes('♫'),
        hasVolume: text.includes('VOLUME'),
        fullText: text.substring(0, 500)
      };
    });

    console.log('🎵 Análise de áudio:', hasMusic);

    // Tenta encontrar slider de volume
    const volumeSliders = await page.locator('input[type="range"]').count();
    console.log(`🎚️  Encontrados ${volumeSliders} sliders na página`);

    if (volumeSliders > 0) {
      console.log('✅ Controles de volume encontrados! Testando...');

      const slider = page.locator('input[type="range"]').first();

      // Screenshot antes
      await page.screenshot({ path: 'test-results/02-before-volume-test.png' });

      // Teste 1: Volume 0
      console.log('🧪 Teste 1: Setando volume para 0...');
      await slider.fill('0');
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-results/03-volume-0.png' });

      // Teste 2: Volume 50
      console.log('🧪 Teste 2: Setando volume para 50...');
      await slider.fill('50');
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-results/04-volume-50.png' });

      // Teste 3: Volume 100
      console.log('🧪 Teste 3: Setando volume para 100...');
      await slider.fill('100');
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-results/05-volume-100.png' });

      // Teste 4: De volta para 0 (bug: 1->0 aumenta volume)
      console.log('🧪 Teste 4: De 100 para 0 (testando bug)...');
      await slider.fill('0');
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-results/06-volume-100-to-0.png' });

      console.log('✅ Todos os testes de volume concluídos!');
    } else {
      console.log('❌ Nenhum controle de volume encontrado na página');

      // Tenta procurar por botões de configuração/settings
      const buttons = await page.locator('button').all();
      console.log(`🔍 Encontrados ${buttons.length} botões. Procurando por settings...`);

      await page.screenshot({ path: 'test-results/02-no-volume-found.png', fullPage: true });
    }

    // Verifica console do navegador
    console.log('📋 Checando console logs do navegador...');
    const consoleLogs = await page.evaluate(() => {
      // Retorna qualquer log que tenha sido capturado
      return (window as any).consoleLogBuffer || [];
    });

    console.log('Console logs:', consoleLogs);

    // Mantém navegador aberto
    console.log('⏳ Mantendo navegador aberto por 30 segundos para inspeção manual...');
    await page.waitForTimeout(30000);

    console.log('✅ Teste concluído!');
  });
});
