"use client";

import { useState } from "react";
import type { UserProfile } from "@/lib/convex-profile";

/**
 * Attack flow, profile creation, and notification state from page.tsx
 */
export function useAttackState() {
  // Attack flow
  const [attackSelectedCards, setAttackSelectedCards] = useState<any[]>([]);
  const [targetPlayer, setTargetPlayer] = useState<UserProfile | null>(null);
  const [attacksRemaining, setAttacksRemaining] = useState<number>(0);
  const [isAttacking, setIsAttacking] = useState<boolean>(false);
  const [isConfirmingCards, setIsConfirmingCards] = useState<boolean>(false);

  // Notifications (defenses received)
  const [defensesReceived, setDefensesReceived] = useState<any[]>([]);
  const [unreadDefenses, setUnreadDefenses] = useState<number>(0);

  // Profile creation/edit
  const [profileUsername, setProfileUsername] = useState<string>('');
  const [isCreatingProfile, setIsCreatingProfile] = useState<boolean>(false);
  const [newUsername, setNewUsername] = useState<string>('');
  const [isChangingUsername, setIsChangingUsername] = useState<boolean>(false);

  return {
    attackSelectedCards, setAttackSelectedCards,
    targetPlayer, setTargetPlayer,
    attacksRemaining, setAttacksRemaining,
    isAttacking, setIsAttacking,
    isConfirmingCards, setIsConfirmingCards,
    defensesReceived, setDefensesReceived,
    unreadDefenses, setUnreadDefenses,
    profileUsername, setProfileUsername,
    isCreatingProfile, setIsCreatingProfile,
    newUsername, setNewUsername,
    isChangingUsername, setIsChangingUsername,
  };
}
