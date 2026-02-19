'use client';

import { useState, useEffect } from 'react';
import { useAccount, useBalance } from 'wagmi';
import {
  useMintPrice,
  useBuyVBMS,
  useSellVBMS,
  useQuoteSellVBMS,
  useVBMSBalance,
} from '@/lib/hooks/useVBMSDex';
import { AudioManager } from '@/lib/fid/audio-manager';

interface VibeDexModalProps {
  onClose: () => void;
}

const BUY_FEE = 0.0375;
const QUICK_PACKS = [1, 2, 5, 10];
const QUICK_SELL = [
  { label: '100k', value: '100000' },
  { label: '500k', value: '500000' },
  { label: '1M', value: '1000000' },
];

function XIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

function StatusBar({ step, error }: { step: string; error?: string | null }) {
  if (!step || step === 'idle') return null;
  const isOk = step === 'complete';
  const isErr = step === 'error';
  const msg: Record<string, string> = {
    minting: 'Minting pack...',
    waiting_mint: 'Waiting confirmation...',
    selling: 'Converting to VBMS...',
    waiting_sell: 'Waiting conversion...',
    complete: 'Done!',
    error: error || 'Transaction failed',
  };
  return (
    <div className={`p-2 border-2 border-black text-xs font-bold text-center rounded-sm ${isOk ? 'bg-green-500/20 text-green-400' : isErr ? 'bg-red-500/20 text-red-400' : 'bg-[#2C2C2C] text-[#FFD400] animate-pulse'}`}>
      {msg[step] || step}
    </div>
  );
}

export function VibeDexModal({ onClose }: VibeDexModalProps) {
  const { address, isConnected } = useAccount();
  const { data: ethBalance } = useBalance({ address });
  const { balance: vbmsBalance, refetch: refetchVBMS } = useVBMSBalance(address);

  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [packCount, setPackCount] = useState(1);
  const [sellAmount, setSellAmount] = useState('');

  const { priceWei, priceEth, isLoading: priceLoading, refetch: refetchPrice } = useMintPrice(packCount);
  const { buyVBMS, step: buyStep, error: buyError, isLoading: buyLoading, reset: resetBuy } = useBuyVBMS();
  const { sellVBMS, step: sellStep, error: sellError, isLoading: sellLoading, reset: resetSell } = useSellVBMS();
  const sellQuote = useQuoteSellVBMS(mode === 'sell' ? sellAmount : '0');

  const estimatedVBMS = Math.floor(packCount * 100000 * (1 - BUY_FEE));
  const hasEnoughEth = ethBalance && priceWei ? BigInt(ethBalance.value) >= priceWei : false;
  const isLoading = mode === 'buy' ? buyLoading : sellLoading;
  const currentStep = mode === 'buy' ? buyStep : sellStep;
  const currentError = mode === 'buy' ? buyError : sellError;

  useEffect(() => {
    if (buyStep === 'complete' || sellStep === 'complete') {
      refetchPrice();
      refetchVBMS();
    }
  }, [buyStep, sellStep, refetchPrice, refetchVBMS]);

  const handleBuy = async () => {
    if (!priceWei || packCount < 1) return;
    AudioManager.buttonClick();
    try { await buyVBMS(packCount, priceWei); } catch {}
  };

  const handleSell = async () => {
    if (!sellAmount || parseFloat(sellAmount) <= 0) return;
    AudioManager.buttonClick();
    try { await sellVBMS(sellAmount); } catch {}
  };

  return (
    <div
      className="fixed inset-0 z-[600] flex items-end sm:items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <div
        className="bg-[#1E1E1E] border-4 border-black shadow-[6px_6px_0px_#000] w-full max-w-sm mx-0 sm:mx-4 rounded-t-sm sm:rounded-sm"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b-4 border-black bg-[#FFD400]">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
            <span className="font-black text-black text-sm tracking-widest uppercase">VBMS DEX</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center bg-black text-white border-2 border-black shadow-[2px_2px_0px_#555] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none rounded-sm"
          >
            <XIcon />
          </button>
        </div>

        {/* Balance row */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#2A2A2A] border-b-2 border-black text-xs">
          <span className="text-gray-400">ETH: <span className="text-white font-bold">{parseFloat(ethBalance?.formatted || '0').toFixed(4)}</span></span>
          <span className="text-gray-400">VBMS: <span className="text-[#FFD400] font-bold">{parseFloat(vbmsBalance || '0').toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
        </div>

        {/* Mode tabs */}
        <div className="flex border-b-4 border-black">
          <button
            onClick={() => { setMode('buy'); resetBuy(); }}
            className={`flex-1 py-2.5 font-black text-sm uppercase tracking-wider border-r-2 border-black transition-none ${mode === 'buy' ? 'bg-[#00AA44] text-white' : 'bg-[#1E1E1E] text-gray-500 hover:text-white'}`}
          >
            Buy
          </button>
          <button
            onClick={() => { setMode('sell'); resetSell(); setSellAmount(''); }}
            className={`flex-1 py-2.5 font-black text-sm uppercase tracking-wider transition-none ${mode === 'sell' ? 'bg-[#CC2222] text-white' : 'bg-[#1E1E1E] text-gray-500 hover:text-white'}`}
          >
            Sell
          </button>
        </div>

        <div className="p-4 space-y-3">
          {mode === 'buy' ? (
            <>
              {/* Pack counter */}
              <div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPackCount(Math.max(1, packCount - 1))}
                    disabled={isLoading || packCount <= 1}
                    className="w-11 h-11 bg-[#2C2C2C] border-2 border-black shadow-[2px_2px_0px_#000] text-white font-black text-2xl flex items-center justify-center hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none disabled:opacity-40 rounded-sm"
                  >−</button>
                  <div className="flex-1 bg-[#2C2C2C] border-2 border-black text-center py-2 font-black text-2xl text-white rounded-sm">
                    {packCount}
                  </div>
                  <button
                    onClick={() => setPackCount(packCount + 1)}
                    disabled={isLoading}
                    className="w-11 h-11 bg-[#2C2C2C] border-2 border-black shadow-[2px_2px_0px_#000] text-white font-black text-2xl flex items-center justify-center hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none disabled:opacity-40 rounded-sm"
                  >+</button>
                </div>
                <div className="flex gap-1.5 mt-2">
                  {QUICK_PACKS.map(n => (
                    <button
                      key={n}
                      onClick={() => setPackCount(n)}
                      className={`flex-1 py-1.5 text-xs font-black border-2 border-black rounded-sm transition-none ${packCount === n ? 'bg-[#FFD400] text-black' : 'bg-[#2C2C2C] text-white shadow-[2px_2px_0px_#000]'}`}
                    >{n}x</button>
                  ))}
                </div>
              </div>

              {/* Price summary */}
              <div className="bg-[#2C2C2C] border-2 border-black rounded-sm p-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">You pay</span>
                  <span className="text-white font-bold">{priceLoading ? '...' : priceEth} ETH</span>
                </div>
                <div className="h-px bg-black" />
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">You receive</span>
                  <span className="text-[#FFD400] font-bold">~{estimatedVBMS.toLocaleString()} VBMS</span>
                </div>
                {!hasEnoughEth && isConnected && (
                  <p className="text-red-400 text-xs pt-0.5">Insufficient ETH balance</p>
                )}
              </div>

              <StatusBar step={currentStep} error={currentError} />

              {!isConnected ? (
                <p className="text-center text-gray-500 text-xs py-1">Connect wallet to trade</p>
              ) : (
                <button
                  onClick={handleBuy}
                  disabled={isLoading || !priceWei || !hasEnoughEth || currentStep === 'complete'}
                  className="w-full py-3 bg-[#FFD400] text-black font-black text-sm uppercase tracking-widest border-4 border-black shadow-[4px_4px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none rounded-sm transition-none"
                >
                  {isLoading ? 'Processing...' : currentStep === 'complete' ? 'Done!' : `Buy ${estimatedVBMS.toLocaleString()} VBMS`}
                </button>
              )}
            </>
          ) : (
            <>
              {/* Sell input */}
              <div>
                <div className="flex justify-between mb-2">
                  <p className="text-gray-400 text-[10px] uppercase tracking-widest">VBMS to sell</p>
                  <button
                    onClick={() => setSellAmount(Math.floor(parseFloat(vbmsBalance || '0')).toString())}
                    className="text-[#FFD400] text-xs font-bold hover:underline"
                  >MAX</button>
                </div>
                <input
                  type="number"
                  value={sellAmount}
                  onChange={e => setSellAmount(e.target.value)}
                  placeholder="0"
                  disabled={isLoading}
                  className="w-full bg-[#2C2C2C] border-2 border-black text-white font-bold text-xl p-2.5 outline-none focus:border-[#FFD400] rounded-sm"
                />
                <div className="flex gap-1.5 mt-2">
                  {QUICK_SELL.map(({ label, value }) => (
                    <button
                      key={value}
                      onClick={() => setSellAmount(value)}
                      className="flex-1 py-1.5 text-xs font-black bg-[#2C2C2C] border-2 border-black shadow-[2px_2px_0px_#000] text-white rounded-sm hover:bg-[#333] transition-none"
                    >{label}</button>
                  ))}
                </div>
              </div>

              {sellAmount && parseFloat(sellAmount) > 0 && (
                <div className="bg-[#2C2C2C] border-2 border-black rounded-sm p-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">You receive</span>
                    <span className="text-white font-bold">
                      {sellQuote.isLoading ? '...' : parseFloat(sellQuote.estimatedEth).toFixed(6)} ETH
                    </span>
                  </div>
                </div>
              )}

              <StatusBar step={currentStep} error={currentError} />

              {!isConnected ? (
                <p className="text-center text-gray-500 text-xs py-1">Connect wallet to trade</p>
              ) : (
                <button
                  onClick={handleSell}
                  disabled={isLoading || !sellAmount || parseFloat(sellAmount || '0') <= 0 || currentStep === 'complete'}
                  className="w-full py-3 bg-[#CC2222] text-white font-black text-sm uppercase tracking-widest border-4 border-black shadow-[4px_4px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none rounded-sm transition-none"
                >
                  {isLoading ? 'Processing...' : currentStep === 'complete' ? 'Done!' : 'Sell VBMS'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
