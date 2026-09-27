const { chromium } = require('C:\\Users\\REYES\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright');
(async () => {
  try {
    console.log('qa-start');
    const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', args: ['--no-sandbox'] });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto('file:///C:/Users/REYES/Desktop/game/index.html?qa=dev-final-2', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.evaluate(() => { developerAuthorized = true; openDeveloperCheckPanel(); });
    const menu = await page.locator('.developer-check-grid button').allTextContents();
    await page.getByText('Preview Celebration Slide', { exact: true }).click();
    const celebration = await page.locator('#celebrationPanel').evaluate(el => !el.classList.contains('hidden'));
    await page.evaluate(() => { developerAuthorized = true; openDeveloperCheckPanel(); });
    await page.getByText('Preview Acknowledgement', { exact: true }).click();
    const acknowledgement = await page.locator('#acknowledgementPanel').evaluate(el => !el.classList.contains('hidden'));
    console.log(JSON.stringify({ menu, celebration, acknowledgement }));
    await browser.close();
    console.log('qa-done');
  } catch (error) {
    console.error('qa-error', error.stack || error);
    process.exitCode = 1;
  }
})();