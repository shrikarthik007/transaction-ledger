import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  ArrowRightLeft,
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Filter,
  Wallet,
} from 'lucide-react';
import {
  getAccount,
  getTransactions,
  type Account,
  type Transaction,
  type PaginationInfo,
} from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';
import CreateTransactionModal from '../components/CreateTransactionModal';
import TransferModal from '../components/TransferModal';

export default function AccountDetail() {
  const { accountId } = useParams<{ accountId: string }>();
  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [txnLoading, setTxnLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('');
  const [page, setPage] = useState(1);
  const [showTxnModal, setShowTxnModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  const limit = 10;

  const fetchAccount = useCallback(async () => {
    if (!accountId) return;
    try {
      const data = await getAccount(accountId);
      setAccount(data);
    } catch {
      console.error('Failed to fetch account');
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  const fetchTransactions = useCallback(async () => {
    if (!accountId) return;
    setTxnLoading(true);
    try {
      const params: { type?: string; page: number; limit: number } = {
        page,
        limit,
      };
      if (filterType) params.type = filterType;
      const res = await getTransactions(accountId, params);
      setTransactions(res.data);
      setPagination(res.pagination);
    } catch {
      console.error('Failed to fetch transactions');
    } finally {
      setTxnLoading(false);
    }
  }, [accountId, page, filterType]);

  useEffect(() => {
    fetchAccount();
  }, [fetchAccount]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleRefresh = () => {
    fetchAccount();
    fetchTransactions();
  };

  const handleTransactionCreated = () => {
    fetchAccount();
    setPage(1);
    fetchTransactions();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="text-center py-20">
        <Wallet className="mx-auto h-12 w-12 text-gray-300" />
        <h3 className="mt-3 text-lg font-medium text-gray-900">
          Account not found
        </h3>
        <Link to="/" className="btn-primary mt-4 inline-flex">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumb */}
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      {/* Account Header */}
      <div className="card p-6 mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-bold text-xl">
              {account.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {account.name}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                ID: {account.id}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Current Balance</p>
            <p
              className={`text-3xl font-bold ${
                account.balance > 0 ? 'text-emerald-600' : 'text-gray-900'
              }`}
            >
              {formatCurrency(account.balance)}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-6 flex flex-wrap gap-3 border-t border-gray-100 pt-4">
          <button onClick={handleRefresh} className="btn-secondary">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowTransferModal(true)}
            className="btn-secondary"
          >
            <ArrowRightLeft className="h-4 w-4" />
            Transfer
          </button>
          <button
            onClick={() => setShowTxnModal(true)}
            className="btn-primary"
          >
            <Plus className="h-4 w-4" />
            New Transaction
          </button>
        </div>
      </div>

      {/* Transaction History */}
      <div className="card">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            Transaction History
          </h2>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">All Types</option>
              <option value="credit">Credit Only</option>
              <option value="debit">Debit Only</option>
            </select>
          </div>
        </div>

        {txnLoading && transactions.length === 0 ? (
          <div className="p-12 text-center">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin text-gray-400" />
            <p className="mt-3 text-sm text-gray-500">
              Loading transactions...
            </p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center">
            <ArrowRightLeft className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-3 text-sm font-medium text-gray-900">
              No transactions yet
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {filterType
                ? `No ${filterType} transactions found. Try a different filter.`
                : 'Create your first transaction to see it here.'}
            </p>
            {!filterType && (
              <button
                onClick={() => setShowTxnModal(true)}
                className="btn-primary mt-4"
              >
                <Plus className="h-4 w-4" />
                New Transaction
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Transaction List */}
            <div className="divide-y divide-gray-100">
              {transactions.map((txn) => (
                <div
                  key={txn.id}
                  className="flex items-center justify-between px-6 py-4"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${
                        txn.type === 'credit'
                          ? 'bg-emerald-100'
                          : 'bg-red-100'
                      }`}
                    >
                      {txn.type === 'credit' ? (
                        <ArrowDownCircle className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <ArrowUpCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">
                          {txn.description || (txn.type === 'credit' ? 'Credit' : 'Debit')}
                        </p>
                        <span
                          className={
                            txn.type === 'credit'
                              ? 'badge-credit'
                              : 'badge-debit'
                          }
                        >
                          {txn.type}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Ref: {txn.reference_id} · {formatDate(txn.created_at)}
                      </p>
                    </div>
                  </div>
                  <p
                    className={`text-sm font-semibold ${
                      txn.type === 'credit'
                        ? 'text-emerald-600'
                        : 'text-red-600'
                    }`}
                  >
                    {txn.type === 'credit' ? '+' : '-'}
                    {formatCurrency(txn.amount)}
                  </p>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.total_pages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
                <p className="text-sm text-gray-500">
                  Showing {(pagination.current_page - 1) * pagination.page_size + 1}
                  –
                  {Math.min(
                    pagination.current_page * pagination.page_size,
                    pagination.total_records
                  )}{' '}
                  of {pagination.total_records} transactions
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="btn-secondary !px-2.5 !py-1.5"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-gray-700 px-2">
                    Page {pagination.current_page} of {pagination.total_pages}
                  </span>
                  <button
                    onClick={() =>
                      setPage((p) =>
                        Math.min(pagination.total_pages, p + 1)
                      )
                    }
                    disabled={page >= pagination.total_pages}
                    className="btn-secondary !px-2.5 !py-1.5"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <CreateTransactionModal
        isOpen={showTxnModal}
        onClose={() => setShowTxnModal(false)}
        onCreated={handleTransactionCreated}
        accountId={account.id}
        accountName={account.name}
        currentBalance={account.balance}
      />
      <TransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        onTransferred={handleTransactionCreated}
        preselectedSourceId={account.id}
      />
    </div>
  );
}

