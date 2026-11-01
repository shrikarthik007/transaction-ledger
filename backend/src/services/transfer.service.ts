import { supabase } from '../config/supabase';
import { Errors } from '../utils/errors';
import { CreateTransferInput } from '../schemas/validation';
import { accountService } from './account.service';
import { v4 as uuidv4 } from 'uuid';

export interface TransferResult {
  transfer_id: string;
  source_account_id: string;
  destination_account_id: string;
  amount: number;
  description: string;
  reference_id: string;
  source_transaction_id: string;
  destination_transaction_id: string;
  created_at: string;
}

export class TransferService {
  /**
   * Transfer money between two accounts atomically.
   * Uses a Supabase RPC function to ensure atomicity.
   */
  async transfer(input: CreateTransferInput): Promise<TransferResult> {
    // 1. Verify both accounts exist
    const [sourceAccount, destAccount] = await Promise.all([
      accountService.getAccountById(input.source_account_id),
      accountService.getAccountById(input.destination_account_id),
    ]);

    // 2. Check sufficient balance
    if (sourceAccount.balance < input.amount) {
      throw Errors.insufficientBalance(
        input.source_account_id,
        sourceAccount.balance,
        input.amount
      );
    }

    // 3. Check for duplicate reference_id on either account
    const { data: existingSource } = await supabase
      .from('transactions')
      .select('id')
      .eq('account_id', input.source_account_id)
      .eq('reference_id', input.reference_id)
      .single();

    if (existingSource) {
      throw Errors.duplicateTransaction(input.reference_id, input.source_account_id);
    }

    const { data: existingDest } = await supabase
      .from('transactions')
      .select('id')
      .eq('account_id', input.destination_account_id)
      .eq('reference_id', input.reference_id)
      .single();

    if (existingDest) {
      throw Errors.duplicateTransaction(input.reference_id, input.destination_account_id);
    }

    // 4. Atomic transfer via RPC
    const transferId = uuidv4();
    const sourceTransactionId = uuidv4();
    const destTransactionId = uuidv4();
    const now = new Date().toISOString();
    const description = input.description || `Transfer from ${sourceAccount.name} to ${destAccount.name}`;

    const { data, error } = await supabase.rpc('transfer_funds', {
      p_transfer_id: transferId,
      p_source_account_id: input.source_account_id,
      p_dest_account_id: input.destination_account_id,
      p_amount: input.amount,
      p_description: description,
      p_reference_id: input.reference_id,
      p_source_transaction_id: sourceTransactionId,
      p_dest_transaction_id: destTransactionId,
      p_created_at: now,
    });

    if (error) {
      console.error('Error transferring funds:', error);
      if (error.message?.includes('INSUFFICIENT_BALANCE')) {
        throw Errors.insufficientBalance(input.source_account_id, sourceAccount.balance, input.amount);
      }
      if (error.message?.includes('DUPLICATE_REFERENCE')) {
        throw Errors.duplicateTransaction(input.reference_id, input.source_account_id);
      }
      if (error.code === '23505' || error.message?.includes('duplicate key value')) {
        throw Errors.duplicateTransaction(input.reference_id, input.source_account_id);
      }
      throw Errors.internal('Failed to transfer funds');
    }

    return {
      transfer_id: transferId,
      source_account_id: input.source_account_id,
      destination_account_id: input.destination_account_id,
      amount: input.amount,
      description,
      reference_id: input.reference_id,
      source_transaction_id: sourceTransactionId,
      destination_transaction_id: destTransactionId,
      created_at: now,
    };
  }
}

export const transferService = new TransferService();

