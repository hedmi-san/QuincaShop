import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware.js';
import * as notificationService from '../services/notification.service.js';
import { sendSuccess } from '../common/response.js';

const router = Router();

router.use(authenticate);

// GET /notifications
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await notificationService.getUserNotifications(
      req.user!.id,
      req.user!.role
    );
    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
});

// PATCH /notifications/:id/read
router.patch('/:id/read', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const updated = await notificationService.markNotificationRead(
      id,
      req.user!.id,
      req.user!.role
    );
    return sendSuccess(res, updated, 'Notification marquée comme lue');
  } catch (err) {
    return next(err);
  }
});

// POST /notifications/read-all
router.post('/read-all', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await notificationService.markAllNotificationsRead(
      req.user!.id,
      req.user!.role
    );
    return sendSuccess(res, result, 'Toutes les notifications marquées comme lues');
  } catch (err) {
    return next(err);
  }
});

export default router;

