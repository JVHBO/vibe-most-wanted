"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useConnect } from "wagmi";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { AudioManager } from "@/lib/audio-manager";
import { devLog, devError } from "@/lib/utils/logger";

interface ConnectScreenProps {
  isCheckingFarcaster: boolean;
  setIsCheckingFarcaster: (v: boolean) => void;
  isInFarcaster: boolean;
  isFrameMode: boolean;
  soundEnabled: boolean;
}

export function ConnectScreen({
  isCheckingFarcaster,
  setIsCheckingFarcaster,
  isInFarcaster,
  isFrameMode,
  soundEnabled,
}: ConnectScreenProps) {
  const { t } = useLanguage();
  const { connect, connectors } = useConnect();

  const handleFarcasterConnect = async () => {
    try {
      if (soundEnabled) AudioManager.buttonClick();
      setIsCheckingFarcaster(true);

      console.log('[Connect Button] 🔍 Available connectors:', connectors.map(c => ({ id: c.id, name: c.name })));

      const farcasterConnector = connectors.find((c) =>
        c.id === 'farcasterMiniApp' ||
        c.id === 'farcaster' ||
        c.name?.toLowerCase().includes('farcaster')
      );

      if (!farcasterConnector) {
        console.error('[Connect Button] ❌ Available connector IDs:', connectors.map(c => c.id));
        throw new Error('Farcaster connector not found. Available: ' + connectors.map(c => c.id).join(', '));
      }

      console.log('[Connect Button] ✅ Found connector:', farcasterConnector.id);

      await connect({ connector: farcasterConnector });
      devLog('✓ Connected Farcaster wallet via wagmi');
    } catch (err: any) {
      devError('Failed to connect Farcaster wallet:', err);
      if (soundEnabled) AudioManager.buttonError();

      if (err?.message?.includes('not been authorized')) {
        toast.error('Por favor, autorize o acesso à carteira nas configurações do Farcaster');
      } else {
        toast.error('Failed to connect Farcaster wallet. Please try again.');
      }
    } finally {
      setIsCheckingFarcaster(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-20">
      {isCheckingFarcaster ? (
        <div className="bg-vintage-charcoal backdrop-blur-lg p-8 rounded-2xl border-2 border-vintage-gold max-w-md text-center">
          <div className="text-6xl mb-4 text-vintage-gold font-display animate-pulse">♠</div>
          <div className="w-full px-6 py-4 bg-vintage-gold/20 text-vintage-gold rounded-xl border-2 border-vintage-gold/50 font-display font-semibold">
            {t('loading')}...
          </div>
        </div>
      ) : (
        <div className="bg-vintage-charcoal backdrop-blur-lg p-8 rounded-2xl border-2 border-vintage-gold max-w-md text-center">
          <div className="text-6xl mb-4 text-vintage-gold font-display">♠</div>
          <h2 className="text-2xl font-bold mb-4 text-vintage-gold">{t('connectTitle')}</h2>
          <p className="text-vintage-burnt-gold mb-6">{t('connectDescription')}</p>

          <div className="flex justify-center">
            {isInFarcaster && !isFrameMode ? (
              <button
                onClick={handleFarcasterConnect}
                className="w-full px-6 py-4 bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black rounded-xl shadow-gold hover:shadow-gold-lg transition-all font-display font-semibold"
              >
                Connect Farcaster Wallet
              </button>
            ) : (
              <ConnectButton.Custom>
                {({ account, chain, openConnectModal, mounted }) => (
                  <div
                    {...(!mounted && {
                      'aria-hidden': true,
                      style: { opacity: 0, pointerEvents: 'none', userSelect: 'none' },
                    })}
                  >
                    {(!mounted || !account || !chain) && (
                      <button
                        onClick={openConnectModal}
                        className="w-full px-6 py-4 bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black rounded-xl shadow-gold hover:shadow-gold-lg transition-all font-display font-semibold"
                      >
                        {t('connectWallet')}
                      </button>
                    )}
                  </div>
                )}
              </ConnectButton.Custom>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
