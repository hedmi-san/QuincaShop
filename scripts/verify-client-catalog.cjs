const puppeteer = require('puppeteer-core');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Authenticate as client@store.local
  const clientRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'client@store.local', password: 'StrongPassword2026!' })
  }).then(r => r.json());

  if (!clientRes.success) {
    console.error('Failed to log in:', clientRes);
    process.exit(1);
  }

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((clientData) => {
    localStorage.clear();
    localStorage.setItem('token', clientData.token);
    localStorage.setItem('user', JSON.stringify(clientData.user));
    localStorage.setItem('quinca_catalog_view', 'grid');
  }, clientRes.data);

  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 800));

  const clientGridCheck = await page.evaluate(() => {
    const guestNotice = document.querySelector('.guest-banner-strip');
    const firstCard = document.querySelector('.product-card');
    const priceEl = firstCard?.querySelector('.card-price-bottom .price-ht-value');
    const addBtn = firstCard?.querySelector('.card-price-bottom .btn-quick-add');
    const quietLock = firstCard?.querySelector('.quiet-pro-price');

    return {
      hasGuestNotice: !!guestNotice,
      cardHasPriceHT: !!priceEl,
      cardPriceText: priceEl ? priceEl.textContent.trim() : null,
      cardHasAddBtn: !!addBtn,
      cardHasQuietLock: !!quietLock
    };
  });
  console.log('Client Grid View Check:', clientGridCheck);
  await page.screenshot({ path: 'docs/ui/shots/after/public-catalog-client-grid-1440.png', fullPage: true });

  // Switch to list view
  await page.evaluate(() => {
    const listBtn = document.querySelectorAll('.view-toggle-group button')[1];
    if (listBtn) listBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  const clientListCheck = await page.evaluate(() => {
    const table = document.querySelector('.wholesale-table');
    const firstRow = table?.querySelector('tbody tr');
    const qtyInput = firstRow?.querySelector('.list-qty-control');
    const addBtn = firstRow?.querySelector('.btn-list-add');
    const priceVal = firstRow?.querySelector('.list-price-ht');

    return {
      tablePresent: !!table,
      hasQtyInput: !!qtyInput,
      hasAddBtn: !!addBtn,
      hasPriceVal: !!priceVal,
      priceText: priceVal ? priceVal.textContent.trim() : null
    };
  });
  console.log('Client List View Check:', clientListCheck);
  await page.screenshot({ path: 'docs/ui/shots/after/public-catalog-client-list-1440.png', fullPage: true });
  console.log('Client List View Check:', clientListCheck);

  // Check server API response directly for purchase price leakage
  const apiRes = await fetch('http://localhost:5000/api/public/products', {
    headers: { 'Authorization': `Bearer ${clientRes.data.token}` }
  }).then(r => r.json());

  const items = apiRes.data.items || [];
  const leaks = items.filter(p => 'purchase_price' in p || 'margin_amount' in p || 'margin_percent' in p);
  console.log('Security check - items with purchase/margin fields:', leaks.length, '(expected 0)');

  await browser.close();
  console.log('Client Storefront Verification Complete!');
})();
