import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, requireActiveClient, AuthRequest } from '../middleware/auth.middleware.js';
import * as catalogService from '../services/catalog.service.js';
import * as cartService from '../services/cart.service.js';
import * as orderService from '../services/order.service.js';
import * as ledgerService from '../services/ledger.service.js';
import * as factureService from '../services/facture.service.js';
import { sendSuccess } from '../common/response.js';

const router = Router();

// Apply auth + requireActiveClient to all portal routes
router.use(authenticate, requireActiveClient);

// ==================== Products ====================

// GET /portal/products
router.get('/products', async (req: AuthRequest, res: Response, next: NextFunction) => {
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
router.get('/products/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const product = await catalogService.getProductBySlugOrId(req.params.id, req.user);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: { code: 'ENTITY_NOT_FOUND', message: 'Produit introuvable' },
      });
    }

    return sendSuccess(res, product);
  } catch (err) {
    return next(err);
  }
});

// ==================== Shopping Cart ====================

// GET /portal/cart
router.get('/cart', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const clientId = req.user!.clientId!;
    const cart = await cartService.getCart(clientId);
    return sendSuccess(res, cart);
  } catch (err) {
    return next(err);
  }
});

// PUT /portal/cart/items/:productId
const upsertCartSchema = z.object({
  quantity: z.number().int().nonnegative(),
});

router.put('/cart/items/:productId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parse = upsertCartSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_FAILED', message: 'Quantité invalide', details: parse.error.issues },
      });
    }

    const clientId = req.user!.clientId!;
    const productId = parseInt(req.params.productId, 10);
    const cart = await cartService.upsertCartItem(clientId, productId, parse.data.quantity);
    return sendSuccess(res, cart, 'Panier mis à jour');
  } catch (err: any) {
    if (err instanceof cartService.CartError) {
      return res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message },
      });
    }
    return next(err);
  }
});

// DELETE /portal/cart/items/:productId
router.delete('/cart/items/:productId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const clientId = req.user!.clientId!;
    const productId = parseInt(req.params.productId, 10);
    const cart = await cartService.removeCartItem(clientId, productId);
    return sendSuccess(res, cart, 'Article retiré du panier');
  } catch (err) {
    return next(err);
  }
});

// DELETE /portal/cart
router.delete('/cart', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const clientId = req.user!.clientId!;
    await cartService.clearCart(clientId);
    return sendSuccess(res, { cleared: true }, 'Panier vidé');
  } catch (err) {
    return next(err);
  }
});

// ==================== B2B Orders ====================

const placeOrderSchema = z.object({
  fulfillmentType: z.enum(['PICKUP', 'DELIVERY']).default('PICKUP'),
  deliveryAddress: z.string().optional(),
  paymentMethod: z.enum(['CASH', 'CHECK', 'TRANSFER', 'ON_CREDIT']).default('ON_CREDIT'),
  clientNote: z.string().optional(),
});

// POST /portal/orders (Checkout cart)
router.post('/orders', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parse = placeOrderSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_FAILED', message: 'Paramètres de commande invalides', details: parse.error.issues },
      });
    }

    const clientId = req.user!.clientId!;
    const order = await orderService.placeOrder(clientId, req.user!.id, parse.data);
    return sendSuccess(res, order, `Commande ${order.order_number} enregistrée avec succès`, 201);
  } catch (err: any) {
    if (err instanceof orderService.OrderError) {
      return res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
      });
    }
    return next(err);
  }
});

// GET /portal/orders (Client order history)
router.get('/orders', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const clientId = req.user!.clientId!;
    const result = await orderService.getOrders({
      clientId,
      status: req.query.status as string,
      search: req.query.search as string,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 20,
    });

    return res.status(200).json({
      success: true,
      data: result.orders,
      meta: result.meta,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return next(err);
  }
});

// GET /portal/orders/:id (Visual tracking detail)
router.get('/orders/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const clientId = req.user!.clientId!;
    const orderId = parseInt(req.params.id, 10);
    const order = await orderService.getOrderById(orderId, clientId, false);
    return sendSuccess(res, order);
  } catch (err: any) {
    if (err instanceof orderService.OrderError) {
      return res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message },
      });
    }
    return next(err);
  }
});

// POST /portal/orders/:id/cancel (Cancel order while in PENDING status)
const cancelSchema = z.object({
  reason: z.string().optional(),
});

router.post('/orders/:id/cancel', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parse = cancelSchema.safeParse(req.body);
    const clientId = req.user!.clientId!;
    const orderId = parseInt(req.params.id, 10);
    const order = await orderService.cancelOrderByClient(
      orderId,
      clientId,
      req.user!.id,
      parse.success ? parse.data.reason : undefined
    );
    return sendSuccess(res, order, `Commande ${order.order_number} annulée`);
  } catch (err: any) {
    if (err instanceof orderService.OrderError) {
      return res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message },
      });
    }
    return next(err);
  }
});

// ==================== Financial Sub-Ledger & Facturation ====================

// GET /portal/me/balance (Current balance & credit limit)
router.get('/me/balance', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const clientId = req.user!.clientId!;
    const bal = await ledgerService.getClientBalance(clientId);
    return sendSuccess(res, bal);
  } catch (err) {
    return next(err);
  }
});

// GET /portal/me/statement (Extrait de Compte Client)
router.get('/me/statement', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const clientId = req.user!.clientId!;
    const result = await ledgerService.getClientLedger(clientId, {
      fromDate: req.query.fromDate as string,
      toDate: req.query.toDate as string,
      type: req.query.type as string,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 30,
    });
    return sendSuccess(res, result);
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

// GET /portal/me/factures (Client's issued invoices)
router.get('/me/factures', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const clientId = req.user!.clientId!;
    const result = await factureService.getFactures({
      clientId,
      docType: req.query.docType as string,
      status: req.query.status as string,
      search: req.query.search as string,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 20,
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

// GET /portal/me/factures/:id (Official printable Facture / BL detail)
router.get('/me/factures/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const clientId = req.user!.clientId!;
    const id = parseInt(req.params.id, 10);
    const facture = await factureService.getFactureById(id, clientId);
    return sendSuccess(res, facture);
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
