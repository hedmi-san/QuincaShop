import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.middleware.js';
import * as hrService from '../services/hr.service.js';
import { sendSuccess } from '../common/response.js';

const router = Router();

// Guard: Strictly ADMIN only per RBAC matrix (Accountants forbidden from HR & Salaries)
router.use(authenticate, requireRole('ADMIN'));

// ==================== Employees ====================

const employeeSchema = z.object({
  fullName: z.string().optional(),
  full_name: z.string().optional(),
  nin: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  position: z.string().optional(),
  hireDate: z.string().optional().nullable(),
  hire_date: z.string().optional().nullable(),
  baseSalary: z.number().nonnegative('Le salaire de base ne peut pas être négatif').optional(),
  base_salary: z.number().nonnegative('Le salaire de base ne peut pas être négatif').optional(),
  status: z.enum(['ACTIVE', 'TERMINATED']).optional(),
}).transform((data) => {
  const name = data.fullName || data.full_name || '';
  if (!name.trim()) {
    throw new Error('Le nom complet est obligatoire');
  }
  return {
    fullName: name,
    nin: data.nin ?? undefined,
    phone: data.phone ?? undefined,
    position: data.position || 'Employé',
    hireDate: data.hireDate || data.hire_date || undefined,
    baseSalary: data.baseSalary !== undefined ? data.baseSalary : (data.base_salary !== undefined ? data.base_salary : 0),
    status: data.status || 'ACTIVE' as const,
  };
});

const employeeUpdateSchema = z.object({
  fullName: z.string().optional(),
  full_name: z.string().optional(),
  nin: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  position: z.string().optional(),
  hireDate: z.string().optional().nullable(),
  hire_date: z.string().optional().nullable(),
  baseSalary: z.number().nonnegative().optional(),
  base_salary: z.number().nonnegative().optional(),
  status: z.enum(['ACTIVE', 'TERMINATED']).optional(),
}).transform((data) => ({
  fullName: (data.fullName !== undefined ? data.fullName : data.full_name) || undefined,
  nin: data.nin ?? undefined,
  phone: data.phone ?? undefined,
  position: data.position || undefined,
  hireDate: (data.hireDate !== undefined ? data.hireDate : data.hire_date) ?? undefined,
  baseSalary: data.baseSalary !== undefined ? data.baseSalary : data.base_salary,
  status: data.status,
}));

// GET /admin/hr/employees
router.get('/employees', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await hrService.getEmployees({
      status: req.query.status as string,
      search: req.query.search as string,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 30,
    });

    return res.status(200).json({
      success: true,
      data: result.employees,
      summary: result.summary,
      meta: result.meta,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return next(err);
  }
});

// GET /admin/hr/employees/:id
router.get('/employees/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const emp = await hrService.getEmployeeById(id);
    return sendSuccess(res, emp);
  } catch (err: any) {
    if (err instanceof hrService.HRError) {
      return res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message },
      });
    }
    return next(err);
  }
});

// POST /admin/hr/employees
router.post('/employees', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parse = employeeSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_FAILED', message: 'Paramètres invalides', details: parse.error.issues },
      });
    }

    const employee = await hrService.createEmployee(parse.data, req.user!.id);
    return sendSuccess(res, employee, `Employé ${employee.full_name} créé`, 201);
  } catch (err: any) {
    if (err instanceof hrService.HRError) {
      return res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message },
      });
    }
    return next(err);
  }
});

// PUT /admin/hr/employees/:id
router.put('/employees/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const parse = employeeUpdateSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_FAILED', message: 'Paramètres invalides', details: parse.error.issues },
      });
    }

    const updated = await hrService.updateEmployee(id, parse.data, req.user!.id);
    return sendSuccess(res, updated, 'Profil employé mis à jour');
  } catch (err: any) {
    if (err instanceof hrService.HRError) {
      return res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message },
      });
    }
    return next(err);
  }
});

// DELETE /admin/hr/employees/:id
router.delete('/employees/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await hrService.deleteEmployee(id, req.user!.id);
    return sendSuccess(res, result, result.message);
  } catch (err: any) {
    if (err instanceof hrService.HRError) {
      return res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message },
      });
    }
    return next(err);
  }
});

// ==================== Monthly Payroll (Salaires & Primes) ====================

// GET /admin/hr/salaries?period=2026-11-01
router.get('/salaries', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const period = req.query.period as string;
    const result = await hrService.getSalaries(period);
    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
});

// POST /admin/hr/salaries/generate
const generateSchema = z.object({
  period: z.string().min(4, 'La période (ex: 2026-11) est obligatoire'),
});

router.post('/salaries/generate', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parse = generateSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_FAILED', message: 'Période invalide', details: parse.error.issues },
      });
    }

    const result = await hrService.generatePayroll(parse.data.period, req.user!.id);
    return sendSuccess(res, result, `Feuille de paie générée pour ${result.period}`, 201);
  } catch (err: any) {
    if (err instanceof hrService.HRError) {
      return res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message },
      });
    }
    return next(err);
  }
});

// PATCH /admin/hr/salaries/:id (Update bonuses, deductions, and mark as paid)
const updateSalarySchema = z.object({
  bonus1: z.number().nonnegative().optional(),
  bonus2: z.number().nonnegative().optional(),
  deductions: z.number().nonnegative().optional(),
  paid: z.boolean().optional(),
  paymentDate: z.string().optional(),
});

router.patch('/salaries/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const parse = updateSalarySchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_FAILED', message: 'Paramètres invalides', details: parse.error.issues },
      });
    }

    const updated = await hrService.updateSalary(id, parse.data, req.user!.id);
    return sendSuccess(res, updated, 'Bulletin de salaire mis à jour');
  } catch (err: any) {
    if (err instanceof hrService.HRError) {
      return res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message },
      });
    }
    return next(err);
  }
});

export default router;
