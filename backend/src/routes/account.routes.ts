import { Router, Request, Response, NextFunction } from 'express';
import { accountService } from '../services/account.service';
import { validateBody } from '../middleware/validate';
import { createAccountSchema } from '../schemas/validation';
import { Errors } from '../utils/errors';

const router = Router();

/**
 * POST /api/accounts
 * Create a new account
 */
router.post(
  '/',
  validateBody(createAccountSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const account = await accountService.createAccount(req.body);
      res.status(201).json({
        success: true,
        data: account,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/accounts
 * Get all accounts
 */
router.get(
  '/',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const accounts = await accountService.getAllAccounts();
      res.json({
        success: true,
        data: accounts,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/accounts/:accountId
 * Get a single account by ID
 */
router.get(
  '/:accountId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const accountId = req.params.accountId as string;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(accountId)) {
        throw Errors.badRequest('Invalid account ID format. Must be a valid UUID.');
      }

      const account = await accountService.getAccountById(accountId);
      res.json({
        success: true,
        data: account,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/accounts/:accountId/balance
 * Get account balance
 */
router.get(
  '/:accountId/balance',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const accountId = req.params.accountId as string;

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(accountId)) {
        throw Errors.badRequest('Invalid account ID format. Must be a valid UUID.');
      }

      const balance = await accountService.getAccountBalance(accountId);
      res.json({
        success: true,
        data: balance,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

