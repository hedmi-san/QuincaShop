const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:3000';

async function checkMatrix() {
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

  const results = {};

  for (const w of widths) {
    await page.setViewport({ width: w.width, height: w.height });
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 600));

    const check = await page.evaluate((widthName) => {
      // 1. Horizontal scroll
      const hasHorizontalScroll = document.documentElement.scrollWidth > window.innerWidth;

      // 2. Unclipped Overflows in layout/chrome
      const isClipped = (el) => {
        let p = el.parentElement;
        while (p && p !== document.body) {
          const s = getComputedStyle(p);
          if (['hidden', 'auto', 'scroll'].includes(s.overflowX)) {
            return true;
          }
          p = p.parentElement;
        }
        return false;
      };

      const overflows = [...document.querySelectorAll('body *')]
        .filter(e => e.getBoundingClientRect().right > window.innerWidth + 1 && !isClipped(e))
        .slice(0, 5)
        .map(e => ({ tag: e.tagName, cls: e.className }));

      // 3. Small text < 12px
      const smallTexts = [...document.querySelectorAll('.announcement-bar *, .main-header *, .public-footer *')]
        .filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 11.5)
        .slice(0, 5)
        .map(e => ({ tag: e.tagName, cls: e.className, size: getComputedStyle(e).fontSize, text: e.textContent.trim().slice(0, 30) }));

      // 4. Touch targets < 44px on mobile <= 768px in header, announcement, ribbon
      let smallTouchTargets = [];
      if (['360', '390', '768'].includes(widthName)) {
        smallTouchTargets = [...document.querySelectorAll('.announcement-bar a, .main-header button, .main-header a, .main-header input, .category-ribbon button')]
          .filter(e => {
            const r = e.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && (r.height < 44 || r.width < 44);
          })
          .slice(0, 10)
          .map(e => ({ tag: e.tagName, cls: e.className, w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height), text: e.textContent.trim().slice(0, 20) }));
      }

      // 5. Emoji in layout
      const emojiInLayout = [...document.querySelectorAll('.announcement-bar, .main-header, .public-footer')]
        .flatMap(c => [...c.querySelectorAll('*')])
        .filter(e => [...e.childNodes].some(n => n.nodeType === 3 && /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(n.textContent)))
        .map(e => ({ tag: e.tagName, text: e.textContent.trim().slice(0, 25) }));

      return {
        hasHorizontalScroll,
        overflows,
        smallTexts,
        smallTouchTargets,
        emojiInLayout
      };
    }, w.name);

    results[w.name] = check;
    console.log(`Width ${w.name}: HorizontalScroll=${check.hasHorizontalScroll}, Overflows=${check.overflows.length}, SmallTexts=${check.smallTexts.length}, SmallTouchTargets=${check.smallTouchTargets.length}, Emojis=${check.emojiInLayout.length}`);
  }

  await browser.close();
}

checkMatrix().catch(console.error);

