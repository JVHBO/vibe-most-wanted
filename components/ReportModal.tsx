'use client';

import { useState, useRef, useCallback } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Modal } from '@/app/(game)/components/ui/Modal';
import { getLogBuffer } from '@/lib/log-buffer';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  t: (key: any) => string;
  address?: string;
  fid?: number | null;
  currentView?: string;
  username?: string | null;
  farcasterDisplayName?: string | null;
}

type Category = 'bug' | 'ux' | 'suggestion' | 'other';

function collectDeviceInfo(address?: string, fid?: number | null, currentView?: string) {
  return {
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    platform: typeof navigator !== 'undefined' ? (navigator.platform || 'unknown') : 'unknown',
    screen: typeof screen !== 'undefined' ? `${screen.width}x${screen.height}` : 'unknown',
    viewport: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'unknown',
    pixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
    language: typeof navigator !== 'undefined' ? navigator.language : 'unknown',
    url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    timestamp: new Date().toISOString(),
    address: address || 'not connected',
    fid: fid ?? null,
    currentView: currentView || 'unknown',
    recentLogs: getLogBuffer().slice(-15),
  };
}

async function resizeImageToBlob(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 800;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
        else { width = Math.round((width * MAX) / height); height = MAX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('canvas ctx failed')); return; }
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(objectUrl);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('toBlob failed'));
      }, 'image/jpeg', 0.65);
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('img load failed')); };
    img.src = objectUrl;
  });
}

export function ReportModal({ isOpen, onClose, t, address, fid, currentView, username, farcasterDisplayName }: ReportModalProps) {
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('bug');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const submitReport = useMutation(api.bugReports.submitBugReport);
  const generateUploadUrl = useMutation(api.bugReports.generateImageUploadUrl);

  const handleImageChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg(t('reportImageTooLarge'));
      return;
    }
    setErrorMsg('');
    setImageFile(file);
    // Preview only
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }, [t]);

  const handleRemoveImage = useCallback(() => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!description.trim()) {
      setErrorMsg(t('reportDescriptionRequired'));
      return;
    }
    setStatus('sending');
    setErrorMsg('');
    try {
      // Upload image to Convex Storage if present
      let imageStorageId: Id<'_storage'> | null = null;
      if (imageFile) {
        const uploadUrl = await generateUploadUrl();
        const blob = await resizeImageToBlob(imageFile);
        const uploadRes = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'image/jpeg' },
          body: blob,
        });
        const { storageId } = await uploadRes.json();
        imageStorageId = storageId;
      }

      const deviceInfo = collectDeviceInfo(address, fid, currentView);
      const result = await submitReport({
        description: description.trim(),
        category,
        deviceInfo: JSON.stringify(deviceInfo),
        address: address || null,
        fid: fid ?? null,
        username: username || null,
        farcasterDisplayName: farcasterDisplayName || null,
        imageStorageId: imageStorageId,
      });

      if (result?.limited) {
        setStatus('error');
        setErrorMsg(t('reportDailyLimit'));
        return;
      }

      setStatus('success');
      setTimeout(() => {
        setStatus('idle');
        setDescription('');
        setCategory('bug');
        setImageFile(null);
        setImagePreview(null);
        onClose();
      }, 2500);
    } catch {
      setStatus('error');
      setErrorMsg(t('reportError'));
    }
  }, [description, category, imageFile, address, fid, currentView, username, farcasterDisplayName, submitReport, generateUploadUrl, t, onClose]);

  const categoryOptions: { value: Category; label: string }[] = [
    { value: 'bug', label: t('reportCategoryBug') },
    { value: 'ux', label: t('reportCategoryUx') },
    { value: 'suggestion', label: t('reportCategorySuggestion') },
    { value: 'other', label: t('reportCategoryOther') },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md" zIndex={200}>
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🐛</span>
            <h2 className="font-display font-bold text-vintage-gold text-xl">
              {t('reportTitle')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-red-500 hover:text-red-400 text-xl leading-none transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {status === 'success' ? (
          <div className="py-10 text-center">
            <div className="text-5xl mb-4">🙏</div>
            <p className="text-vintage-gold font-semibold">{t('reportSuccess')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Category */}
            <div>
              <label className="block text-xs text-vintage-gold/70 mb-1.5 font-semibold uppercase tracking-wide">
                {t('reportCategory')}
              </label>
              <div className="flex gap-2 flex-wrap">
                {categoryOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setCategory(opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      category === opt.value
                        ? 'bg-vintage-gold text-vintage-black border-vintage-gold'
                        : 'bg-vintage-black/50 text-vintage-gold/70 border-vintage-gold/30 hover:border-vintage-gold/60'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs text-vintage-gold/70 mb-1.5 font-semibold uppercase tracking-wide">
                {t('reportDescription')}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('reportDescriptionPlaceholder')}
                rows={4}
                maxLength={1000}
                className="w-full bg-vintage-black/60 border border-vintage-gold/30 rounded-xl px-3 py-2.5 text-sm text-vintage-gold/90 placeholder-vintage-gold/30 resize-none focus:outline-none focus:border-vintage-gold/60 transition-colors"
              />
              <div className="text-right text-xs text-vintage-gold/30 mt-0.5">
                {description.length}/1000
              </div>
            </div>

            {/* Image upload */}
            <div>
              <label className="block text-xs text-vintage-gold/70 mb-1.5 font-semibold uppercase tracking-wide">
                {t('reportAddImage')}
              </label>
              {imagePreview ? (
                <div>
                  <img
                    src={imagePreview}
                    alt="preview"
                    className="max-h-32 rounded-lg border border-vintage-gold/30 object-contain"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-vintage-gold/60 hover:text-vintage-gold underline"
                    >
                      {t('reportImageChange')}
                    </button>
                    <button
                      onClick={handleRemoveImage}
                      className="text-xs text-red-400/70 hover:text-red-400 underline"
                    >
                      {t('reportImageRemove')}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-vintage-gold/25 rounded-xl py-4 px-3 text-xs text-vintage-gold/40 hover:border-vintage-gold/50 hover:text-vintage-gold/60 transition-all flex items-center justify-center gap-2"
                >
                  <span className="text-lg">📎</span>
                  <span>{t('reportAddImage')}</span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </div>

            {/* Device info notice */}
            <div className="flex items-center gap-2 text-xs text-vintage-gold/30">
              <span>ℹ️</span>
              <span>{t('reportDeviceInfo')}</span>
            </div>

            {/* Error */}
            {errorMsg && <p className="text-red-400 text-xs">{errorMsg}</p>}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={status === 'sending'}
              className="w-full px-4 py-3 bg-vintage-gold hover:bg-vintage-gold-dark disabled:opacity-50 disabled:cursor-not-allowed text-vintage-black rounded-xl font-display font-bold text-sm transition-all"
            >
              {status === 'sending' ? t('reportSending') : t('reportSubmit')}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
