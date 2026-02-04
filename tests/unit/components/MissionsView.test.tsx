import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MissionsView } from '@/app/(game)/components/views/MissionsView';

vi.mock('@/components/LoadingSpinner', () => ({
  default: () => <div data-testid="spinner">Loading...</div>,
}));
vi.mock('@/components/SocialQuestsPanel', () => ({
  SocialQuestsPanel: () => <div data-testid="social-panel">Social</div>,
}));
vi.mock('@/lib/audio-manager', () => ({
  AudioManager: { buttonNav: vi.fn() },
}));
vi.mock('next/image', () => ({
  default: (props: any) => <img {...props} />,
}));

const mockMissions = [
  { _id: '1', missionType: 'daily_login', reward: 25, completed: true, claimed: false },
  { _id: '2', missionType: 'first_pve_win', reward: 50, completed: false, claimed: false },
  { _id: '3', missionType: 'first_pvp', reward: 100, completed: true, claimed: true },
];

const baseProps = {
  missionsSubView: 'missions' as const,
  setMissionsSubView: vi.fn(),
  missions: mockMissions,
  isLoadingMissions: false,
  soundEnabled: false,
  address: '0x123',
  userProfile: { username: 'Test' },
  nfts: [],
  isClaimingMission: null,
  isClaimingAll: false,
  getMissionInfo: (type: string) => ({ icon: '/icon.png', title: type, description: `Desc ${type}` }),
  claimMission: vi.fn(),
  claimAllMissions: vi.fn(),
  setSuccessMessage: vi.fn(),
  t: (k: string) => k,
};

describe('MissionsView', () => {
  it('renders missions list', () => {
    render(<MissionsView {...baseProps} />);
    expect(screen.getByText('Daily Missions', { exact: false })).toBeInTheDocument();
  });

  it('shows loading spinner when loading', () => {
    render(<MissionsView {...baseProps} isLoadingMissions={true} />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('shows Claim button for completed unclaimed missions', () => {
    render(<MissionsView {...baseProps} />);
    expect(screen.getByText('Claim')).toBeInTheDocument();
  });

  it('shows Claimed badge for claimed missions', () => {
    render(<MissionsView {...baseProps} />);
    expect(screen.getByText(/Claimed/)).toBeInTheDocument();
  });

  it('shows Locked for incomplete missions', () => {
    render(<MissionsView {...baseProps} />);
    expect(screen.getByText('Locked')).toBeInTheDocument();
  });

  it('shows Claim All button when claimable missions exist', () => {
    render(<MissionsView {...baseProps} />);
    expect(screen.getByText(/Claim All Rewards/)).toBeInTheDocument();
  });

  it('switches to social view', () => {
    render(<MissionsView {...baseProps} missionsSubView="social" />);
    expect(screen.getByTestId('social-panel')).toBeInTheDocument();
  });
});
