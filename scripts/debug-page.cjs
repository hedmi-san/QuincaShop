const puppeteer = require('puppeteer-core');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  const info = await page.evaluate(() => {
    return {
      currentUrl: window.location.href,
      bodyHtmlSnippet: document.body.innerHTML.slice(0, 1000),
      classes: [...document.querySelectorAll('*')].map(e => e.className).filter(Boolean).slice(0, 30)
    };
  });

  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})();

