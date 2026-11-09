import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.middleware.js';
import * as clientService from '../services/client.service.js';
import * as ledgerService from '../services/ledger.service.js';
import * as paymentService from '../services/payment.service.js';
import { sendSuccess } from '../common/response.js';

const router = Router();

// Base guard: ADMIN or ACCOUNTANT
router.use(authenticate, requireRole('ADMIN', 'ACCOUNTANT'));

const approveSchema = z.object({
  code: z.string().optional(),
  creditLimit: z.number().nonnegative().optional(),
});

const reasonSchema = z.object({
  reason: z.string().min(3, 'Un motif explicatif est obligatoire (min. 3 caractères)'),
});

const manualClientSchema = z.object({
  name: z.string().min(2, 'La raison sociale est obligatoire'),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  wilaya: z.string().optional(),
  rc: z.string().optional(),
  nif: z.string().optional(),
  art: z.string().optional(),
  nis: z.string().optional(),
  activite: z.string().optional(),
  creditLimit: z.number().nonnegative().optional(),
});

// GET /admin/clients/next-code
router.get('/next-code', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const nextCode = await clientService.peekNextClientCode();
    return sendSuccess(res, { nextCode });
  } catch (err) {
    return next(err);
  }
});

// GET /admin/clients
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await clientService.getClients({
      status: req.query.status as string,
      search: req.query.search as string,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 25,
    });

    return res.status(200).json({
      success: true,
      data: result.clients,
      meta: result.meta,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return next(err);
  }
});

// GET /admin/clients/:id
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const client = await clientService.getClientById(id);
    return sendSuccess(res, client);
  } catch (err: any) {
    if (err instanceof clientService.ClientError) {
      return res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message },
      });
    }
    return next(err);
  }
});

// POST /admin/clients (Manual creation)
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parse = manualClientSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Données client invalides',
          details: parse.error.issues,
        },
      });
    }

    const created = await clientService.createManualClient(
      parse.data,
      req.user!.id,
      req.ip
    );
    return sendSuccess(res, created, 'Client créé avec succès', 201);
  } catch (err) {
    return next(err);
  }
});

// POST /admin/clients/:id/documents
router.post(
  '/:id/documents',
  clientService.uploadClientDocs.single('file'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const clientId = parseInt(req.params.id, 10);
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_FILE', message: 'Aucun fichier fourni' },
        });
      }
      const docType = (req.body.docType as string) || 'RC';
      const saved = await clientService.saveClientDocumentFile(clientId, docType, req.file);
      return sendSuccess(res, saved, 'Document joint au dossier client', 201);
    } catch (err) {
      return next(err);
    }
  }
);

// PATCH /admin/clients/:id/approve (Admin only)
router.patch(
  '/:id/approve',
  requireRole('ADMIN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      const parse = approveSchema.safeParse(req.body || {});
      if (!parse.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Paramètres d’approbation invalides',
            details: parse.error.issues,
          },
        });
      }

      const result = await clientService.approveClient(
        id,
        parse.data,
        req.user!.id,
        req.ip
      );

      return sendSuccess(
        res,
        result.client,
        `Compte client approuvé avec le code ${result.client.code}`
      );
    } catch (err: any) {
      if (err instanceof clientService.ClientError) {
        return res.status(err.statusCode).json({
          success: false,
          error: { code: err.code, message: err.message },
        });
      }
      return next(err);
    }
  }
);

// PATCH /admin/clients/:id/reject (Admin only)
router.patch(
  '/:id/reject',
  requireRole('ADMIN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      const parse = reasonSchema.safeParse(req.body);
      if (!parse.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Le motif du rejet est obligatoire',
            details: parse.error.issues,
          },
        });
      }

      const updated = await clientService.rejectClient(
        id,
        parse.data.reason,
        req.user!.id,
        req.ip
      );
      return sendSuccess(res, updated, 'Demande client rejetée');
    } catch (err: any) {
      if (err instanceof clientService.ClientError) {
        return res.status(err.statusCode).json({
          success: false,
          error: { code: err.code, message: err.message },
        });
      }
      return next(err);
    }
  }
);

// PATCH /admin/clients/:id/suspend (Admin only)
router.patch(
  '/:id/suspend',
  requireRole('ADMIN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      const parse = reasonSchema.safeParse(req.body);
      if (!parse.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Le motif de suspension est obligatoire',
            details: parse.error.issues,
          },
        });
      }

      const updated = await clientService.suspendClient(
        id,
        parse.data.reason,
        req.user!.id,
        req.ip
      );
      return sendSuccess(res, updated, 'Compte client suspendu');
    } catch (err: any) {
      if (err instanceof clientService.ClientError) {
        return res.status(err.statusCode).json({
          success: false,
          error: { code: err.code, message: err.message },
        });
      }
      return next(err);
    }
  }
);

// PATCH /admin/clients/:id/reactivate (Admin only)
router.patch(
  '/:id/reactivate',
  requireRole('ADMIN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      const updated = await clientService.reactivateClient(id, req.user!.id, req.ip);
      return sendSuccess(res, updated, 'Compte client réactivé');
    } catch (err: any) {
      if (err instanceof clientService.ClientError) {
        return res.status(err.statusCode).json({
          success: false,
          error: { code: err.code, message: err.message },
        });
      }
      return next(err);
    }
  }
);

// GET /admin/clients/:id/ledger (Extrait de compte / Sub-ledger)
router.get('/:id/ledger', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const ledger = await ledgerService.getClientLedger(id, {
      fromDate: req.query.fromDate as string,
      toDate: req.query.toDate as string,
      type: req.query.type as string,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 50,
    });
    return sendSuccess(res, ledger);
  } catch (err: any) {
    if (err instanceof ledgerService.LedgerError) {
      return res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message },
      });
    }
    return next(err);
  }
});

// POST /admin/clients/:id/payments (Record customer versement)
const paymentSchema = z.object({
  amount: z.number().positive('Le montant doit être supérieur à zéro'),
  method: z.enum(['CASH', 'CHECK', 'TRANSFER']).default('CASH'),
  reference: z.string().optional(),
  paymentDate: z.string().optional(),
  allocatedOrderIds: z.array(z.number().int().positive()).optional(),
});

router.post('/:id/payments', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const parse = paymentSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_FAILED', message: 'Paramètres invalides', details: parse.error.issues },
      });
    }

    const payment = await paymentService.recordPayment({
      clientId: id,
      amount: parse.data.amount,
      method: parse.data.method,
      reference: parse.data.reference,
      paymentDate: parse.data.paymentDate,
      allocatedOrderIds: parse.data.allocatedOrderIds,
      userId: req.user!.id,
    });

    return sendSuccess(res, payment, `Versement ${payment.payment_number} enregistré`, 201);
  } catch (err: any) {
    if (err instanceof paymentService.PaymentError || err instanceof ledgerService.LedgerError) {
      return res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message },
      });
    }
    return next(err);
  }
});

export default router;

