import { Router, Response } from 'express';
import { authenticate, requireActiveClient, AuthRequest } from '../middleware/auth.middleware.js';
import * as catalogService from '../services/catalog.service.js';
import { sendSuccess } from '../common/response.js';

const router = Router();

// Apply auth + requireActiveClient to all portal routes
router.use(authenticate, requireActiveClient);

// GET /portal/products
router.get('/products', async (req: AuthRequest, res: Response, next) => {
  try {
    const result = await catalogService.getPublicProducts(
      {
        category: req.query.category as string,
        search: req.query.search as string,
        brand: req.query.brand as string,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 24,
      },
      req.user
    );

    return res.status(200).json({
      success: true,
      data: result.products,
      meta: result.meta,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return next(err);
  }
});

// GET /portal/products/:id
router.get('/products/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const product = await catalogService.getProductBySlugOrId(req.params.id, req.user);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ENTITY_NOT_FOUND',
          message: 'Product not found',
        },
      });
    }

    return sendSuccess(res, product);
  } catch (err) {
    return next(err);
  }
});

export default router;

