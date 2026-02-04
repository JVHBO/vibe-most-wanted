"use client";

import { useEffect, useCallback, type ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  overlayClassName?: string;
  closeOnOverlay?: boolean;
  closeOnEscape?: boolean;
  zIndex?: number;
}

export function Modal({
  isOpen,
  onClose,
  children,
  className = '',
  overlayClassName = '',
  closeOnOverlay = true,
  closeOnEscape = true,
  zIndex = 150,
}: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') onClose();
    },
    [closeOnEscape, onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 bg-black/90 flex items-center justify-center p-4 ${overlayClassName}`}
      style={{ zIndex }}
      onClick={closeOnOverlay ? onClose : undefined}
    >
      <div
        className={`bg-vintage-charcoal rounded-2xl border-2 border-vintage-gold max-w-6xl w-full ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
