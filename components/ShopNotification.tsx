'use client';

import { useEffect } from 'react';

interface ShopNotificationProps {
  type: 'success' | 'error';
  message: string;
  onClose: () => void;
}

export function ShopNotification({ type, message, onClose }: ShopNotificationProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const isSuccess = type === 'success';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className={`relative max-w-md w-full rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl transform animate-slideUp ${
          isSuccess
            ? 'bg-gradient-to-br from-vintage-gold/20 to-vintage-burnt-gold/20 border-2 border-vintage-gold'
            : 'bg-gradient-to-br from-red-900/20 to-red-800/20 border-2 border-red-500'
        }`}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 text-vintage-ice/50 hover:text-vintage-ice transition-colors"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Icon */}
        <div className="flex items-center justify-center mb-3 sm:mb-4">
          {isSuccess ? (
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-vintage-gold/20 flex items-center justify-center">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-vintage-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ) : (
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
        </div>

        {/* Message */}
        <div className="text-center">
          <h3 className={`text-xl sm:text-2xl font-display font-bold mb-2 ${
            isSuccess ? 'text-vintage-gold' : 'text-red-400'
          }`}>
            {isSuccess ? 'Success!' : 'Error'}
          </h3>
          <p className="text-vintage-ice text-sm sm:text-base leading-relaxed">
            {message}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mt-6 h-1 bg-vintage-charcoal/50 rounded-full overflow-hidden">
          <div
            className={`h-full animate-shrink ${
              isSuccess ? 'bg-vintage-gold' : 'bg-red-500'
            }`}
            style={{ animationDuration: '4000ms' }}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-slideUp {
          animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .animate-shrink {
          animation: shrink linear forwards;
        }
      `}</style>
    </div>
  );
}
