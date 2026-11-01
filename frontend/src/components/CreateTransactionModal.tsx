import { useState } from 'react';
import { X, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { createTransaction } from '../lib/api';
import { toast } from 'sonner';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  accountId: string;
  accountName: string;
  currentBalance: number;
}

export default function CreateTransactionModal({
  isOpen,
  onClose,
  onCreated,
  accountId,
  accountName,
  currentBalance,
}: Props) {
  const [type, setType] = useState<'credit' | 'debit'>('credit');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }
    if (!referenceId.trim()) {
      toast.error('Reference ID is required');
      return;
    }

    setLoading(true);
    try {
      await createTransaction(accountId, {
        type,
        amount: numAmount,
        description: description.trim(),
        reference_id: referenceId.trim(),
      });
      toast.success(
        `${type === 'credit' ? 'Credit' : 'Debit'} of ₹${numAmount.toFixed(2)} successful!`
      );
      setAmount('');
      setDescription('');
      setReferenceId('');
      onCreated();
      onClose();
    } catch (err: unknown) {
      const error = err as { error?: { message?: string } };
      toast.error(error?.error?.message || 'Failed to create transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative card w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold text-gray-900">New Transaction</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Account: <span className="font-medium text-gray-700">{accountName}</span> · Balance: ₹{currentBalance.toFixed(2)}
        </p>

        <form onSubmit={handleSubmit}>
          {/* Type selector */}
          <div className="mb-4">
            <label className="label">Transaction Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('credit')}
                className={`flex items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                  type === 'credit'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <ArrowDownCircle className="h-5 w-5" />
                Credit
              </button>
              <button
                type="button"
                onClick={() => setType('debit')}
                className={`flex items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                  type === 'debit'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <ArrowUpCircle className="h-5 w-5" />
                Debit
              </button>
            </div>
          </div>

          {/* Amount */}
          <div className="mb-4">
            <label htmlFor="txn-amount" className="label">
              Amount (₹)
            </label>
            <input
              id="txn-amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="input"
              required
            />
          </div>

          {/* Reference ID */}
          <div className="mb-4">
            <label htmlFor="txn-ref" className="label">
              Reference ID
            </label>
            <input
              id="txn-ref"
              type="text"
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
              placeholder="e.g. TXN-001, INV-2024-001"
              className="input"
              required
            />
          </div>

          {/* Description */}
          <div className="mb-6">
            <label htmlFor="txn-desc" className="label">
              Description <span className="text-gray-400">(optional)</span>
            </label>
            <input
              id="txn-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Salary payment, Office supplies"
              className="input"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !amount || !referenceId.trim()}
              className={type === 'credit' ? 'btn-primary' : 'btn-danger'}
            >
              {loading
                ? 'Processing...'
                : `${type === 'credit' ? 'Credit' : 'Debit'} ₹${amount || '0.00'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

