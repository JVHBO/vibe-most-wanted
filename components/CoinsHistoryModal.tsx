'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { X, Filter } from 'lucide-react';
import { Z_INDEX } from '@/lib/z-index';
import { createPortal } from 'react-dom';

interface CoinsHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string;
}

type FilterType = 'all' | 'earn' | 'convert' | 'spend' | 'bonus';

export default function CoinsHistoryModal({ isOpen, onClose, address }: CoinsHistoryModalProps) {
  const [filter, setFilter] = useState<FilterType>('all');

  const transactions = useQuery(
    api.coinsInbox.getTransactionHistory,
    isOpen && address ? { address, limit: 100 } : 'skip'
  );

  if (!isOpen) return null;

  // SSR check
  if (typeof window === 'undefined') return null;

  const getTypeIcon = (type: string, source?: string) => {
    // Source-specific icons
    if (source === 'pve') return '⚔️';
    if (source === 'pvp') return '🎮';
    if (source === 'attack_win' || source === 'attack') return '🗡️';
    if (source === 'mission') return '🎯';
    if (source === 'daily_quest' || source === 'weekly_quest') return '📜';
    if (source === 'shame') return '🔔';
    if (source === 'boss') return '👹';
    if (source === 'leaderboard') return '🏆';
    if (source === 'blockchain') return '⛓️';

    // Type-based fallbacks
    switch (type) {
      case 'earn':
        return '💰';
      case 'claim':
        return '📥';
      case 'convert':
        return '🔄';
      case 'spend':
        return '💸';
      case 'bonus':
        return '🎁';
      case 'refund':
        return '↩️';
      default:
        return '📊';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'earn':
      case 'bonus':
        return 'text-green-400';
      case 'claim':
        return 'text-blue-400';
      case 'convert':
        return 'text-purple-400';
      case 'spend':
        return 'text-red-400';
      case 'refund':
        return 'text-orange-400';
      default:
        return 'text-gray-400';
    }
  };

  const getSourceLabel = (source?: string) => {
    if (!source) return '';
    const labels: Record<string, string> = {
      'pve': 'PvE Battle',
      'pvp': 'PvP Battle',
      'attack_win': 'Attack',
      'attack': 'Attack',
      'mission': 'Mission',
      'daily_quest': 'Daily Quest',
      'weekly_quest': 'Weekly Quest',
      'shame': 'Shame',
      'boss': 'Raid Boss',
      'leaderboard': 'Leaderboard',
      'blockchain': 'Blockchain',
      'inbox': 'Inbox',
    };
    return labels[source] || source;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;

    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  // Filter transactions
  const filteredTransactions = transactions?.filter((tx: any) => {
    if (filter === 'all') return true;
    if (filter === 'earn') return tx.type === 'earn' || tx.type === 'bonus';
    return tx.type === filter;
  });

  console.log('[CoinsHistoryModal] Rendering modal, isOpen:', isOpen);

  // Calculate stats
  const stats = transactions ? {
    totalEarned: transactions.filter((t: any) => t.type === 'earn' || t.type === 'bonus').reduce((sum: number, t: any) => sum + t.amount, 0),
    totalConverted: transactions.filter((t: any) => t.type === 'convert').reduce((sum: number, t: any) => sum + t.amount, 0),
    totalSpent: transactions.filter((t: any) => t.type === 'spend').reduce((sum: number, t: any) => sum + t.amount, 0),
  } : null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/90 p-2"
      style={{ zIndex: Z_INDEX.modalNested }}
      onClick={onClose}
    >
      <div
        className="bg-vintage-charcoal rounded-xl border border-vintage-gold/50 max-w-lg w-full max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-vintage-gold/30">
          <h2 className="text-lg font-bold text-vintage-gold">
            📊 Transaction History
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-vintage-gold/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-vintage-gold" />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 p-2 border-b border-vintage-gold/20 overflow-x-auto">
          {(['all', 'earn', 'convert', 'spend'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${
                filter === f
                  ? 'bg-vintage-gold text-vintage-deep-black'
                  : 'bg-vintage-black/50 text-vintage-gold/70 hover:bg-vintage-gold/20'
              }`}
            >
              {f === 'all' ? '🔄 All' : f === 'earn' ? '💰 Earned' : f === 'convert' ? '⛓️ Converted' : '💸 Spent'}
            </button>
          ))}
        </div>

        {/* Stats Bar */}
        {stats && (
          <div className="grid grid-cols-3 gap-2 p-2 bg-vintage-black/30 text-center text-xs">
            <div>
              <span className="text-vintage-ice/50">Earned</span>
              <p className="font-bold text-green-400">+{stats.totalEarned.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-vintage-ice/50">Converted</span>
              <p className="font-bold text-purple-400">{stats.totalConverted.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-vintage-ice/50">Spent</span>
              <p className="font-bold text-red-400">{stats.totalSpent.toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Transactions List */}
        <div className="flex-1 overflow-y-auto p-2">
          {!transactions ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-vintage-ice/50 text-sm">Loading history...</div>
            </div>
          ) : filteredTransactions?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="text-4xl mb-2">📭</div>
              <p className="text-vintage-ice/60 text-sm">No transactions</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {filteredTransactions?.map((tx: any) => (
                <div
                  key={tx._id}
                  className="bg-vintage-black/40 rounded-lg border border-vintage-gold/10 p-2.5 hover:border-vintage-gold/30 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    {/* Left: Icon + Info */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="text-xl flex-shrink-0">{getTypeIcon(tx.type, tx.source)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-vintage-ice text-sm font-medium truncate">
                          {tx.description}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-vintage-ice/50">
                          <span>{formatDate(tx.timestamp)}</span>
                          {tx.source && (
                            <span className="px-1.5 py-0.5 bg-vintage-gold/10 rounded text-vintage-gold/70">
                              {getSourceLabel(tx.source)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Amount */}
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-bold ${getTypeColor(tx.type)}`}>
                        {tx.type === 'earn' || tx.type === 'bonus' || tx.type === 'refund' ? '+' : tx.type === 'convert' ? '→' : '-'}
                        {tx.amount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {/* TX Hash link for blockchain transactions */}
                  {tx.txHash && (
                    <a
                      href={`https://basescan.org/tx/${tx.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 block text-xs text-purple-400 hover:text-purple-300 truncate"
                    >
                      🔗 {tx.txHash.slice(0, 10)}...{tx.txHash.slice(-8)}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-vintage-gold/20 text-center">
          <p className="text-xs text-vintage-ice/40">
            Showing {filteredTransactions?.length || 0} of {transactions?.length || 0} transactions
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
