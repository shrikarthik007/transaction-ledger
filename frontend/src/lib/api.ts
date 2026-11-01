const API_BASE = '/api';

export interface Account {
  id: string;
  name: string;
  balance: number;
  created_at: string;
}

export interface Transaction {
  id: string;
  account_id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  reference_id: string;
  created_at: string;
}

export interface PaginationInfo {
  current_page: number;
  page_size: number;
  total_records: number;
  total_pages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
  pagination?: PaginationInfo;
}

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

async function request<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const json = await res.json();

  if (!res.ok) {
    throw json;
  }

  return json;
}

// ==================== Accounts ====================

export async function getAccounts(): Promise<Account[]> {
  const res = await request<Account[]>('/accounts');
  return res.data;
}

export async function getAccount(id: string): Promise<Account> {
  const res = await request<Account>(`/accounts/${id}`);
  return res.data;
}

export async function getAccountBalance(
  id: string
): Promise<{ account_id: string; balance: number; name: string }> {
  const res = await request<{ account_id: string; balance: number; name: string }>(
    `/accounts/${id}/balance`
  );
  return res.data;
}

export async function createAccount(name: string): Promise<Account> {
  const res = await request<Account>('/accounts', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  return res.data;
}

// ==================== Transactions ====================

export async function getTransactions(
  accountId: string,
  params?: { type?: string; page?: number; limit?: number }
): Promise<{ data: Transaction[]; pagination: PaginationInfo }> {
  const searchParams = new URLSearchParams();
  if (params?.type) searchParams.set('type', params.type);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));

  const qs = searchParams.toString();
  const res = await request<Transaction[]>(
    `/accounts/${accountId}/transactions${qs ? `?${qs}` : ''}`
  );
  return { data: res.data, pagination: res.pagination! };
}

export async function createTransaction(
  accountId: string,
  data: {
    type: 'credit' | 'debit';
    amount: number;
    description?: string;
    reference_id: string;
  }
): Promise<Transaction> {
  const res = await request<Transaction>(
    `/accounts/${accountId}/transactions`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  );
  return res.data;
}

// ==================== Transfers ====================

export async function transferFunds(data: {
  source_account_id: string;
  destination_account_id: string;
  amount: number;
  description?: string;
  reference_id: string;
}): Promise<TransferResult> {
  const res = await request<TransferResult>('/transfers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

