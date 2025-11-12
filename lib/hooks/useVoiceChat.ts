/**
 * WebRTC Voice Chat Hook
 *
 * Real-time peer-to-peer voice communication for poker battles
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { devLog, devError } from '@/lib/utils/logger';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

export interface VoiceChatState {
  isConnected: boolean;
  isMuted: boolean;
  isCallActive: boolean;
  error: string | null;
}

export function useVoiceChat(
  roomId: string | null,
  isHost: boolean,
  localAddress: string,
  remoteAddress: string
) {
  const [state, setState] = useState<VoiceChatState>({
    isConnected: false,
    isMuted: false,
    isCallActive: false,
    error: null
  });

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteAudio = useRef<HTMLAudioElement | null>(null);

  // Convex mutations and queries
  const sendSignal = useMutation(api.voiceChat.sendSignal);
  const markSignalsProcessed = useMutation(api.voiceChat.markSignalsProcessed);
  const signals = useQuery(
    api.voiceChat.getSignals,
    roomId ? { recipient: localAddress, roomId } : "skip"
  );

  // Initialize WebRTC
  const initWebRTC = useCallback(async () => {
    try {
      devLog('[VoiceChat] Initializing WebRTC...');

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      localStream.current = stream;
      devLog('[VoiceChat] Microphone access granted');

      // Create peer connection with public STUN servers
      const config: RTCConfiguration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      };

      const pc = new RTCPeerConnection(config);
      peerConnection.current = pc;

      // Add local audio track
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Handle remote audio
      pc.ontrack = (event) => {
        devLog('[VoiceChat] Received remote audio track');
        if (!remoteAudio.current) {
          remoteAudio.current = new Audio();
          remoteAudio.current.autoplay = true;
        }
        remoteAudio.current.srcObject = event.streams[0];
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && roomId) {
          devLog('[VoiceChat] New ICE candidate', event.candidate.candidate);
          // Send candidate to peer via Convex
          sendSignal({
            roomId,
            sender: localAddress,
            recipient: remoteAddress,
            type: "ice-candidate",
            data: event.candidate.toJSON(),
          }).catch((error) => {
            devError('[VoiceChat] Failed to send ICE candidate:', error);
          });
        }
      };

      pc.onconnectionstatechange = () => {
        devLog('[VoiceChat] Connection state:', pc.connectionState);
        setState(prev => ({
          ...prev,
          isConnected: pc.connectionState === 'connected',
          isCallActive: pc.connectionState === 'connected'
        }));
      };

      setState(prev => ({ ...prev, error: null }));
      return pc;

    } catch (error) {
      devError('[VoiceChat] Failed to initialize:', error);
      setState(prev => ({
        ...prev,
        error: 'Microphone access denied or not available'
      }));
      return null;
    }
  }, [roomId, localAddress, remoteAddress, sendSignal]);

  // Start call (host creates offer)
  const startCall = useCallback(async () => {
    devLog('[VoiceChat] Starting call as host...');

    const pc = await initWebRTC();
    if (!pc) return;

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      devLog('[VoiceChat] Offer created');

      // Send offer to peer via Convex
      if (roomId) {
        await sendSignal({
          roomId,
          sender: localAddress,
          recipient: remoteAddress,
          type: "offer",
          data: offer,
        });
      }

    } catch (error) {
      devError('[VoiceChat] Failed to create offer:', error);
    }
  }, [initWebRTC, roomId, localAddress, remoteAddress, sendSignal]);

  // Answer call (guest receives offer and creates answer)
  const answerCall = useCallback(async (offer: RTCSessionDescriptionInit) => {
    devLog('[VoiceChat] Answering call as guest...');

    const pc = await initWebRTC();
    if (!pc) return;

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      devLog('[VoiceChat] Answer created');

      // Send answer to peer via Convex
      if (roomId) {
        await sendSignal({
          roomId,
          sender: localAddress,
          recipient: remoteAddress,
          type: "answer",
          data: answer,
        });
      }

    } catch (error) {
      devError('[VoiceChat] Failed to answer call:', error);
    }
  }, [initWebRTC, roomId, localAddress, remoteAddress, sendSignal]);

  // Handle received answer
  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit) => {
    if (!peerConnection.current) return;

    try {
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
      devLog('[VoiceChat] Remote description set');
    } catch (error) {
      devError('[VoiceChat] Failed to set remote description:', error);
    }
  }, []);

  // Handle received ICE candidate
  const handleIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    if (!peerConnection.current) return;

    try {
      await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      devLog('[VoiceChat] ICE candidate added');
    } catch (error) {
      devError('[VoiceChat] Failed to add ICE candidate:', error);
    }
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (!localStream.current) return;

    const audioTrack = localStream.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setState(prev => ({ ...prev, isMuted: !audioTrack.enabled }));
      devLog('[VoiceChat] Mute toggled:', !audioTrack.enabled);
    }
  }, []);

  // End call
  const endCall = useCallback(() => {
    devLog('[VoiceChat] Ending call...');

    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
      localStream.current = null;
    }

    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    if (remoteAudio.current) {
      remoteAudio.current.srcObject = null;
      remoteAudio.current = null;
    }

    setState({
      isConnected: false,
      isMuted: false,
      isCallActive: false,
      error: null
    });
  }, []);

  // Listen for incoming signals
  useEffect(() => {
    if (!signals || signals.length === 0) return;

    const processSignals = async () => {
      for (const signal of signals) {
        try {
          devLog('[VoiceChat] Processing signal:', signal.type);

          if (signal.type === 'offer') {
            await answerCall(signal.data);
          } else if (signal.type === 'answer') {
            await handleAnswer(signal.data);
          } else if (signal.type === 'ice-candidate') {
            await handleIceCandidate(signal.data);
          }
        } catch (error) {
          devError('[VoiceChat] Failed to process signal:', error);
        }
      }

      // Mark all signals as processed
      const signalIds = signals.map((s: any) => s._id);
      await markSignalsProcessed({ signalIds });
    };

    processSignals();
  }, [signals, answerCall, handleAnswer, handleIceCandidate, markSignalsProcessed]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, [endCall]);

  return {
    ...state,
    startCall,
    answerCall,
    handleAnswer,
    handleIceCandidate,
    toggleMute,
    endCall
  };
}
