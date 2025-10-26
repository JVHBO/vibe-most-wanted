import { testWithSynpress } from '@synthetixio/synpress'
import { MetaMask, metaMaskFixtures } from '@synthetixio/synpress/playwright'
import basicSetup from '../wallet-setup/basic.setup'

const test = testWithSynpress(metaMaskFixtures(basicSetup))
const { expect } = test

test('should connect wallet to vibe-most-wanted', async ({
  context,
  page,
  metamaskPage,
  extensionId,
}) => {
  console.log('🚀 Iniciando teste de conexão da wallet...')

  const metamask = new MetaMask(
    context,
    metamaskPage,
    basicSetup.walletPassword,
    extensionId
  )

  console.log('📍 Extension ID:', extensionId)
  console.log('🔑 Wallet Password:', basicSetup.walletPassword)

  // Navega para o site
  console.log('🌐 Navegando para vibe-most-wanted...')
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  console.log('✅ Site carregado!')

  // Tira screenshot inicial
  await page.screenshot({ path: 'test-results/01-site-loaded.png', fullPage: true })

  // Aguarda um pouco
  await page.waitForTimeout(3000)

  // Procura botão Connect Wallet
  console.log('🔍 Procurando botão Connect Wallet...')
  const connectButton = page.locator('button:has-text("Connect Wallet")')
  await expect(connectButton).toBeVisible({ timeout: 10000 })

  console.log('🖱️  Clicando em Connect Wallet...')
  await connectButton.click()

  // Aguarda modal
  await page.waitForTimeout(2000)
  await page.screenshot({ path: 'test-results/02-modal.png' })

  // Procura e clica em MetaMask
  console.log('🦊 Procurando opção MetaMask...')
  const metamaskButton = page.locator('[data-testid="rk-wallet-option-metaMask"]')
  await expect(metamaskButton).toBeVisible({ timeout: 10000 })

  console.log('🖱️  Clicando em MetaMask...')
  await metamaskButton.click()

  // Aguarda popup
  await page.waitForTimeout(2000)

  // CONECTA A WALLET! 🎉
  console.log('🔗 Conectando wallet ao dapp...')
  await metamask.connectToDapp()

  console.log('✅ Wallet conectada!')

  // Aguarda conexão ser estabelecida
  await page.waitForTimeout(5000)

  // Tira screenshot final
  await page.screenshot({ path: 'test-results/03-connected.png', fullPage: true })

  // Verifica se o endereço aparece na página
  console.log('🔍 Verificando se wallet está conectada...')
  const pageContent = await page.content()

  // Meu endereço: 0xBb4c7d8B2E32c7C99d358Be999377c208cCE53c2
  const isConnected = pageContent.includes('0xBb4c') ||
                      pageContent.includes('0xbb4c') ||
                      pageContent.toLowerCase().includes('disconnect')

  expect(isConnected).toBeTruthy()

  console.log('🎉🎉🎉 WALLET CONECTADA COM SUCESSO! 🎉🎉🎉')
  console.log('📍 Endereço: 0xBb4c7d8B2E32c7C99d358Be999377c208cCE53c2')

  // Mantém aberto por 30 segundos para ver
  console.log('⏳ Mantendo navegador aberto por 30 segundos...')
  await page.waitForTimeout(30000)
})
