import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.middleware.js';
import * as factureService from '../services/facture.service.js';
import { sendSuccess } from '../common/response.js';

const router = Router();

// Guard: ADMIN or ACCOUNTANT
router.use(authenticate, requireRole('ADMIN', 'ACCOUNTANT'));

// GET /admin/factures
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await factureService.getFactures({
      clientId: req.query.clientId ? parseInt(req.query.clientId as string, 10) : undefined,
      docType: req.query.docType as string,
      status: req.query.status as string,
      search: req.query.search as string,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 25,
    });

    return res.status(200).json({
      success: true,
      data: result.factures,
      meta: result.meta,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return next(err);
  }
});

// GET /admin/factures/:id
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const doc = await factureService.getFactureById(id);
    return sendSuccess(res, doc);
  } catch (err: any) {
    if (err instanceof factureService.FactureError) {
      return res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message },
      });
    }
    return next(err);
  }
});

// POST /admin/orders/:id/facture (Generate fiscal invoice from order)
const createFactureSchema = z.object({
  docType: z.enum(['FACTURE', 'PROFORMA', 'BON_LIVRAISON']).default('FACTURE'),
  paymentMode: z.string().optional(),
  transportMode: z.string().optional(),
  truckNumber: z.string().optional(),
  driverName: z.string().optional(),
});

router.post('/orders/:id/facture', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    const parse = createFactureSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_FAILED', message: 'Paramètres invalides', details: parse.error.issues },
      });
    }

    const facture = await factureService.createFactureFromOrder(
      {
        orderId,
        ...parse.data,
      },
      req.user!.id
    );

    return sendSuccess(res, facture, `Document ${facture.facture_number} émis avec succès`, 201);
  } catch (err: any) {
    if (err instanceof factureService.FactureError) {
      return res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message },
      });
    }
    return next(err);
  }
});

// POST /admin/factures/:id/annuler (Void facture)
const voidSchema = z.object({
  voidReason: z.string().min(3, 'Le motif d’annulation est obligatoire (min. 3 caractères)'),
});

router.post('/:id/annuler', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const parse = voidSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_FAILED', message: 'Motif invalide', details: parse.error.issues },
      });
    }

    const voided = await factureService.voidFacture(id, req.user!.id, parse.data.voidReason);
    return sendSuccess(res, voided, `Facture ${voided.facture_number} annulée`);
  } catch (err: any) {
    if (err instanceof factureService.FactureError) {
      return res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message },
      });
    }
    return next(err);
  }
});

export default router;

