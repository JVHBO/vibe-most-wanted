import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChainSelectionModal } from '@/app/(game)/components/modals/ChainSelectionModal';

describe('ChainSelectionModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <ChainSelectionModal isOpen={false} onClose={() => {}} onSelectChain={async () => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders title and description', () => {
    render(
      <ChainSelectionModal isOpen={true} onClose={() => {}} onSelectChain={async () => {}} />
    );
    expect(screen.getByText('Choose Network')).toBeInTheDocument();
    expect(screen.getByText(/Select which blockchain/)).toBeInTheDocument();
  });

  it('renders both chain options', () => {
    render(
      <ChainSelectionModal isOpen={true} onClose={() => {}} onSelectChain={async () => {}} />
    );
    expect(screen.getByText('Base (Default)')).toBeInTheDocument();
    expect(screen.getByText('Arbitrum')).toBeInTheDocument();
  });

  it('calls onSelectChain with base when Base clicked', () => {
    const onSelect = vi.fn(async () => {});
    render(
      <ChainSelectionModal isOpen={true} onClose={() => {}} onSelectChain={onSelect} />
    );
    fireEvent.click(screen.getByText('Base (Default)').closest('button')!);
    expect(onSelect).toHaveBeenCalledWith('base');
  });

  it('calls onSelectChain with arbitrum when Arbitrum clicked', () => {
    const onSelect = vi.fn(async () => {});
    render(
      <ChainSelectionModal isOpen={true} onClose={() => {}} onSelectChain={onSelect} />
    );
    fireEvent.click(screen.getByText('Arbitrum').closest('button')!);
    expect(onSelect).toHaveBeenCalledWith('arbitrum');
  });
});
