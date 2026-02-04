import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LeaderboardRewardsModal } from '@/app/(game)/components/modals/LeaderboardRewardsModal';

describe('LeaderboardRewardsModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <LeaderboardRewardsModal isOpen={false} onClose={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders title when open', () => {
    render(<LeaderboardRewardsModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText(/Weekly Ranking Rewards/)).toBeInTheDocument();
  });

  it('renders all reward tiers', () => {
    render(<LeaderboardRewardsModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText('1st Place')).toBeInTheDocument();
    expect(screen.getByText('2nd Place')).toBeInTheDocument();
    expect(screen.getByText('3rd Place')).toBeInTheDocument();
    expect(screen.getByText('4th - 10th Place')).toBeInTheDocument();
  });

  it('renders reward amounts', () => {
    render(<LeaderboardRewardsModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText('1,000 coins')).toBeInTheDocument();
    expect(screen.getByText('750 coins')).toBeInTheDocument();
    expect(screen.getByText('500 coins')).toBeInTheDocument();
    expect(screen.getByText('300 coins')).toBeInTheDocument();
  });

  it('renders footer text', () => {
    render(<LeaderboardRewardsModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText(/Ranking based on Aura score/)).toBeInTheDocument();
  });
});
