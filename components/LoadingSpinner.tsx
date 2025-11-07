'use client';

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  className?: string;
  variant?: 'default' | 'gold' | 'purple' | 'minimal';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  text,
  className = '',
  variant = 'default'
}) => {
  // Size configurations
  const sizeClasses = {
    sm: 'h-6 w-6 border-2',
    md: 'h-10 w-10 border-3',
    lg: 'h-12 w-12 border-4',
    xl: 'h-16 w-16 border-4'
  };

  const textSizeClasses = {
    sm: 'text-xs mt-2',
    md: 'text-sm mt-3',
    lg: 'text-base mt-4',
    xl: 'text-lg mt-4'
  };

  // Variant configurations
  const variantClasses = {
    default: 'border-vintage-gold border-t-transparent',
    gold: 'border-vintage-gold/40 border-t-vintage-gold',
    purple: 'border-purple-500/40 border-t-purple-500',
    minimal: 'border-gray-600 border-t-gray-400'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {/* Spinner */}
      <div className="relative">
        {/* Outer ring */}
        <div
          className={`
            inline-block rounded-full animate-spin
            ${sizeClasses[size]}
            ${variantClasses[variant]}
          `}
          style={{
            animation: 'spin 1s linear infinite'
          }}
        />

        {/* Inner pulse effect (only for non-minimal variants) */}
        {variant !== 'minimal' && (
          <div
            className={`
              absolute inset-0 rounded-full
              ${variant === 'gold' ? 'bg-vintage-gold/10' : variant === 'purple' ? 'bg-purple-500/10' : 'bg-vintage-gold/5'}
              animate-pulse
            `}
          />
        )}
      </div>

      {/* Loading text */}
      {text && (
        <p className={`
          text-gray-400 font-modern
          ${textSizeClasses[size]}
        `}>
          {text}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;

// Preset loading components for common use cases
export const CardLoadingSpinner: React.FC<{ text?: string }> = ({ text = "Loading cards..." }) => (
  <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-8 text-center">
    <LoadingSpinner size="lg" variant="gold" text={text} />
  </div>
);

export const PageLoadingSpinner: React.FC<{ text?: string }> = ({ text = "Loading..." }) => (
  <div className="min-h-screen bg-vintage-deep-black flex items-center justify-center">
    <LoadingSpinner size="xl" variant="gold" text={text} />
  </div>
);

export const InlineLoadingSpinner: React.FC<{ text?: string }> = ({ text }) => (
  <div className="flex items-center justify-center py-4">
    <LoadingSpinner size="sm" variant="minimal" text={text} />
  </div>
);
