// SVG Icons for Poker Battle - Golden Theme

interface IconProps {
  className?: string;
  size?: number;
}

export const SwordIcon = ({ className = "", size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M20 4L12 12M12 12L4 20M12 12L8 16M12 12L16 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const ShieldIcon = ({ className = "", size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M12 2L4 6V12C4 16.4183 7.58172 20 12 22C16.4183 20 20 16.4183 20 12V6L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    <path d="M12 8V14M9 11L15 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const BoltIcon = ({ className = "", size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"/>
  </svg>
);

export const HandIcon = ({ className = "", size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M8 14V8M11 14V6M14 14V8M17 14V10M6 14C6 16.2091 7.79086 18 10 18H14C16.2091 18 18 16.2091 18 14V8C18 6.89543 17.1046 6 16 6C14.8954 6 14 6.89543 14 8M6 14V12C6 10.8954 6.89543 10 8 10C9.10457 10 10 10.8954 10 12V8C10 6.89543 10.8954 6 12 6C13.1046 6 14 6.89543 14 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const TrophyIcon = ({ className = "", size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M12 15C15.3137 15 18 12.3137 18 9V5H6V9C6 12.3137 8.68629 15 12 15ZM12 15V19M12 19H9M12 19H15M8 19H16M6 5H4C3.44772 5 3 5.44772 3 6V7C3 8.65685 4.34315 10 6 10M18 5H20C20.5523 5 21 5.44772 21 6V7C21 8.65685 19.6569 10 18 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const SkullIcon = ({ className = "", size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="10" r="7" stroke="currentColor" strokeWidth="2"/>
    <circle cx="9" cy="9" r="1.5" fill="currentColor"/>
    <circle cx="15" cy="9" r="1.5" fill="currentColor"/>
    <path d="M8 15H10V17H8V15ZM14 15H16V17H14V15Z" fill="currentColor"/>
    <path d="M9 13C9 13.5523 9.44772 14 10 14H14C14.5523 14 15 13.5523 15 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const ChatIcon = ({ className = "", size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M21 11.5C21 16.7467 16.9706 21 12 21C10.3126 21 8.74117 20.5701 7.38959 19.8127L3 21L4.18733 16.6104C3.42991 15.2588 3 13.6874 3 12C3 6.75329 7.02944 3 12 3C16.9706 3 21 6.75329 21 11.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
  </svg>
);

export const EyeIcon = ({ className = "", size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M12 5C7 5 2.73 8.11 1 12.5C2.73 16.89 7 20 12 20C17 20 21.27 16.89 23 12.5C21.27 8.11 17 5 12 5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

export const ClockIcon = ({ className = "", size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 7V12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const GiftIcon = ({ className = "", size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="3" y="10" width="18" height="12" rx="1" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 10V22M3 14H21" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 10C12 10 10 10 10 8C10 6 11 5 12 5C13 5 14 6 14 8C14 10 12 10 12 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 10C12 10 14 10 14 8C14 6 13 5 12 5C11 5 10 6 10 8C10 10 12 10 12 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const CloseIcon = ({ className = "", size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const FarcasterIcon = ({ className = "", size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="128.889 155.556 751.111 688.889" fill="currentColor" className={className}>
    <path d="M257.778 155.556h484.444v688.889h-71.111V528.889h-.697c-7.86-87.212-81.156-155.556-170.414-155.556s-162.554 68.344-170.414 155.556h-.697v315.556h-71.111z"/>
    <path d="M128.889 253.333l28.889 97.778h24.444v395.556c-12.273 0-22.222 9.949-22.222 22.222v26.667h-4.444c-12.273 0-22.223 9.949-22.223 22.222v26.667h248.889v-26.667c0-12.273-9.949-22.222-22.222-22.222h-4.444v-26.667c0-12.273-9.95-22.222-22.223-22.222h-26.666V253.333zM675.556 746.667c-12.273 0-22.223 9.949-22.223 22.222v26.667h-4.444c-12.273 0-22.222 9.949-22.222 22.222v26.667h248.889v-26.667c0-12.273-9.95-22.222-22.223-22.222h-4.444v-26.667c0-12.273-9.949-22.222-22.222-22.222V351.111h24.444L880 253.333H702.222v493.334z"/>
  </svg>
);
