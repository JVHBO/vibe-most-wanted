with open('components/PokerBattleTable.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix card sync for spectators (around line 1089-1092)
old_sync = """      // Sync opponent's selected card (only show after they select)
      if (isHost && gs.guestSelectedCard) {
        setOpponentSelectedCard(gs.guestSelectedCard);
      } else if (!isHost && gs.hostSelectedCard) {
        setOpponentSelectedCard(gs.hostSelectedCard);
      }"""

new_sync = """      // Sync opponent's selected card (only show after they select)
      if (isSpectatorMode) {
        // Spectators see both cards
        setPlayerSelectedCard(gs.hostSelectedCard);
        setOpponentSelectedCard(gs.guestSelectedCard);
      } else if (isHost && gs.guestSelectedCard) {
        setOpponentSelectedCard(gs.guestSelectedCard);
      } else if (!isHost && gs.hostSelectedCard) {
        setOpponentSelectedCard(gs.hostSelectedCard);
      }"""

content = content.replace(old_sync, new_sync)

# 2. Fix action sync for spectators
old_action = """      // Sync opponent's action
      if (isHost && gs.guestAction) {
        setOpponentAction(gs.guestAction as CardAction);
      } else if (!isHost && gs.hostAction) {
        setOpponentAction(gs.hostAction as CardAction);
      }"""

new_action = """      // Sync opponent's action
      if (isSpectatorMode) {
        // Spectators see both actions
        setPlayerAction(gs.hostAction as CardAction);
        setOpponentAction(gs.guestAction as CardAction);
      } else if (isHost && gs.guestAction) {
        setOpponentAction(gs.guestAction as CardAction);
      } else if (!isHost && gs.hostAction) {
        setOpponentAction(gs.hostAction as CardAction);
      }"""

content = content.replace(old_action, new_action)

with open('components/PokerBattleTable.tsx', 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print("Fixed spectator card and action sync!")
