import { Router, Request, Response, NextFunction } from 'express';
import { transactionService } from '../services/transaction.service';
import { validateBody, validateQuery } from '../middleware/validate';
import { createTransactionSchema, transactionQuerySchema } from '../schemas/validation';
import { Errors } from '../utils/errors';

const router = Router();

/**
 * POST /api/accounts/:accountId/transactions
 * Add a transaction to an account
 */
router.post(
  '/:accountId/transactions',
  validateBody(createTransactionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const accountId = req.params.accountId as string;

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(accountId)) {
        throw Errors.badRequest('Invalid account ID format. Must be a valid UUID.');
      }

      const transaction = await transactionService.addTransaction(accountId, req.body);
      res.status(201).json({
        success: true,
        data: transaction,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/accounts/:accountId/transactions
 * Get transaction history for an account
 */
router.get(
  '/:accountId/transactions',
  validateQuery(transactionQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const accountId = req.params.accountId as string;

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(accountId)) {
        throw Errors.badRequest('Invalid account ID format. Must be a valid UUID.');
      }

      const validatedQuery = (req as any).validatedQuery;
      const result = await transactionService.getTransactions(accountId, validatedQuery);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

