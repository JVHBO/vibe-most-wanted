"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AudioManager } from "@/lib/audio-manager";
import { useAccount } from "wagmi";
import {
  useVBMSBalance as useWagmiVBMSBalance,
  useVBMSAllowance as useWagmiVBMSAllowance,
  useApproveVBMS,
  useCreateBattle,
  useJoinBattle,
  useCancelBattle,
  useActiveBattle,
  useBattle
} from "@/lib/hooks/useVBMSContracts";
import { useFarcasterVBMSBalance, useFarcasterVBMSAllowance } from "@/lib/hooks/useFarcasterVBMS";
import { CONTRACTS } from "@/lib/contracts";
import { parseEther } from "viem";

interface PokerMatchmakingProps {
  onClose: () => void;
  onRoomJoined: (roomId: string, isHost: boolean, ante: number, token: string, isSpectator?: boolean) => void;
  playerAddress: string;
  playerUsername: string;
}

export function PokerMatchmaking({
  onClose,
  onRoomJoined,
  playerAddress,
  playerUsername,
}: PokerMatchmakingProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAnte, setSelectedAnte] = useState(10);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [hasCheckedExistingRoom, setHasCheckedExistingRoom] = useState(false);

  // Ref to prevent multiple orphaned battle recoveries running at once
  const isRecoveringRef = useRef(false);

  // Ref to prevent multiple Convex room creations
  const isCreatingConvexRoomRef = useRef(false);

  // Ref to prevent multiple join battle transactions
  const isJoiningBattleRef = useRef(false);

  // Web3 hooks for VBMS
  const { address: walletAddress } = useAccount();
  // Use playerAddress (Farcaster miniapp) OR walletAddress (web wallet) - playerAddress takes priority
  const effectiveAddress = (playerAddress || walletAddress) as `0x${string}` | undefined;

  // Detect miniapp (needs Farcaster SDK provider, wagmi won't work)
  // Check both iframe (web) and Farcaster SDK (mobile app)
  const isInMiniapp = typeof window !== 'undefined' && (
    window.parent !== window || // iframe detection (web)
    !!(window as any).sdk?.wallet // Farcaster SDK detection (mobile + web)
  );

  // Use Farcaster-compatible hooks in miniapp, wagmi hooks on web
  const farcasterBalance = useFarcasterVBMSBalance(effectiveAddress);
  const farcasterAllowance = useFarcasterVBMSAllowance(effectiveAddress, CONTRACTS.VBMSPokerBattle);
  const wagmiBalance = useWagmiVBMSBalance(effectiveAddress);
  const wagmiAllowance = useWagmiVBMSAllowance(effectiveAddress, CONTRACTS.VBMSPokerBattle as `0x${string}`);

  // Select hooks based on environment
  const { balance: vbmsBalance, balanceRaw: vbmsBalanceRaw, refetch: refetchVBMSBalance } = isInMiniapp ? farcasterBalance : wagmiBalance;
  const { allowance: vbmsAllowance, allowanceRaw: vbmsAllowanceRaw, refetch: refetchAllowance } = isInMiniapp ? farcasterAllowance : wagmiAllowance;

  console.log("🔍 VBMS Balance Debug:", {
    isInMiniapp,
    playerAddress,
    walletAddress,
    effectiveAddress,
    vbmsBalance,
    vbmsBalanceRaw,
    source: isInMiniapp ? 'Farcaster SDK' : 'Wagmi'
  });
  const { approve: approveVBMS, isPending: isApproving, error: approveError } = useApproveVBMS();
  const { createBattle: createBlockchainBattle, isPending: isCreatingBattle, isConfirming: isCreatingBattleConfirming, isSuccess: isBattleCreated, error: createBattleError } = useCreateBattle();
  const { joinBattle: joinBlockchainBattle, isPending: isJoiningBattle, isConfirming: isJoiningBattleConfirming, isSuccess: isBattleJoined, error: joinBattleError } = useJoinBattle();
  const { battleId: activeBattleId, isLoading: isLoadingActiveBattle, refetch: refetchActiveBattle } = useActiveBattle(effectiveAddress);
  const { battle: activeBattleInfo, isLoading: isLoadingBattleInfo } = useBattle(activeBattleId);
  const { cancelBattle: cancelBlockchainBattle, isPending: isCancellingBattle, isConfirming: isCancellingBattleConfirming, isSuccess: isBattleCancelled } = useCancelBattle();

  // Track blockchain transaction stages
  const [vbmsStage, setVbmsStage] = useState<"idle" | "approving" | "creating" | "joining">("idle");

  // Track if we've already processed this approval (prevent double-processing)
  const [processedApproval, setProcessedApproval] = useState(false);

  // Track if we skipped approval (already had allowance)
  const [skippedApproval, setSkippedApproval] = useState(false);

  // Queries
  const availableRooms = useQuery(api.pokerBattle.getPokerRooms);
  const myRoom = useQuery(api.pokerBattle.getMyPokerRoom, {
    address: playerAddress,
  });

  // Mutations
  const createRoom = useMutation(api.pokerBattle.createPokerRoom);
  const joinRoom = useMutation(api.pokerBattle.joinPokerRoom);
  const spectate = useMutation(api.pokerBattle.spectateRoom);
  const leaveRoom = useMutation(api.pokerBattle.leavePokerRoom);
  const forceDeleteRoomByAddress = useMutation(api.pokerBattle.forceDeleteRoomByAddress);

  // Check if player is already in a room on mount - but only run once to prevent auto-start
  useEffect(() => {
    if (myRoom && !hasCheckedExistingRoom) {
      setHasCheckedExistingRoom(true);
      const isHost = myRoom.hostAddress === playerAddress.toLowerCase();
      onRoomJoined(myRoom.roomId, isHost, myRoom.ante, myRoom.token);
    }
  }, [myRoom, hasCheckedExistingRoom]);

  // Auto-recover: If we have an active blockchain battle but no Convex room, recreate the room
  // TEMPORARILY DISABLED - causing infinite loop
  /*
  useEffect(() => {
    const recoverOrphanedBattle = async () => {
      // Only check if we have wallet connected
      if (!effectiveAddress) return;

      // If we already have a Convex room, don't do anything
      if (myRoom) return;

      // If already processing, skip
      if (isRecoveringRef.current) {
        console.log("⏭️ Already recovering orphaned battle, skipping...");
        return;
      }

      // If we have an active blockchain battle, find or create the Convex room
      if (activeBattleId > 0 && activeBattleInfo) {
        console.log("🔧 Detected orphaned blockchain battle! Looking for existing Convex room...", {
          battleId: activeBattleId,
          stake: activeBattleInfo.stake,
        });

        try {
          // Set flag to prevent concurrent executions
          isRecoveringRef.current = true;

          // First check if there's already a room for this blockchain battle
          const existingRoom = availableRooms?.find(
            (room: any) => room.blockchainBattleId === activeBattleId
          );

          if (existingRoom) {
            console.log("✅ Found existing Convex room for this battle! Joining it...", existingRoom.roomId);
            // Join the existing room instead of creating a new one
            await joinRoom({
              roomId: existingRoom.roomId,
              address: playerAddress,
              username: playerUsername,
            });
          } else {
            console.log("🆕 No existing room found. Creating new Convex room...");
            // No existing room - create one
            const result = await createRoom({
              address: playerAddress,
              username: playerUsername,
              ante: parseFloat(activeBattleInfo.stake),
              token: "VBMS",
              blockchainBattleId: activeBattleId, // Link to existing battle
            });

            if (result.success) {
              console.log("✅ Successfully recovered orphaned battle! Room created:", result.roomId);
            }
          }
        } catch (error) {
          console.error("❌ Failed to recover orphaned battle:", error);
        } finally {
          // Reset flag after operation completes (success or failure)
          isRecoveringRef.current = false;
        }
      }
    };

    recoverOrphanedBattle();
  }, [activeBattleId, activeBattleInfo, myRoom, walletAddress, availableRooms, joinRoom, createRoom, playerAddress, playerUsername]);
  */

  // Handle VBMS approval success -> refetch allowance and continue
  useEffect(() => {
    const handleApprovalSuccess = async () => {
      // Check if we're in JOIN flow (not CREATE flow)
      const isPendingJoin = !!(window as any).__pendingVBMSJoinRoomId;

      if (isApproved && vbmsStage === "approving" && !processedApproval && !isPendingJoin) {
        // CREATE ROOM flow
        console.log("✅ Approval transaction confirmed! Refetching allowance...");
        setProcessedApproval(true);

        // Wait a bit for blockchain to update
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Refetch allowance to get updated value
        await refetchAllowance();
        console.log("🔄 Refetched allowance after approval - will use updated vbmsAllowance from hook");

        // Now create the battle
        setVbmsStage("creating");
        console.log("Creating Battle - Please confirm the transaction to create the battle...");

        try {
          const stakeAmount = selectedAnte.toString();
          await createBlockchainBattle(stakeAmount);
        } catch (error) {
          console.error("Error creating blockchain battle:", error);
          AudioManager.buttonError();
          setVbmsStage("idle");
          setIsCreating(false);
          setProcessedApproval(false);
        }
      } else if (isApproved && vbmsStage === "approving" && !processedApproval && isPendingJoin && !isJoiningBattleRef.current) {
        // JOIN ROOM flow - same approach as CREATE (wait + refetch + join)
        console.log("✅ Approval transaction confirmed! Refetching allowance...");
        setProcessedApproval(true);
        isJoiningBattleRef.current = true; // Set guard to prevent other useEffect from triggering

        // Wait a bit for blockchain to update (same as CREATE flow)
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Refetch allowance to get updated value (same as CREATE flow)
        await refetchAllowance();
        console.log("🔄 Refetched allowance after approval - will use updated vbmsAllowance from hook");

        try {
          // Get pending room data
          const currentRoomId = (window as any).__pendingVBMSJoinRoomId;
          const room = availableRooms?.find((r: any) => r.roomId === currentRoomId);
          const battleId = room?.blockchainBattleId;

          if (!battleId) {
            throw new Error("Room doesn't have a blockchain battle ID");
          }

          // Store pending convex join data for after blockchain join confirms
          (window as any).__pendingConvexJoin = {
            roomId: currentRoomId,
            ante: (window as any).__pendingVBMSJoinAnte,
            token: (window as any).__pendingVBMSJoinToken,
            battleId,
          };

          console.log(`💰 Joining battle #${battleId} - Please confirm the transaction...`);
          setVbmsStage("joining");

          // Call join directly - don't wait for another useEffect
          await joinBlockchainBattle(battleId);
        } catch (error) {
          console.error("❌ Error joining battle after approval:", error);
          AudioManager.buttonError();
          setVbmsStage("idle");
          setIsJoining(false);
          setProcessedApproval(false);
          isJoiningBattleRef.current = false; // Reset guard on error
        }
      }
    };

    handleApprovalSuccess();
  }, [isApproved, vbmsStage, processedApproval]);

  // Handle battle created success -> create Convex room
  useEffect(() => {
    console.log("🔄 Battle Creation useEffect triggered:", {
      isBattleCreated,
      isCreatingBattle,
      isCreatingBattleConfirming,
      vbmsStage,
      isCreatingConvexRoom: isCreatingConvexRoomRef.current,
      shouldCreateRoom: isBattleCreated && vbmsStage === "creating" && !isCreatingConvexRoomRef.current
    });

    const createConvexRoom = async () => {
      if (isBattleCreated && vbmsStage === "creating" && !isCreatingConvexRoomRef.current) {
        console.log("✅ Success! Blockchain battle created. Fetching battle ID...");
        isCreatingConvexRoomRef.current = true; // Prevent multiple executions

        try {
          // Refetch to get the newly created battle ID with multiple retries
          let battleIdToUse = 0;
          const maxRetries = 5;

          for (let i = 0; i < maxRetries; i++) {
            console.log(`🔍 Attempt ${i + 1}/${maxRetries} to fetch battle ID...`);
            const { data: fetchedBattleId } = await refetchActiveBattle();
            battleIdToUse = fetchedBattleId ? Number(fetchedBattleId) : 0;

            if (battleIdToUse > 0) {
              console.log(`✅ Battle ID found: ${battleIdToUse}`);
              break;
            }

            if (i < maxRetries - 1) {
              const waitTime = 1000 * (i + 1); // Increasing wait: 1s, 2s, 3s, 4s
              console.log(`⏳ Battle ID not ready yet, waiting ${waitTime}ms...`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
            }
          }

          if (battleIdToUse === 0) {
            throw new Error("Failed to get battle ID after creation. The battle was created on-chain but we couldn't retrieve its ID. Please try creating a new room.");
          }

          console.log("✅ Creating Convex room with battle ID:", battleIdToUse);

          const result = await createRoom({
            address: playerAddress,
            username: playerUsername,
            ante: selectedAnte,
            token: "VBMS",
            blockchainBattleId: battleIdToUse, // Link to blockchain battle
          });

          console.log("📦 Convex room creation result:", result);

          if (result.success) {
            setShowCreateModal(false);
            AudioManager.buttonSuccess();
            onRoomJoined(result.roomId, true, selectedAnte, "VBMS");
            await refetchVBMSBalance(); // Refresh balance
          }
        } catch (error) {
          console.error("❌ Error creating Convex room:", error);
          console.error("Battle created on-chain but failed to create game room");
          AudioManager.buttonError();
        } finally {
          setVbmsStage("idle");
          setIsCreating(false);
          isCreatingConvexRoomRef.current = false; // Reset for next creation
        }
      }
    };

    createConvexRoom();
  }, [isBattleCreated, vbmsStage]);

  // Handle errors during battle creation
  useEffect(() => {
    if (createBattleError) {
      console.error("❌ Error creating battle:", createBattleError);

      // Check if it's a user rejection
      if (createBattleError.message?.includes("User rejected")) {
        console.log("⚠️ User rejected the transaction");
      }

      // Reset state to allow retry
      setVbmsStage("idle");
      setIsCreating(false);
      setProcessedApproval(false); // Reset to allow retry
      AudioManager.buttonError();
    }
  }, [createBattleError]);

  // Handle errors during approval
  useEffect(() => {
    if (approveError) {
      console.error("❌ Error approving VBMS:", approveError);

      // Reset state to allow retry
      setVbmsStage("idle");
      setIsCreating(false);
      setProcessedApproval(false); // Reset to allow retry
      AudioManager.buttonError();
    }
  }, [approveError]);

  // Handle errors during join battle
  useEffect(() => {
    if (joinBattleError) {
      console.error("❌ Error joining battle:", joinBattleError);

      // Reset state to allow retry
      setVbmsStage("idle");
      setIsJoining(false);
      setProcessedApproval(false);
      setSkippedApproval(false);
      isJoiningBattleRef.current = false; // Reset guard
      AudioManager.buttonError();
    }
  }, [joinBattleError]);

  // Handle approval success for JOIN -> transition to joining stage
  useEffect(() => {
    const handleApprovalForJoin = async () => {
      const pendingJoin = (window as any).__pendingConvexJoin;

      if (
        isApproved &&
        vbmsStage === "approving" &&
        pendingJoin &&
        !processedApproval
      ) {
        console.log("✅ Approval confirmed! Transitioning to joining stage...");
        setProcessedApproval(true);
        setVbmsStage("joining");
        // NOTE: Do NOT call joinBlockchainBattle here - it will be called by the next useEffect
      }
    };

    handleApprovalForJoin();
  }, [isApproved, vbmsStage, processedApproval]);

  // Auto-delete Convex room when blockchain battle is cancelled
  useEffect(() => {
    if (isBattleCancelled) {
      console.log("✅ Battle cancelled successfully on blockchain! Auto-deleting Convex room...");

      // Delete room by address (works even if myRoom doesn't exist)
      forceDeleteRoomByAddress({ address: playerAddress })
        .then((result) => {
          console.log(`🗑️ Auto-deleted ${result.deletedCount} room(s) from Convex after blockchain cancel`);
          AudioManager.buttonSuccess();
          alert("Battle cancelled! Your VBMS stake has been returned.");
          refetchVBMSBalance();
        })
        .catch((error) => {
          console.error("❌ Failed to auto-delete Convex room:", error);
          // Still show success since blockchain cancel succeeded
          AudioManager.buttonSuccess();
          alert("Battle cancelled! Your VBMS stake has been returned.");
          refetchVBMSBalance();
        });
    }
  }, [isBattleCancelled, playerAddress, forceDeleteRoomByAddress, refetchVBMSBalance]);

  // Handle blockchain join success -> join Convex room
  useEffect(() => {
    console.log("🔍 Join Convex useEffect triggered:", {
      isBattleJoined,
      vbmsStage,
      hasPendingJoin: !!(window as any).__pendingConvexJoin,
    });

    const joinConvexRoom = async () => {
      if (isBattleJoined && vbmsStage === "joining") {
        console.log("✅ Blockchain join successful! Joining Convex room...");

        try {
          const pendingJoin = (window as any).__pendingConvexJoin;
          console.log("📦 Pending join data:", pendingJoin);

          if (pendingJoin) {
            console.log("🎮 Calling Convex joinRoom with:", {
              roomId: pendingJoin.roomId,
              address: playerAddress,
              username: playerUsername,
            });

            const result = await joinRoom({
              roomId: pendingJoin.roomId,
              address: playerAddress,
              username: playerUsername,
            });

            console.log("🎯 Convex joinRoom result:", result);

            if (result.success) {
              AudioManager.buttonSuccess();
              console.log("🚀 Calling onRoomJoined...");
              onRoomJoined(pendingJoin.roomId, false, pendingJoin.ante, pendingJoin.token);
              await refetchVBMSBalance();
            } else {
              console.error("❌ Convex joinRoom failed:", result);
            }

            // Clean up
            delete (window as any).__pendingConvexJoin;
            delete (window as any).__pendingVBMSJoinRoomId;
            delete (window as any).__pendingVBMSJoinAnte;
            delete (window as any).__pendingVBMSJoinToken;
          } else {
            console.warn("⚠️ No pending join data found!");
          }
        } catch (error) {
          console.error("❌ Error joining Convex room:", error);
          AudioManager.buttonError();
        } finally {
          console.log("🔄 Resetting states: vbmsStage=idle, isJoining=false");
          setVbmsStage("idle");
          setIsJoining(false);
          setSkippedApproval(false); // Reset skip flag
          isJoiningBattleRef.current = false; // Reset guard for next join
        }
      }
    };

    joinConvexRoom();
  }, [isBattleJoined, vbmsStage]);

  // Handle VBMS approval for joining -> join battle on blockchain
  // WAIT for approval to be CONFIRMED before calling joinBattle (OR if we skipped approval)
  useEffect(() => {
    console.log("🔍 Join Battle useEffect triggered:", {
      isApproved,
      isApprovingConfirming,
      skippedApproval,
      vbmsStage,
      isJoiningBattleRef: isJoiningBattleRef.current,
      readyToJoin: ((isApproved && !isApprovingConfirming) || skippedApproval) && vbmsStage === "joining" && !isJoiningBattleRef.current,
    });

    const joinBattleOnChain = async () => {
      // Proceed if: (approval confirmed OR skipped approval) AND stage is joining AND not already called
      const approvalReady = (isApproved && !isApprovingConfirming) || skippedApproval;

      if (approvalReady && vbmsStage === "joining" && !isJoiningBattleRef.current) {
        console.log("✅ Ready to join battle! (approval:", skippedApproval ? "skipped" : "confirmed", ")");

        // Set guard to prevent multiple calls
        isJoiningBattleRef.current = true;

        try {
          // Get pending room data
          const currentRoomId = (window as any).__pendingVBMSJoinRoomId;
          const currentAnte = (window as any).__pendingVBMSJoinAnte;
          const currentToken = (window as any).__pendingVBMSJoinToken;

          console.log("📦 Pending room data:", { currentRoomId, currentAnte, currentToken });

          if (currentRoomId) {
            // Find the room in available rooms to get the blockchainBattleId
            const room = availableRooms?.find((r: any) => r.roomId === currentRoomId);
            const battleId = room?.blockchainBattleId;

            console.log("🎯 Found room:", { room, battleId });

            if (!battleId) {
              throw new Error("Room doesn't have a blockchain battle ID");
            }

            // Join the blockchain battle
            console.log(`💰 Calling joinBlockchainBattle with battleId: ${battleId}`);
            joinBlockchainBattle(battleId);

            // Wait for blockchain join to confirm (handled by isJoiningBattle state)
            // The Convex room join will happen in a separate useEffect

            // Store for later use after blockchain confirmation
            (window as any).__pendingConvexJoin = {
              roomId: currentRoomId,
              ante: currentAnte,
              token: currentToken,
              battleId,
            };
            console.log("💾 Stored pending convex join data");
          } else {
            console.warn("⚠️ No currentRoomId found in window storage!");
            isJoiningBattleRef.current = false; // Reset on error
          }
        } catch (error) {
          console.error("❌ Error joining battle:", error);
          AudioManager.buttonError();
          setVbmsStage("idle");
          setIsJoining(false);
          setSkippedApproval(false); // Reset skip flag on error
          isJoiningBattleRef.current = false; // Reset on error
        }
      } else if (isApprovingConfirming && vbmsStage === "joining") {
        console.log("⏳ Waiting for approval to be confirmed on blockchain...");
      }
    };

    joinBattleOnChain();
  }, [isApproved, isApprovingConfirming, skippedApproval, vbmsStage]);

  const handleCreateRoom = async () => {
    if (isCreating) return;

    AudioManager.buttonClick();

    // Reset flags for new creation attempt
    setProcessedApproval(false);
    isCreatingConvexRoomRef.current = false;

    try {
      // Create VBMS blockchain battle
      // Check if we have an address (from Farcaster miniapp OR web wallet)
      if (!effectiveAddress) {
        console.log("Wallet Not Connected - Please connect your wallet to play with VBMS");
        AudioManager.buttonError();
        return;
      }

      // REMOVED: Active battle check - now allows creating multiple battles
      // Players can create new battles even if they have active ones
      // Old battles will be auto-canceled after timeout
      if (activeBattleId > 0 && activeBattleInfo) {
        console.log("⚠️ Note: You have an active battle #" + activeBattleId + " - it will be abandoned if you create a new one");
      }

      // Calculate total stake needed
      const stakeAmount = selectedAnte.toString();

      // Check if user has enough VBMS
      const userBalance = parseFloat(vbmsBalance);
      const requiredAmount = parseFloat(stakeAmount);

      console.log("💰 Balance check:", {
        userBalance,
        requiredAmount,
        hasEnough: userBalance >= requiredAmount,
      });

      if (userBalance < requiredAmount) {
        console.log(`Insufficient VBMS - You need ${requiredAmount} VBMS but only have ${userBalance.toFixed(2)} VBMS`);
        AudioManager.buttonError();
        return;
      }

      // IMPORTANT: Refetch allowance to get latest value from blockchain
      console.log("🔄 Refetching allowance before check...");
      await refetchAllowance();
      console.log("🔄 Refetched allowance - will use updated vbmsAllowance from hook");
      const currentAllowance = parseFloat(vbmsAllowance?.toString() || '0');
      const requiredAllowance = parseFloat(stakeAmount);

      console.log("💰 Allowance check for CREATE:", {
        vbmsAllowance: vbmsAllowance,
        currentAllowance,
        requiredAllowance,
        hasEnoughAllowance: currentAllowance >= requiredAllowance,
      });

      if (currentAllowance >= requiredAllowance) {
        // Already have enough allowance, skip straight to createBattle
        console.log("✅ Sufficient allowance already exists! Skipping approval...");
        setVbmsStage("creating");
        setIsCreating(true);
        console.log("Creating battle on-chain - Please confirm the transaction...");
        createBlockchainBattle(stakeAmount);
        return;
      }

      // Need to approve first
      console.log("⚠️ Insufficient allowance, requesting approval...");
      setProcessedApproval(false); // Reset before approving
      setVbmsStage("approving");
      setIsCreating(true);
      console.log("Step 1/2: Approving VBMS...");
      approveVBMS(CONTRACTS.VBMSPokerBattle as `0x${string}`, stakeAmount);
      return; // useEffect will handle next step after approval
    } catch (error) {
      console.error("❌ Error in handleCreateRoom:", error);
      AudioManager.buttonError();
      setIsCreating(false);
      setVbmsStage("idle");
    }
  };

  const handleJoinRoom = async (roomId: string, ante: number, token: string) => {
    if (isJoining) return;

    setIsJoining(true);
    AudioManager.buttonClick();

    try {
      // If VBMS room, join blockchain battle
      if (token === "VBMS") {
        // Check if we have an address (from Farcaster miniapp OR web wallet)
        if (!effectiveAddress) {
          console.log("Wallet Not Connected - Please connect your wallet to play with VBMS");
          AudioManager.buttonError();
          setIsJoining(false);
          return;
        }

        // Calculate stake needed (just the ante, not bankroll)
        const stakeAmount = ante.toString();

        // Check if user has enough VBMS
        const userBalance = parseFloat(vbmsBalance);
        const requiredAmount = parseFloat(stakeAmount);

        if (userBalance < requiredAmount) {
          console.log(`Insufficient VBMS - You need ${requiredAmount} VBMS but only have ${userBalance.toFixed(2)} VBMS`);
          AudioManager.buttonError();
          setIsJoining(false);
          return;
        }

        // Store pending room data for after approval
        (window as any).__pendingVBMSJoinRoomId = roomId;
        (window as any).__pendingVBMSJoinAnte = ante;
        (window as any).__pendingVBMSJoinToken = token;

        console.log("💾 Stored pending join data:", {
          roomId,
          ante,
          token,
        });

        // Check if we already have enough allowance
        const currentAllowance = parseFloat(vbmsAllowance);
        const requiredAllowance = parseFloat(stakeAmount);

        console.log("💰 Allowance check:", {
          currentAllowance,
          requiredAllowance,
          hasEnoughAllowance: currentAllowance >= requiredAllowance,
        });

        if (currentAllowance >= requiredAllowance) {
          // Already have enough allowance, skip straight to joinBattle
          console.log("✅ Sufficient allowance already exists! Skipping approval...");

          // Find the battle ID from the room
          const room = availableRooms?.find((r: any) => r.roomId === roomId);
          const battleId = room?.blockchainBattleId;

          if (!battleId) {
            throw new Error("Room doesn't have a blockchain battle ID");
          }

          // Store pending join data for useEffect to use
          (window as any).__pendingConvexJoin = {
            roomId,
            ante,
            token,
            battleId,
          };

          console.log("📦 Stored pendingConvexJoin, triggering join via useEffect...");

          // Mark that we skipped approval and set stage to joining
          setSkippedApproval(true);
          setVbmsStage("joining");
          return;
        }

        // Need to approve first
        setProcessedApproval(false); // Reset before approving
        setSkippedApproval(false); // Make sure skip flag is off
        setVbmsStage("approving");
        console.log("🔐 Calling approveVBMS - Please approve the transaction in your wallet...");

        // Find the battle ID from the room
        const room = availableRooms?.find((r: any) => r.roomId === roomId);
        const battleId = room?.blockchainBattleId;

        if (!battleId) {
          throw new Error("Room doesn't have a blockchain battle ID");
        }

        // Store for useEffect to use after approval
        (window as any).__pendingConvexJoin = {
          roomId,
          ante,
          token,
          battleId,
        };

        console.log("📦 Stored pendingConvexJoin for after approval:", (window as any).__pendingConvexJoin);

        approveVBMS(CONTRACTS.VBMSPokerBattle as `0x${string}`, stakeAmount);

        // The useEffect will handle joining after approval
        // DON'T reset isJoining here - let the useEffect handle it
        console.log("✅ Approval transaction sent, waiting for confirmation...");
        return;
      }
    } catch (error) {
      console.error("Error joining room:", error);
      AudioManager.buttonError();
      setIsJoining(false);
      setVbmsStage("idle");
      setSkippedApproval(false); // Reset skip flag on error
    }
  };

  const handleSpectate = async (roomId: string) => {
    AudioManager.buttonClick();
    try {
      await spectate({
        roomId,
        address: playerAddress,
        username: playerUsername,
      });
      AudioManager.buttonSuccess();
      // Navigate to spectator view
      onRoomJoined(roomId, false, 0, "TESTVBMS", true); // Pass isSpectator = true
    } catch (error) {
      console.error("Error spectating:", error);
      AudioManager.buttonError();
    }
  };

  const handleCancelBattle = async () => {
    if (!activeBattleId || !activeBattleInfo) return;

    // Check if 1 minute has passed
    const oneMinute = 60; // seconds
    const now = Math.floor(Date.now() / 1000);
    const canCancel = (now - activeBattleInfo.createdAt) >= oneMinute;

    if (!canCancel) {
      const timeLeft = oneMinute - (now - activeBattleInfo.createdAt);
      const secondsLeft = Math.ceil(timeLeft);
      alert(`You must wait ${secondsLeft} more second(s) before cancelling this battle.`);
      AudioManager.buttonError();
      return;
    }

    if (activeBattleInfo.status !== 0) { // 0 = WAITING
      alert("Can only cancel battles that are waiting for an opponent.");
      AudioManager.buttonError();
      return;
    }

    AudioManager.buttonClick();
    console.log(`🚫 Cancelling battle #${activeBattleId}...`);

    // Just cancel blockchain - system will auto-delete Convex room when detected
    cancelBlockchainBattle(activeBattleId);
  };

  const anteOptions = [
    { value: 10, label: "Low", color: "from-green-600 to-green-700" },
    { value: 50, label: "Mid", color: "from-yellow-600 to-yellow-700" },
    { value: 200, label: "High", color: "from-red-600 to-red-700" },
    { value: 2000, label: "Extreme", color: "from-purple-600 to-pink-700" },
  ];

  return (
    <div className="fixed inset-0 bg-vintage-deep-black/95 backdrop-blur-sm flex items-center justify-center z-[200] p-2 sm:p-4 pb-20 sm:pb-4">
      <div className="bg-gradient-to-b from-vintage-charcoal to-vintage-deep-black rounded-2xl sm:rounded-3xl border-2 sm:border-4 border-vintage-gold/50 max-w-6xl w-full max-h-[92vh] sm:max-h-[95vh] overflow-y-auto shadow-2xl shadow-vintage-gold/20">

        {/* Header */}
        <div className="bg-gradient-to-r from-vintage-gold/20 via-vintage-burnt-gold/20 to-vintage-gold/20 border-b-2 border-vintage-gold/30 p-3 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-3xl md:text-4xl font-display font-bold text-vintage-gold mb-1 sm:mb-2 flex items-center gap-2 sm:gap-3">
                <span className="text-2xl sm:text-4xl md:text-5xl flex-shrink-0">♠️</span>
                <span className="truncate">POKER BATTLE</span>
              </h1>
              <p className="text-xs sm:text-base text-vintage-burnt-gold font-modern">
                Choose stakes & find opponent
              </p>
            </div>
            <button
              onClick={() => {
                AudioManager.buttonNav();
                onClose();
              }}
              className="text-vintage-gold hover:text-vintage-burnt-gold transition text-3xl sm:text-4xl leading-none flex-shrink-0"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-3 sm:p-6">
          {/* Stuck in Room Warning - Force Leave Option */}
          {myRoom && !activeBattleId && (
            <div className="mb-4 sm:mb-8 bg-red-500/10 border-2 border-red-500/50 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg sm:text-xl font-display font-bold text-red-400 mb-2">
                    🚨 Stuck in Room
                  </h3>
                  <p className="text-sm sm:text-base text-vintage-parchment mb-2">
                    Room: {myRoom.roomId.slice(0, 8)}... • Stake: {myRoom.ante} {myRoom.token}
                  </p>
                  <p className="text-xs sm:text-sm text-vintage-burnt-gold">
                    You're in a room with no active blockchain battle. Click to force leave.
                  </p>
                </div>

                <div className="flex flex-col gap-2 items-end">
                  <button
                    onClick={async () => {
                      try {
                        console.log('🚨 Force leaving stuck room:', myRoom.roomId);
                        await forceDeleteRoomByAddress({ address: playerAddress });
                        console.log('✅ Successfully left room');
                        AudioManager.buttonClick();
                      } catch (error) {
                        console.error('❌ Failed to leave room:', error);
                        AudioManager.buttonError();
                      }
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-display font-bold transition"
                    title="Force leave this stuck room"
                  >
                    Force Leave
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Main Action Button */}
          <div className="flex justify-center mb-4 sm:mb-8">
            {/* Create Room */}
            <button
              onClick={() => {
                AudioManager.buttonClick();
                setShowCreateModal(true);
              }}
              className="group bg-gradient-to-br from-vintage-gold to-vintage-burnt-gold p-4 sm:p-8 rounded-xl sm:rounded-2xl border-2 border-vintage-gold hover:shadow-2xl hover:shadow-vintage-gold/30 transition-all duration-300 hover:scale-105 active:scale-95 max-w-md w-full"
            >
              <div className="text-4xl sm:text-7xl mb-2 sm:mb-4">🎰</div>
              <h3 className="text-xl sm:text-3xl font-display font-bold text-vintage-black mb-2 sm:mb-3">
                CREATE ROOM
              </h3>
              <p className="text-xs sm:text-base text-vintage-deep-black/80 font-modern">
                Set your own stakes and wait for opponent
              </p>
            </button>
          </div>

          {/* Room Settings */}
          <div className="bg-vintage-black/50 border-2 border-vintage-gold/30 rounded-xl sm:rounded-2xl p-3 sm:p-6 mb-4 sm:mb-8">
            <h3 className="text-base sm:text-xl font-display font-bold text-vintage-gold mb-3 sm:mb-4">
              ⚙️ STAKES SELECTION
            </h3>

            {/* Current Token Display */}
            <div className="mb-4 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-2 border-yellow-400/30 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-vintage-burnt-gold mb-1">Betting Token</div>
                  <div className="text-2xl font-bold text-yellow-400">$VBMS</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-vintage-burnt-gold mb-1">Your Balance</div>
                  <div className="text-2xl font-bold text-yellow-400">
                    {effectiveAddress ? `${parseFloat(vbmsBalance).toFixed(2)}` : "Connect Wallet"}
                  </div>
                </div>
              </div>
            </div>

            {/* Ante Selection */}
            <div>
              <label className="block text-sm font-bold text-vintage-burnt-gold mb-3">
                STAKES (Entry Fee)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {anteOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedAnte(option.value)}
                    className={`p-3 rounded-xl border-2 font-bold transition-all ${
                      selectedAnte === option.value
                        ? `bg-gradient-to-br ${option.color} text-white border-white shadow-lg`
                        : "bg-vintage-charcoal text-vintage-gold border-vintage-gold/30 hover:border-vintage-gold/60"
                    }`}
                  >
                    <div className="text-xs mb-1">{option.label}</div>
                    <div className="text-lg">{option.value}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Available Rooms List */}
          <div id="rooms-list" className="bg-vintage-black/50 border-2 border-vintage-gold/30 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-display font-bold text-vintage-gold flex items-center gap-2">
                <span>🎲</span>
                AVAILABLE ROOMS
              </h3>
              <div className="text-sm text-vintage-burnt-gold font-modern">
                {availableRooms?.length | 0} rooms active
              </div>
            </div>

            {!availableRooms || availableRooms.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4 opacity-50">🎰</div>
                <p className="text-vintage-burnt-gold font-modern text-lg">
                  No rooms available. Be the first to create one!
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {availableRooms.map((room: any) => {
                  const canJoin = room.status === "waiting" && !room.guestAddress;
                  const inProgress = room.status === "in-progress" || room.status === "ready";
                  const isFull = room.guestAddress && room.status === "waiting";

                  return (
                    <div
                      key={room._id}
                      className={`bg-vintage-charcoal border-2 rounded-xl p-4 transition-all ${
                        canJoin
                          ? "border-green-500/50 hover:border-green-500 hover:shadow-lg hover:shadow-green-500/20"
                          : inProgress
                          ? "border-blue-500/50 hover:border-blue-500"
                          : "border-vintage-gold/30"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        {/* Room Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="text-2xl">
                              {canJoin ? "🟢" : inProgress ? "🔵" : "⚪"}
                            </div>
                            <div>
                              <h4 className="text-lg font-bold text-vintage-gold">
                                {room.hostUsername}'s Room
                              </h4>
                              <div className="flex items-center gap-4 text-sm text-vintage-burnt-gold">
                                <span className="flex items-center gap-1">
                                  <span className="font-bold text-vintage-gold">{room.ante}</span>
                                  {room.token}
                                </span>
                                <span>•</span>
                                <span>
                                  {room.guestUsername ? `vs ${room.guestUsername}` : "Waiting for opponent"}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div className="flex items-center gap-2">
                            {canJoin && (
                              <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded-full border border-green-500/50">
                                OPEN
                              </span>
                            )}
                            {inProgress && (
                              <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded-full border border-blue-500/50 flex items-center gap-1">
                                <span className="animate-pulse">⚔️</span>
                                IN PROGRESS
                              </span>
                            )}
                            {isFull && (
                              <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-bold rounded-full border border-yellow-500/50">
                                STARTING...
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Button */}
                        <div>
                          {canJoin ? (
                            <button
                              onClick={() => handleJoinRoom(room.roomId, room.ante, room.token)}
                              disabled={isJoining}
                              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              JOIN
                            </button>
                          ) : inProgress ? (
                            <button
                              onClick={() => handleSpectate(room.roomId)}
                              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg flex items-center gap-2"
                            >
                              <span>👁️</span>
                              WATCH
                            </button>
                          ) : (
                            <div className="px-6 py-3 bg-vintage-black/50 text-vintage-burnt-gold font-bold rounded-xl">
                              FULL
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-vintage-charcoal rounded-2xl border-4 border-vintage-gold max-w-md w-full p-6 shadow-2xl shadow-vintage-gold/30">
            <h2 className="text-3xl font-display font-bold text-vintage-gold mb-6 text-center">
              🎰 CREATE ROOM
            </h2>

            {/* Token Display */}
            <div className="mb-6 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-2 border-yellow-400/30 rounded-xl p-4">
              <div className="text-center">
                <div className="text-sm text-vintage-burnt-gold mb-2">Betting Token</div>
                <div className="text-3xl font-bold text-yellow-400 mb-2">$VBMS</div>
                <div className="text-sm text-vintage-burnt-gold">
                  Your Balance: <span className="text-yellow-400 font-bold">
                    {walletAddress ? `${parseFloat(vbmsBalance).toFixed(2)}` : "Connect Wallet"}
                  </span>
                </div>
              </div>
            </div>

            {/* Stakes Selection */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-vintage-burnt-gold mb-3">
                STAKES (Entry Fee)
              </label>
              <div className="grid grid-cols-3 gap-3">
                {anteOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedAnte(option.value)}
                    className={`p-4 rounded-xl border-2 font-bold transition-all ${
                      selectedAnte === option.value
                        ? `bg-gradient-to-br ${option.color} text-white border-white shadow-lg`
                        : "bg-vintage-deep-black text-vintage-gold border-vintage-gold/30 hover:border-vintage-gold/60"
                    }`}
                  >
                    <div className="text-xs mb-1">{option.label}</div>
                    <div className="text-2xl">{option.value}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-vintage-gold/10 border border-vintage-gold/30 rounded-xl p-4 mb-6">
              <div className="text-sm text-vintage-burnt-gold space-y-2">
                <div className="flex justify-between">
                  <span>Your Stake:</span>
                  <span className="text-vintage-gold font-bold">
                    {selectedAnte} VBMS
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Pot:</span>
                  <span className="text-vintage-gold font-bold">
                    {selectedAnte * 2} VBMS
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  AudioManager.buttonNav();
                  setShowCreateModal(false);
                }}
                className="flex-1 px-6 py-4 bg-vintage-black hover:bg-vintage-charcoal text-vintage-gold border-2 border-vintage-gold/30 hover:border-vintage-gold/60 rounded-xl font-bold transition-all"
              >
                CANCEL
              </button>
              <button
                onClick={handleCreateRoom}
                disabled={isCreating}
                className="flex-1 px-6 py-4 bg-gradient-to-br from-vintage-gold to-vintage-burnt-gold hover:from-vintage-burnt-gold hover:to-vintage-gold text-vintage-black font-display font-bold rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-vintage-gold/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? "CREATING..." : "CREATE"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOADING OVERLAY - Shows during battle creation/joining */}
      {(isCreatingBattle || isCreatingBattleConfirming || isJoiningBattle || isJoiningBattleConfirming || (isApproving || isApprovingConfirming)) && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-[600]">
          <div className="bg-gradient-to-b from-vintage-charcoal to-vintage-deep-black rounded-2xl border-4 border-vintage-gold p-8 text-center shadow-2xl max-w-md mx-4 animate-in fade-in duration-300">
            {/* Animated Spinner */}
            <div className="mb-6 flex justify-center">
              <div className="w-16 h-16 border-4 border-vintage-gold/30 border-t-vintage-gold rounded-full animate-spin"></div>
            </div>

            {/* Status Message */}
            <h2 className="text-2xl font-display font-bold text-vintage-gold mb-4">
              {isApproving || isApprovingConfirming ? "Approving VBMS..." :
               isCreatingBattle || isCreatingBattleConfirming ? "Creating Battle..." :
               isJoiningBattle || isJoiningBattleConfirming ? "Joining Battle..." :
               "Processing..."}
            </h2>

            <p className="text-vintage-ice mb-4">
              {isApproving ? "Please confirm the approval transaction in your wallet" :
               isApprovingConfirming ? "Approval transaction confirming on blockchain..." :
               isCreatingBattle ? "Please confirm the battle creation transaction in your wallet" :
               isCreatingBattleConfirming ? "Battle creation transaction confirming on blockchain..." :
               isJoiningBattle ? "Please confirm the join battle transaction in your wallet" :
               isJoiningBattleConfirming ? "Join transaction confirming on blockchain..." :
               "Transaction processing..."}
            </p>

            <div className="bg-vintage-gold/10 rounded-lg p-4 border border-vintage-gold/30">
              <p className="text-xs text-vintage-burnt-gold">
                This may take 5-15 seconds. Please do not close this window or refresh the page.
              </p>
            </div>

            {/* Animated dots */}
            <div className="mt-4 flex justify-center gap-2">
              <div className="w-2 h-2 bg-vintage-gold rounded-full animate-pulse" style={{animationDelay: '0s'}}></div>
              <div className="w-2 h-2 bg-vintage-gold rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
              <div className="w-2 h-2 bg-vintage-gold rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
