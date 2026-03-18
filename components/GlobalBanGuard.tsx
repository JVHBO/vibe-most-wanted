"use client";

import { useEffect, useState } from "react";
import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePrimaryAddress } from "@/lib/hooks/usePrimaryAddress";
import BannedScreen from "./BannedScreen";

interface BanInfo {
  isBanned: boolean;
  username?: string;
  amountStolen?: number;
  reason?: string;
}

export default function GlobalBanGuard({ children }: { children: React.ReactNode }) {
  const convex = useConvex();
  const { primaryAddress: address } = usePrimaryAddress();
  const [banInfo, setBanInfo] = useState<BanInfo | null>(null);

  useEffect(() => {
    if (!address) return;
    convex.query(api.blacklist.checkBan, { address }).then((result) => {
      setBanInfo(result);
    });
  }, [address, convex]);

  if (banInfo?.isBanned) {
    return (
      <BannedScreen
        username={banInfo.username || "Unknown"}
        amountStolen={banInfo.amountStolen || 0}
        reason={banInfo.reason || "You have been permanently banned until the end of time."}
      />
    );
  }

  return <>{children}</>;
}
