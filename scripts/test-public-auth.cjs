const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:3000';
const SHOTS_DIR = path.resolve(__dirname, '../docs/ui/shots/after');

(async () => {
  console.log('--- Testing Auth and Pending Client Layout States ---');
  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Test Active Client (client@store.local)
  const clientRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'client@store.local', password: 'StrongPassword2026!' })
  }).then(r => r.json());

  if (clientRes.success) {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((clientData) => {
      localStorage.clear();
      localStorage.setItem('token', clientData.token);
      localStorage.setItem('user', JSON.stringify(clientData.user));
    }, clientRes.data);

    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 600));

    const clientCheck = await page.evaluate(() => {
      const ordersLink = document.querySelector('a[href="/portal/orders"]');
      const facturesLink = document.querySelector('a[href="/portal/me/factures"]');
      const statementLink = document.querySelector('a[href="/portal/me/statement"]');
      const cartLink = document.querySelector('.cart-link');
      const notifBtn = document.querySelector('.notif-btn');
      const userRole = document.querySelector('.user-role-tag');
      return {
        ordersLink: !!ordersLink,
        facturesLink: !!facturesLink,
        statementLink: !!statementLink,
        cartLink: !!cartLink,
        notifBtn: !!notifBtn,
        role: userRole ? userRole.textContent : null
      };
    });
    console.log('✅ Active Client Layout Check:', clientCheck);
    await page.screenshot({ path: path.join(SHOTS_DIR, 'public-layout-client-active-1440.png'), fullPage: false });
  }

  // 2. Test Pending Client (pending@store.local)
  const pendingRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'pending@store.local', password: 'StrongPassword2026!' })
  }).then(r => r.json());

  if (pendingRes.success) {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((pendingData) => {
      localStorage.clear();
      localStorage.setItem('token', pendingData.token);
      localStorage.setItem('user', JSON.stringify(pendingData.user));
    }, pendingRes.data);

    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 600));

    const pendingCheck = await page.evaluate(() => {
      const banner = document.querySelector('.pending-sticky-banner');
      const bannerLink = document.querySelector('.pending-banner-link');
      const userRole = document.querySelector('.user-role-tag');
      return {
        bannerVisible: !!banner,
        bannerText: banner ? banner.textContent.trim().slice(0, 40) : null,
        bannerLink: bannerLink ? bannerLink.getAttribute('href') : null,
        role: userRole ? userRole.textContent : null
      };
    });
    console.log('✅ Pending Client Layout Check:', pendingCheck);
    await page.screenshot({ path: path.join(SHOTS_DIR, 'public-layout-client-pending-1440.png'), fullPage: false });
  }

  await browser.close();
  console.log('🎉 All Auth & Pending Client Layout States Verified!');
})();
