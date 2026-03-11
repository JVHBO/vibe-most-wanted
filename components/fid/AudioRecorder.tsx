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
  toolbar?: boolean; // compact toolbar mode
}

const AUDIO_ACCEPT = 'audio/mp3,audio/mpeg,audio/ogg,audio/wav,audio/m4a,audio/aac,audio/*';

const MAX_DURATION = 15;

export function AudioRecorder({ onAudioReady, onClear, currentAudioId, disabled, toolbar }: AudioRecorderProps) {
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const generateUploadUrl = useMutation(api.audioStorage.generateUploadUrl);

  // Upload a file directly (for both recorded blobs and file uploads)
  const uploadAudioFile = async (blob: Blob, mimeType: string) => {
    setIsUploading(true);
    setUploadError(null);
    try {
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': mimeType },
        body: blob,
      });
      if (!response.ok) throw new Error('Upload failed');
      const { storageId } = await response.json();
      onAudioReady(`custom:${storageId}`);
      clearRecording();
    } catch (err) {
      console.error('Upload error:', err);
      setUploadError('Failed to upload audio');
    } finally {
      setIsUploading(false);
    }
  };

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
    await uploadAudioFile(audioBlob, audioBlob.type);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadAudioFile(file, file.type);
    e.target.value = '';
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

  // Not supported - show only upload
  if (!isSupported) {
    return (
      <div className="space-y-2">
        <input ref={fileInputRef} type="file" accept={AUDIO_ACCEPT} className="hidden" onChange={handleFileUpload} />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className="w-full flex items-center justify-center gap-2 bg-[#2563EB] border-2 border-[#1D4ED8] text-white py-2 px-3 text-xs hover:bg-[#1D4ED8] transition-colors disabled:opacity-50"
          style={{ WebkitTextFillColor: 'white' }}
        >
          {isUploading ? <span>{t.uploading}</span> : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <span>Upload audio file (MP3, WAV, M4A...)</span>
            </>
          )}
        </button>
        {(uploadError) && <p className="text-red-400 text-xs text-center">{uploadError}</p>}
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
      <div className="flex items-center gap-2 bg-[#111] border border-[#FFD700]/30 rounded-lg p-2">
        <div className="w-8 h-8 rounded-full bg-vintage-gold flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
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

  // Toolbar compact mode
  if (toolbar) {
    return (
      <>
        <audio ref={audioRef} />
        <input ref={fileInputRef} type="file" accept={AUDIO_ACCEPT} className="hidden" onChange={handleFileUpload} />
        {/* Recording active — show inline status */}
        {isRecording && (
          <div className="flex items-center gap-1.5 h-9 px-2 bg-red-500/20 border border-red-500/50">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
            <span className="text-red-400 font-bold text-[10px]">{recordingTime}s</span>
            <button onClick={stopRecording} className="ml-1 w-6 h-6 bg-red-500 flex items-center justify-center text-white text-xs rounded-sm">⏹</button>
          </div>
        )}
        {/* Recorded preview */}
        {hasRecordedAudio && !isRecording && (
          <div className="flex items-center gap-1 h-9 px-2 bg-[#1a1a1a] border border-[#FFD700]/30">
            <button onClick={handlePlayPause} className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${isPlaying ? 'bg-red-500 text-white animate-pulse' : 'bg-vintage-gold text-black'}`}>{isPlaying ? '⏹' : '▶'}</button>
            <span className="text-vintage-gold text-[10px] font-bold">{recordingTime}s</span>
            <button onClick={handleUploadAndSend} disabled={isUploading || disabled} className="ml-1 px-2 h-6 bg-vintage-gold text-black text-[10px] font-black disabled:opacity-50">{isUploading ? '...' : t.send}</button>
            <button onClick={() => { clearRecording(); setIsPlaying(false); }} className="px-1 h-6 text-white/40 text-[10px] hover:text-white">✕</button>
          </div>
        )}
        {/* Idle OR custom audio selected */}
        {!isRecording && !hasRecordedAudio && (
          <>
            {isCustomAudio ? (
              <div className="flex items-center gap-1 h-9 px-2 bg-[#1a1a1a] border border-[#FFD700]/30">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-vintage-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
                <span className="text-vintage-gold text-[10px] font-bold flex-1">{t.recorded}</span>
                <button onClick={handleClear} className="text-red-400 text-[10px] hover:text-red-300">✕</button>
              </div>
            ) : (
              <>
                {isSupported && (
                  <button
                    onClick={startRecording}
                    disabled={disabled || isUploading}
                    title="Record voice"
                    className="w-9 h-9 flex items-center justify-center border-2 border-[#C2410C] bg-[#EA580C] text-white hover:bg-[#C2410C] transition-all disabled:opacity-50"
                    style={{ WebkitTextFillColor: 'white' }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
                  </button>
                )}
              </>
            )}
          </>
        )}
        {(error || uploadError) && <span className="text-red-400 text-[9px]">{error || uploadError}</span>}
      </>
    );
  }

  return (
    <div className="space-y-2">
      <audio ref={audioRef} />
      {/* Hidden file input for audio upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept={AUDIO_ACCEPT}
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Recording state */}
      {isRecording && (
        <div className="flex items-center gap-3 bg-red-500/20 border border-red-500/50 rounded-lg p-3">
          <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
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
        <div className="flex items-center gap-2 bg-[#111] border border-[#FFD700]/30 rounded-lg p-2">
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
            <p className="text-white/40 text-[10px]">
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
              className="px-2 py-1 bg-[#1a1a1a] border border-[#444] text-white text-xs rounded hover:bg-[#222] disabled:opacity-50"
            >
              {t.reRecord}
            </button>
          </div>
        </div>
      )}

      {/* Idle state - record OR upload */}
      {!isRecording && !hasRecordedAudio && !isCustomAudio && (
        <div className="flex gap-2">
          {/* Record button - only show if supported */}
          {isSupported && (
            <button
              onClick={startRecording}
              disabled={disabled || isUploading}
              className="flex-1 flex items-center justify-center gap-2 bg-[#EA580C] border-2 border-[#C2410C] text-white py-2 px-3 text-xs hover:bg-[#C2410C] transition-colors disabled:opacity-50"
              style={{ WebkitTextFillColor: 'white' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
              <span>{t.record}</span>
            </button>
          )}
          {/* Upload audio file button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
            className="flex-1 flex items-center justify-center gap-2 bg-[#2563EB] border-2 border-[#1D4ED8] text-white py-2 px-3 text-xs hover:bg-[#1D4ED8] transition-colors disabled:opacity-50"
            style={{ WebkitTextFillColor: 'white' }}
          >
            {isUploading ? (
              <span>{t.uploading}</span>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <span>Upload audio</span>
              </>
            )}
          </button>
        </div>
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
