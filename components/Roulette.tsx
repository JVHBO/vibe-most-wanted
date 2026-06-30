"use client";

type RouletteProps = {
  onClose?: () => void;
  pfpUrl?: string | null;
  onChainChange?: (chain: "base" | "arbitrum") => void;
  showHeader?: boolean;
  onHelpClick?: () => void;
};

export function Roulette(_props: RouletteProps) {
  return null;
}

export default Roulette;
