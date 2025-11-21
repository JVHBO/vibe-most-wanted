/**
 * Generate Share Image - Combines card PNG with criminal record text
 *
 * Creates a 1200x630 image for social sharing with:
 * - Card image on the left (scaled to fit)
 * - Criminal record text on the right
 * - Vintage theme matching the site
 */

import type { CriminalBackstoryData } from './generateCriminalBackstory';
import { generateCriminalBackstory } from './generateCriminalBackstory';

interface ShareImageParams {
  cardImageDataUrl: string; // Base64 data URL of the card PNG
  backstoryData: CriminalBackstoryData;
  displayName: string;
}

export async function generateShareImage(params: ShareImageParams): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }

    // Standard OG image size
    canvas.width = 1200;
    canvas.height = 630;

    // Background - vintage charcoal
    ctx.fillStyle = '#1a1a1a';
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
        const cardWidth = 350;
        const cardHeight = 490; // Maintain 500:700 aspect ratio
        const cardX = 40;
        const cardY = (canvas.height - cardHeight) / 2;

        // Card border
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 3;
        ctx.strokeRect(cardX - 3, cardY - 3, cardWidth + 6, cardHeight + 6);

        // Draw card
        ctx.drawImage(cardImg, cardX, cardY, cardWidth, cardHeight);

        // Right side - Criminal record text
        const textStartX = cardX + cardWidth + 60;
        const textWidth = canvas.width - textStartX - 50;
        let currentY = 80;

        // Generate backstory in English for share
        const backstory = generateCriminalBackstory(params.backstoryData, 'en');

        // Title
        ctx.fillStyle = '#d4af37';
        ctx.font = 'bold 42px serif';
        ctx.textAlign = 'left';
        ctx.fillText('CRIMINAL RECORD', textStartX, currentY);
        currentY += 50;

        // Divider line
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(textStartX, currentY);
        ctx.lineTo(textStartX + textWidth, currentY);
        ctx.stroke();
        currentY += 30;

        // Name
        ctx.fillStyle = '#f5f5dc';
        ctx.font = 'bold 28px serif';
        const nameText = params.displayName.length > 25
          ? params.displayName.substring(0, 25) + '...'
          : params.displayName;
        ctx.fillText(nameText, textStartX, currentY);
        currentY += 45;

        // Wanted For
        ctx.fillStyle = '#c9a961';
        ctx.font = 'bold 20px serif';
        ctx.fillText('WANTED FOR:', textStartX, currentY);
        currentY += 30;

        ctx.fillStyle = '#d4af37';
        ctx.font = 'bold 22px serif';
        const wantedText = wrapText(ctx, backstory.wantedFor, textWidth, 22);
        wantedText.forEach(line => {
          ctx.fillText(line, textStartX, currentY);
          currentY += 28;
        });
        currentY += 15;

        // Danger Level
        ctx.fillStyle = '#c9a961';
        ctx.font = 'bold 20px serif';
        ctx.fillText('DANGER LEVEL:', textStartX, currentY);
        currentY += 30;

        // Danger level color based on level
        const dangerColor = backstory.dangerLevel.includes('EXTREME') ? '#ff4444' :
                           backstory.dangerLevel.includes('HIGH') ? '#ff8800' :
                           backstory.dangerLevel.includes('MEDIUM') ? '#ffcc00' : '#44ff44';
        ctx.fillStyle = dangerColor;
        ctx.font = 'bold 24px serif';
        ctx.fillText(backstory.dangerLevel, textStartX, currentY);
        currentY += 40;

        // Last Seen
        ctx.fillStyle = '#c9a961';
        ctx.font = 'bold 20px serif';
        ctx.fillText('LAST SEEN:', textStartX, currentY);
        currentY += 28;

        ctx.fillStyle = '#f5f5dc';
        ctx.font = '18px serif';
        const lastSeenText = wrapText(ctx, backstory.lastSeen, textWidth, 18);
        lastSeenText.forEach(line => {
          ctx.fillText(line, textStartX, currentY);
          currentY += 24;
        });

        // Warning box at bottom
        const warningY = canvas.height - 80;
        ctx.fillStyle = 'rgba(139, 0, 0, 0.3)';
        ctx.fillRect(textStartX - 10, warningY - 10, textWidth + 20, 60);

        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 2;
        ctx.strokeRect(textStartX - 10, warningY - 10, textWidth + 20, 60);

        ctx.fillStyle = '#ff6666';
        ctx.font = 'bold 18px serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚠️ WARNING: ARMED AND DANGEROUS ⚠️',
                    textStartX + textWidth / 2,
                    warningY + 20);

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

/**
 * Wrap text to fit within a specified width
 */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, fontSize: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const testLine = currentLine + words[i] + ' ';
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && i > 0) {
      lines.push(currentLine.trim());
      currentLine = words[i] + ' ';
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }

  return lines;
}
