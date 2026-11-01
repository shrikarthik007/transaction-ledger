import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  ArrowRightLeft,
  Wallet,
  TrendingUp,
  Users,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import { getAccounts, type Account } from '../lib/api';
import { formatCurrency, formatRelativeTime } from '../lib/utils';
import CreateAccountModal from '../components/CreateAccountModal';
import TransferModal from '../components/TransferModal';

export default function Dashboard() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAccounts();
      setAccounts(data);
    } catch {
      console.error('Failed to fetch accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const totalAccounts = accounts.length;

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage accounts and transactions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchAccounts}
            className="btn-secondary"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowTransferModal(true)}
            className="btn-secondary"
            disabled={accounts.length < 2}
          >
            <ArrowRightLeft className="h-4 w-4" />
            Transfer
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            <Plus className="h-4 w-4" />
            New Account
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
              <Wallet className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Balance</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(totalBalance)}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
              <Users className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Accounts</p>
              <p className="text-xl font-bold text-gray-900">{totalAccounts}</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100">
              <TrendingUp className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg Balance</p>
              <p className="text-xl font-bold text-gray-900">
                {totalAccounts > 0
                  ? formatCurrency(totalBalance / totalAccounts)
                  : '₹0.00'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Accounts List */}
      <div className="card">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Accounts</h2>
        </div>

        {loading && accounts.length === 0 ? (
          <div className="p-12 text-center">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin text-gray-400" />
            <p className="mt-3 text-sm text-gray-500">Loading accounts...</p>
          </div>
        ) : accounts.length === 0 ? (
          <div className="p-12 text-center">
            <Wallet className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-3 text-sm font-medium text-gray-900">
              No accounts yet
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Create your first account to get started.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary mt-4"
            >
              <Plus className="h-4 w-4" />
              Create Account
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {accounts.map((account) => (
              <Link
                key={account.id}
                to={`/accounts/${account.id}`}
                className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-gray-50 group"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-semibold text-sm">
                    {account.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {account.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      Created {formatRelativeTime(account.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p
                      className={`text-sm font-semibold ${
                        account.balance > 0
                          ? 'text-emerald-600'
                          : 'text-gray-900'
                      }`}
                    >
                      {formatCurrency(account.balance)}
                    </p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateAccountModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={fetchAccounts}
      />
      <TransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        onTransferred={fetchAccounts}
      />
    </div>
  );
}

