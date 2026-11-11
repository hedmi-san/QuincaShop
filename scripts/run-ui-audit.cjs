const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:3000';
const SHOTS_DIR = path.resolve(__dirname, '../docs/ui/shots/before');

fs.mkdirSync(SHOTS_DIR, { recursive: true });

async function getAuthTokens() {
  const adminRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@store.local', password: 'StrongPassword2026!' })
  }).then(r => r.json());

  const clientRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'client@store.local', password: 'StrongPassword2026!' })
  }).then(r => r.json());

  return {
    admin: adminRes.data,
    client: clientRes.data
  };
}

const ROUTES = [
  // Public
  { name: 'storefront-catalog', path: '/', role: 'public', wide: true },
  { name: 'storefront-product-detail', path: '/products/perforateur-burineur-bosch-gbh-2-26-dre', role: 'public' },
  { name: 'auth-login', path: '/login', role: 'public' },
  { name: 'auth-register', path: '/register', role: 'public' },

  // Admin
  { name: 'admin-orders', path: '/admin/orders', role: 'admin', wide: true },
  { name: 'admin-factures', path: '/admin/factures', role: 'admin', wide: true },
  { name: 'admin-pending-clients', path: '/admin/clients/pending', role: 'admin' },
  { name: 'admin-client-detail', path: '/admin/clients/2', role: 'admin' },
  { name: 'admin-client-ledger', path: '/admin/clients/2/ledger', role: 'admin', wide: true },
  { name: 'admin-expenses', path: '/admin/expenses', role: 'admin' },
  { name: 'admin-employees', path: '/admin/hr/employees', role: 'admin' },
  { name: 'admin-payroll', path: '/admin/hr/payroll', role: 'admin' },
  { name: 'admin-reports', path: '/admin/reports', role: 'admin' },

  // Portal
  { name: 'portal-cart', path: '/portal/cart', role: 'client' },
  { name: 'portal-orders', path: '/portal/orders', role: 'client' },
  { name: 'portal-statement', path: '/portal/me/statement', role: 'client' },
  { name: 'portal-factures', path: '/portal/me/factures', role: 'client' }
];

async function runAudit() {
  console.log('--- Fetching Seed Auth Tokens ---');
  const tokens = await getAuthTokens();
  console.log('Admin token received, Client token received.');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const results = {};

  const viewports = [
    { width: 390, height: 844, name: '390' },
    { width: 768, height: 1024, name: '768' },
    { width: 1440, height: 900, name: '1440' },
    { width: 1920, height: 1080, name: '1920' }
  ];

  for (const route of ROUTES) {
    console.log(`\n========================================`);
    console.log(`Auditing Route: ${route.name} (${route.path}) [${route.role}]`);
    console.log(`========================================`);

    results[route.name] = { path: route.path, role: route.role, findings: {} };

    // Navigate to set localStorage
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((authData, role) => {
      localStorage.clear();
      if (role === 'admin' && authData.admin) {
        localStorage.setItem('token', authData.admin.token);
        localStorage.setItem('user', JSON.stringify(authData.admin.user));
        localStorage.removeItem('client');
      } else if (role === 'client' && authData.client) {
        localStorage.setItem('token', authData.client.token);
        localStorage.setItem('user', JSON.stringify(authData.client.user));
        if (authData.client.client) {
          localStorage.setItem('client', JSON.stringify(authData.client.client));
        }
      }
    }, tokens, route.role);

    // Loop viewports
    for (const vp of viewports) {
      if (vp.name === '1920' && !route.wide) continue;

      await page.setViewport({ width: vp.width, height: vp.height });
      await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 800));

      const shotPath = path.join(SHOTS_DIR, `${route.name}-${vp.name}.png`);
      await page.screenshot({ path: shotPath, fullPage: true });
      console.log(`  📸 Screenshot saved: ${route.name}-${vp.name}.png`);

      // Run mechanical checks on desktop (1440) and mobile (390)
      if (vp.name === '1440' || vp.name === '390') {
        const checks = await page.evaluate(() => {
          // 1. overflow / clipped content
          const overflows = [...document.querySelectorAll('body *')]
            .filter(e => e.getBoundingClientRect().right > window.innerWidth + 1)
            .slice(0, 10)
            .map(e => ({ tag: e.tagName, cls: e.className, text: e.textContent.slice(0, 40) }));

          // 2. text under 12px
          const smallTexts = [...document.querySelectorAll('body *')]
            .filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 12)
            .slice(0, 10)
            .map(e => ({ tag: e.tagName, cls: e.className, size: getComputedStyle(e).fontSize, text: e.textContent.slice(0, 40) }));

          // 3. unstyled native controls (square / 0px border radius)
          const unstyledControls = [...document.querySelectorAll('button,select,input:not([type=checkbox]):not([type=radio])')]
            .filter(e => getComputedStyle(e).borderRadius === '0px')
            .slice(0, 10)
            .map(e => ({ tag: e.tagName, cls: e.className, type: e.type, text: e.textContent.slice(0, 30) }));

          // 4. emoji used as icons, mojibake, raw enums
          const emojiMojibakeEnums = [...document.querySelectorAll('body *')]
            .filter(e => [...e.childNodes].some(n => n.nodeType === 3 && (/\p{Extended_Pictographic}||Ã./u.test(n.textContent) || /^(PENDING|ACTIVE|SUSPENDED|REJECTED|VALIDATED|CANCELLED)$/.test(n.textContent.trim()))))
            .slice(0, 15)
            .map(e => ({ tag: e.tagName, cls: e.className, text: e.textContent.trim().slice(0, 60) }));

          // 5. identifiers or amounts wrapped over several lines
          const wrappedIdsAmounts = [...document.querySelectorAll('td,th,span,p')]
            .filter(e => /^(CMD|FAC|BL|CLT)-?[\w-]*$|^[\d\s.,]+\s?(DA|DZD)$/.test(e.textContent.trim()) && e.getBoundingClientRect().height > 1.8 * (parseFloat(getComputedStyle(e).lineHeight) || 20))
            .slice(0, 10)
            .map(e => ({ tag: e.tagName, cls: e.className, text: e.textContent.trim(), height: e.getBoundingClientRect().height }));

          return { overflows, smallTexts, unstyledControls, emojiMojibakeEnums, wrappedIdsAmounts };
        });

        results[route.name].findings[vp.name] = checks;
      }
    }
  }

  // Also test modal state on Factures and Ledger
  console.log('\n--- Capturing reachable Modal States ---');
  try {
    // Admin Factures modal
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/admin/factures`, { waitUntil: 'networkidle2' });
    const createBtn = await page.$('.header-actions button, button.btn-primary');
    if (createBtn) {
      await createBtn.click();
      await new Promise(r => setTimeout(r, 500));
      await page.screenshot({ path: path.join(SHOTS_DIR, 'admin-factures-modal-1440.png') });
      console.log('  📸 Screenshot saved: admin-factures-modal-1440.png');
    }
  } catch (err) {
    console.error('Error capturing factures modal:', err.message);
  }

  // Arabic / RTL check on Storefront
  console.log('\n--- Capturing Arabic / RTL Storefront ---');
  try {
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
    await page.evaluate(() => {
      const arBtn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('عربي'));
      if (arBtn) arBtn.click();
    });
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: path.join(SHOTS_DIR, 'storefront-catalog-rtl-1440.png'), fullPage: true });
    console.log('  📸 Screenshot saved: storefront-catalog-rtl-1440.png');
  } catch (err) {
    console.error('Error capturing RTL:', err.message);
  }

  await browser.close();

  const auditLogPath = path.resolve(__dirname, '../docs/ui/audit-findings.json');
  fs.writeFileSync(auditLogPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\nAudit checks complete! Raw findings written to ${auditLogPath}`);
}

runAudit().catch(err => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});

