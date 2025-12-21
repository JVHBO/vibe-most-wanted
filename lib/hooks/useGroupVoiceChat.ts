/**
 * Group Voice Chat Hook
 *
 * Multi-user voice chat for poker rooms (players + spectators)
 * Each user can:
 * - Mute/unmute themselves
 * - Mute/unmute others (locally)
 * - Join/leave voice channel
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { devLog, devError } from '@/lib/utils/logger';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { sdk } from '@farcaster/miniapp-sdk';

export interface VoiceUser {
  address: string;
  username: string;
  isSpeaking: boolean;
  isMutedByMe: boolean;
  volume: number; // 0-100
}

export interface GroupVoiceChatState {
  isConnected: boolean;
  isMuted: boolean;
  isInChannel: boolean;
  users: VoiceUser[];
  error: string | null;
}

export function useGroupVoiceChat(
  roomId: string | null,
  localAddress: string,
  localUsername: string
) {
  const [state, setState] = useState<GroupVoiceChatState>({
    isConnected: false,
    isMuted: false,
    isInChannel: false,
    users: [],
    error: null
  });

  // Refs for WebRTC connections
  const localStream = useRef<MediaStream | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteAudios = useRef<Map<string, HTMLAudioElement>>(new Map());
  const locallyMutedUsers = useRef<Set<string>>(new Set());
  const userVolumes = useRef<Map<string, number>>(new Map()); // Store volumes 0-100

  // Convex mutations and queries
  const sendSignal = useMutation(api.voiceChat.sendSignal);
  const markSignalsProcessed = useMutation(api.voiceChat.markSignalsProcessed);
  const signals = useQuery(
    api.voiceChat.getSignals,
    roomId ? { recipient: localAddress, roomId } : "skip"
  );

  // Check if running in Farcaster miniapp context (with proper validation)
  const isInFarcasterMiniapp = useCallback(async (): Promise<boolean> => {
    try {
      if (typeof window === 'undefined') return false;
      if (typeof sdk === 'undefined' || !sdk.actions) return false;

      // Verify SDK context is actually valid (not just SDK exists)
      try {
        const context = await Promise.race([
          sdk.context,
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000))
        ]) as any;

        // Must have valid user context
        if (!context?.user?.fid) {
          devLog('[GroupVoice] SDK exists but no valid user context');
          return false;
        }

        devLog('[GroupVoice] Valid Farcaster context - FID:', context.user.fid);
        return true;
      } catch {
        devLog('[GroupVoice] Failed to get Farcaster context');
        return false;
      }
    } catch {
      return false;
    }
  }, []);

  // Initialize local audio stream
  const initLocalAudio = useCallback(async () => {
    try {
      devLog('[GroupVoice] Requesting microphone access...');

      // Check if in Farcaster miniapp with valid context
      const inFarcaster = await isInFarcasterMiniapp();
      devLog('[GroupVoice] Farcaster miniapp detected:', inFarcaster);

      // If in Farcaster miniapp, request permission via SDK first
      // Note: This only works on native Warpcast app, not web miniapps
      if (inFarcaster) {
        try {
          devLog('[GroupVoice] Detected Farcaster miniapp, requesting SDK permission...');
          await sdk.actions.requestCameraAndMicrophoneAccess();
          devLog('[GroupVoice] Farcaster SDK permission granted');
        } catch (sdkError) {
          devError('[GroupVoice] Farcaster SDK permission denied:', sdkError);
          // Check if this is a web miniapp (always rejects)
          const errorMessage = sdkError instanceof Error ? sdkError.message : String(sdkError);
          if (errorMessage.includes('not supported') || errorMessage.includes('web')) {
            setState(prev => ({
              ...prev,
              error: 'Voice chat requires the Warpcast mobile app'
            }));
            return null;
          }
          setState(prev => ({
            ...prev,
            error: 'Microphone permission denied by Farcaster'
          }));
          return null;
        }
      }

      // Now request browser microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      localStream.current = stream;
      devLog('[GroupVoice] Microphone access granted');

      setState(prev => ({ ...prev, error: null }));
      return stream;
    } catch (error) {
      devError('[GroupVoice] Failed to get microphone:', error);

      // Provide more helpful error message for permission policy violations
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Permissions policy') || errorMessage.includes('not allowed')) {
        setState(prev => ({
          ...prev,
          error: 'Voice chat requires the Warpcast mobile app'
        }));
      } else {
        setState(prev => ({
          ...prev,
          error: 'Microphone access denied'
        }));
      }
      return null;
    }
  }, [isInFarcasterMiniapp]);

  // Create peer connection for a specific user
  const createPeerConnection = useCallback(async (
    remoteAddress: string,
    isInitiator: boolean
  ): Promise<RTCPeerConnection | undefined> => {
    try {
      devLog('[GroupVoice] Creating peer connection with:', remoteAddress);

      // Don't create if already exists
      if (peerConnections.current.has(remoteAddress)) {
        devLog('[GroupVoice] Peer connection already exists for:', remoteAddress);
        return peerConnections.current.get(remoteAddress)!;
      }

      const config: RTCConfiguration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      };

      const pc = new RTCPeerConnection(config);
      peerConnections.current.set(remoteAddress, pc);

      // Add local audio track
      if (localStream.current) {
        localStream.current.getTracks().forEach(track => {
          pc.addTrack(track, localStream.current!);
        });
      }

      // Handle remote audio
      pc.ontrack = (event) => {
        devLog('[GroupVoice] Received remote audio from:', remoteAddress);

        let audio = remoteAudios.current.get(remoteAddress);
        if (!audio) {
          audio = new Audio();
          audio.autoplay = true;
          remoteAudios.current.set(remoteAddress, audio);
        }

        audio.srcObject = event.streams[0];

        // Apply local mute if user was muted
        if (locallyMutedUsers.current.has(remoteAddress)) {
          audio.volume = 0;
        } else {
          // Apply saved volume or default to 100%
          const savedVolume = userVolumes.current.get(remoteAddress) ?? 100;
          audio.volume = savedVolume / 100;
        }

        // Update speaking indicator
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(event.streams[0]);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const checkSpeaking = () => {
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          const isSpeaking = average > 20; // Threshold for speaking

          setState(prev => ({
            ...prev,
            users: prev.users.map(u =>
              u.address === remoteAddress
                ? { ...u, isSpeaking }
                : u
            )
          }));

          if (audio && audio.srcObject) {
            requestAnimationFrame(checkSpeaking);
          }
        };

        checkSpeaking();
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && roomId) {
          sendSignal({
            roomId,
            sender: localAddress,
            recipient: remoteAddress,
            type: "ice-candidate",
            data: event.candidate.toJSON(),
          }).catch((error) => {
            devError('[GroupVoice] Failed to send ICE candidate:', error);
          });
        }
      };

      pc.onconnectionstatechange = () => {
        devLog('[GroupVoice] Connection state with', remoteAddress, ':', pc.connectionState);

        if (pc.connectionState === 'connected') {
          setState(prev => ({ ...prev, isConnected: true }));
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          // Clean up this connection
          peerConnections.current.delete(remoteAddress);
          const audio = remoteAudios.current.get(remoteAddress);
          if (audio) {
            audio.srcObject = null;
            remoteAudios.current.delete(remoteAddress);
          }
        }
      };

      // If initiator, create offer
      if (isInitiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        if (roomId) {
          await sendSignal({
            roomId,
            sender: localAddress,
            recipient: remoteAddress,
            type: "offer",
            data: offer,
          });
        }
      }

      return pc;
    } catch (error) {
      devError('[GroupVoice] Failed to create peer connection:', error);
      return undefined;
    }
  }, [roomId, localAddress, sendSignal]);

  // Mutations for tracking voice participants
  const joinVoiceChannelMutation = useMutation(api.voiceChat.joinVoiceChannel);
  const leaveVoiceChannelMutation = useMutation(api.voiceChat.leaveVoiceChannel);

  // Join voice channel
  const joinChannel = useCallback(async (participants: Array<{ address: string; username: string }>) => {
    devLog('[GroupVoice] Joining channel with participants:', participants);

    // Initialize local audio
    const stream = await initLocalAudio();
    if (!stream) return;

    setState(prev => ({
      ...prev,
      isInChannel: true,
      users: participants
        .filter(p => p.address !== localAddress)
        .map(p => ({
          address: p.address,
          username: p.username,
          isSpeaking: false,
          isMutedByMe: false,
          volume: userVolumes.current.get(p.address) ?? 100
        }))
    }));

    // Track voice participation in Convex (for incoming call notifications)
    if (roomId) {
      joinVoiceChannelMutation({
        roomId,
        address: localAddress,
        username: localUsername,
      }).catch(err => devError('[GroupVoice] Failed to track voice join:', err));
    }

    // Create peer connections with all participants
    // We initiate connections with users who have "higher" addresses (alphabetically)
    // This prevents duplicate connections
    for (const participant of participants) {
      if (participant.address !== localAddress) {
        const shouldInitiate = localAddress.toLowerCase() > participant.address.toLowerCase();
        await createPeerConnection(participant.address, shouldInitiate);
      }
    }
  }, [localAddress, localUsername, roomId, initLocalAudio, createPeerConnection, joinVoiceChannelMutation]);

  // Leave voice channel
  const leaveChannel = useCallback(() => {
    devLog('[GroupVoice] Leaving channel');

    // Stop local stream
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
      localStream.current = null;
    }

    // Close all peer connections
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();

    // Clean up remote audios
    remoteAudios.current.forEach(audio => {
      audio.srcObject = null;
    });
    remoteAudios.current.clear();

    // Track leaving voice in Convex
    if (roomId) {
      leaveVoiceChannelMutation({
        roomId,
        address: localAddress,
      }).catch(err => devError('[GroupVoice] Failed to track voice leave:', err));
    }

    setState({
      isConnected: false,
      isMuted: false,
      isInChannel: false,
      users: [],
      error: null
    });
  }, [roomId, localAddress, leaveVoiceChannelMutation]);

  // Toggle self mute
  const toggleMute = useCallback(() => {
    if (!localStream.current) return;

    const audioTrack = localStream.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setState(prev => ({ ...prev, isMuted: !audioTrack.enabled }));
      devLog('[GroupVoice] Self mute toggled:', !audioTrack.enabled);
    }
  }, []);

  // Toggle mute for specific user (local only)
  const toggleUserMute = useCallback((userAddress: string) => {
    const audio = remoteAudios.current.get(userAddress);
    if (!audio) return;

    const isMuted = locallyMutedUsers.current.has(userAddress);

    if (isMuted) {
      locallyMutedUsers.current.delete(userAddress);
      const savedVolume = userVolumes.current.get(userAddress) ?? 100;
      audio.volume = savedVolume / 100;
    } else {
      locallyMutedUsers.current.add(userAddress);
      audio.volume = 0;
    }

    setState(prev => ({
      ...prev,
      users: prev.users.map(u =>
        u.address === userAddress
          ? { ...u, isMutedByMe: !isMuted }
          : u
      )
    }));

    devLog('[GroupVoice] User mute toggled:', userAddress, !isMuted);
  }, []);

  // Set volume for specific user (0-100)
  const setUserVolume = useCallback((userAddress: string, volume: number) => {
    const audio = remoteAudios.current.get(userAddress);
    if (!audio) return;

    // Clamp volume between 0-100
    const clampedVolume = Math.max(0, Math.min(100, volume));

    // Save volume preference
    userVolumes.current.set(userAddress, clampedVolume);

    // Apply volume if not muted
    if (!locallyMutedUsers.current.has(userAddress)) {
      audio.volume = clampedVolume / 100;
    }

    setState(prev => ({
      ...prev,
      users: prev.users.map(u =>
        u.address === userAddress
          ? { ...u, volume: clampedVolume }
          : u
      )
    }));

    devLog('[GroupVoice] User volume set:', userAddress, clampedVolume);
  }, []);

  // Process incoming signals
  useEffect(() => {
    if (!signals || signals.length === 0) return;

    const processSignals = async () => {
      for (const signal of signals) {
        try {
          devLog('[GroupVoice] Processing signal:', signal.type, 'from:', signal.sender);

          let pc = peerConnections.current.get(signal.sender);

          if (signal.type === 'offer') {
            // Create connection if doesn't exist
            if (!pc) {
              pc = await createPeerConnection(signal.sender, false);
            }

            if (pc) {
              await pc.setRemoteDescription(new RTCSessionDescription(signal.data));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);

              if (roomId) {
                await sendSignal({
                  roomId,
                  sender: localAddress,
                  recipient: signal.sender,
                  type: "answer",
                  data: answer,
                });
              }
            }
          } else if (signal.type === 'answer') {
            if (pc) {
              await pc.setRemoteDescription(new RTCSessionDescription(signal.data));
            }
          } else if (signal.type === 'ice-candidate') {
            if (pc) {
              await pc.addIceCandidate(new RTCIceCandidate(signal.data));
            }
          }
        } catch (error) {
          devError('[GroupVoice] Failed to process signal:', error);
        }
      }

      // Mark all signals as processed
      const signalIds = signals.map((s: any) => s._id);
      await markSignalsProcessed({ signalIds });
    };

    processSignals();
  }, [signals, roomId, localAddress, sendSignal, markSignalsProcessed, createPeerConnection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveChannel();
    };
  }, [leaveChannel]);

  return {
    ...state,
    joinChannel,
    leaveChannel,
    toggleMute,
    toggleUserMute,
    setUserVolume
  };
}
