import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "$VBMS - Game",
  description: "NFT Card Battle Game",
};

export default function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
