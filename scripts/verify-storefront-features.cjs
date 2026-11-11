const puppeteer = require('puppeteer-core');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();

  console.log('=== 1. Checking Grid Columns at various breakpoints ===');
  const breakpoints = [
    { width: 1440, expected: 5 },
    { width: 1200, expected: 4 },
    { width: 900, expected: 3 },
    { width: 500, expected: 2 },
  ];

  for (const bp of breakpoints) {
    await page.setViewport({ width: bp.width, height: 900 });
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 400));
    const cols = await page.evaluate(() => {
      const grid = document.querySelector('.product-grid');
      if (!grid) return null;
      const style = window.getComputedStyle(grid);
      const colsTemplate = style.getPropertyValue('grid-template-columns');
      return colsTemplate ? colsTemplate.split(' ').length : 0;
    });
    console.log(`Width ${bp.width}px -> columns: ${cols} (expected ~${bp.expected})`);
  }

  console.log('\n=== 2. Checking Grid/List Toggle & localStorage Persistence ===');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 400));

  // Click list toggle button
  const toggleToList = await page.evaluate(() => {
    const listBtn = document.querySelectorAll('.view-toggle-group button')[1];
    if (listBtn) {
      listBtn.click();
      return true;
    }
    return false;
  });
  await new Promise(r => setTimeout(r, 400));

  const listModeActive = await page.evaluate(() => {
    const table = document.querySelector('.wholesale-table');
    const stored = localStorage.getItem('quinca_catalog_view');
    return {
      tablePresent: !!table,
      storedValue: stored
    };
  });
  console.log('Switched to list mode:', listModeActive);

  // Reload page and check persistence
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 400));
  const reloadedView = await page.evaluate(() => {
    return {
      tablePresent: !!document.querySelector('.wholesale-table'),
      storedValue: localStorage.getItem('quinca_catalog_view')
    };
  });
  console.log('Persisted on reload:', reloadedView);

  // Switch back to grid mode
  await page.evaluate(() => {
    const gridBtn = document.querySelectorAll('.view-toggle-group button')[0];
    if (gridBtn) gridBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  console.log('\n=== 3. Stock badge check (only when NOT En stock) ===');
  const stockCheck = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.product-card')];
    return cards.map(c => {
      const brandStock = c.querySelector('.brand-stock-dot')?.textContent.trim();
      const badge = c.querySelector('.card-tile .ui-badge')?.textContent.trim() || null;
      return { brandStock, badge };
    });
  });
  console.log('Stock badges on cards:', stockCheck);

  console.log('\n=== 4. Testing RTL & Language Switcher ===');
  const initialLang = await page.evaluate(() => document.documentElement.getAttribute('dir') || 'ltr');
  console.log('Initial html dir:', initialLang);

  // Click Arabic in language switcher
  await page.evaluate(() => {
    const arBtn = document.querySelectorAll('.ui-lang-switcher .lang-pill')[1];
    if (arBtn) arBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  const rtlActive = await page.evaluate(() => {
    return {
      dir: document.documentElement.getAttribute('dir'),
      lang: document.documentElement.getAttribute('lang')
    };
  });
  console.log('After switching to Arabic:', rtlActive);

  // Switch back to French
  await page.evaluate(() => {
    const frBtn = document.querySelectorAll('.ui-lang-switcher .lang-pill')[0];
    if (frBtn) frBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  await browser.close();
  console.log('=== All Feature Checks Finished ===');
})();

