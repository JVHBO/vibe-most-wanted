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
  createdAt?: Date; // Account creation timestamp (optional)

  // Card properties
  suit: CardSuit;
  suitSymbol: string;
  rank: CardRank;
  color: 'red' | 'black';
  rarity: string;
  bounty: number; // Bounty reward for capture
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

    // Top left: rank and suit (centered horizontally)
    ctx.fillStyle = params.color === 'red' ? '#dc143c' : '#000';
    ctx.textAlign = 'center';

    // For "10", compress letter spacing
    if (params.rank === '10') {
      ctx.letterSpacing = '-8px';
    }
    ctx.font = 'bold 60px serif';
    const rankWidth = ctx.measureText(params.rank).width;
    ctx.fillText(params.rank, 30 + rankWidth / 2, 80);

    // Reset letter spacing
    ctx.letterSpacing = '0px';

    // Suit symbol centered with rank
    ctx.font = '50px serif';
    const suitWidth = ctx.measureText(params.suitSymbol).width;
    ctx.fillText(params.suitSymbol, 30 + rankWidth / 2, 130);

    // Top center - FID
    ctx.fillStyle = '#000';
    ctx.font = '20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`fid:${params.fid}`, canvas.width / 2, 40);

    // Neynar score below FID
    ctx.font = '18px monospace';
    ctx.fillText(`neynar score: ${params.neynarScore.toFixed(2)}`, canvas.width / 2, 70);

    // BOUNTY REWARD text (above PFP, close to it - simple black text)
    const pfpY = 200; // PFP starts at y=200
    ctx.fillStyle = '#000';
    ctx.font = 'bold 18px serif';
    ctx.textAlign = 'center';
    ctx.fillText(`BOUNTY REWARD: $${params.bounty.toLocaleString()}`, canvas.width / 2, pfpY - 20); // 20px above PFP

    // Load and draw PFP
    const pfpImg = new Image();
    pfpImg.crossOrigin = 'anonymous';

    pfpImg.onload = () => {
      // Draw PFP in center (square)
      const pfpSize = 300;
      const pfpX = (canvas.width - pfpSize) / 2;
      const pfpY = 200; // More centered vertically in 700px canvas

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
      // Match top spacing: rank at 80px from edge, suit at 130px from edge
      ctx.save();
      ctx.translate(canvas.width - 30, canvas.height - 30);
      ctx.rotate(Math.PI); // 180° rotation
      ctx.fillStyle = params.color === 'red' ? '#dc143c' : '#000';
      ctx.textAlign = 'center';

      // For "10", compress letter spacing
      if (params.rank === '10') {
        ctx.letterSpacing = '-8px';
      }
      ctx.font = 'bold 60px serif';
      const bottomRankWidth = ctx.measureText(params.rank).width;
      ctx.fillText(params.rank, bottomRankWidth / 2, 50); // 80px from bottom, centered

      // Reset letter spacing
      ctx.letterSpacing = '0px';

      // Suit symbol centered with rank
      ctx.font = '50px serif';
      ctx.fillText(params.suitSymbol, bottomRankWidth / 2, 100); // 130px from bottom, centered
      ctx.restore();

      // Bottom left - WANTED SINCE (moved down slightly)
      ctx.fillStyle = '#000';
      ctx.font = 'bold 16px serif';
      ctx.textAlign = 'left';

      // Generate vintage date from FID
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

      let year: number;
      let monthProgress: number; // 0-1 representing position within the range

      if (params.fid <= 1000) {
        // FID 1-1,000: 1920-1930 (10 years)
        monthProgress = (params.fid - 1) / 999;
        year = 1920 + Math.floor(monthProgress * 10);
      } else if (params.fid <= 10000) {
        // FID 1,001-10,000: 1930-1950 (20 years)
        monthProgress = (params.fid - 1000) / 9000;
        year = 1930 + Math.floor(monthProgress * 20);
      } else if (params.fid <= 100000) {
        // FID 10,001-100,000: 1950-1980 (30 years)
        monthProgress = (params.fid - 10000) / 90000;
        year = 1950 + Math.floor(monthProgress * 30);
      } else if (params.fid <= 500000) {
        // FID 100,001-500,000: 1980-2000 (20 years)
        monthProgress = (params.fid - 100000) / 400000;
        year = 1980 + Math.floor(monthProgress * 20);
      } else {
        // FID 500,001+: 2000-2020 (20 years)
        monthProgress = Math.min((params.fid - 500000) / 500000, 1);
        year = 2000 + Math.floor(monthProgress * 20);
      }

      // Use FID to generate consistent month (modulo 12)
      const month = monthNames[params.fid % 12];

      ctx.fillText(`WANTED SINCE:`, 20, canvas.height - 50);
      ctx.font = 'bold 16px serif'; // Same font for consistency
      ctx.fillText(`${month} ${year}`, 20, canvas.height - 28);

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
