/**
 * Voice Channel Panel
 *
 * UI for group voice chat in poker rooms
 * Shows all participants with mute controls
 */

import { GroupVoiceChatState, VoiceUser } from '@/lib/hooks/useGroupVoiceChat';

interface VoiceChannelPanelProps {
  voiceState: GroupVoiceChatState;
  onJoinChannel: () => void;
  onLeaveChannel: () => void;
  onToggleMute: () => void;
  onToggleUserMute: (userAddress: string) => void;
}

export function VoiceChannelPanel({
  voiceState,
  onJoinChannel,
  onLeaveChannel,
  onToggleMute,
  onToggleUserMute
}: VoiceChannelPanelProps) {
  if (!voiceState.isInChannel) {
    return (
      <div className="border-t border-vintage-gold/30 pt-2">
        <button
          onClick={onJoinChannel}
          className="w-full px-2 py-2 bg-green-500/20 hover:bg-green-500/40 border border-green-500/50 rounded text-[10px] font-bold text-green-400 transition flex items-center justify-center gap-1"
        >
          📞 JOIN VOICE
        </button>
        {voiceState.error && (
          <div className="text-[8px] text-red-400 text-center mt-1">
            {voiceState.error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="border-t border-vintage-gold/30 pt-2 space-y-2">
      {/* Self controls */}
      <div className="flex gap-1">
        <button
          onClick={onToggleMute}
          className={`flex-1 px-2 py-1.5 border rounded text-[10px] font-bold transition ${
            voiceState.isMuted
              ? 'bg-red-500/20 hover:bg-red-500/40 border-red-500/50 text-red-400'
              : 'bg-green-500/20 hover:bg-green-500/40 border-green-500/50 text-green-400'
          }`}
        >
          {voiceState.isMuted ? '🔇' : '🎤'}
        </button>
        <button
          onClick={onLeaveChannel}
          className="flex-1 px-2 py-1.5 bg-red-500/20 hover:bg-red-500/40 border border-red-500/50 rounded text-[10px] font-bold text-red-400 transition"
        >
          📵 LEAVE
        </button>
      </div>

      {/* Other users */}
      {voiceState.users.length > 0 && (
        <div className="space-y-1 max-h-[120px] overflow-y-auto custom-scrollbar">
          <div className="text-[8px] text-vintage-burnt-gold text-center border-b border-vintage-gold/20 pb-1">
            IN VOICE ({voiceState.users.length})
          </div>
          {voiceState.users.map((user) => (
            <div
              key={user.address}
              className="flex items-center gap-1 px-1.5 py-1 bg-vintage-charcoal/50 rounded border border-vintage-gold/20"
            >
              {/* Speaking indicator */}
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  user.isSpeaking ? 'bg-green-400 animate-pulse' : 'bg-gray-600'
                }`}
              />

              {/* Username */}
              <span className="flex-1 text-[9px] text-vintage-ice truncate">
                {user.username}
              </span>

              {/* Mute button */}
              <button
                onClick={() => onToggleUserMute(user.address)}
                className={`px-1 py-0.5 rounded text-[10px] transition ${
                  user.isMutedByMe
                    ? 'text-red-400 hover:text-red-300'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
                title={user.isMutedByMe ? 'Unmute' : 'Mute'}
              >
                {user.isMutedByMe ? '🔇' : '🔊'}
              </button>
            </div>
          ))}
        </div>
      )}

      {voiceState.error && (
        <div className="text-[8px] text-red-400 text-center">
          {voiceState.error}
        </div>
      )}
    </div>
  );
}
