import { z } from 'zod';

// ==========================================
// Shared field schemas
// ==========================================

// NUMERIC(15,2) => max 13 integer digits + 2 decimal digits
const MONEY_MAX = 9_999_999_999_999.99;

const amountSchema = z
  .number({ required_error: 'Amount is required', invalid_type_error: 'Amount must be a number' })
  .finite('Amount must be a finite number')
  .positive('Amount must be greater than 0')
  .max(MONEY_MAX, 'Amount exceeds the maximum allowed value')
  .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6, {
    message: 'Amount must have at most 2 decimal places',
  });

// ==========================================
// Account Schemas
// ==========================================

export const createAccountSchema = z.object({
  name: z
    .string({ required_error: 'Account name is required' })
    .trim()
    .min(1, 'Account name must not be empty')
    .max(255, 'Account name must not exceed 255 characters'),
}).strict();

export type CreateAccountInput = z.infer<typeof createAccountSchema>;

// ==========================================
// Transaction Schemas
// ==========================================

export const createTransactionSchema = z.object({
  type: z.enum(['credit', 'debit'], {
    required_error: 'Transaction type is required',
    invalid_type_error: "Transaction type must be either 'credit' or 'debit'",
  }),
  amount: amountSchema,
  description: z
    .string()
    .trim()
    .max(500, 'Description must not exceed 500 characters')
    .optional()
    .default(''),
  reference_id: z
    .string({ required_error: 'Reference ID is required' })
    .trim()
    .min(1, 'Reference ID must not be empty')
    .max(255, 'Reference ID must not exceed 255 characters'),
}).strict();

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

// ==========================================
// Transaction Query Schemas
// ==========================================

export const transactionQuerySchema = z.object({
  type: z.enum(['credit', 'debit']).optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().positive('Page must be a positive integer')),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .pipe(z.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit must not exceed 100')),
});

export type TransactionQueryInput = z.infer<typeof transactionQuerySchema>;

// ==========================================
// Transfer Schemas
// ==========================================

export const createTransferSchema = z.object({
  source_account_id: z
    .string({ required_error: 'Source account ID is required' })
    .uuid('Source account ID must be a valid UUID'),
  destination_account_id: z
    .string({ required_error: 'Destination account ID is required' })
    .uuid('Destination account ID must be a valid UUID'),
  amount: amountSchema,
  description: z
    .string()
    .trim()
    .max(500, 'Description must not exceed 500 characters')
    .optional()
    .default(''),
  reference_id: z
    .string({ required_error: 'Reference ID is required' })
    .trim()
    .min(1, 'Reference ID must not be empty')
    .max(255, 'Reference ID must not exceed 255 characters'),
}).strict().refine(
  (data) => data.source_account_id !== data.destination_account_id,
  { message: 'Source and destination accounts must be different', path: ['destination_account_id'] }
);

export type CreateTransferInput = z.infer<typeof createTransferSchema>;

