"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AudioManager } from "@/lib/audio-manager";

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
  const [selectedAnte, setSelectedAnte] = useState(25);
  const [selectedToken, setSelectedToken] = useState<"TESTVBMS" | "testUSDC" | "VIBE_NFT">("TESTVBMS");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isAutoMatching, setIsAutoMatching] = useState(false);
  const [hasCheckedExistingRoom, setHasCheckedExistingRoom] = useState(false);

  // Queries
  const availableRooms = useQuery(api.pokerBattle.getPokerRooms);
  const myRoom = useQuery(api.pokerBattle.getMyPokerRoom, {
    address: playerAddress,
  });

  // Mutations
  const createRoom = useMutation(api.pokerBattle.createPokerRoom);
  const joinRoom = useMutation(api.pokerBattle.joinPokerRoom);
  const autoMatch = useMutation(api.pokerBattle.autoMatch);
  const spectate = useMutation(api.pokerBattle.spectateRoom);
  const leaveRoom = useMutation(api.pokerBattle.leavePokerRoom);

  // Check if player is already in a room on mount - but only run once to prevent auto-start
  useEffect(() => {
    if (myRoom && !hasCheckedExistingRoom) {
      setHasCheckedExistingRoom(true);
      const isHost = myRoom.hostAddress === playerAddress.toLowerCase();
      onRoomJoined(myRoom.roomId, isHost, myRoom.ante, myRoom.token);
    }
  }, [myRoom, hasCheckedExistingRoom]);

  const handleCreateRoom = async () => {
    if (isCreating) return;

    setIsCreating(true);
    AudioManager.buttonClick();

    try {
      const result = await createRoom({
        address: playerAddress,
        username: playerUsername,
        ante: selectedAnte,
        token: selectedToken as 'TESTVBMS' | 'testUSDC',
      });

      if (result.success) {
        setShowCreateModal(false);
        AudioManager.buttonSuccess();
        onRoomJoined(result.roomId, true, selectedAnte, selectedToken);
      }
    } catch (error) {
      console.error("Error creating room:", error);
      AudioManager.buttonError();
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async (roomId: string, ante: number, token: string) => {
    if (isJoining) return;

    setIsJoining(true);
    AudioManager.buttonClick();

    try {
      const result = await joinRoom({
        roomId,
        address: playerAddress,
        username: playerUsername,
      });

      if (result.success) {
        AudioManager.buttonSuccess();
        onRoomJoined(roomId, false, ante, token);
      }
    } catch (error) {
      console.error("Error joining room:", error);
      AudioManager.buttonError();
    } finally {
      setIsJoining(false);
    }
  };

  const handleAutoMatch = async () => {
    if (isAutoMatching) return;

    setIsAutoMatching(true);
    AudioManager.buttonClick();

    try {
      const result = await autoMatch({
        address: playerAddress,
        username: playerUsername,
        ante: selectedAnte,
        token: selectedToken,
      });

      if (result.success) {
        const isHost = result.action === "created";
        AudioManager.buttonSuccess();
        onRoomJoined(result.roomId, isHost, selectedAnte, selectedToken);
      }
    } catch (error) {
      console.error("Error auto-matching:", error);
      AudioManager.buttonError();
    } finally {
      setIsAutoMatching(false);
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

  const anteOptions = [
    { value: 2, label: "Micro", color: "from-gray-600 to-gray-700" },
    { value: 10, label: "Low", color: "from-green-600 to-green-700" },
    { value: 50, label: "Mid", color: "from-yellow-600 to-yellow-700" },
    { value: 200, label: "High", color: "from-red-600 to-red-700" },
  ];

  return (
    <div className="fixed inset-0 bg-vintage-deep-black/95 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 pb-20 sm:pb-4">
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
              ⚙️ ROOM SETTINGS
            </h3>

            <div className="grid md:grid-cols-2 gap-3 sm:gap-6">
              {/* Token Selection */}
              <div>
                <label className="block text-sm font-bold text-vintage-burnt-gold mb-3">
                  BETTING TOKEN
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setSelectedToken("TESTVBMS")}
                    className={`px-6 py-4 rounded-xl font-bold transition-all ${
                      selectedToken === "TESTVBMS"
                        ? "bg-vintage-gold text-vintage-black border-2 border-vintage-gold shadow-gold"
                        : "bg-vintage-charcoal text-vintage-gold border-2 border-vintage-gold/30 hover:border-vintage-gold/60"
                    }`}
                  >
                    <div className="text-lg">$TESTVBMS</div>
                    <div className="text-[10px] text-vintage-burnt-gold mt-1">Main Token</div>
                  </button>
                  <button
                    onClick={() => setSelectedToken("testUSDC")}
                    className={`px-6 py-4 rounded-xl font-bold transition-all ${
                      selectedToken === "testUSDC"
                        ? "bg-green-500 text-white border-2 border-green-400 shadow-lg shadow-green-500/30"
                        : "bg-vintage-charcoal text-vintage-gold border-2 border-vintage-gold/30 hover:border-vintage-gold/60"
                    }`}
                  >
                    <div className="text-lg">testUSDC</div>
                    <div className="text-[10px] opacity-70 mt-1">Stablecoin</div>
                  </button>
                </div>
                <div className="mt-3 bg-blue-900/20 border border-blue-500/30 rounded-xl p-3">
                  <p className="text-blue-300 text-xs">
                    💡 NFT cards are used for gameplay power - coins are bet for prizes
                  </p>
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
          </div>

          {/* Available Rooms List */}
          <div id="rooms-list" className="bg-vintage-black/50 border-2 border-vintage-gold/30 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-display font-bold text-vintage-gold flex items-center gap-2">
                <span>🎲</span>
                AVAILABLE ROOMS
              </h3>
              <div className="text-sm text-vintage-burnt-gold font-modern">
                {availableRooms?.length || 0} rooms active
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

            {/* Token Selection */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-vintage-burnt-gold mb-3">
                BETTING TOKEN
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedToken("TESTVBMS")}
                  className={`px-6 py-4 rounded-xl font-bold transition-all ${
                    selectedToken === "TESTVBMS"
                      ? "bg-vintage-gold text-vintage-black border-2 border-vintage-gold shadow-gold"
                      : "bg-vintage-deep-black text-vintage-gold border-2 border-vintage-gold/30 hover:border-vintage-gold/60"
                  }`}
                >
                  <div className="text-lg">$TESTVBMS</div>
                  <div className="text-[10px] text-vintage-burnt-gold mt-1">Main Token</div>
                </button>
                <button
                  onClick={() => setSelectedToken("testUSDC")}
                  className={`px-6 py-4 rounded-xl font-bold transition-all ${
                    selectedToken === "testUSDC"
                      ? "bg-green-500 text-white border-2 border-green-400 shadow-lg shadow-green-500/30"
                      : "bg-vintage-deep-black text-vintage-gold border-2 border-vintage-gold/30 hover:border-vintage-gold/60"
                  }`}
                >
                  <div className="text-lg">testUSDC</div>
                  <div className="text-[10px] opacity-70 mt-1">Stablecoin</div>
                </button>
              </div>
              <div className="mt-3 bg-blue-900/20 border border-blue-500/30 rounded-xl p-3">
                <p className="text-blue-300 text-xs">
                  💡 NFT cards are used for gameplay power - coins are bet for prizes
                </p>
              </div>
            </div>

            {/* Stakes Selection */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-vintage-burnt-gold mb-3">
                STAKES (Entry Fee)
              </label>
              <div className="grid grid-cols-2 gap-3">
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
                  <span>Starting Bankroll:</span>
                  <span className="text-vintage-gold font-bold">
                    {selectedAnte * 50} {selectedToken}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Max Pot:</span>
                  <span className="text-vintage-gold font-bold">
                    {selectedAnte * 100} {selectedToken}
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
    </div>
  );
}
