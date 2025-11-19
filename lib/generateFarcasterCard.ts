/**
 * Generate Farcaster Card Image
 *
 * Creates a card image based on the template and Farcaster data
 */

import type { NeynarUser } from './neynar';
import type { CardSuit, CardRank } from './neynar';

/**
 * Generate a random meme crime phrase
 */
function generateMemeCrime(): string {
  const crimes = [
    "Caught redhanded stealing vibes from the timeline",
    "Wanted for posting cringe takes at 3am",
    "Accused of having too much aura for their follower count",
    "Guilty of being chronically online since 2009",
    "Suspected of touching grass only once a year",
    "Known associate of the ratio gang",
    "Wanted for committing tax fraud in the metaverse",
    "Caught lacking in the group chat",
    "Guilty of copying homework and still getting it wrong",
    "Wanted for being too based for their own good",
    "Accused of having main character syndrome",
    "Known for starting beef in the replies",
    "Caught simping in 4K resolution",
    "Guilty of posting banger after banger",
    "Wanted for stealing the aux cord at parties",
    "Suspected of unironically saying 'hear me out'",
    "Known for gatekeeping their Spotify playlists",
    "Caught making up stories for clout",
    "Guilty of having zero chill whatsoever",
    "Wanted for crimes against good taste",
    "Accused of being built different (derogatory)",
    "Known for sliding into DMs with 'hey lol'",
    "Caught lacking common sense in public",
    "Guilty of being that friend who never texts back",
    "Wanted for hoarding NFTs they'll never sell",
    "Suspected of pretending to read books for aesthetic",
    "Known for starting drama and grabbing popcorn",
    "Caught being a menace to society (affectionate)",
    "Guilty of believing their own hype too much",
  ];

  return crimes[Math.floor(Math.random() * crimes.length)];
}

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
      const pfpSize = 320;
      const pfpX = (canvas.width - pfpSize) / 2;
      const pfpY = 150; // Centered with space for bottom text

      // PFP border
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeRect(pfpX - 2, pfpY - 2, pfpSize + 4, pfpSize + 4);

      // Draw PFP
      ctx.drawImage(pfpImg, pfpX, pfpY, pfpSize, pfpSize);

      // Add vintage filter overlay on PFP
      const gradient = ctx.createLinearGradient(pfpX, pfpY, pfpX, pfpY + pfpSize);
      gradient.addColorStop(0, 'rgba(101, 67, 33, 0.15)'); // Sepia tone top
      gradient.addColorStop(0.5, 'rgba(101, 67, 33, 0.05)'); // Lighter middle
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)'); // Darker bottom
      ctx.fillStyle = gradient;
      ctx.fillRect(pfpX, pfpY, pfpSize, pfpSize);

      // Add subtle vignette effect
      const radialGrad = ctx.createRadialGradient(
        pfpX + pfpSize/2, pfpY + pfpSize/2, pfpSize * 0.3,
        pfpX + pfpSize/2, pfpY + pfpSize/2, pfpSize * 0.7
      );
      radialGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      radialGrad.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
      ctx.fillStyle = radialGrad;
      ctx.fillRect(pfpX, pfpY, pfpSize, pfpSize);

      // Username below PFP
      ctx.fillStyle = '#000';
      ctx.font = 'bold 28px serif';
      ctx.textAlign = 'center';
      ctx.fillText(params.displayName || params.username, canvas.width / 2, pfpY + pfpSize + 40);

      // Meme crime text below username
      ctx.font = '14px serif';
      const crimeText = generateMemeCrime();
      // Word wrap for long text
      const maxWidth = 450;
      const words = crimeText.split(' ');
      let line = '';
      let y = pfpY + pfpSize + 65;

      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && i > 0) {
          ctx.fillText(line, canvas.width / 2, y);
          line = words[i] + ' ';
          y += 18;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, canvas.width / 2, y);

      // Bottom right: rotated 180° (upside down like real playing cards)
      ctx.save();
      ctx.translate(canvas.width - 30, canvas.height - 30);
      ctx.rotate(Math.PI); // 180° rotation
      ctx.fillStyle = params.color === 'red' ? '#dc143c' : '#000';
      ctx.textAlign = 'left';
      ctx.font = 'bold 60px serif';
      ctx.fillText(params.rank, 0, 80); // Match top left spacing
      ctx.font = '50px serif';
      ctx.fillText(params.suitSymbol, 0, 130); // Match top left spacing
      ctx.restore();

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
