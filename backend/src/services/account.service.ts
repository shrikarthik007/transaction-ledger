import { supabase } from '../config/supabase';
import { Errors } from '../utils/errors';
import { CreateAccountInput } from '../schemas/validation';
import { v4 as uuidv4 } from 'uuid';

export interface Account {
  id: string;
  name: string;
  balance: number;
  created_at: string;
}

export class AccountService {
  /**
   * Create a new account with initial balance of 0.
   */
  async createAccount(input: CreateAccountInput): Promise<Account> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('accounts')
      .insert({
        id,
        name: input.name,
        balance: 0,
        created_at: now,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating account:', error);
      throw Errors.internal('Failed to create account');
    }

    return data as Account;
  }

  /**
   * Get account by ID.
   */
  async getAccountById(accountId: string): Promise<Account> {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (error || !data) {
      throw Errors.notFound('Account', accountId);
    }

    return data as Account;
  }

  /**
   * Get account balance.
   */
  async getAccountBalance(accountId: string): Promise<{ account_id: string; balance: number; name: string }> {
    const account = await this.getAccountById(accountId);
    return {
      account_id: account.id,
      balance: account.balance,
      name: account.name,
    };
  }

  /**
   * Get all accounts.
   */
  async getAllAccounts(): Promise<Account[]> {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching accounts:', error);
      throw Errors.internal('Failed to fetch accounts');
    }

    return (data || []) as Account[];
  }
}

export const accountService = new AccountService();

