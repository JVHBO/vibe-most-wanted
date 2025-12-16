const { firefox } = require('playwright');

(async () => {
  const browser = await firefox.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('https://console.filebase.com/buckets/vibefid');

  // Wait for page to load
  await page.waitForTimeout(3000);

  // Take screenshot
  await page.screenshot({ path: 'filebase-screenshot.png', fullPage: true });
  console.log('Screenshot saved to filebase-screenshot.png');

  // Get page content
  const content = await page.content();
  console.log('Page title:', await page.title());

  // Keep browser open for user to login if needed
  console.log('Browser open - login if needed, then press Ctrl+C');

  // Wait indefinitely
  await new Promise(() => {});
})();
