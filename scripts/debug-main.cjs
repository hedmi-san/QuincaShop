const puppeteer = require('puppeteer-core');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  const mainContent = await page.evaluate(() => {
    const main = document.querySelector('.public-main') || document.querySelector('main');
    return {
      mainExists: !!main,
      html: main ? main.innerHTML : null
    };
  });

  console.log('Main Content:', mainContent);
  await browser.close();
})();

