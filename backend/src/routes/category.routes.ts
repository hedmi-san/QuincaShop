import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.middleware.js';
import * as categoryService from '../services/category.service.js';
import { sendSuccess } from '../common/response.js';

const router = Router();

const categorySchema = z.object({
  name: z.string().min(2, 'Name is required (min 2 characters)'),
  slug: z.string().optional(),
  parent_id: z.number().nullable().optional(),
  sort_order: z.number().int().optional(),
  active: z.boolean().optional(),
});

// GET /admin/categories
router.get('/', authenticate, requireRole('ADMIN', 'ACCOUNTANT'), async (req: AuthRequest, res: Response, next) => {
  try {
    const categories = await categoryService.getAllCategories(true);
    return sendSuccess(res, categories);
  } catch (err) {
    return next(err);
  }
});

// POST /admin/categories (Admin only)
router.post('/', authenticate, requireRole('ADMIN'), async (req: AuthRequest, res: Response, next) => {
  try {
    const parse = categorySchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid category data',
          details: parse.error.issues,
        },
      });
    }

    const created = await categoryService.createCategory(parse.data);
    return sendSuccess(res, created, 'Category created successfully', 201);
  } catch (err) {
    return next(err);
  }
});

// PUT /admin/categories/:id (Admin only)
router.put('/:id', authenticate, requireRole('ADMIN'), async (req: AuthRequest, res: Response, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const parse = categorySchema.partial().safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid category data',
          details: parse.error.issues,
        },
      });
    }

    const updated = await categoryService.updateCategory(id, parse.data);
    return sendSuccess(res, updated, 'Category updated successfully');
  } catch (err) {
    return next(err);
  }
});

// DELETE /admin/categories/:id (Admin only)
router.delete('/:id', authenticate, requireRole('ADMIN'), async (req: AuthRequest, res: Response, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await categoryService.deleteCategory(id);
    return sendSuccess(res, result, 'Category deleted successfully');
  } catch (err) {
    return next(err);
  }
});

export default router;

