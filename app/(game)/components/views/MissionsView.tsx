"use client";

import NextImage from 'next/image';
import LoadingSpinner from '@/components/LoadingSpinner';
import { SocialQuestsPanel } from '@/components/SocialQuestsPanel';
import { AudioManager } from '@/lib/audio-manager';

interface Mission {
  _id: string;
  missionType: string;
  reward: number;
  completed: boolean;
  claimed: boolean;
}

interface MissionInfo {
  icon: string;
  title: string;
  description: string;
}

interface MissionsViewProps {
  missionsSubView: 'missions' | 'social';
  setMissionsSubView: (v: 'missions' | 'social') => void;
  missions: Mission[];
  isLoadingMissions: boolean;
  soundEnabled: boolean;
  address: string | undefined;
  userProfile: any;
  nfts: any[];
  isClaimingMission: string | null;
  isClaimingAll: boolean;
  getMissionInfo: (missionType: string) => MissionInfo;
  claimMission: (missionId: string, missionType?: string) => void;
  claimAllMissions: () => void;
  setSuccessMessage: (msg: string) => void;
  t: (key: any, params?: any) => string;
  refreshUserProfile?: () => Promise<void>;
}

export function MissionsView({
  missionsSubView,
  setMissionsSubView,
  missions,
  isLoadingMissions,
  soundEnabled,
  address,
  userProfile,
  nfts,
  isClaimingMission,
  isClaimingAll,
  getMissionInfo,
  claimMission,
  claimAllMissions,
  setSuccessMessage,
  t,
  refreshUserProfile,
}: MissionsViewProps) {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Toggle Buttons: Missions / Social */}
      <div className="flex justify-center gap-1 md:gap-2 mb-4 px-2">
        <button
          onClick={() => {
            if (soundEnabled) AudioManager.buttonNav();
            setMissionsSubView('missions');
          }}
          className={`px-3 md:px-6 py-2 rounded-lg font-display font-bold text-xs md:text-base transition-all flex-shrink-0 ${
            missionsSubView === 'missions'
              ? 'bg-vintage-gold text-vintage-black shadow-gold'
              : 'bg-vintage-charcoal border-2 border-vintage-gold/50 text-vintage-gold hover:bg-vintage-gold/20'
          }`}
        >
          {"\u25C8"} {t('missions')}
        </button>
        <button
          onClick={() => {
            if (soundEnabled) AudioManager.buttonNav();
            setMissionsSubView('social');
          }}
          className={`px-3 md:px-6 py-2 rounded-lg font-display font-bold text-xs md:text-base transition-all flex-shrink-0 ${
            missionsSubView === 'social'
              ? 'bg-vintage-gold text-vintage-black shadow-gold'
              : 'bg-vintage-charcoal border-2 border-vintage-gold/50 text-vintage-gold hover:bg-vintage-gold/20'
          }`}
        >
          <svg className="inline-block w-3 h-3 md:w-4 md:h-4 mr-1" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
          </svg>
          Social
        </button>
      </div>

      {/* Missions Sub-View */}
      {missionsSubView === 'missions' && (
      <>
      {/* Daily Missions Section */}
      <div className="bg-vintage-charcoal/80 backdrop-blur-lg rounded-2xl border-2 border-vintage-gold/30 shadow-gold p-4 md:p-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-vintage-gold mb-2">
            {"\u{1F381}"} Daily Missions
          </h1>
          <p className="text-vintage-burnt-gold font-modern text-sm md:text-base">
            Complete missions and claim your rewards!
          </p>
        </div>

        {isLoadingMissions ? (
          <div className="flex justify-center items-center py-20">
            <LoadingSpinner size="xl" variant="gold" />
          </div>
        ) : missions.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-2xl mb-4">{"\u{1F3AF}"}</p>
            <p className="text-vintage-burnt-gold font-modern">
              No missions available yet. Play some matches to unlock rewards!
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4 mb-6">
              {missions.map((mission) => {
                const missionInfo = getMissionInfo(mission.missionType);
                const isClaimed = mission.claimed;
                const isCompleted = mission.completed;

                return (
                  <div
                    key={mission._id}
                    className={`bg-vintage-black/50 rounded-xl p-4 md:p-6 border-2 transition-all ${
                      isClaimed
                        ? 'border-vintage-gold/20 opacity-60'
                        : isCompleted
                        ? 'border-vintage-gold shadow-gold'
                        : 'border-vintage-gold/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Mission Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <NextImage src={missionInfo.icon} alt={missionInfo.title} width={32} height={32} />
                          <h3 className="text-lg md:text-xl font-display font-bold text-vintage-gold">
                            {missionInfo.title}
                          </h3>
                        </div>
                        <p className="text-sm md:text-base text-vintage-burnt-gold font-modern mb-3">
                          {missionInfo.description}
                        </p>
                        <div className="flex items-center gap-2">
                          {mission.missionType === 'claim_vibe_badge' ? (
                            <>
                              <span className="text-yellow-400 font-bold text-lg">{"\u2728"} VIBE Badge</span>
                              <span className="text-vintage-burnt-gold text-sm">(2x Wanted Cast)</span>
                            </>
                          ) : (
                            <>
                              <span className="text-vintage-gold font-bold text-lg">
                                +{mission.reward}
                              </span>
                              <span className="text-vintage-burnt-gold text-sm">$TESTVBMS</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Claim Button */}
                      <div className="flex-shrink-0">
                        {isClaimed ? (
                          <div className="px-4 py-2 bg-green-600/20 border-2 border-green-500 rounded-lg text-green-400 font-bold text-sm md:text-base whitespace-nowrap">
                            {"\u2713"} Claimed
                          </div>
                        ) : isCompleted ? (
                          <button
                            onClick={() => claimMission(mission._id, mission.missionType)}
                            disabled={isClaimingMission === mission._id}
                            className="px-4 py-2 bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black rounded-lg font-display font-bold text-sm md:text-base shadow-gold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                          >
                            {isClaimingMission === mission._id ? 'Claiming...' : 'Claim'}
                          </button>
                        ) : (
                          <div className="px-4 py-2 bg-vintage-charcoal border-2 border-vintage-gold/30 rounded-lg text-vintage-burnt-gold text-sm md:text-base whitespace-nowrap">
                            Locked
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Claim All Button */}
            {missions.some((m) => m.completed && !m.claimed) && (
              <div className="border-t-2 border-vintage-gold/20 pt-6">
                <button
                  onClick={claimAllMissions}
                  disabled={isClaimingAll}
                  className="w-full px-8 py-4 bg-gradient-to-r from-vintage-gold to-vintage-burnt-gold hover:from-vintage-gold-dark hover:to-vintage-gold text-vintage-black rounded-xl font-display font-bold text-lg md:text-xl shadow-gold-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isClaimingAll ? 'Claiming All...' : `\u{1F381} Claim All Rewards (${missions.filter((m) => m.completed && !m.claimed).length})`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
      </>
      )}

      {/* Social Quests Sub-View */}
      {missionsSubView === 'social' && address && (
        <SocialQuestsPanel
          address={address}
          userFid={userProfile?.farcasterFid || (userProfile?.fid ? parseInt(userProfile.fid) : undefined)}
          soundEnabled={soundEnabled}
          hasVibeBadge={userProfile?.hasVibeBadge}
          hasVibeFID={nfts.some((c: any) => c.collection === 'vibefid')}
          onRewardClaimed={async (amount: number) => {
            setSuccessMessage(`Claimed ${amount} coins!`);
            // 🔄 Refresh user profile to update coins display
            if (refreshUserProfile) {
              await refreshUserProfile();
            }
          }}
        />
      )}
    </div>
  );
}
