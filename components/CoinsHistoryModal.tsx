'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { X } from 'lucide-react';
import { Z_INDEX } from '@/lib/z-index';

interface CoinsHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string;
}

export default function CoinsHistoryModal({ isOpen, onClose, address }: CoinsHistoryModalProps) {
  const transactions = useQuery(
    api.coinsInbox.getTransactionHistory,
    isOpen && address ? { address } : 'skip'
  );

  if (!isOpen) return null;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'earn':
        return '💰';
      case 'claim':
        return '📥';
      case 'convert':
        return '🔄';
      case 'spend':
        return '💸';
      default:
        return '📊';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'earn':
        return 'text-green-400';
      case 'claim':
        return 'text-blue-400';
      case 'convert':
        return 'text-purple-400';
      case 'spend':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}m atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;

    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/80 p-4"
      style={{ zIndex: Z_INDEX.modalNested }}
    >
      <div className="bg-vintage-charcoal rounded-xl border-2 border-vintage-gold/50 max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-vintage-gold/30">
          <h2 className="text-2xl font-bold text-vintage-gold">
            📊 Histórico de Transações
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-vintage-gold/10 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-vintage-gold" />
          </button>
        </div>

        {/* Transactions List */}
        <div className="flex-1 overflow-y-auto p-6">
          {!transactions ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-vintage-ice/50">Carregando histórico...</div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-6xl mb-4">📭</div>
              <div className="text-vintage-ice/70 text-center">
                <p className="font-bold mb-2">Nenhuma transação ainda</p>
                <p className="text-sm">Comece jogando para ganhar coins!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx: any) => (
                <div
                  key={tx._id}
                  className="bg-vintage-black/50 rounded-lg border border-vintage-gold/20 p-4 hover:border-vintage-gold/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Icon + Info */}
                    <div className="flex items-start gap-3 flex-1">
                      <div className="text-3xl mt-1">{getTypeIcon(tx.type)}</div>
                      <div className="flex-1">
                        <p className="text-vintage-ice font-semibold mb-1">
                          {tx.description}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-vintage-ice/60">
                          <span>{formatDate(tx.timestamp)}</span>
                          {tx.source && (
                            <>
                              <span>•</span>
                              <span className="capitalize">{tx.source}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Amount */}
                    <div className="text-right">
                      <p className={`text-lg font-bold ${getTypeColor(tx.type)}`}>
                        {tx.type === 'earn' || tx.type === 'claim' ? '+' : '-'}
                        {tx.amount.toLocaleString()}
                      </p>
                      <p className="text-xs text-vintage-ice/50 mt-1">
                        Saldo: {tx.balanceAfter.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Stats */}
        {transactions && transactions.length > 0 && (
          <div className="p-6 border-t border-vintage-gold/30 bg-vintage-black/30">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-vintage-ice/60 mb-1">Total Ganho</p>
                <p className="text-lg font-bold text-green-400">
                  +{transactions
                    .filter((t: any) => t.type === 'earn')
                    .reduce((sum: number, t: any) => sum + t.amount, 0)
                    .toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-vintage-ice/60 mb-1">Total Claimado</p>
                <p className="text-lg font-bold text-blue-400">
                  {transactions
                    .filter((t: any) => t.type === 'claim')
                    .reduce((sum: number, t: any) => sum + t.amount, 0)
                    .toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-vintage-ice/60 mb-1">Transações</p>
                <p className="text-lg font-bold text-vintage-gold">
                  {transactions.length}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
