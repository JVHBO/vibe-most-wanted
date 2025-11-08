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
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18.24 5.5H5.76C5.34 5.5 5 5.84 5 6.26V19.5H7.5V13.5H9V19.5H15V13.5H16.5V19.5H19V6.26C19 5.84 18.66 5.5 18.24 5.5ZM9 9C8.45 9 8 8.55 8 8C8 7.45 8.45 7 9 7C9.55 7 10 7.45 10 8C10 8.55 9.55 9 9 9ZM15 9C14.45 9 14 8.55 14 8C14 7.45 14.45 7 15 7C15.55 7 16 7.45 16 8C16 8.55 15.55 9 15 9Z"/>
  </svg>
);
