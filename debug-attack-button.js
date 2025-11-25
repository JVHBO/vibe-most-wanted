// Add this to page.tsx temporarily to debug the issue
// Place it right before the attack button (around line 5383)

console.log('🔍 Attack Button Debug:', {
  hasUserProfile: !!userProfile,
  userProfileAddress: userProfile?.address,
  hasDefenseDeck: userProfile?.hasDefenseDeck,
  defenseDeckLength: userProfile?.defenseDeck?.length,
  attacksRemaining: attacksRemaining,
  maxAttacks: maxAttacks,
  attacksToday: userProfile?.attacksToday,
  lastAttackDate: userProfile?.lastAttackDate,
  targetHasDefenseDeck: profile.hasDefenseDeck,
  isButtonDisabled: !userProfile || !userProfile.hasDefenseDeck || attacksRemaining <= 0 || !profile.hasDefenseDeck
});
