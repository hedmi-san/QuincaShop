import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.middleware.js';
import * as expenseService from '../services/expense.service.js';
import { sendSuccess } from '../common/response.js';

const router = Router();

// Guard: Strictly ADMIN only per RBAC matrix (Accountants forbidden)
router.use(authenticate, requireRole('ADMIN'));

const expenseSchema = z.object({
  category: z.enum([
    'ELECTRICITY',
    'WATER',
    'RENT',
    'FUEL',
    'MAINTENANCE',
    'TRANSPORTATION',
    'SUPPLIES',
    'OTHER',
  ]),
  amount: z.number().positive('Le montant doit être supérieur à zéro'),
  description: z.string().optional(),
  expenseDate: z.string().min(1, 'La date est obligatoire'),
});

// GET /admin/expenses
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await expenseService.getExpenses({
      category: req.query.category as string,
      fromDate: req.query.fromDate as string,
      toDate: req.query.toDate as string,
      search: req.query.search as string,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 30,
    });

    return res.status(200).json({
      success: true,
      data: result.expenses,
      summary: result.summary,
      meta: result.meta,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return next(err);
  }
});

// GET /admin/expenses/:id
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const expense = await expenseService.getExpenseById(id);
    return sendSuccess(res, expense);
  } catch (err: any) {
    if (err instanceof expenseService.ExpenseError) {
      return res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message },
      });
    }
    return next(err);
  }
});

// POST /admin/expenses
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parse = expenseSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_FAILED', message: 'Paramètres invalides', details: parse.error.issues },
      });
    }

    const expense = await expenseService.createExpense({
      category: parse.data.category,
      amount: parse.data.amount,
      description: parse.data.description,
      expenseDate: parse.data.expenseDate,
      userId: req.user!.id,
    });

    return sendSuccess(res, expense, 'Dépense enregistrée avec succès', 201);
  } catch (err: any) {
    if (err instanceof expenseService.ExpenseError) {
      return res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message },
      });
    }
    return next(err);
  }
});

// PUT /admin/expenses/:id
router.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const parse = expenseSchema.partial().safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_FAILED', message: 'Paramètres invalides', details: parse.error.issues },
      });
    }

    const updated = await expenseService.updateExpense(id, parse.data, req.user!.id);
    return sendSuccess(res, updated, 'Dépense modifiée avec succès');
  } catch (err: any) {
    if (err instanceof expenseService.ExpenseError) {
      return res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message },
      });
    }
    return next(err);
  }
});

// DELETE /admin/expenses/:id
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await expenseService.deleteExpense(id, req.user!.id);
    return sendSuccess(res, result, 'Dépense supprimée');
  } catch (err: any) {
    if (err instanceof expenseService.ExpenseError) {
      return res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message },
      });
    }
    return next(err);
  }
});

export default router;

