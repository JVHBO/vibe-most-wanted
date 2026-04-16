export const COMBO_VOICE_FILES: Record<string, string> = {
  four_aces: "four_aces.mp3",
  four_kings: "four_kings.mp3",
  four_queens: "four_queens.mp3",
  four_jacks: "four_jacks.mp3",
  four_tens: "four_tens.mp3",
  four_nines: "four_nines.mp3",
  four_eights: "four_eights.mp3",
  four_sevens: "four_sevens.mp3",
  four_fives: "four_fives.mp3",
  four_fours: "four_fours.mp3",
  four_threes: "four_threes.mp3",
  four_twos: "four_twos.mp3",
  four_dragukkas: "four_dragukkas.mp3",
};

export function getComboVoicePath(comboId: string): string | null {
  const audioFile = COMBO_VOICE_FILES[comboId];
  return audioFile ? `/sounds/combos/${audioFile}` : null;
}
