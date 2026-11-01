import { Router, Request, Response } from 'express';

const router = Router();

const apiDocs = {
  title: 'Transaction Ledger API',
  version: '1.0.0',
  description: 'Backend API for a simple transaction ledger system. Supports account management, credit/debit transactions, balance inquiries, transaction history with filtering/pagination, and money transfers.',
  base_url: '/api',
  endpoints: [
    {
      group: 'Health',
      routes: [
        {
          method: 'GET',
          path: '/api/health',
          description: 'Health check endpoint',
          response: { status: 'ok', timestamp: '2024-01-01T00:00:00.000Z' },
        },
      ],
    },
    {
      group: 'Accounts',
      routes: [
        {
          method: 'POST',
          path: '/api/accounts',
          description: 'Create a new account',
          body: {
            name: 'string (required) — Account holder name',
          },
          response: {
            success: true,
            data: {
              id: 'uuid',
              name: 'John Doe',
              balance: 0,
              created_at: '2024-01-01T00:00:00.000Z',
            },
          },
          errors: ['422 — Validation error (missing/invalid name)'],
        },
        {
          method: 'GET',
          path: '/api/accounts',
          description: 'Get all accounts',
          response: {
            success: true,
            data: ['Array of account objects'],
          },
        },
        {
          method: 'GET',
          path: '/api/accounts/:accountId',
          description: 'Get a single account by ID',
          params: { accountId: 'uuid (required)' },
          response: {
            success: true,
            data: { id: 'uuid', name: 'John Doe', balance: 150, created_at: '...' },
          },
          errors: ['400 — Invalid UUID format', '404 — Account not found'],
        },
        {
          method: 'GET',
          path: '/api/accounts/:accountId/balance',
          description: 'Get account balance',
          params: { accountId: 'uuid (required)' },
          response: {
            success: true,
            data: { account_id: 'uuid', balance: 150, name: 'John Doe' },
          },
          errors: ['400 — Invalid UUID format', '404 — Account not found'],
        },
      ],
    },
    {
      group: 'Transactions',
      routes: [
        {
          method: 'POST',
          path: '/api/accounts/:accountId/transactions',
          description: 'Add a transaction (credit or debit) to an account',
          params: { accountId: 'uuid (required)' },
          body: {
            type: "'credit' | 'debit' (required)",
            amount: 'number > 0 (required)',
            description: 'string (optional)',
            reference_id: 'string (required) — Must be unique per account',
          },
          response: {
            success: true,
            data: {
              id: 'uuid',
              account_id: 'uuid',
              type: 'credit',
              amount: 100,
              description: 'Initial deposit',
              reference_id: 'TXN-001',
              created_at: '2024-01-01T00:00:00.000Z',
            },
          },
          errors: [
            '400 — Invalid UUID format',
            '404 — Account not found',
            '409 — Duplicate reference_id for this account',
            '422 — Validation error / Insufficient balance for debit',
          ],
        },
        {
          method: 'GET',
          path: '/api/accounts/:accountId/transactions',
          description: 'Get transaction history with filtering, pagination, and sorting',
          params: { accountId: 'uuid (required)' },
          query: {
            type: "'credit' | 'debit' (optional) — Filter by transaction type",
            page: 'number (optional, default: 1) — Page number',
            limit: 'number (optional, default: 10, max: 100) — Items per page',
          },
          response: {
            success: true,
            data: ['Array of transaction objects (sorted by created_at DESC)'],
            pagination: {
              current_page: 1,
              page_size: 10,
              total_records: 25,
              total_pages: 3,
            },
          },
          errors: [
            '400 — Invalid UUID format',
            '404 — Account not found',
            '422 — Invalid pagination parameters',
          ],
        },
      ],
    },
    {
      group: 'Transfers (Bonus)',
      routes: [
        {
          method: 'POST',
          path: '/api/transfers',
          description: 'Transfer money from one account to another (atomic)',
          body: {
            source_account_id: 'uuid (required)',
            destination_account_id: 'uuid (required) — Must differ from source',
            amount: 'number > 0 (required)',
            description: 'string (optional)',
            reference_id: 'string (required)',
          },
          response: {
            success: true,
            data: {
              transfer_id: 'uuid',
              source_account_id: 'uuid',
              destination_account_id: 'uuid',
              amount: 50,
              description: 'Transfer from A to B',
              reference_id: 'TRF-001',
              source_transaction_id: 'uuid',
              destination_transaction_id: 'uuid',
              created_at: '2024-01-01T00:00:00.000Z',
            },
          },
          errors: [
            '404 — Source or destination account not found',
            '409 — Duplicate reference_id',
            '422 — Insufficient balance / Same source and destination / Validation error',
          ],
        },
      ],
    },
  ],
  error_format: {
    success: false,
    error: {
      code: 'ERROR_CODE',
      message: 'Human-readable error message',
      details: '(optional) Array of field-level validation errors',
    },
  },
  assumptions: [
    'Account IDs are UUIDs generated server-side',
    'Initial balance is always 0 and cannot be set by the client',
    'reference_id uniqueness is scoped per account (same reference_id can be used across different accounts)',
    'Transaction amounts are stored as numeric with 2 decimal precision',
    'Transactions are immutable — no update or delete endpoints are provided',
    'Balance updates and transaction creation happen atomically via PostgreSQL functions',
    'Transfers create two linked transactions (debit on source, credit on destination)',
    'All timestamps are in ISO 8601 UTC format',
    'Pagination defaults: page=1, limit=10, max limit=100',
    'Transaction history is always sorted by created_at in descending order (latest first)',
  ],
};

/**
 * GET /api/docs
 * Returns API documentation as JSON
 */
router.get('/', (_req: Request, res: Response) => {
  res.json(apiDocs);
});

export default router;

