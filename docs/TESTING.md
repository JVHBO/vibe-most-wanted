# Testing Guide

**Last Updated**: 2026-02-03

---

## Overview

| Metric | Value |
|--------|-------|
| Test Framework | Vitest 4.x |
| Component Testing | React Testing Library |
| E2E Testing | Playwright |
| Total Unit Tests | 377 |
| Statement Coverage | 92%+ |
| Test Files | 21 |

---

## Running Tests

```bash
# Watch mode (development)
npm run test

# Single run (CI)
npm run test:ci

# With coverage report
npm run test:coverage

# E2E tests
npm run test:e2e
```

---

## Test Structure

```
tests/
  unit/
    components/
      BattleArena.test.tsx
      BattleResults.test.tsx
      PowerDisplay.test.tsx
      Modal.test.tsx
      CardDisplay.test.tsx
      CardSelector.test.tsx
      DefenseDeckModal.test.tsx
      MyCardsModal.test.tsx
      LeaderboardRewardsModal.test.tsx
      ChainSelectionModal.test.tsx
    hooks/
      usePowerCalculation.test.ts
      useCardSelection.test.ts
  setup.ts                    # Global test setup

lib/
  utils/__tests__/
    card-power.test.ts        # 55 tests - power calculations
    battle-calculations.test.ts  # 36 tests - battle logic
    economy-calc.test.ts      # 56 tests - economy system
    quest-logic.test.ts       # 34 tests - quest validation
    card-calculations.test.ts # 37 tests - card sorting/filtering
    deck-validation.test.ts   # 22 tests - deck rules
    vbms-calc.test.ts         # 20 tests - VBMS token math
    blockchain-verify.test.ts # 32 tests - signature verification
  __tests__/
    dailyBuff.test.ts         # 19 tests - daily buff system
```

---

## Configuration

### Vitest (`vitest.config.ts`)

- **Environment**: jsdom (for DOM testing)
- **Plugin**: @vitejs/plugin-react
- **Path aliases**: `@/` maps to project root
- **Coverage**: v8 provider, 70% threshold for statements/branches/functions/lines
- **Setup**: `tests/setup.ts` (cleanup, mock next/navigation)

### Playwright (`playwright.config.ts`)

- **Browser**: Chromium only
- **Web Server**: `npm run dev` on port 3000
- **Retries**: 2 on CI

---

## Writing Tests

### Component Test Pattern

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyComponent } from '@/app/(game)/components/MyComponent';

// Mock heavy dependencies
vi.mock('@/components/CardMedia', () => ({
  CardMedia: (props: any) => <img src={props.src} alt={props.alt || ''} />,
}));

describe('MyComponent', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<MyComponent isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders content when open', () => {
    render(<MyComponent isOpen={true} />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

### Hook Test Pattern

```ts
import { renderHook } from '@testing-library/react';
import { useMyHook } from '@/app/(game)/hooks/useMyHook';

describe('useMyHook', () => {
  it('returns expected value', () => {
    const { result } = renderHook(() => useMyHook(input));
    expect(result.current.value).toBe(expected);
  });
});
```

### Common Mocks

Components that need mocking in most tests:

| Module | Mock |
|--------|------|
| `@/components/CardMedia` | `<img>` element |
| `@/components/FoilCardEffect` | Passthrough `<div>` |
| `@/lib/audio-manager` | No-op functions |
| `@/lib/power-utils` | Return `card.power` directly |
| `@/lib/collections/index` | Simplified filter/id functions |
| `@/lib/nft` | Compare by tokenId + collection |

---

## Coverage

Current coverage (as of 2026-02-03):

| Metric | Coverage |
|--------|----------|
| Statements | 92.36% |
| Branches | 78.98% |
| Functions | 90.85% |
| Lines | 92.76% |

Target: 70% minimum (enforced in vitest.config.ts).
