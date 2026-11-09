import { Router, Request, Response, NextFunction } from 'express';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../utils/validation.js';
import * as authService from '../services/auth.service.js';
import { uploadClientDocs, saveClientDocumentFile } from '../services/client.service.js';
import { authenticate, AuthRequest } from '../middleware/auth.middleware.js';
import { sendSuccess } from '../common/response.js';

const router = Router();

const registrationUpload = uploadClientDocs.fields([
  { name: 'rcDoc', maxCount: 1 },
  { name: 'nifDoc', maxCount: 1 },
  { name: 'nisDoc', maxCount: 1 },
  { name: 'idDoc', maxCount: 1 },
  { name: 'otherDoc', maxCount: 1 },
]);

// POST /auth/register (Supports JSON or multipart/form-data with RC/NIF documents)
router.post('/register', registrationUpload, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseRes = registerSchema.safeParse(req.body);
    if (!parseRes.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid registration input',
          details: parseRes.error.issues,
        },
      });
    }

    const uploadedFiles: Array<{ docType: string; file: Express.Multer.File }> = [];
    const filesMap = req.files as Record<string, Express.Multer.File[]> | undefined;
    if (filesMap) {
      if (filesMap.rcDoc?.[0]) uploadedFiles.push({ docType: 'RC', file: filesMap.rcDoc[0] });
      if (filesMap.nifDoc?.[0]) uploadedFiles.push({ docType: 'NIF', file: filesMap.nifDoc[0] });
      if (filesMap.nisDoc?.[0]) uploadedFiles.push({ docType: 'NIS', file: filesMap.nisDoc[0] });
      if (filesMap.idDoc?.[0]) uploadedFiles.push({ docType: 'ID', file: filesMap.idDoc[0] });
      if (filesMap.otherDoc?.[0]) uploadedFiles.push({ docType: 'OTHER', file: filesMap.otherDoc[0] });
    }

    const result = await authService.registerClient(parseRes.data, uploadedFiles);
    return sendSuccess(
      res,
      result,
      'Registration submitted successfully. Account pending administrative approval.',
      201
    );
  } catch (err: any) {
    if (err instanceof authService.AuthError) {
      return res.status(err.statusCode).json({
        success: false,
        error: {
          code: err.code,
          message: err.message,
          ...(err.details ? { details: err.details } : {}),
        },
      });
    }
    return next(err);
  }
});

// POST /auth/login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseRes = loginSchema.safeParse(req.body);
    if (!parseRes.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Email and password are required',
          details: parseRes.error.issues,
        },
      });
    }

    const result = await authService.login(parseRes.data);
    return sendSuccess(res, result, 'Login successful');
  } catch (err: any) {
    if (err instanceof authService.AuthError) {
      return res.status(err.statusCode).json({
        success: false,
        error: {
          code: err.code,
          message: err.message,
        },
      });
    }
    return next(err);
  }
});

// GET /auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    const result = await authService.getMe(req.user.id);
    return sendSuccess(res, result);
  } catch (err: any) {
    if (err instanceof authService.AuthError) {
      return res.status(err.statusCode).json({
        success: false,
        error: {
          code: err.code,
          message: err.message,
        },
      });
    }
    return next(err);
  }
});

// POST /auth/me/documents (Allow authenticated client to upload additional RC/NIF/NIS documents)
router.post(
  '/me/documents',
  authenticate,
  uploadClientDocs.single('file'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.clientId) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Only client accounts can upload registry documents' },
        });
      }
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_FILE', message: 'A document file is required' },
        });
      }

      const docType = (req.body.docType as string) || 'RC';
      const saved = await saveClientDocumentFile(req.user.clientId, docType, req.file);
      return sendSuccess(res, saved, 'Document uploaded successfully', 201);
    } catch (err) {
      return next(err);
    }
  }
);

// POST /auth/verify-email
router.post('/verify-email', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseRes = verifyEmailSchema.safeParse(req.body);
    if (!parseRes.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Verification token is required',
          details: parseRes.error.issues,
        },
      });
    }

    const result = await authService.verifyEmail(parseRes.data.token);
    return sendSuccess(res, result, 'Email verified successfully');
  } catch (err: any) {
    if (err instanceof authService.AuthError) {
      return res.status(err.statusCode).json({
        success: false,
        error: {
          code: err.code,
          message: err.message,
        },
      });
    }
    return next(err);
  }
});

// POST /auth/forgot-password
router.post('/forgot-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseRes = forgotPasswordSchema.safeParse(req.body);
    if (!parseRes.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Valid email is required',
          details: parseRes.error.issues,
        },
      });
    }

    const result = await authService.forgotPassword(parseRes.data.email);
    return sendSuccess(res, result, 'If the email exists, a password reset link has been dispatched');
  } catch (err: any) {
    return next(err);
  }
});

// POST /auth/reset-password
router.post('/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseRes = resetPasswordSchema.safeParse(req.body);
    if (!parseRes.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Valid token and strong new password are required',
          details: parseRes.error.issues,
        },
      });
    }

    const result = await authService.resetPassword(parseRes.data.token, parseRes.data.newPassword);
    return sendSuccess(res, result, 'Password has been reset successfully');
  } catch (err: any) {
    if (err instanceof authService.AuthError) {
      return res.status(err.statusCode).json({
        success: false,
        error: {
          code: err.code,
          message: err.message,
        },
      });
    }
    return next(err);
  }
});

export default router;
