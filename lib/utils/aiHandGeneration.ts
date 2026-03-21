import { HAND_SIZE } from '@/lib/config';
import { devLog } from '@/lib/utils/logger';

type Difficulty = 'gey' | 'goofy' | 'gooner' | 'gangster' | 'gigachad';

export function generateAIHand(jcNfts: any[], difficulty: Difficulty): any[] {
  if (jcNfts.length < HAND_SIZE) return [];

  const sorted = [...jcNfts].sort((a, b) => (b.power || 0) - (a.power || 0));
  let pickedCards: any[] = [];

  switch (difficulty) {
    case 'gey': {
      const weakest = sorted.filter((c) => (c.power || 0) === 15);
      pickedCards = weakest.sort(() => Math.random() - 0.5).slice(0, HAND_SIZE);
      break;
    }
    case 'goofy': {
      const weak = sorted.filter((c) => {
        const p = c.power || 0;
        return p === 18 || p === 21;
      });
      if (weak.length >= HAND_SIZE) {
        pickedCards = weak.sort(() => Math.random() - 0.5).slice(0, HAND_SIZE);
      } else {
        const weakExpanded = sorted.filter((c) => {
          const p = c.power || 0;
          return p >= 18 && p <= 38;
        });
        pickedCards = weakExpanded.sort(() => Math.random() - 0.5).slice(0, HAND_SIZE);
      }
      break;
    }
    case 'gooner': {
      const medium = sorted.filter((c) => {
        const p = c.power || 0;
        return p === 60 || p === 72;
      });
      pickedCards = medium.sort(() => Math.random() - 0.5).slice(0, HAND_SIZE);
      break;
    }
    case 'gangster': {
      const cards150 = sorted.filter((c) => (c.power || 0) === 150);
      if (cards150.length >= HAND_SIZE) {
        pickedCards = cards150.sort(() => Math.random() - 0.5).slice(0, HAND_SIZE);
      } else {
        const legendaries = sorted.filter((c) => (c.rarity || '').toLowerCase().includes('legend'));
        pickedCards = legendaries.slice(0, HAND_SIZE);
      }
      break;
    }
    case 'gigachad':
      pickedCards = sorted.slice(0, HAND_SIZE);
      break;
  }

  let orderedCards: any[] = [];
  switch (difficulty) {
    case 'gey':
    case 'goofy':
      orderedCards = pickedCards.sort(() => Math.random() - 0.5);
      break;
    case 'gooner':
      orderedCards = [...pickedCards].sort((a, b) => (a.power || 0) - (b.power || 0));
      break;
    case 'gangster':
      orderedCards = [...pickedCards].sort((a, b) => (b.power || 0) - (a.power || 0));
      break;
    case 'gigachad': {
      const byPower = [...pickedCards].sort((a, b) => (b.power || 0) - (a.power || 0));
      orderedCards = [byPower[0], byPower[4], byPower[1], byPower[3], byPower[2]];
      break;
    }
  }

  devLog(`AI ordered cards for ${difficulty}:`, orderedCards.map((c) => `#${c.tokenId} (${c.power} PWR)`));
  return orderedCards;
}
