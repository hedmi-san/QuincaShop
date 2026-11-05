import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { checkDbConnection } from './db/index.js';
import { runSeed } from './db/seed.js';
import apiRouter from './routes/index.js';
import { errorHandler } from './middleware/error.middleware.js';

export const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static uploads directory
app.use('/uploads', express.static(config.uploadDir));

// API Routes
app.use('/api', apiRouter);

// Global Error Handler
app.use(errorHandler);

// Server startup
async function startServer() {
  console.log(`[Server] Connecting to PostgreSQL at ${config.databaseUrl.replace(/:[^:@]+@/, ':****@')}...`);
  const isHealthy = await checkDbConnection();

  if (!isHealthy) {
    console.error('❌ FATAL: Could not connect to PostgreSQL. Check your credentials and server status.');
    process.exit(1);
  }

  console.log('✅ PostgreSQL connection verified.');

  try {
    // Automatically ensure baseline roles, settings, admin and comptoir are seeded
    await runSeed();
  } catch (seedErr) {
    console.warn('⚠️ Warning: Automatic seed encountered an error:', seedErr);
  }

  app.listen(config.port, () => {
    console.log(`🚀 Single-Store API Server running on port ${config.port} [${config.env}]`);
    console.log(`👉 Health check: http://localhost:${config.port}/api/health`);
  });
}

// Start if not in test environment
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

