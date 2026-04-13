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

  const preferredConnectorIds = [
    "baseAccount",
    "coinbaseWalletSDK",
    "metaMaskSDK",
    "walletConnect",
  ];

  const standardConnectors = preferredConnectorIds
    .map((id) => connectorById.get(id))
    .filter((connector): connector is Connector => !!connector);

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
          <div className="text-6xl mb-4 text-vintage-gold font-display">♠</div>
          <h2 className="text-2xl font-bold mb-4 text-vintage-gold">{t('connectTitle')}</h2>
          <p className="text-vintage-burnt-gold mb-6">{t('connectDescription')}</p>

          <div className="flex justify-center">
            {isInFarcaster && !isFrameMode ? (
              <button
                onClick={() => {
                  if (!farcasterConnector) {
                    toast.error('Farcaster connector not found. Please reload.');
                    return;
                  }
                  handleConnectorConnect(farcasterConnector, 'Farcaster Wallet');
                }}
                className="w-full px-6 py-4 bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black rounded-xl shadow-gold hover:shadow-gold-lg transition-all font-display font-semibold"
              >
                Connect Farcaster Wallet
              </button>
            ) : (
              <div className="w-full flex flex-col gap-3">
                {standardConnectors.length > 0 ? (
                  standardConnectors.map((connector) => (
                    <button
                      key={connector.uid}
                      onClick={() => handleConnectorConnect(connector)}
                      className="w-full px-6 py-4 bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black rounded-xl shadow-gold hover:shadow-gold-lg transition-all font-display font-semibold"
                    >
                      {connector.id === 'baseAccount' ? 'Continue with Base' : `Connect ${connector.name}`}
                    </button>
                  ))
                ) : (
                  <div className="w-full px-6 py-4 bg-vintage-gold/10 text-vintage-burnt-gold rounded-xl border border-vintage-gold/30 text-sm">
                    No compatible wallet connector is available.
                  </div>
                )}
                {farcasterConnector && (
                  <button
                    onClick={() => handleConnectorConnect(farcasterConnector, 'Farcaster Wallet')}
                    className="w-full px-6 py-3 bg-transparent hover:bg-vintage-gold/10 text-vintage-gold rounded-xl border border-vintage-gold/30 transition-all font-display font-semibold"
                  >
                    Connect Farcaster Wallet
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
