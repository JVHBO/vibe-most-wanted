/**
 * Server-side card image generation using @napi-rs/canvas
 * Replicates generateFarcasterCardImage() but works in Node.js
 */

import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';

const SUIT_SYMBOLS: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  spades: '♠',
  clubs: '♣',
};

interface ServerCardParams {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl: string;
  neynarScore: number;
  suit: string;
  suitSymbol: string;
  rank: string;
  color: string;
  power: number;
}

/**
 * Generate card image server-side, returns PNG Buffer
 */
export async function generateCardImageServer(params: ServerCardParams): Promise<Buffer> {
  // Fix suitSymbol if it's stored as letter instead of unicode
  const suitSymbol = SUIT_SYMBOLS[params.suit] || params.suitSymbol;
  const bounty = params.power * 10;

  const canvas = createCanvas(500, 700);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#f5f5dc';
  ctx.fillRect(0, 0, 500, 700);

  // Border
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, 480, 680);

  // Top left: rank and suit
  ctx.fillStyle = params.color === 'red' ? '#dc143c' : '#000';
  ctx.textAlign = 'center';

  // Rank
  ctx.font = 'bold 60px serif';
  const rankWidth = ctx.measureText(params.rank).width;
  ctx.fillText(params.rank, 30 + rankWidth / 2, 80);

  // Suit symbol
  ctx.font = '50px serif';
  ctx.fillText(suitSymbol, 30 + rankWidth / 2, 130);

  // Top center - FID
  ctx.fillStyle = '#000';
  ctx.font = '20px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`fid:${params.fid}`, 250, 40);

  // Neynar score
  ctx.font = '18px monospace';
  ctx.fillText(`neynar score: ${params.neynarScore.toFixed(2)}`, 250, 70);

  // Bounty reward text
  const pfpY = 200;
  ctx.fillStyle = '#000';
  ctx.font = 'bold 18px serif';
  ctx.textAlign = 'center';
  ctx.fillText(`BOUNTY REWARD: $${bounty.toLocaleString()}`, 250, pfpY - 20);

  // Load PFP
  try {
    const pfpImg = await loadImage(params.pfpUrl);
    const pfpSize = 300;
    const pfpX = (500 - pfpSize) / 2;

    // PFP border
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeRect(pfpX - 2, pfpY - 2, pfpSize + 4, pfpSize + 4);

    // Draw PFP
    ctx.drawImage(pfpImg, pfpX, pfpY, pfpSize, pfpSize);

    // Vintage filter overlay
    const gradient = ctx.createLinearGradient(pfpX, pfpY, pfpX, pfpY + pfpSize);
    gradient.addColorStop(0, 'rgba(101, 67, 33, 0.15)');
    gradient.addColorStop(0.5, 'rgba(101, 67, 33, 0.05)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
    ctx.fillStyle = gradient;
    ctx.fillRect(pfpX, pfpY, pfpSize, pfpSize);

    // Vignette
    const radialGrad = ctx.createRadialGradient(
      pfpX + pfpSize / 2, pfpY + pfpSize / 2, pfpSize * 0.3,
      pfpX + pfpSize / 2, pfpY + pfpSize / 2, pfpSize * 0.7
    );
    radialGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    radialGrad.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
    ctx.fillStyle = radialGrad;
    ctx.fillRect(pfpX, pfpY, pfpSize, pfpSize);
  } catch (err) {
    // If PFP fails, draw placeholder
    console.warn(`Failed to load PFP for FID ${params.fid}:`, err);
    const pfpSize = 300;
    const pfpX = (500 - pfpSize) / 2;
    ctx.fillStyle = '#666';
    ctx.fillRect(pfpX, pfpY, pfpSize, pfpSize);
    ctx.fillStyle = '#fff';
    ctx.font = '24px serif';
    ctx.fillText('PFP unavailable', 250, pfpY + pfpSize / 2);
  }

  // Username below PFP
  ctx.fillStyle = '#000';
  ctx.font = 'bold 28px serif';
  ctx.textAlign = 'center';
  ctx.fillText(params.displayName || params.username, 250, 200 + 300 + 40);

  // Meme crime text
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
  ];
  // Use FID as seed for deterministic crime
  const crimeText = crimes[params.fid % crimes.length];

  ctx.font = '14px serif';
  const maxWidth = 450;
  const words = crimeText.split(' ');
  let line = '';
  let y = 200 + 300 + 65;

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && i > 0) {
      ctx.fillText(line, 250, y);
      line = words[i] + ' ';
      y += 18;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, 250, y);

  // Bottom right: rotated 180°
  ctx.save();
  ctx.translate(500 - 30, 700 - 30);
  ctx.rotate(Math.PI);
  ctx.fillStyle = params.color === 'red' ? '#dc143c' : '#000';
  ctx.textAlign = 'center';

  ctx.font = 'bold 60px serif';
  const bottomRankWidth = ctx.measureText(params.rank).width;
  ctx.fillText(params.rank, bottomRankWidth / 2, 50);

  ctx.font = '50px serif';
  ctx.fillText(suitSymbol, bottomRankWidth / 2, 100);
  ctx.restore();

  // Bottom left - WANTED SINCE
  ctx.fillStyle = '#000';
  ctx.font = 'bold 16px serif';
  ctx.textAlign = 'left';

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  let year: number;

  if (params.fid <= 1000) {
    year = 1920 + Math.floor(((params.fid - 1) / 999) * 10);
  } else if (params.fid <= 10000) {
    year = 1930 + Math.floor(((params.fid - 1000) / 9000) * 20);
  } else if (params.fid <= 100000) {
    year = 1950 + Math.floor(((params.fid - 10000) / 90000) * 30);
  } else if (params.fid <= 500000) {
    year = 1980 + Math.floor(((params.fid - 100000) / 400000) * 20);
  } else {
    year = 2000 + Math.floor(Math.min((params.fid - 500000) / 500000, 1) * 20);
  }

  const month = monthNames[params.fid % 12];

  ctx.fillText('WANTED SINCE:', 20, 700 - 50);
  ctx.font = 'bold 16px serif';
  ctx.fillText(`${month} ${year}`, 20, 700 - 28);

  // Return PNG buffer
  return canvas.toBuffer('image/png');
}
