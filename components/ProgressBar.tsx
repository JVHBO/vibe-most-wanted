/**
 * PROGRESS BAR COMPONENT
 *
 * Reusable animated progress bar for quests and missions
 * Features:
 * - Smooth animations
 * - Glow effects when complete
 * - Percentage display
 * - Customizable colors
 */

import React from 'react';

interface ProgressBarProps {
  current: number;
  target: number;
  showPercentage?: boolean;
  showNumbers?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'purple' | 'gold' | 'green' | 'blue';
  animate?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  target,
  showPercentage = false,
  showNumbers = true,
  size = 'md',
  variant = 'purple',
  animate = true,
}) => {
  const percentage = Math.min(100, (current / target) * 100);
  const isComplete = current >= target;

  // Size variants
  const heights = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-3',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  // Color variants
  const colors = {
    purple: {
      bg: 'bg-purple-950/50',
      border: 'border-purple-500/30',
      fill: isComplete
        ? 'bg-gradient-to-r from-purple-500 to-blue-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]'
        : 'bg-gradient-to-r from-purple-600/60 to-blue-600/60',
      text: 'text-purple-300',
    },
    gold: {
      bg: 'bg-vintage-black/50',
      border: 'border-vintage-gold/30',
      fill: isComplete
        ? 'bg-gradient-to-r from-vintage-gold to-yellow-500 shadow-[0_0_10px_rgba(212,175,55,0.8)]'
        : 'bg-gradient-to-r from-vintage-gold/60 to-yellow-500/60',
      text: 'text-vintage-gold',
    },
    green: {
      bg: 'bg-green-950/50',
      border: 'border-green-500/30',
      fill: isComplete
        ? 'bg-gradient-to-r from-green-500 to-emerald-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]'
        : 'bg-gradient-to-r from-green-600/60 to-emerald-600/60',
      text: 'text-green-300',
    },
    blue: {
      bg: 'bg-blue-950/50',
      border: 'border-blue-500/30',
      fill: isComplete
        ? 'bg-gradient-to-r from-blue-500 to-cyan-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]'
        : 'bg-gradient-to-r from-blue-600/60 to-cyan-600/60',
      text: 'text-blue-300',
    },
  };

  const colorScheme = colors[variant];

  return (
    <div className="space-y-2">
      {/* Numbers/Percentage Row */}
      {(showNumbers || showPercentage) && (
        <div className={`flex justify-between ${textSizes[size]} ${colorScheme.text} font-modern`}>
          {showNumbers && (
            <span className="font-medium">Progress</span>
          )}
          <div className="flex items-center gap-2">
            {showNumbers && (
              <span className="font-bold">
                {current} / {target}
              </span>
            )}
            {showPercentage && (
              <span className={`font-semibold ${isComplete ? 'text-white' : ''}`}>
                {Math.floor(percentage)}%
              </span>
            )}
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className={`w-full ${colorScheme.bg} rounded-full ${heights[size]} border ${colorScheme.border} overflow-hidden`}>
        <div
          className={`${heights[size]} rounded-full ${colorScheme.fill} ${
            animate ? 'transition-all duration-500 ease-out' : ''
          }`}
          style={{
            width: `${percentage}%`,
          }}
        >
          {/* Animated shimmer effect */}
          {isComplete && animate && (
            <div className="h-full w-full animate-pulse" />
          )}
        </div>
      </div>

      {/* Complete indicator */}
      {isComplete && (
        <div className="flex items-center gap-1.5 text-xs text-green-400 font-modern font-semibold animate-fade-in">
          <span className="text-sm">✓</span>
          <span>Complete!</span>
        </div>
      )}
    </div>
  );
};

/**
 * Compact progress bar variant (single line, no labels)
 */
export const ProgressBarCompact: React.FC<{
  current: number;
  target: number;
  variant?: 'purple' | 'gold' | 'green' | 'blue';
}> = ({ current, target, variant = 'purple' }) => {
  const percentage = Math.min(100, (current / target) * 100);
  const isComplete = current >= target;

  const colors = {
    purple: isComplete ? 'bg-gradient-to-r from-purple-500 to-blue-500' : 'bg-gradient-to-r from-purple-600/60 to-blue-600/60',
    gold: isComplete ? 'bg-gradient-to-r from-vintage-gold to-yellow-500' : 'bg-gradient-to-r from-vintage-gold/60 to-yellow-500/60',
    green: isComplete ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-green-600/60 to-emerald-600/60',
    blue: isComplete ? 'bg-gradient-to-r from-blue-500 to-cyan-500' : 'bg-gradient-to-r from-blue-600/60 to-cyan-600/60',
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-800/50 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full ${colors[variant]} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-gray-400 font-mono min-w-[3ch]">
        {current}/{target}
      </span>
    </div>
  );
};

export default ProgressBar;
