import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import publicRoutes from './public.routes.js';
import portalRoutes from './portal.routes.js';
import categoryRoutes from './category.routes.js';
import adminProductRoutes from './admin-product.routes.js';

const apiRouter = Router();

apiRouter.use(healthRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/public', publicRoutes);
apiRouter.use('/portal', portalRoutes);
apiRouter.use('/admin/categories', categoryRoutes);
apiRouter.use('/admin/products', adminProductRoutes);

export default apiRouter;
