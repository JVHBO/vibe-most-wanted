/**
 * Generate Farcaster Card Image
 *
 * Creates a card image based on the template and Farcaster data
 */

import type { NeynarUser } from './neynar';
import type { CardSuit, CardRank } from './neynar';

export interface CardGenerationParams {
  // Farcaster data
  fid: number;
  username: string;
  displayName: string;
  pfpUrl: string;
  bio: string;
  neynarScore: number;

  // Card properties
  suit: CardSuit;
  suitSymbol: string;
  rank: CardRank;
  color: 'red' | 'black';
  rarity: string;
}

/**
 * Generate card image using Canvas API
 */
export async function generateFarcasterCardImage(params: CardGenerationParams): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }

    // Card dimensions (poker card ratio: 2.5:3.5)
    canvas.width = 500;
    canvas.height = 700;

    // Background
    ctx.fillStyle = '#f5f5dc'; // Vintage beige
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Border
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    // Top left: rank and suit
    ctx.fillStyle = params.color === 'red' ? '#dc143c' : '#000';
    ctx.textAlign = 'left';
    ctx.font = 'bold 60px serif';
    ctx.fillText(params.rank, 30, 80);
    ctx.font = '50px serif';
    ctx.fillText(params.suitSymbol, 30, 130);

    // Top center - FID
    ctx.fillStyle = '#000';
    ctx.font = '20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`fid:${params.fid}`, canvas.width / 2, 40);

    // Neynar score below FID
    ctx.font = '18px monospace';
    ctx.fillText(`neynar score: ${params.neynarScore.toFixed(2)}`, canvas.width / 2, 70);

    // Load and draw PFP
    const pfpImg = new Image();
    pfpImg.crossOrigin = 'anonymous';

    pfpImg.onload = () => {
      // Draw PFP in center (square)
      const pfpSize = 350;
      const pfpX = (canvas.width - pfpSize) / 2;
      const pfpY = 100;

      // PFP border
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeRect(pfpX - 2, pfpY - 2, pfpSize + 4, pfpSize + 4);

      // Draw PFP
      ctx.drawImage(pfpImg, pfpX, pfpY, pfpSize, pfpSize);

      // Username below PFP
      ctx.fillStyle = '#000';
      ctx.font = 'bold 28px serif';
      ctx.textAlign = 'center';
      ctx.fillText(params.displayName || params.username, canvas.width / 2, pfpY + pfpSize + 40);

      // Bio below username (truncated)
      ctx.font = '14px serif';
      const bioText = params.bio.length > 60 ? params.bio.slice(0, 60) + '...' : params.bio;
      ctx.fillText(bioText, canvas.width / 2, pfpY + pfpSize + 65);

      // Bottom right: suit on top, rank on bottom
      ctx.fillStyle = params.color === 'red' ? '#dc143c' : '#000';
      ctx.textAlign = 'right';
      ctx.font = '50px serif';
      ctx.fillText(params.suitSymbol, canvas.width - 30, canvas.height - 80);
      ctx.font = 'bold 60px serif';
      ctx.fillText(params.rank, canvas.width - 30, canvas.height - 30);

      // Convert to data URL
      const dataUrl = canvas.toDataURL('image/png');
      resolve(dataUrl);
    };

    pfpImg.onerror = () => {
      reject(new Error('Failed to load profile picture'));
    };

    // Try to load PFP with CORS proxy if needed
    pfpImg.src = params.pfpUrl;
  });
}
