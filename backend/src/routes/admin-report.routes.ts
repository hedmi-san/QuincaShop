import { Router, Response, NextFunction } from 'express';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.middleware.js';
import { sendSuccess } from '../common/response.js';
import * as reportService from '../services/report.service.js';

const router = Router();

// Strictly ADMIN only: Accountants are locked out of gross margins, purchase costs, and P&L.
router.use(authenticate, requireRole('ADMIN'));

/**
 * GET /admin/reports/dashboard
 * Executive KPI cards and operational business pulse.
 */
router.get('/dashboard', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const kpis = await reportService.getDashboardKpis();
    return sendSuccess(res, kpis);
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /admin/reports/income-statement
 * Consolidated Income Statement (P&L: Revenue, COGS, Gross Margin, Overhead, Payroll, Net Profit).
 */
router.get('/income-statement', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const pnl = await reportService.getIncomeStatement(from, to);
    return sendSuccess(res, pnl);
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /admin/reports/stock-valuation
 * Asset valuation of physical inventory based on purchase unit costs.
 */
router.get('/stock-valuation', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const valuation = await reportService.getStockValuation();
    return sendSuccess(res, valuation);
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /admin/reports/receivables
 * Debt aging report (Balance Âgée) with overdue time intervals.
 */
router.get('/receivables', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const aging = await reportService.getAgingReceivables();
    return sendSuccess(res, aging);
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /admin/reports/export
 * Downloads executive reports as Microsoft Excel (.xlsx) spreadsheets.
 */
router.get('/export', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const reportType = (req.query.report as string || 'income-statement') as 'income-statement' | 'stock-valuation' | 'receivables';
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    const { buffer, filename } = await reportService.generateExcelReport(reportType, { from, to });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`
    );

    return res.status(200).send(buffer);
  } catch (err: any) {
    if (err instanceof reportService.ReportError) {
      return res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message },
      });
    }
    return next(err);
  }
});

export default router;

