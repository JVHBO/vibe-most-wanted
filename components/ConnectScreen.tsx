"use client";

import type { Connector } from "wagmi";
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
  const farcasterConnector = connectors.find((c) =>
    c.id === 'farcasterMiniApp' ||
    c.id === 'farcaster' ||
    c.name?.toLowerCase().includes('farcaster')
  );
  const connectorById = new Map<string, Connector>();
  for (const connector of connectors) {
    if (connector.id === farcasterConnector?.id) continue;
    if (!connectorById.has(connector.id)) {
      connectorById.set(connector.id, connector);
    }
  }

  const baseConnector = connectors.find(c => c.id === 'baseAccount' || c.id === 'base');
  const metamaskConnector = connectors.find(c => c.id === 'io.metamask' || c.id === 'metaMask' || c.id === 'injected');

  const handleConnectorConnect = async (connector: Connector, label = connector.name) => {
    try {
      if (soundEnabled) AudioManager.buttonClick();
      setIsCheckingFarcaster(true);

      await connect({ connector });
      devLog(`✓ Connected wallet via ${connector.id}`);
    } catch (err: any) {
      devError(`Failed to connect ${connector.id}:`, err);
      if (soundEnabled) AudioManager.buttonError();

      if (err?.message?.includes('not been authorized')) {
        toast.error('Por favor, autorize o acesso à carteira nas configurações do Farcaster');
      } else {
        toast.error(`Failed to connect ${label}. Please try again.`);
      }
    } finally {
      setIsCheckingFarcaster(false);
    }
  };

  return (
    <div className="w-full max-w-[420px] mx-auto">
      {isCheckingFarcaster ? (
        <div className="bg-vintage-charcoal backdrop-blur-lg p-8 rounded-2xl border-2 border-vintage-gold text-center w-full shadow-gold">
          <div className="text-6xl mb-4 text-vintage-gold font-display animate-pulse">♠</div>
          <div className="w-full px-6 py-4 bg-vintage-gold/20 text-vintage-gold rounded-xl border-2 border-vintage-gold/50 font-display font-semibold">
            {t('loading')}...
          </div>
        </div>
      ) : (
        <div className="bg-vintage-charcoal backdrop-blur-lg p-8 rounded-2xl border-2 border-vintage-gold text-center w-full shadow-gold">
          <div className="text-6xl mb-6 text-vintage-gold font-display">♠</div>
          <h2 className="text-2xl font-bold mb-6 text-vintage-gold">{t('connectTitle')}</h2>

          <div className="flex justify-center">
            <div className="w-full flex flex-col gap-3">
              {baseConnector && (
                <button
                  onClick={() => handleConnectorConnect(baseConnector)}
                  className="w-full px-6 py-4 bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black rounded-xl shadow-gold hover:shadow-gold-lg transition-all font-display font-semibold"
                >
                  Continue with Base
                </button>
              )}
              {metamaskConnector && (
                <button
                  onClick={() => handleConnectorConnect(metamaskConnector)}
                  className="w-full px-6 py-4 bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black rounded-xl shadow-gold hover:shadow-gold-lg transition-all font-display font-semibold"
                >
                  Continue with MetaMask
                </button>
              )}
              {farcasterConnector && (
                <button
                  onClick={() => handleConnectorConnect(farcasterConnector)}
                  className="w-full px-6 py-4 bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black rounded-xl shadow-gold hover:shadow-gold-lg transition-all font-display font-semibold"
                >
                  Continue with Farcaster
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
