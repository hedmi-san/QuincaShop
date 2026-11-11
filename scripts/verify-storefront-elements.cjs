const puppeteer = require('puppeteer-core');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  const metrics = await page.evaluate(() => {
    const topBar = document.querySelector('.announcement-bar');
    const header = document.querySelector('.main-header');
    const categoryRibbon = document.querySelector('.category-ribbon');
    const guestNotice = document.querySelector('.guest-banner-strip');
    const grid = document.querySelector('.product-grid');
    const cards = document.querySelectorAll('.product-card');

    return {
      topBarHeight: topBar ? topBar.getBoundingClientRect().height : null,
      headerHeight: header ? header.getBoundingClientRect().height : null,
      categoryHeight: categoryRibbon ? categoryRibbon.getBoundingClientRect().height : null,
      totalChromeHeight: (topBar ? topBar.getBoundingClientRect().height : 0) + 
                         (header ? header.getBoundingClientRect().height : 0) + 
                         (categoryRibbon ? categoryRibbon.getBoundingClientRect().height : 0),
      hasGuestNotice: !!guestNotice,
      guestNoticeText: guestNotice ? guestNotice.textContent.trim().replace(/\s+/g, ' ') : null,
      cardCount: cards.length,
      sampleCard: cards[0] ? {
        title: cards[0].querySelector('.product-name')?.textContent.trim(),
        meta: cards[0].querySelector('.brand-stock-dot')?.textContent.trim().replace(/\s+/g, ' '),
        skuCat: cards[0].querySelector('.sku-category-row')?.textContent.trim().replace(/\s+/g, ' '),
        priceBadge: cards[0].querySelector('.quiet-pro-price')?.textContent.trim().replace(/\s+/g, ' ')
      } : null
    };
  });

  console.log(JSON.stringify(metrics, null, 2));
  await browser.close();
})();
