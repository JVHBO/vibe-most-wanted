/**
 * Generate Neynar Score Share Image - Combines card PNG with score info
 *
 * Creates a 1200x800 image for social sharing with:
 * - Card image on the left (scaled to fit)
 * - Neynar Score, rarity, and traits on the right
 * - Vintage theme matching the site
 */

import { fidTranslations } from './fidTranslations';
import type { SupportedLanguage } from '@/lib/translations';

interface NeynarScoreShareImageParams {
  cardImageDataUrl: string; // Base64 data URL of the card PNG
  username: string;
  currentScore: number;
  mintScore?: number; // Score at mint time (for diff calculation)
  currentRarity: string;
  mintRarity?: string; // Rarity at mint time
  power: number;
  fid: number;
  traits?: string[]; // Optional traits to display
  lang?: SupportedLanguage;
}

export async function generateNeynarScoreShareImage(params: NeynarScoreShareImageParams): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }

    // Farcaster Frame size (3:2 aspect ratio)
    canvas.width = 1200;
    canvas.height = 800;

    // Background - vintage charcoal with gradient
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#0f0f1a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Border - vintage gold
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    // Load card image
    const cardImg = new Image();
    cardImg.crossOrigin = 'anonymous';

    cardImg.onerror = () => {
      reject(new Error('Failed to load card image'));
    };

    cardImg.onload = () => {
      try {
        // Draw card on the left side
        const cardWidth = 400;
        const cardHeight = 560; // Maintain 5:7 aspect ratio
        const cardX = 40;
        const cardY = (canvas.height - cardHeight) / 2;

        // Card border glow effect
        ctx.shadowColor = getRarityColor(params.currentRarity);
        ctx.shadowBlur = 20;
        ctx.strokeStyle = getRarityColor(params.currentRarity);
        ctx.lineWidth = 4;
        ctx.strokeRect(cardX - 4, cardY - 4, cardWidth + 8, cardHeight + 8);
        ctx.shadowBlur = 0;

        // Draw card
        ctx.drawImage(cardImg, cardX, cardY, cardWidth, cardHeight);

        // Right side - Score info
        const textStartX = cardX + cardWidth + 60;
        const textWidth = canvas.width - textStartX - 60;
        let currentY = 80;

        const lang = params.lang || 'en';
        const t = fidTranslations[lang];

        // Title - "NEYNAR SCORE"
        ctx.fillStyle = '#d4af37';
        ctx.font = 'bold 38px serif';
        ctx.textAlign = 'left';
        ctx.fillText('NEYNAR SCORE', textStartX, currentY);
        currentY += 50;

        // Divider line
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(textStartX, currentY);
        ctx.lineTo(textStartX + textWidth, currentY);
        ctx.stroke();
        currentY += 40;

        // Username
        ctx.fillStyle = '#c9a961';
        ctx.font = '24px serif';
        ctx.fillText(`@${params.username}`, textStartX, currentY);
        currentY += 50;

        // Big Score Number
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 72px serif';
        ctx.fillText(params.currentScore.toFixed(3), textStartX, currentY);
        currentY += 20;

        // Score diff from mint
        if (params.mintScore !== undefined) {
          const scoreDiff = params.currentScore - params.mintScore;
          const diffSign = scoreDiff >= 0 ? '+' : '';
          const diffColor = scoreDiff > 0 ? '#4ade80' : scoreDiff < 0 ? '#f87171' : '#9ca3af';

          ctx.fillStyle = diffColor;
          ctx.font = 'bold 28px serif';
          ctx.fillText(`${diffSign}${scoreDiff.toFixed(4)} ${t.sinceMint || 'since mint'}`, textStartX, currentY);
        }
        currentY += 60;

        // Rarity with color
        ctx.fillStyle = '#c9a961';
        ctx.font = 'bold 22px serif';
        ctx.fillText(t.rarity || 'Rarity', textStartX, currentY);
        currentY += 35;

        // Rarity value with upgrade arrow if changed
        ctx.fillStyle = getRarityColor(params.currentRarity);
        ctx.font = 'bold 36px serif';

        if (params.mintRarity && params.mintRarity !== params.currentRarity) {
          ctx.fillStyle = '#9ca3af';
          ctx.fillText(params.mintRarity, textStartX, currentY);
          const mintWidth = ctx.measureText(params.mintRarity).width;

          ctx.fillStyle = '#d4af37';
          ctx.fillText(' → ', textStartX + mintWidth, currentY);
          const arrowWidth = ctx.measureText(' → ').width;

          ctx.fillStyle = getRarityColor(params.currentRarity);
          ctx.fillText(params.currentRarity, textStartX + mintWidth + arrowWidth, currentY);
        } else {
          ctx.fillText(params.currentRarity, textStartX, currentY);
        }
        currentY += 60;

        // Power
        ctx.fillStyle = '#c9a961';
        ctx.font = 'bold 22px serif';
        ctx.fillText(t.power || 'Power', textStartX, currentY);
        currentY += 35;

        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 36px serif';
        ctx.fillText(`${params.power}`, textStartX, currentY);
        currentY += 60;

        // Traits (if provided)
        if (params.traits && params.traits.length > 0) {
          ctx.fillStyle = '#c9a961';
          ctx.font = 'bold 22px serif';
          ctx.fillText('Traits', textStartX, currentY);
          currentY += 30;

          ctx.fillStyle = '#f5f5dc';
          ctx.font = '20px serif';
          const displayTraits = params.traits.slice(0, 3); // Max 3 traits
          displayTraits.forEach((trait) => {
            ctx.fillText(`• ${trait}`, textStartX, currentY);
            currentY += 28;
          });
        }

        // Bottom bar with FID and branding
        const bottomY = canvas.height - 60;

        // FID badge
        ctx.fillStyle = 'rgba(212, 175, 55, 0.2)';
        ctx.beginPath();
        ctx.roundRect(textStartX, bottomY - 15, 140, 40, 8);
        ctx.fill();

        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(textStartX, bottomY - 15, 140, 40, 8);
        ctx.stroke();

        ctx.fillStyle = '#d4af37';
        ctx.font = 'bold 22px serif';
        ctx.fillText(`FID #${params.fid}`, textStartX + 20, bottomY + 12);

        // VibeFID branding
        ctx.fillStyle = '#d4af37';
        ctx.font = 'bold 24px serif';
        ctx.textAlign = 'right';
        ctx.fillText('vibefid.xyz', canvas.width - 50, bottomY + 12);

        // Convert to data URL
        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl);
      } catch (error) {
        reject(error);
      }
    };

    cardImg.src = params.cardImageDataUrl;
  });
}

function getRarityColor(rarity: string): string {
  const colors: Record<string, string> = {
    Common: '#9ca3af',
    Rare: '#3b82f6',
    Epic: '#a855f7',
    Legendary: '#f59e0b',
    Mythic: '#ef4444',
  };
  return colors[rarity] || '#9ca3af';
}
