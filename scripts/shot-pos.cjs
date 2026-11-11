const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:3000';
const MODE = process.argv[2] || 'before'; // 'before' or 'after'
const SHOTS_DIR = path.resolve(__dirname, `../docs/ui/shots/${MODE}`);

fs.mkdirSync(SHOTS_DIR, { recursive: true });

async function takeShots() {
  console.log(`--- Taking ${MODE} screenshots for /admin/pos ---`);
  const adminRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@store.local', password: 'StrongPassword2026!' })
  }).then(r => r.json());

  const admin = adminRes.data;

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Set auth credentials
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((adminData) => {
    localStorage.clear();
    localStorage.setItem('token', adminData.token);
    localStorage.setItem('user', JSON.stringify(adminData.user));
  }, admin);

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
    await page.goto(`${BASE_URL}/admin/pos`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 600));

    const shotPath = path.join(SHOTS_DIR, `admin-pos-${w.name}.png`);
    await page.screenshot({ path: shotPath, fullPage: true });
    console.log(`📸 Screenshot saved: admin-pos-${w.name}.png [${w.width}x${w.height}]`);
  }

  // Also take RTL screenshot at 1440 and 390
  await page.setViewport({ width: 1440, height: 900 });
  await page.evaluate(() => {
    document.documentElement.setAttribute('dir', 'rtl');
  });
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({ path: path.join(SHOTS_DIR, `admin-pos-rtl-1440.png`), fullPage: true });
  console.log(`📸 Screenshot saved: admin-pos-rtl-1440.png`);

  await browser.close();
  console.log('--- Done taking screenshots ---');
}

takeShots().catch(err => {
  console.error('Failed to take screenshots:', err);
  process.exit(1);
});
