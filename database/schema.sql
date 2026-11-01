-- =============================================
-- Transaction Ledger Database Schema
-- Run this SQL in your Supabase SQL Editor
-- =============================================

-- 1. Accounts table
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL CHECK (char_length(name) > 0),
  balance NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  type VARCHAR(10) NOT NULL CHECK (type IN ('credit', 'debit')),
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL DEFAULT '',
  reference_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, reference_id)
);

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_type ON public.transactions(account_id, type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON public.transactions(account_id, reference_id);

-- 4. Enable RLS
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (service_role bypasses RLS, but these exist for completeness)
-- Dropped first so this script can be re-run safely on an existing database
DROP POLICY IF EXISTS "Service role full access on accounts" ON public.accounts;
DROP POLICY IF EXISTS "Service role full access on transactions" ON public.transactions;

CREATE POLICY "Service role full access on accounts" ON public.accounts
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on transactions" ON public.transactions
  FOR ALL USING (true) WITH CHECK (true);

-- Revoke direct access from public-facing roles
REVOKE ALL ON public.accounts FROM anon, authenticated;
REVOKE ALL ON public.transactions FROM anon, authenticated;


-- =============================================
-- 5. Atomic Transaction Creation Function
-- =============================================
CREATE OR REPLACE FUNCTION public.create_transaction(
  p_transaction_id UUID,
  p_account_id UUID,
  p_type VARCHAR(10),
  p_amount NUMERIC(15, 2),
  p_description TEXT,
  p_reference_id VARCHAR(255),
  p_created_at TIMESTAMPTZ,
  p_balance_change NUMERIC(15, 2)
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_current_balance NUMERIC(15, 2);
  v_new_balance NUMERIC(15, 2);
BEGIN
  -- Lock the account row for update (prevents race conditions)
  SELECT balance INTO v_current_balance
  FROM public.accounts
  WHERE id = p_account_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ACCOUNT_NOT_FOUND: Account % does not exist', p_account_id;
  END IF;

  -- Check for duplicate reference_id
  IF EXISTS (
    SELECT 1 FROM public.transactions
    WHERE account_id = p_account_id AND reference_id = p_reference_id
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_REFERENCE: Transaction with reference_id % already exists for account %', p_reference_id, p_account_id;
  END IF;

  -- Calculate new balance
  v_new_balance := v_current_balance + p_balance_change;

  -- Check for sufficient balance on debit
  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE: Account % has balance %, cannot apply change of %', p_account_id, v_current_balance, p_balance_change;
  END IF;

  -- Insert the transaction
  INSERT INTO public.transactions (id, account_id, type, amount, description, reference_id, created_at)
  VALUES (p_transaction_id, p_account_id, p_type, p_amount, p_description, p_reference_id, p_created_at);

  -- Update the account balance
  UPDATE public.accounts
  SET balance = v_new_balance
  WHERE id = p_account_id;

  -- Return the result
  RETURN json_build_object(
    'id', p_transaction_id,
    'account_id', p_account_id,
    'type', p_type,
    'amount', p_amount,
    'new_balance', v_new_balance
  );
END;
$$;


-- =============================================
-- 6. Atomic Transfer Function
-- =============================================
CREATE OR REPLACE FUNCTION public.transfer_funds(
  p_transfer_id UUID,
  p_source_account_id UUID,
  p_dest_account_id UUID,
  p_amount NUMERIC(15, 2),
  p_description TEXT,
  p_reference_id VARCHAR(255),
  p_source_transaction_id UUID,
  p_dest_transaction_id UUID,
  p_created_at TIMESTAMPTZ
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_source_balance NUMERIC(15, 2);
  v_dest_balance NUMERIC(15, 2);
BEGIN
  -- Lock both accounts in consistent order (by id) to prevent deadlocks
  IF p_source_account_id < p_dest_account_id THEN
    SELECT balance INTO v_source_balance FROM public.accounts WHERE id = p_source_account_id FOR UPDATE;
    SELECT balance INTO v_dest_balance FROM public.accounts WHERE id = p_dest_account_id FOR UPDATE;
  ELSE
    SELECT balance INTO v_dest_balance FROM public.accounts WHERE id = p_dest_account_id FOR UPDATE;
    SELECT balance INTO v_source_balance FROM public.accounts WHERE id = p_source_account_id FOR UPDATE;
  END IF;

  -- Verify accounts exist
  IF v_source_balance IS NULL THEN
    RAISE EXCEPTION 'ACCOUNT_NOT_FOUND: Source account % does not exist', p_source_account_id;
  END IF;
  IF v_dest_balance IS NULL THEN
    RAISE EXCEPTION 'ACCOUNT_NOT_FOUND: Destination account % does not exist', p_dest_account_id;
  END IF;

  -- Check sufficient balance
  IF v_source_balance < p_amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE: Source account % has balance %, cannot transfer %', p_source_account_id, v_source_balance, p_amount;
  END IF;

  -- Check for duplicate reference_id on either account
  IF EXISTS (
    SELECT 1 FROM public.transactions
    WHERE (account_id = p_source_account_id OR account_id = p_dest_account_id)
    AND reference_id = p_reference_id
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_REFERENCE: Transaction with reference_id % already exists', p_reference_id;
  END IF;

  -- Create debit transaction on source
  INSERT INTO public.transactions (id, account_id, type, amount, description, reference_id, created_at)
  VALUES (p_source_transaction_id, p_source_account_id, 'debit', p_amount, p_description, p_reference_id, p_created_at);

  -- Create credit transaction on destination
  INSERT INTO public.transactions (id, account_id, type, amount, description, reference_id, created_at)
  VALUES (p_dest_transaction_id, p_dest_account_id, 'credit', p_amount, p_description, p_reference_id, p_created_at);

  -- Update balances
  UPDATE public.accounts SET balance = balance - p_amount WHERE id = p_source_account_id;
  UPDATE public.accounts SET balance = balance + p_amount WHERE id = p_dest_account_id;

  RETURN json_build_object(
    'transfer_id', p_transfer_id,
    'source_new_balance', v_source_balance - p_amount,
    'dest_new_balance', v_dest_balance + p_amount
  );
END;
$$;

