import { Router, Request, Response, NextFunction } from 'express';
import { transferService } from '../services/transfer.service';
import { validateBody } from '../middleware/validate';
import { createTransferSchema } from '../schemas/validation';

const router = Router();

/**
 * POST /api/transfers
 * Transfer money between two accounts
 */
router.post(
  '/',
  validateBody(createTransferSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await transferService.transfer(req.body);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

