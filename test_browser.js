const puppeteer = require('puppeteer-core');

async function test() {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.goto('https://social-seals-agree.loca.lt', { waitUntil: 'networkidle2' });
  const title = await page.title();
  console.log('Page title:', title);
  const content = await page.content();
  if (content.includes('Click to Continue') || content.includes('localtunnel')) {
    console.log('Localtunnel reminder page detected');
    // Click the submit button or bypass
    try {
      const btn = await page.$('button');
      if (btn) {
        await btn.click();
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        console.log('After click title:', await page.title());
      }
    } catch (e) {
      console.log('Click error:', e.message);
    }
  }
  await page.screenshot({ path: 'localtunnel-test.png' });
  await browser.close();
}

test().catch(console.error);
