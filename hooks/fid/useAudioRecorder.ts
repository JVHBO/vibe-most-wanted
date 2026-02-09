'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export interface AudioRecorderState {
  isRecording: boolean;
  isPaused: boolean;
  recordingTime: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  isSupported: boolean;
  permissionStatus: 'prompt' | 'granted' | 'denied' | 'unknown';
  error: string | null;
}

export interface UseAudioRecorderReturn extends AudioRecorderState {
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  cancelRecording: () => void;
  clearRecording: () => void;
}

const MAX_RECORDING_TIME = 15; // 15 seconds max

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [state, setState] = useState<AudioRecorderState>({
    isRecording: false,
    isPaused: false,
    recordingTime: 0,
    audioBlob: null,
    audioUrl: null,
    isSupported: false,
    permissionStatus: 'unknown',
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Check browser support on mount
  useEffect(() => {
    const isSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    setState(prev => ({ ...prev, isSupported }));

    // Check permission status if supported
    if (isSupported && navigator.permissions) {
      navigator.permissions.query({ name: 'microphone' as PermissionName })
        .then(result => {
          setState(prev => ({
            ...prev,
            permissionStatus: result.state as 'prompt' | 'granted' | 'denied'
          }));

          result.addEventListener('change', () => {
            setState(prev => ({
              ...prev,
              permissionStatus: result.state as 'prompt' | 'granted' | 'denied'
            }));
          });
        })
        .catch(() => {
          // Permission API not supported, will check on first use
        });
    }

    // Cleanup on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    if (!state.isSupported) {
      setState(prev => ({ ...prev, error: 'Audio recording not supported' }));
      return;
    }

    try {
      setState(prev => ({ ...prev, error: null }));

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        }
      });

      streamRef.current = stream;
      setState(prev => ({ ...prev, permissionStatus: 'granted' }));

      // Determine supported mime type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/wav';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);

        setState(prev => ({
          ...prev,
          isRecording: false,
          audioBlob: blob,
          audioUrl: url,
        }));

        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setState(prev => ({
          ...prev,
          isRecording: false,
          error: 'Recording error occurred'
        }));
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      startTimeRef.current = Date.now();

      setState(prev => ({
        ...prev,
        isRecording: true,
        recordingTime: 0,
        audioBlob: null,
        audioUrl: null,
      }));

      // Start timer
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);

        if (elapsed >= MAX_RECORDING_TIME) {
          // Auto-stop at max time
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
        } else {
          setState(prev => ({ ...prev, recordingTime: elapsed }));
        }
      }, 100);

    } catch (err: any) {
      console.error('Error starting recording:', err);

      let errorMessage = 'Failed to access microphone';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = 'Microphone permission denied';
        setState(prev => ({ ...prev, permissionStatus: 'denied' }));
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No microphone found';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Microphone is in use by another app';
      }

      setState(prev => ({ ...prev, error: errorMessage }));
    }
  }, [state.isSupported]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const cancelRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    // Clear the recorded data
    chunksRef.current = [];

    setState(prev => ({
      ...prev,
      isRecording: false,
      recordingTime: 0,
      audioBlob: null,
      audioUrl: null,
    }));
  }, []);

  const clearRecording = useCallback(() => {
    if (state.audioUrl) {
      URL.revokeObjectURL(state.audioUrl);
    }

    setState(prev => ({
      ...prev,
      audioBlob: null,
      audioUrl: null,
      recordingTime: 0,
    }));
  }, [state.audioUrl]);

  return {
    ...state,
    startRecording,
    stopRecording,
    cancelRecording,
    clearRecording,
  };
}
