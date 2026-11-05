import dotenv from 'dotenv';
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgres://postgres:root@localhost:5432/single_store_db',
  jwtSecret: process.env.JWT_SECRET || 'super-secure-high-entropy-jwt-secret-key-replace-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '5', 10),
  puppeteerExecutablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '',
  companyCurrency: process.env.COMPANY_CURRENCY || 'DZD',
  defaultTva: parseFloat(process.env.DEFAULT_TVA || '19.00'),
};

