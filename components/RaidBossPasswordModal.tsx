'use client';

import { useState } from 'react';

interface RaidBossPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  soundEnabled: boolean;
}

export function RaidBossPasswordModal({
  isOpen,
  onClose,
  onSuccess,
  soundEnabled,
}: RaidBossPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (password === 'vibe2025') {
      onSuccess();
      setPassword('');
      setError('');
    } else {
      setError('❌ Invalid password');
      setPassword('');
    }
  };

  const handleClose = () => {
    setPassword('');
    setError('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/95 flex items-center justify-center z-[300] p-4"
      onClick={handleClose}
    >
      <div
        className="bg-vintage-charcoal rounded-2xl border-4 border-red-500/50 max-w-md w-full p-6 shadow-neon"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-display font-bold text-center mb-4 text-red-400">
          💀 BOSS RAID ACCESS 💀
        </h2>

        <p className="text-vintage-burnt-gold text-center mb-6 text-sm">
          Enter the password to access the Boss Raid mode
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="Enter password..."
              autoFocus
              className="w-full px-4 py-3 bg-vintage-black/50 text-vintage-gold border-2 border-vintage-gold/30 rounded-xl font-modern focus:outline-none focus:border-red-500/50 placeholder-vintage-gold/30"
            />
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-500 rounded-lg p-3 text-sm text-red-200 text-center">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-6 py-3 bg-vintage-black hover:bg-vintage-gold/10 text-vintage-gold border border-vintage-gold/50 rounded-xl font-modern font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!password}
              className={`flex-1 px-6 py-3 rounded-xl font-display font-bold transition-all uppercase ${
                password
                  ? 'bg-gradient-to-r from-red-900 to-purple-900 hover:from-red-800 hover:to-purple-800 text-red-200 shadow-neon hover:scale-105 border-2 border-red-500/50'
                  : 'bg-vintage-black/50 text-vintage-gold/40 cursor-not-allowed border border-vintage-gold/20'
              }`}
            >
              Enter
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
