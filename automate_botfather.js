const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runAutomation() {
  console.log("Connecting or launching browser...");
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: false,
    defaultViewport: { width: 1280, height: 800 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = (await browser.pages())[0] || await browser.newPage();
  await page.goto('https://web.telegram.org/a/');

  console.log("Waiting for Telegram Web login...");
  // Wait up to 2 minutes for login
  await page.waitForSelector('.chat-list, .chatlist, #LeftColumn-main, .sidebar-header', { timeout: 120000 });
  console.log("Logged in successfully!");

  await wait(2000);

  // 1. Get User ID from @userinfobot
  console.log("Navigating to @userinfobot to determine your Telegram ID...");
  await page.goto('https://web.telegram.org/a/#?tgaddr=tg%3A%2F%2Fresolve%3Fdomain%3Duserinfobot');
  await wait(3000);

  // Click start or send message
  let startBtn = await page.$('button.bottom-button, button.chat-input-control');
  if (startBtn) {
    await startBtn.click();
    await wait(2000);
  } else {
    const input = await page.$('.input-message-input, [contenteditable="true"]');
    if (input) {
      await input.type('/start');
      await page.keyboard.press('Enter');
      await wait(3000);
    }
  }

  // Read message with Id
  const chatText = await page.evaluate(() => document.body.innerText);
  const idMatch = chatText.match(/Id:\s*(\d+)/i) || chatText.match(/ID:\s*`?(\d+)`?/i) || chatText.match(/user_id:\s*(\d+)/i);
  let userId = idMatch ? idMatch[1] : null;
  console.log("Detected User ID:", userId);

  // 2. Open @BotFather
  console.log("Navigating to @BotFather...");
  await page.goto('https://web.telegram.org/a/#?tgaddr=tg%3A%2F%2Fresolve%3Fdomain%3DBotFather');
  await wait(3000);

  const botInput = await page.waitForSelector('.input-message-input, [contenteditable="true"]', { timeout: 10000 });
  
  // Create /newbot
  console.log("Sending /newbot to BotFather...");
  await botInput.click();
  await botInput.type('/newbot');
  await page.keyboard.press('Enter');
  await wait(2500);

  const botTitle = "BORODA & CO Барбершоп";
  await botInput.type(botTitle);
  await page.keyboard.press('Enter');
  await wait(2500);

  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const botUsername = `boroda_barber_${randomSuffix}_bot`;
  console.log(`Setting bot username: ${botUsername}`);
  await botInput.type(botUsername);
  await page.keyboard.press('Enter');
  await wait(4000);

  // Extract Token
  const botFatherText = await page.evaluate(() => document.body.innerText);
  const tokenMatch = botFatherText.match(/(\d{8,11}:[a-zA-Z0-9_-]{35})/);
  
  if (!tokenMatch) {
    console.error("Could not find bot token in response. BotFather text sample:\n", botFatherText.slice(-600));
    return;
  }

  const botToken = tokenMatch[1];
  console.log("SUCCESS! Extracted Bot Token:", botToken);

  // Configure Menu Button
  console.log("Configuring Menu Button...");
  const webappUrl = "https://social-seals-agree.loca.lt";
  
  await botInput.type('/mybots');
  await page.keyboard.press('Enter');
  await wait(2500);

  // Click on the bot button in inline keyboard
  const inlineButtons = await page.$$('.inline-button-text, .reply-markup-button');
  for (const btn of inlineButtons) {
    const text = await (await btn.getProperty('textContent')).jsonValue();
    if (text.includes(botUsername)) {
      await btn.click();
      await wait(2000);
      break;
    }
  }

  // Save results to .env
  const envContent = `BOT_TOKEN=${botToken}\nWEBAPP_URL=${webappUrl}\nADMIN_CHAT_ID=${userId || '123456789'}\nADMIN_SECRET=supersecretbarber2026\n`;
  fs.writeFileSync(path.join(__dirname, '.env'), envContent);
  console.log("Saved configuration to .env");

  // Save to database: update barber 1 telegram_id to userId
  if (userId) {
    try {
      execSync(`./venv/bin/python3 -c "
import sys
sys.path.append('backend')
from database import SessionLocal, Barber
db = SessionLocal()
b = db.query(Barber).first()
if b:
    b.telegram_id = ${userId}
    db.commit()
    print('Updated Barber 1 with telegram_id:', b.telegram_id)
db.close()
"`);
    } catch (e) {
      console.warn("DB update note:", e.message);
    }
  }

  console.log("Bot setup completed!");
}

module.exports = { runAutomation };

if (require.main === module) {
  runAutomation().catch(console.error);
}
