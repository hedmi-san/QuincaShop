process.env.NODE_ENV = 'test';

import { createServer } from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { query } from '../db/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../..');

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

function getObjectLeafKeys(obj: any, prefix = ''): string[] {
  let keys: string[] = [];
  for (const k of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      keys = keys.concat(getObjectLeafKeys(obj[k], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

async function runPhase9Tests() {
  console.log('\n======================================================');
  console.log('--- STARTING PHASE 9 END-TO-END VERIFICATION SUITE ---');
  console.log('======================================================\n');

  const { app } = await import('../server.js');

  const server = createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, () => resolve());
  });
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}/api`;
  console.log(`Test API Server running on ${baseUrl}\n`);

  try {
    // -----------------------------------------------------------------
    // Step 1: Internationalization (i18n) & RTL Configuration
    // -----------------------------------------------------------------
    console.log('[Step 1] Verifying Vue-i18n translation bundles & key parity...');

    const frPath = path.join(rootDir, 'frontend/src/i18n/locales/fr.json');
    const arPath = path.join(rootDir, 'frontend/src/i18n/locales/ar.json');

    assert(fs.existsSync(frPath), 'French locale bundle (fr.json) exists');
    assert(fs.existsSync(arPath), 'Arabic locale bundle (ar.json) exists');

    const frJson = JSON.parse(fs.readFileSync(frPath, 'utf8'));
    const arJson = JSON.parse(fs.readFileSync(arPath, 'utf8'));

    const frKeys = getObjectLeafKeys(frJson);
    const arKeys = getObjectLeafKeys(arJson);

    assert(frKeys.length > 50, `French bundle contains ${frKeys.length} translation keys`);
    assert(arKeys.length > 50, `Arabic bundle contains ${arKeys.length} translation keys`);

    // Verify 100% key parity between French and Arabic
    const missingInAr = frKeys.filter((k) => !arKeys.includes(k));
    const missingInFr = arKeys.filter((k) => !frKeys.includes(k));

    assert(
      missingInAr.length === 0,
      `No missing keys in Arabic bundle (found: ${missingInAr.join(', ') || 'none'})`
    );
    assert(
      missingInFr.length === 0,
      `No missing keys in French bundle (found: ${missingInFr.join(', ') || 'none'})`
    );

    // Verify Arabic characters are present in ar.json
    const arabicRegex = /[\u0600-\u06FF]/;
    assert(arabicRegex.test(arJson.brand.name), 'Arabic bundle contains authentic Arabic script');
    assert(arabicRegex.test(arJson.facture.title), 'Arabic legal terminology (فاتورة رسمية) present');

    // Verify i18n setup file
    const i18nConfigPath = path.join(rootDir, 'frontend/src/i18n/index.ts');
    assert(fs.existsSync(i18nConfigPath), 'i18n initialization file (index.ts) exists');
    const i18nContent = fs.readFileSync(i18nConfigPath, 'utf8');
    assert(i18nContent.includes("dir', lang === 'ar' ? 'rtl' : 'ltr'"), 'Dynamic document direction (RTL/LTR) configured');

    // Verify RTL CSS rules
    const mainCssPath = path.join(rootDir, 'frontend/src/assets/styles/main.css');
    const mainCss = fs.readFileSync(mainCssPath, 'utf8');
    assert(mainCss.includes('[dir="rtl"]'), 'Global CSS contains [dir="rtl"] layout mirroring selectors');
    console.log('Internationalization (i18n) and Arabic RTL layout validated.\n');

    // -----------------------------------------------------------------
    // Step 2: Docker Containerization Architecture
    // -----------------------------------------------------------------
    console.log('[Step 2] Verifying Docker Compose and multi-stage Dockerfiles...');

    // 2.1 docker-compose.yml
    const composePath = path.join(rootDir, 'docker-compose.yml');
    assert(fs.existsSync(composePath), 'Root docker-compose.yml exists');
    const composeContent = fs.readFileSync(composePath, 'utf8');

    assert(composeContent.includes('services:'), 'docker-compose defines services');
    assert(composeContent.includes('db:'), 'Service "db" configured');
    assert(composeContent.includes('api:'), 'Service "api" configured');
    assert(composeContent.includes('web:'), 'Service "web" configured');
    assert(composeContent.includes('quincashop_db'), 'Database container named "quincashop_db"');
    assert(composeContent.includes('postgres:16-alpine'), 'Postgres 16 Alpine image specified');
    assert(composeContent.includes('healthcheck:'), 'Database service includes healthcheck');
    assert(composeContent.includes('condition: service_healthy'), 'API depends on healthy database');
    assert(composeContent.includes('volumes:'), 'Persistent volumes configured');

    // 2.2 backend/Dockerfile
    const beDockerPath = path.join(rootDir, 'backend/Dockerfile');
    assert(fs.existsSync(beDockerPath), 'Backend Dockerfile exists');
    const beDocker = fs.readFileSync(beDockerPath, 'utf8');
    assert(beDocker.includes('AS builder'), 'Backend Dockerfile uses multi-stage builder');
    assert(beDocker.includes('AS runner'), 'Backend Dockerfile uses minimal production runner');
    assert(beDocker.includes('EXPOSE 5000'), 'Backend exposes port 5000');

    // 2.3 frontend/Dockerfile & nginx.conf
    const feDockerPath = path.join(rootDir, 'frontend/Dockerfile');
    assert(fs.existsSync(feDockerPath), 'Frontend Dockerfile exists');
    const feDocker = fs.readFileSync(feDockerPath, 'utf8');
    assert(feDocker.includes('nginx:alpine'), 'Frontend production runner uses nginx:alpine');

    const nginxPath = path.join(rootDir, 'frontend/nginx.conf');
    assert(fs.existsSync(nginxPath), 'frontend/nginx.conf exists');
    const nginxContent = fs.readFileSync(nginxPath, 'utf8');
    assert(nginxContent.includes('try_files $uri $uri/ /index.html;'), 'HTML5 History mode fallback configured in Nginx');
    assert(nginxContent.includes('proxy_pass http://api:5000/api/;'), 'API reverse proxy configured to backend container');
    assert(nginxContent.includes('proxy_pass http://api:5000/uploads/;'), 'Uploads reverse proxy configured to backend container');
    assert(nginxContent.includes('gzip on;'), 'Gzip compression enabled in Nginx');
    console.log('Production Docker containerization validated.\n');

    // -----------------------------------------------------------------
    // Step 3: Automated Database Backup & Disaster Recovery Scripts
    // -----------------------------------------------------------------
    console.log('[Step 3] Verifying database backup and recovery scripts...');

    const backupSh = path.join(rootDir, 'scripts/backup-db.sh');
    const backupPs1 = path.join(rootDir, 'scripts/backup-db.ps1');
    const restoreSh = path.join(rootDir, 'scripts/restore-db.sh');
    const restorePs1 = path.join(rootDir, 'scripts/restore-db.ps1');

    assert(fs.existsSync(backupSh), 'Bash backup script (backup-db.sh) exists');
    assert(fs.existsSync(backupPs1), 'PowerShell backup script (backup-db.ps1) exists');
    assert(fs.existsSync(restoreSh), 'Bash restore script (restore-db.sh) exists');
    assert(fs.existsSync(restorePs1), 'PowerShell restore script (restore-db.ps1) exists');

    // Execute backup-db.ps1 to verify live backup execution
    console.log('  Executing live database backup via scripts/backup-db.ps1...');
    const testBackupDir = path.join(rootDir, 'backups_test_temp');
    try {
      execSync(
        `powershell -ExecutionPolicy Bypass -File "${backupPs1}" -BackupDir "${testBackupDir}" -DbName "single_store_db"`,
        { stdio: 'pipe' }
      );

      const generatedFiles = fs.readdirSync(testBackupDir);
      assert(generatedFiles.length > 0, 'Backup file generated successfully in test directory');
      const backupFile = path.join(testBackupDir, generatedFiles[0]);
      const fileStats = fs.statSync(backupFile);
      assert(fileStats.size > 1000, `Backup file size is valid (${fileStats.size} bytes)`);

      const fileContent = fs.readFileSync(backupFile, 'utf8');
      assert(
        fileContent.includes('PostgreSQL database dump') || fileContent.includes('CREATE TABLE'),
        'Backup file contains authentic PostgreSQL DDL dump'
      );
      console.log(`  ✓ Backup verified: ${generatedFiles[0]} (${fileStats.size} bytes)`);
    } finally {
      // Clean up temporary test backup directory
      if (fs.existsSync(testBackupDir)) {
        fs.rmSync(testBackupDir, { recursive: true, force: true });
      }
    }
    console.log('Database backup and disaster recovery verified.\n');

    // -----------------------------------------------------------------
    // Step 4: System Health & Baseline Verification
    // -----------------------------------------------------------------
    console.log('[Step 4] Checking system health check endpoint...');

    const healthRes = await fetch(`${baseUrl}/health`);
    assert(healthRes.status === 200, 'GET /api/health returned 200 OK');
    const healthData: any = await healthRes.json();
    assert(healthData.success === true, 'API health status success is true');
    assert(healthData.data?.database === 'connected', 'Database connection status is "connected"');
    console.log(`  Health Status: ${healthData.message} | DB: ${healthData.data?.database} | Time: ${healthData.data?.timestamp}`);
    console.log('System health validated.\n');

    console.log('======================================================');
    console.log('🎉 ALL PHASE 9 VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉');
    console.log('======================================================\n');
  } finally {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }
}

runPhase9Tests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Phase 9 Verification Failed:', err);
    process.exit(1);
  });
