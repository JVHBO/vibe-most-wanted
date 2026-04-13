export const COMBO_VOICE_FILES: Record<string, string> = {
  romero_family: "romero.mp3",
  crypto_kings: "cryptokings.mp3",
  mythic_assembly: "mythic.mp3",
  legends_unite: "legends_unite.mp3",
  ai_bros: "ai_takeover.mp3",
  scam_squad: "scam_squad.mp3",
  degen_trio: "degen_trio.mp3",
  vibe_team: "vibe_team.mp3",
  dirty_duo: "dirty_duo.mp3",
  code_masters: "code_masters.mp3",
  content_creators: "content_creators.mp3",
  chaos_agents: "chaos_agents.mp3",
  sniper_support: "sniper_elite.mp3",
  money_makers: "money_makers.mp3",
  underdog_uprising: "underdog_uprising.mp3",
  parallel: "PARALLEL.mp3",
  royal_brothers: "royal_brothers.mp3",
  philosopher_chad: "philosopher_chad.mp3",
  scaling_masters: "scaling_masters.mp3",
  christmas_spirit: "christmas_spirit.mp3",
  shadow_network: "shadow_network.mp3",
  pixel_artists: "pixel_artists.mp3",
  dirty_money: "dirty_money.mp3",
};

export function getComboVoicePath(comboId: string): string | null {
  const audioFile = COMBO_VOICE_FILES[comboId];
  return audioFile ? `/sounds/combos/${audioFile}` : null;
}
