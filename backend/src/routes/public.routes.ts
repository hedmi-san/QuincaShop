import { Router, Response } from 'express';
import { optionalAuth, AuthRequest } from '../middleware/auth.middleware.js';
import * as catalogService from '../services/catalog.service.js';
import { sendSuccess } from '../common/response.js';

const router = Router();

// GET /public/categories
router.get('/categories', async (_req, res: Response, next) => {
  try {
    const categories = await catalogService.getCategories();
    return sendSuccess(res, categories);
  } catch (err) {
    return next(err);
  }
});

// GET /public/store-info
router.get('/store-info', async (_req, res: Response, next) => {
  try {
    const info = await catalogService.getStoreInfo();
    return sendSuccess(res, info);
  } catch (err) {
    return next(err);
  }
});

// GET /public/products
router.get('/products', optionalAuth, async (req: AuthRequest, res: Response, next) => {
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

// GET /public/products/:slug
router.get('/products/:slug', optionalAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const product = await catalogService.getProductBySlugOrId(req.params.slug, req.user);
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

