import { supabase } from '../config/supabase';
import { Errors } from '../utils/errors';
import { CreateTransactionInput, TransactionQueryInput } from '../schemas/validation';
import { accountService } from './account.service';
import { v4 as uuidv4 } from 'uuid';

export interface Transaction {
  id: string;
  account_id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  reference_id: string;
  created_at: string;
}

export interface PaginatedTransactions {
  data: Transaction[];
  pagination: {
    current_page: number;
    page_size: number;
    total_records: number;
    total_pages: number;
  };
}

export class TransactionService {
  /**
   * Add a transaction (credit or debit) to an account.
   * Uses a Supabase RPC function for atomicity.
   */
  async addTransaction(accountId: string, input: CreateTransactionInput): Promise<Transaction> {
    // 1. Verify account exists
    const account = await accountService.getAccountById(accountId);

    // 2. Check for duplicate reference_id for this account
    const { data: existing } = await supabase
      .from('transactions')
      .select('id')
      .eq('account_id', accountId)
      .eq('reference_id', input.reference_id)
      .single();

    if (existing) {
      throw Errors.duplicateTransaction(input.reference_id, accountId);
    }

    // 3. For debit, check sufficient balance
    if (input.type === 'debit' && account.balance < input.amount) {
      throw Errors.insufficientBalance(accountId, account.balance, input.amount);
    }

    // 4. Atomic: create transaction + update balance via RPC
    const transactionId = uuidv4();
    const now = new Date().toISOString();
    const balanceChange = input.type === 'credit' ? input.amount : -input.amount;

    const { data, error } = await supabase.rpc('create_transaction', {
      p_transaction_id: transactionId,
      p_account_id: accountId,
      p_type: input.type,
      p_amount: input.amount,
      p_description: input.description || '',
      p_reference_id: input.reference_id,
      p_created_at: now,
      p_balance_change: balanceChange,
    });

    if (error) {
      console.error('Error creating transaction:', error);
      // Check for specific error codes from our DB function
      if (error.message?.includes('INSUFFICIENT_BALANCE')) {
        throw Errors.insufficientBalance(accountId, account.balance, input.amount);
      }
      if (error.message?.includes('DUPLICATE_REFERENCE')) {
        throw Errors.duplicateTransaction(input.reference_id, accountId);
      }
      // Unique constraint violation (race condition between the pre-check and the insert)
      if (error.code === '23505' || error.message?.includes('duplicate key value')) {
        throw Errors.duplicateTransaction(input.reference_id, accountId);
      }
      throw Errors.internal('Failed to create transaction');
    }

    return {
      id: transactionId,
      account_id: accountId,
      type: input.type,
      amount: input.amount,
      description: input.description || '',
      reference_id: input.reference_id,
      created_at: now,
    };
  }

  /**
   * Get paginated transaction history for an account with optional type filtering.
   */
  async getTransactions(accountId: string, query: TransactionQueryInput): Promise<PaginatedTransactions> {
    // Verify account exists
    await accountService.getAccountById(accountId);

    const { page, limit, type } = query;
    const offset = (page - 1) * limit;

    // Build query
    let dbQuery = supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + limit - 1);

    if (type) {
      dbQuery = dbQuery.eq('type', type);
    }

    const { data, error, count } = await dbQuery;

    if (error) {
      console.error('Error fetching transactions:', error);
      throw Errors.internal('Failed to fetch transactions');
    }

    const totalRecords = count || 0;
    const totalPages = Math.ceil(totalRecords / limit);

    return {
      data: (data || []) as Transaction[],
      pagination: {
        current_page: page,
        page_size: limit,
        total_records: totalRecords,
        total_pages: totalPages,
      },
    };
  }
}

export const transactionService = new TransactionService();

