'use client';

import { useState, useRef, useEffect } from 'react';
import { useAudioRecorder } from "@/hooks/fid/useAudioRecorder";
import { useMutation } from 'convex/react';
import { api } from "@/lib/fid/convex-generated/api";
import { useLanguage } from '@/contexts/LanguageContext';

interface AudioRecorderProps {
  onAudioReady: (audioId: string) => void;
  onClear: () => void;
  currentAudioId: string | null;
  disabled?: boolean;
}

const MAX_DURATION = 15;

export function AudioRecorder({ onAudioReady, onClear, currentAudioId, disabled }: AudioRecorderProps) {
  const { lang } = useLanguage();
  const {
    isRecording,
    recordingTime,
    audioBlob,
    audioUrl,
    isSupported,
    permissionStatus,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    clearRecording,
  } = useAudioRecorder();

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const generateUploadUrl = useMutation(api.audioStorage.generateUploadUrl);

  // Check if current audio is a custom recording
  const isCustomAudio = currentAudioId?.startsWith('custom:');
  const hasRecordedAudio = audioBlob && audioUrl;

  // Translations
  const translations: Record<string, {
    record: string; recording: string; stop: string; preview: string;
    send: string; reRecord: string; delete: string; notSupported: string;
    permissionDenied: string; uploading: string; recorded: string; maxTime: string;
  }> = {
    en: {
      record: 'Record voice',
      recording: 'Recording...',
      stop: 'Stop',
      preview: 'Preview',
      send: 'Use this',
      reRecord: 'Re-record',
      delete: 'Delete',
      notSupported: 'Recording not supported',
      permissionDenied: 'Allow microphone access',
      uploading: 'Uploading...',
      recorded: 'Voice recorded',
      maxTime: `Max ${MAX_DURATION}s`,
    },
    pt: {
      record: 'Gravar voz',
      recording: 'Gravando...',
      stop: 'Parar',
      preview: 'Ouvir',
      send: 'Usar esse',
      reRecord: 'Regravar',
      delete: 'Apagar',
      notSupported: 'Gravacao nao suportada',
      permissionDenied: 'Permita acesso ao microfone',
      uploading: 'Enviando...',
      recorded: 'Voz gravada',
      maxTime: `Max ${MAX_DURATION}s`,
    },
    es: {
      record: 'Grabar voz',
      recording: 'Grabando...',
      stop: 'Parar',
      preview: 'Escuchar',
      send: 'Usar este',
      reRecord: 'Regrabar',
      delete: 'Borrar',
      notSupported: 'Grabacion no soportada',
      permissionDenied: 'Permite acceso al microfono',
      uploading: 'Subiendo...',
      recorded: 'Voz grabada',
      maxTime: `Max ${MAX_DURATION}s`,
    },
  };
  const t = translations[lang] || {
    record: 'Record voice',
    recording: 'Recording...',
    stop: 'Stop',
    preview: 'Preview',
    send: 'Use this',
    reRecord: 'Re-record',
    delete: 'Delete',
    notSupported: 'Recording not supported',
    permissionDenied: 'Allow microphone access',
    uploading: 'Uploading...',
    recorded: 'Voice recorded',
    maxTime: `Max ${MAX_DURATION}s`,
  };

  const handleUploadAndSend = async () => {
    if (!audioBlob) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      // Get upload URL from Convex
      const uploadUrl = await generateUploadUrl();

      // Upload the audio blob
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': audioBlob.type,
        },
        body: audioBlob,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const { storageId } = await response.json();

      // Create custom audio ID with prefix
      const customAudioId = `custom:${storageId}`;
      onAudioReady(customAudioId);

      // Clear local recording state
      clearRecording();
    } catch (err) {
      console.error('Upload error:', err);
      setUploadError('Failed to upload audio');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePlayPause = () => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    } else {
      audioRef.current.src = audioUrl;
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  const handleClear = () => {
    clearRecording();
    onClear();
    setIsPlaying(false);
  };

  // Stop playing when audio ends
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => setIsPlaying(false);
    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, []);

  // Not supported
  if (!isSupported) {
    return (
      <div className="text-vintage-ice/50 text-xs text-center py-2">
        {t.notSupported}
      </div>
    );
  }

  // Permission denied
  if (permissionStatus === 'denied') {
    return (
      <div className="text-red-400 text-xs text-center py-2">
        {t.permissionDenied}
      </div>
    );
  }

  // Already has custom audio selected (from previous upload)
  if (isCustomAudio && !hasRecordedAudio) {
    return (
      <div className="flex items-center gap-2 bg-vintage-gold/10 border border-vintage-gold/30 rounded-lg p-2">
        <div className="w-8 h-8 rounded-full bg-vintage-gold flex items-center justify-center">
          <span className="text-black text-sm">🎤</span>
        </div>
        <div className="flex-1">
          <p className="text-vintage-gold font-bold text-xs">{t.recorded}</p>
        </div>
        <button
          onClick={handleClear}
          className="text-red-400 text-xs hover:text-red-300"
          disabled={disabled}
        >
          {t.delete}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <audio ref={audioRef} />

      {/* Recording state */}
      {isRecording && (
        <div className="flex items-center gap-3 bg-red-500/20 border border-red-500/50 rounded-lg p-3">
          <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
            <span className="text-white text-lg">🎤</span>
          </div>
          <div className="flex-1">
            <p className="text-red-400 font-bold text-sm">{t.recording}</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-red-500/30 rounded-full h-1">
                <div
                  className="bg-red-500 h-1 rounded-full transition-all"
                  style={{ width: `${(recordingTime / MAX_DURATION) * 100}%` }}
                />
              </div>
              <span className="text-red-400 text-xs font-mono">
                {recordingTime}s / {MAX_DURATION}s
              </span>
            </div>
          </div>
          <button
            onClick={stopRecording}
            className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white font-bold hover:bg-red-600 transition-colors"
          >
            ⏹
          </button>
        </div>
      )}

      {/* Preview state - has recorded audio */}
      {hasRecordedAudio && !isRecording && (
        <div className="flex items-center gap-2 bg-vintage-gold/10 border border-vintage-gold/30 rounded-lg p-2">
          <button
            onClick={handlePlayPause}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors ${
              isPlaying
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-vintage-gold text-black'
            }`}
          >
            {isPlaying ? '⏹' : '▶'}
          </button>
          <div className="flex-1">
            <p className="text-vintage-gold font-bold text-xs">
              {isPlaying ? t.preview : t.recorded}
            </p>
            <p className="text-vintage-ice/50 text-[10px]">
              {recordingTime}s
            </p>
          </div>
          <div className="flex gap-1">
            <button
              onClick={handleUploadAndSend}
              disabled={isUploading || disabled}
              className="px-2 py-1 bg-vintage-gold text-black text-xs rounded font-bold hover:bg-vintage-gold/80 disabled:opacity-50"
            >
              {isUploading ? t.uploading : t.send}
            </button>
            <button
              onClick={() => {
                clearRecording();
                setIsPlaying(false);
              }}
              disabled={isUploading || disabled}
              className="px-2 py-1 bg-vintage-charcoal border border-vintage-gold/30 text-vintage-ice text-xs rounded hover:bg-vintage-gold/10 disabled:opacity-50"
            >
              {t.reRecord}
            </button>
          </div>
        </div>
      )}

      {/* Idle state - ready to record */}
      {!isRecording && !hasRecordedAudio && !isCustomAudio && (
        <button
          onClick={startRecording}
          disabled={disabled}
          className="w-full flex items-center justify-center gap-2 bg-vintage-charcoal border border-vintage-gold/30 text-vintage-ice py-2 px-3 rounded-lg text-sm hover:bg-vintage-gold/10 hover:border-vintage-gold/50 transition-colors disabled:opacity-50"
        >
          <span className="text-lg">🎤</span>
          <span>{t.record}</span>
          <span className="text-vintage-ice/50 text-xs">({t.maxTime})</span>
        </button>
      )}

      {/* Error display */}
      {(error || uploadError) && (
        <p className="text-red-400 text-xs text-center">
          {error || uploadError}
        </p>
      )}
    </div>
  );
}
