import { Router, Request, Response } from 'express';
import { checkDbConnection } from '../db/index.js';

const router = Router();

router.get('/health', async (_req: Request, res: Response) => {
  const isDbHealthy = await checkDbConnection();
  if (isDbHealthy) {
    return res.status(200).json({
      success: true,
      message: 'Healthy',
      data: {
        database: 'connected',
        timestamp: new Date().toISOString(),
      },
    });
  }

  return res.status(503).json({
    success: false,
    message: 'Database connection unavailable',
    data: {
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    },
  });
});

export default router;

