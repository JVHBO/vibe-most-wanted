'use client';

import { useState, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from "@/lib/fid/convex-generated/api";
import { Id } from "@/lib/fid/convex-generated/dataModel";
import { useAccount, useWaitForTransactionReceipt } from 'wagmi';
import { sdk } from '@farcaster/miniapp-sdk';
import { useTransferVBMS } from "@/hooks/fid/useVBMSContracts";
import { CONTRACTS } from "@/lib/fid/contracts";
import { parseEther } from 'viem';
import { useWriteContractWithAttribution, dataSuffix, BUILDER_CODE } from "@/hooks/fid/useWriteContractWithAttribution";
import haptics from "@/lib/fid/haptics";
import { openMarketplace } from "@/lib/fid/marketplace-utils";

// ERC-721 ABI for safeTransferFrom
const ERC721_ABI = [
  {
    name: 'safeTransferFrom',
    type: 'function',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

interface NFTItem {
  tokenId: string;
  name: string;
  imageUrl: string;
  rarity?: string;
  collectionId: string;
  collectionName: string;
  contractAddress: string;
}

interface CollectionInfo {
  id: string;
  name: string;
  count: number;
}

interface NFTGiftModalProps {
  onClose: () => void;
  onComplete: () => void; // Called after everything is done
  recipientFid: number;
  recipientAddress: string;
  recipientUsername: string;
  senderFid: number;
  senderAddress: string;
  // VibeMail data
  message: string;
  audioId?: string;
  imageId?: string;
  isPaidVibeMail: boolean;
  // Reply support
  replyToMessageId?: Id<'cardVotes'>; // If provided, this is a reply
}

const VIBEMAIL_COST_VBMS = "100";

export function NFTGiftModal({
  onClose,
  onComplete,
  recipientFid,
  recipientAddress,
  recipientUsername,
  senderFid,
  senderAddress,
  message,
  audioId,
  imageId,
  isPaidVibeMail,
  replyToMessageId,
}: NFTGiftModalProps) {
  const { address } = useAccount();
  const [step, setStep] = useState<'loading' | 'collections' | 'nfts' | 'confirm' | 'sending' | 'done'>('loading');
  const [collections, setCollections] = useState<CollectionInfo[]>([]);
  const [nfts, setNfts] = useState<Record<string, NFTItem[]>>({});
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [selectedNft, setSelectedNft] = useState<NFTItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string>('');

  // Filters
  const [rarityFilter, setRarityFilter] = useState<string>('all');
  const [showUnopened, setShowUnopened] = useState<boolean>(false);

  const recordGift = useMutation(api.nftGifts.recordNFTGift);
  const sendVibeMailMutation = useMutation(api.cardVotes.sendDirectVibeMail);
  const replyMutation = useMutation(api.cardVotes.replyToMessage);
  const { transfer: transferVBMS, isPending: isTransferPending } = useTransferVBMS();

  // Wagmi write contract hook
  const { writeContractAsync } = useWriteContractWithAttribution();

  // Marketplace URLs for each collection
  const MARKETPLACE_URLS: Record<string, string> = {
    'vmw': 'https://vibechain.com/market/vibe-most-wanted?ref=XCLR1DJ6LQTT',
    'gmvbrs': 'https://vibechain.com/market/gm-vbrs?ref=XCLR1DJ6LQTT',
    'viberuto': 'https://vibechain.com/market/viberuto-packs?ref=XCLR1DJ6LQTT',
    'meowverse': 'https://vibechain.com/market/meowverse?ref=XCLR1DJ6LQTT',
    'poorlydrawnpepes': 'https://vibechain.com/market/poorly-drawn-pepes?ref=XCLR1DJ6LQTT',
    'teampothead': 'https://vibechain.com/market/team-pothead?ref=XCLR1DJ6LQTT',
    'tarot': 'https://vibechain.com/market/tarot?ref=XCLR1DJ6LQTT',
    'baseballcabal': 'https://vibechain.com/market/base-ball-cabal?ref=XCLR1DJ6LQTT',
    'vibefx': 'https://vibechain.com/market/vibe-fx?ref=XCLR1DJ6LQTT',
    'historyofcomputer': 'https://vibechain.com/market/historyofcomputer?ref=XCLR1DJ6LQTT',
    'cumioh': 'https://vibechain.com/market/cu-mi-oh?ref=XCLR1DJ6LQTT',
    'viberotbangers': 'https://vibechain.com/market/vibe-rot-bangers?ref=XCLR1DJ6LQTT',
  };

  // Hardcoded giftable collections - show immediately, load NFTs on demand
  const GIFTABLE_COLLECTIONS: CollectionInfo[] = [
    { id: 'vmw', name: 'Vibe Most Wanted', count: 0 },
    { id: 'gmvbrs', name: 'GM VBRS', count: 0 },
    { id: 'viberuto', name: 'Viberuto', count: 0 },
    { id: 'meowverse', name: 'Meowverse', count: 0 },
    { id: 'poorlydrawnpepes', name: 'Poorly Drawn Pepes', count: 0 },
    { id: 'teampothead', name: 'Team Pothead', count: 0 },
    { id: 'tarot', name: 'Tarot', count: 0 },
    { id: 'baseballcabal', name: 'Baseball Cabal', count: 0 },
    { id: 'vibefx', name: 'Vibe FX', count: 0 },
    { id: 'historyofcomputer', name: 'History of Computer', count: 0 },
    { id: 'cumioh', name: '$CU-MI-OH!', count: 0 },
    { id: 'viberotbangers', name: 'Vibe Rot Bangers', count: 0 },
  ];

  // Show collections immediately on mount
  useEffect(() => {
    if (!address) {
      setStep('confirm');
      return;
    }
    setCollections(GIFTABLE_COLLECTIONS);
    setStep('collections');
  }, [address]);

  // Fetch NFTs only when a collection is selected
  const fetchCollectionNFTs = async (collectionId: string) => {
    if (!address) return;

    setStep('loading');

    try {
      const res = await fetch(`/api/gift-nfts?address=${address}&collection=${collectionId}`);
      const data = await res.json();

      if (data.success && data.nfts && data.nfts.length > 0) {
        setNfts({ [collectionId]: data.nfts });
        setStep('nfts');
      } else {
        setError('No NFTs found in this collection');
        setStep('collections');
      }
    } catch (err: any) {
      console.error('Error fetching NFTs:', err);
      setError('Failed to load NFTs');
      setStep('collections');
    }
  };

  // Handle send (with or without NFT gift)
  const handleSend = async () => {
    if (!senderAddress) return;

    setStep('sending');
    setError(null);

    try {
      // Step 1: Transfer NFT if selected
      let nftTxHash: string | undefined;
      if (selectedNft && address) {
        setStatusText('Transferring NFT...');

        try {
          // Try Farcaster SDK first
          if (sdk?.wallet) {
            try {
              const provider = await sdk.wallet.getEthereumProvider();
              if (provider) {
                const { encodeFunctionData } = await import('viem');
                const data = encodeFunctionData({
                  abi: ERC721_ABI,
                  functionName: 'safeTransferFrom',
                  args: [
                    address as `0x${string}`,
                    recipientAddress as `0x${string}`,
                    BigInt(selectedNft.tokenId),
                  ],
                });

                // Add builder code suffix for attribution
                console.log('Adding builder code:', BUILDER_CODE);
                const dataWithBuilderCode = (data + dataSuffix.slice(2)) as `0x${string}`;

                nftTxHash = await provider.request({
                  method: 'eth_sendTransaction',
                  params: [{
                    from: address,
                    to: selectedNft.contractAddress as `0x${string}`,
                    data: dataWithBuilderCode,
                  }],
                }) as string;
              }
            } catch (e) {
              console.log('SDK not available, using wagmi');
            }
          }

          // Fallback to wagmi
          if (!nftTxHash) {
            nftTxHash = await writeContractAsync({
              abi: ERC721_ABI,
              address: selectedNft.contractAddress as `0x${string}`,
              functionName: 'safeTransferFrom',
              args: [
                address as `0x${string}`,
                recipientAddress as `0x${string}`,
                BigInt(selectedNft.tokenId),
              ],
            });
          }

          console.log('NFT transferred:', nftTxHash);
        } catch (err: any) {
          console.error('NFT transfer failed:', err);
          setError('NFT transfer failed: ' + (err.message || 'Unknown error'));
          setStep('confirm');
          return;
        }
      }

      // Step 2: Pay VibeMail cost (100 VBMS for paid, 0 for free)
      setStatusText('Sending VibeMail...');
      const cost = isPaidVibeMail ? parseEther(VIBEMAIL_COST_VBMS) : BigInt(0);

      try {
        await transferVBMS(CONTRACTS.VBMSPoolTroll as `0x${string}`, cost);
      } catch (err: any) {
        console.error('VibeMail TX failed:', err);
        setError('VibeMail payment failed');
        setStep('confirm');
        return;
      }

      // Step 3: Save VibeMail to Convex (with NFT gift as separate fields)
      setStatusText('Saving message...');

      if (replyToMessageId) {
        // Reply to existing message
        await replyMutation({
          originalMessageId: replyToMessageId,
          senderFid,
          senderAddress,
          message,
          audioId: audioId || undefined,
          imageId: imageId || undefined,
          // NFT Gift fields
          giftNftName: selectedNft?.name,
          giftNftImageUrl: selectedNft?.imageUrl,
          giftNftCollection: selectedNft?.collectionName,
        });
      } else {
        // Direct message
        await sendVibeMailMutation({
          recipientFid,
          senderFid,
          senderAddress,
          message,
          audioId: audioId || undefined,
          imageId: imageId || undefined,
          // NFT Gift fields (separate from message)
          giftNftName: selectedNft?.name,
          giftNftImageUrl: selectedNft?.imageUrl,
          giftNftCollection: selectedNft?.collectionName,
        });
      }

      // Step 4: Record NFT gift if sent
      if (selectedNft && nftTxHash) {
        await recordGift({
          senderFid,
          senderAddress,
          recipientFid,
          recipientAddress,
          contractAddress: selectedNft.contractAddress,
          collectionId: selectedNft.collectionId,
          collectionName: selectedNft.collectionName,
          tokenId: selectedNft.tokenId,
          nftName: selectedNft.name,
          nftImageUrl: selectedNft.imageUrl,
          txHash: nftTxHash,
        });
      }

      setStep('done');
    } catch (err: any) {
      console.error('Send failed:', err);
      setError(err.message || 'Failed to send');
      setStep('confirm');
    }
  };

  // Render collection selector
  const renderCollections = () => (
    <>
      <h3 className="text-vintage-gold font-bold text-lg mb-2">
        Gift an NFT with your message?
      </h3>
      <p className="text-vintage-ice/60 text-sm mb-4">
        Choose a collection to send as a gift to @{recipientUsername}
      </p>
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-2 mb-3">
          <p className="text-red-400 text-sm text-center">{error}</p>
        </div>
      )}
      <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
        {collections.map((col) => (
          <div key={col.id} className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedCollection(col.id);
                setError(null);
                fetchCollectionNFTs(col.id);
              }}
              className="flex-1 p-3 bg-vintage-black/50 border border-vintage-gold/30 rounded-lg text-left hover:border-vintage-gold/60 hover:bg-vintage-gold/10 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-vintage-gold font-bold">{col.name}</span>
                <span className="text-vintage-ice/60 text-sm">→</span>
              </div>
            </button>
            {MARKETPLACE_URLS[col.id] && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openMarketplace(MARKETPLACE_URLS[col.id], sdk, true);
                }}
                className="p-3 bg-vintage-gold/20 border border-vintage-gold/50 rounded-lg hover:bg-vintage-gold/30 transition-all"
                title="Buy on Vibe Market"
              >
                <span className="text-vintage-gold text-lg">🛒</span>
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        onClick={() => {
          setSelectedNft(null);
          setStep('confirm');
        }}
        className="w-full py-3 bg-vintage-black/50 border border-vintage-gold/30 text-vintage-ice/70 rounded-lg hover:bg-vintage-gold/10"
      >
        Skip - Send without gift
      </button>
    </>
  );

  // Render NFT selector
  const renderNFTs = () => {
    const collectionNfts = selectedCollection ? nfts[selectedCollection] || [] : [];

    // Get unique rarities for filter
    const rarities = Array.from(new Set(collectionNfts.map(n => n.rarity).filter(Boolean)));

    // Apply filters
    const filteredNfts = collectionNfts.filter(nft => {
      // Rarity filter
      if (rarityFilter !== 'all' && nft.rarity !== rarityFilter) return false;

      // Unopened filter - if showUnopened is false, hide unopened
      if (!showUnopened) {
        const isUnopened = nft.rarity?.toLowerCase() === 'unopened' ||
          nft.name?.toLowerCase().includes('unopened');
        if (isUnopened) return false;
      }

      return true;
    });

    return (
      <>
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => {
              setSelectedCollection(null);
              setRarityFilter('all');
              setStep('collections');
            }}
            className="text-vintage-gold hover:text-yellow-400"
          >
            ←
          </button>
          <h3 className="text-vintage-gold font-bold text-lg flex-1">
            {collections.find(c => c.id === selectedCollection)?.name}
          </h3>
          <span className="text-vintage-ice/50 text-xs">{filteredNfts.length} NFTs</span>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-3">
          {/* Rarity Filter */}
          <select
            value={rarityFilter}
            onChange={(e) => setRarityFilter(e.target.value)}
            className="bg-vintage-black/70 border border-vintage-gold/30 text-vintage-gold text-xs rounded px-2 py-1"
          >
            <option value="all">All Rarities</option>
            {rarities.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          {/* Unopened Toggle */}
          <button
            onClick={() => setShowUnopened(!showUnopened)}
            className={`text-xs px-2 py-1 rounded border ${
              showUnopened
                ? 'bg-vintage-gold/20 border-vintage-gold text-vintage-gold'
                : 'bg-vintage-black/50 border-vintage-gold/30 text-vintage-ice/50'
            }`}
          >
            {showUnopened ? '📦 Hiding Unopened ✓' : '📦 Show Unopened'}
          </button>
        </div>

        {/* NFT Grid */}
        <div className="grid grid-cols-3 gap-2 max-h-52 overflow-y-auto mb-3">
          {filteredNfts.length === 0 ? (
            <div className="col-span-3 text-center py-8 text-vintage-ice/50">
              No NFTs match filters
            </div>
          ) : (
            filteredNfts.map((nft) => (
              <button
                key={`${nft.collectionId}-${nft.tokenId}`}
                onClick={() => {
                  setSelectedNft(nft);
                  setStep('confirm');
                }}
                className="p-1 bg-vintage-black/50 border border-vintage-gold/30 rounded-lg hover:border-vintage-gold/60 hover:bg-vintage-gold/10 transition-all relative"
              >
                <img
                  src={nft.imageUrl}
                  alt={nft.name}
                  className="w-full aspect-square object-cover rounded-lg mb-1"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.png';
                  }}
                />
                <p className="text-vintage-gold text-[10px] font-bold truncate">{nft.name}</p>
                {nft.rarity && (
                  <span className="absolute top-0.5 right-0.5 text-[8px] bg-vintage-black/80 text-vintage-ice/70 px-1 rounded">
                    {nft.rarity}
                  </span>
                )}
              </button>
            ))
          )}
        </div>

        <button
          onClick={() => {
            setSelectedNft(null);
            setStep('confirm');
          }}
          className="w-full py-2 bg-vintage-black/50 border border-vintage-gold/30 text-vintage-ice/70 rounded-lg hover:bg-vintage-gold/10 text-sm"
        >
          Skip - No gift
        </button>
      </>
    );
  };

  // Render confirmation screen
  const renderConfirm = () => (
    <>
      <h3 className="text-vintage-gold font-bold text-lg mb-4 text-center">
        Confirm & Send
      </h3>

      {/* Preview */}
      <div className="bg-vintage-black/50 border border-vintage-gold/30 rounded-lg p-3 mb-4">
        <p className="text-vintage-ice/60 text-xs mb-1">To: @{recipientUsername}</p>
        <p className="text-vintage-ice text-sm mb-2">{message.slice(0, 100)}{message.length > 100 ? '...' : ''}</p>

        {/* NFT Gift Preview */}
        {selectedNft && (
          <div className="mt-3 pt-3 border-t border-vintage-gold/20 flex items-center gap-3">
            <div className="relative">
              <img
                src={selectedNft.imageUrl}
                alt={selectedNft.name}
                className="w-16 h-16 object-cover rounded-lg border-2 border-vintage-gold"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.png';
                }}
              />
              <span className="absolute -top-2 -right-2 text-2xl">🎁</span>
            </div>
            <div>
              <p className="text-vintage-gold font-bold text-sm">{selectedNft.name}</p>
              <p className="text-vintage-ice/60 text-xs">{selectedNft.collectionName}</p>
            </div>
          </div>
        )}
      </div>

      {/* Cost breakdown */}
      <div className="bg-vintage-black/30 rounded-lg p-2 mb-4 text-sm">
        <div className="flex justify-between text-vintage-ice/60">
          <span>VibeMail</span>
          <span>{isPaidVibeMail ? `${VIBEMAIL_COST_VBMS} VBMS` : 'Free'}</span>
        </div>
        {selectedNft && (
          <div className="flex justify-between text-vintage-ice/60">
            <span>NFT Transfer</span>
            <span>Gas fee</span>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-2 mb-4">
          <p className="text-red-400 text-sm text-center">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => {
            if (collections.length > 0) {
              setSelectedNft(null);
              setStep('collections');
            } else {
              onClose();
            }
          }}
          className="flex-1 py-3 bg-vintage-black border border-vintage-gold/30 text-vintage-gold rounded-lg hover:bg-vintage-gold/10"
        >
          {collections.length > 0 ? 'Change Gift' : 'Cancel'}
        </button>
        <button
          onClick={handleSend}
          disabled={isTransferPending}
          className="flex-1 py-3 bg-gradient-to-r from-vintage-gold to-yellow-500 text-vintage-black font-bold rounded-lg hover:brightness-110 disabled:opacity-50"
        >
          {selectedNft ? '🎁 Send with Gift' : '📨 Send'}
        </button>
      </div>
    </>
  );

  // Render sending screen
  const renderSending = () => (
    <div className="text-center py-8">
      <div className="w-16 h-16 border-4 border-vintage-gold/30 border-t-vintage-gold rounded-full animate-spin mx-auto mb-4" />
      <p className="text-vintage-gold font-bold text-lg mb-2">{statusText || 'Processing...'}</p>
      <p className="text-vintage-ice/60 text-sm">Please confirm the transactions in your wallet</p>
    </div>
  );

  // Render done screen
  const renderDone = () => (
    <div className="text-center py-8">
      <div className="text-6xl mb-4">{selectedNft ? '🎁' : '📨'}</div>
      <p className="text-vintage-gold font-bold text-xl mb-2">
        {selectedNft ? 'Gift Sent!' : 'Message Sent!'}
      </p>
      <p className="text-vintage-ice/60 text-sm mb-6">
        {selectedNft
          ? `${selectedNft.name} and your message were sent to @${recipientUsername}`
          : `Your message was sent to @${recipientUsername}`
        }
      </p>
      <button
        onClick={onComplete}
        className="w-full py-3 bg-gradient-to-r from-vintage-gold to-yellow-500 text-vintage-black font-bold rounded-lg hover:brightness-110"
      >
        Done
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[600] bg-black/95 flex items-center justify-center p-4">
      <div className="bg-vintage-charcoal border-2 border-vintage-gold rounded-2xl p-4 w-full max-w-md max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-vintage-gold/30">
          <h2 className="text-vintage-gold font-bold text-lg flex items-center gap-2">
            <span>📬</span> Send VibeMail
          </h2>
          {step !== 'sending' && step !== 'done' && (
            <button
              onClick={onClose}
              className="w-8 h-8 bg-vintage-black/50 border border-vintage-gold/30 rounded-full text-vintage-gold hover:bg-vintage-gold/20 transition-all flex items-center justify-center"
            >
              X
            </button>
          )}
        </div>

        {/* Content based on step */}
        {step === 'loading' && (
          <div className="text-center py-8">
            <div className="w-12 h-12 border-4 border-vintage-gold/30 border-t-vintage-gold rounded-full animate-spin mx-auto mb-4" />
            <p className="text-vintage-ice/60">Loading your NFTs...</p>
          </div>
        )}

        {step === 'collections' && renderCollections()}
        {step === 'nfts' && renderNFTs()}
        {step === 'confirm' && renderConfirm()}
        {step === 'sending' && renderSending()}
        {step === 'done' && renderDone()}
      </div>
    </div>
  );
}
