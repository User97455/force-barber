const puppeteer = require('puppeteer-core');
const fs = require('fs');

async function checkTelegramWeb() {
  console.log("Launching Chrome...");
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: false, // Let user see or headful
    defaultViewport: { width: 1280, height: 800 },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1280,800'
    ]
  });

  const page = await browser.newPage();
  console.log("Navigating to https://web.telegram.org/a/ ...");
  await page.goto('https://web.telegram.org/a/', { waitUntil: 'networkidle2', timeout: 30000 }).catch(e => console.log("Goto warning:", e.message));

  // Wait 4 seconds for Telegram web to initialize
  await new Promise(r => setTimeout(r, 4000));

  const screenshotPath = '/Users/user1/tg-barber app/telegram_web_screen.png';
  await page.screenshot({ path: screenshotPath });
  console.log(`Screenshot saved to ${screenshotPath}`);

  const pageContent = await page.content();
  const title = await page.title();
  console.log("Page title:", title);

  const hasQr = await page.$('.qr-canvas, canvas, .auth-form, .login-header, .qr-container');
  const hasChats = await page.$('.chat-list, .chatlist, #LeftColumn-main, .sidebar-header');

  console.log("Status: hasQr =", Boolean(hasQr), ", hasChats =", Boolean(hasChats));
  
  return { hasQr: Boolean(hasQr), hasChats: Boolean(hasChats), browser, page };
}

checkTelegramWeb().catch(console.error);
