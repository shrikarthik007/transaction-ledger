import { useState, useEffect } from 'react';
import { X, ArrowRightLeft } from 'lucide-react';
import { getAccounts, transferFunds, type Account } from '../lib/api';
import { toast } from 'sonner';
import { formatCurrency } from '../lib/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onTransferred: () => void;
  preselectedSourceId?: string;
}

export default function TransferModal({
  isOpen,
  onClose,
  onTransferred,
  preselectedSourceId,
}: Props) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [sourceId, setSourceId] = useState(preselectedSourceId || '');
  const [destId, setDestId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getAccounts().then(setAccounts).catch(() => {});
      if (preselectedSourceId) setSourceId(preselectedSourceId);
    }
  }, [isOpen, preselectedSourceId]);

  if (!isOpen) return null;

  const sourceAccount = accounts.find((a) => a.id === sourceId);
  const destAccount = accounts.find((a) => a.id === destId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }
    if (!sourceId || !destId) {
      toast.error('Please select both accounts');
      return;
    }
    if (sourceId === destId) {
      toast.error('Source and destination must be different');
      return;
    }
    if (!referenceId.trim()) {
      toast.error('Reference ID is required');
      return;
    }

    setLoading(true);
    try {
      await transferFunds({
        source_account_id: sourceId,
        destination_account_id: destId,
        amount: numAmount,
        description: description.trim(),
        reference_id: referenceId.trim(),
      });
      toast.success(
        `Successfully transferred ${formatCurrency(numAmount)} from ${sourceAccount?.name} to ${destAccount?.name}`
      );
      setAmount('');
      setDescription('');
      setReferenceId('');
      onTransferred();
      onClose();
    } catch (err: unknown) {
      const error = err as { error?: { message?: string } };
      toast.error(error?.error?.message || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative card w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">Transfer Money</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Source Account */}
          <div className="mb-4">
            <label htmlFor="source-account" className="label">
              From Account
            </label>
            <select
              id="source-account"
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              className="input"
              required
            >
              <option value="">Select source account</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({formatCurrency(acc.balance)})
                </option>
              ))}
            </select>
          </div>

          {/* Destination Account */}
          <div className="mb-4">
            <label htmlFor="dest-account" className="label">
              To Account
            </label>
            <select
              id="dest-account"
              value={destId}
              onChange={(e) => setDestId(e.target.value)}
              className="input"
              required
            >
              <option value="">Select destination account</option>
              {accounts
                .filter((a) => a.id !== sourceId)
                .map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatCurrency(acc.balance)})
                  </option>
                ))}
            </select>
          </div>

          {/* Amount */}
          <div className="mb-4">
            <label htmlFor="transfer-amount" className="label">
              Amount (₹)
            </label>
            <input
              id="transfer-amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="input"
              required
            />
            {sourceAccount && (
              <p className="mt-1 text-xs text-gray-500">
                Available: {formatCurrency(sourceAccount.balance)}
              </p>
            )}
          </div>

          {/* Reference ID */}
          <div className="mb-4">
            <label htmlFor="transfer-ref" className="label">
              Reference ID
            </label>
            <input
              id="transfer-ref"
              type="text"
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
              placeholder="e.g. TRF-001"
              className="input"
              required
            />
          </div>

          {/* Description */}
          <div className="mb-6">
            <label htmlFor="transfer-desc" className="label">
              Description <span className="text-gray-400">(optional)</span>
            </label>
            <input
              id="transfer-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Payment for services"
              className="input"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !sourceId || !destId || !amount || !referenceId.trim()}
              className="btn-primary"
            >
              {loading ? 'Transferring...' : `Transfer ₹${amount || '0.00'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

