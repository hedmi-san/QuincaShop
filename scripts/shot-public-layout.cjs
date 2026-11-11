const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:3000';
const MODE = process.argv[2] || 'before'; // 'before' or 'after'
const SHOTS_DIR = path.resolve(__dirname, `../docs/ui/shots/${MODE}`);

fs.mkdirSync(SHOTS_DIR, { recursive: true });

async function takeShots() {
  console.log(`--- Taking ${MODE} screenshots for public-layout (/) ---`);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  const widths = [
    { width: 360, height: 740, name: '360' },
    { width: 390, height: 844, name: '390' },
    { width: 768, height: 1024, name: '768' },
    { width: 1024, height: 768, name: '1024' },
    { width: 1440, height: 900, name: '1440' },
    { width: 1920, height: 1080, name: '1920' },
  ];

  for (const w of widths) {
    await page.setViewport({ width: w.width, height: w.height });
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 600));

    const shotPath = path.join(SHOTS_DIR, `public-layout-${w.name}.png`);
    await page.screenshot({ path: shotPath, fullPage: true });
    console.log(`📸 Screenshot saved: public-layout-${w.name}.png [${w.width}x${w.height}]`);
  }

  // RTL screenshot at 1440 and 390
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    document.documentElement.setAttribute('dir', 'rtl');
  });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(SHOTS_DIR, 'public-layout-rtl-1440.png'), fullPage: true });
  console.log('📸 Screenshot saved: public-layout-rtl-1440.png');

  await page.setViewport({ width: 390, height: 844 });
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    document.documentElement.setAttribute('dir', 'rtl');
  });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(SHOTS_DIR, 'public-layout-rtl-390.png'), fullPage: true });
  console.log('📸 Screenshot saved: public-layout-rtl-390.png');

  await browser.close();
  console.log(`✅ All ${MODE} screenshots captured successfully.`);
}

takeShots().catch(err => {
  console.error(err);
  process.exit(1);
});

