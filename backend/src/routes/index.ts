import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import publicRoutes from './public.routes.js';
import portalRoutes from './portal.routes.js';
import categoryRoutes from './category.routes.js';
import adminProductRoutes from './admin-product.routes.js';
import adminStockRoutes from './admin-stock.routes.js';
import adminPosRoutes from './admin-pos.routes.js';
import adminClientRoutes from './admin-client.routes.js';
import adminOrderRoutes from './admin-order.routes.js';
import adminFactureRoutes from './admin-facture.routes.js';
import adminExpenseRoutes from './admin-expense.routes.js';
import adminHrRoutes from './admin-hr.routes.js';
import adminReportRoutes from './admin-report.routes.js';
import notificationRoutes from './notification.routes.js';

const apiRouter = Router();

apiRouter.use(healthRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/public', publicRoutes);
apiRouter.use('/portal', portalRoutes);
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/admin/categories', categoryRoutes);
apiRouter.use('/admin/products', adminProductRoutes);
apiRouter.use('/admin/stock', adminStockRoutes);
apiRouter.use('/admin/pos', adminPosRoutes);
apiRouter.use('/admin/clients', adminClientRoutes);
apiRouter.use('/admin/orders', adminOrderRoutes);
apiRouter.use('/admin/factures', adminFactureRoutes);
apiRouter.use('/admin/expenses', adminExpenseRoutes);
apiRouter.use('/admin/hr', adminHrRoutes);
apiRouter.use('/admin/reports', adminReportRoutes);

export default apiRouter;
