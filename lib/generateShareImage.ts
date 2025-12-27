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
import { fidTranslations } from './fidTranslations';
import type { SupportedLanguage } from './translations';

interface ShareImageParams {
  cardImageDataUrl: string; // Base64 data URL of the card PNG
  backstoryData: CriminalBackstoryData;
  displayName: string;
  lang?: SupportedLanguage; // Language for backstory (defaults to 'en')
}

export async function generateShareImage(params: ShareImageParams): Promise<string> {
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
        const cardWidth = 400;
        const cardHeight = 560; // Maintain 500:700 aspect ratio (5:7)
        const cardX = 40;
        const cardY = (canvas.height - cardHeight) / 2;

        // Card border
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 3;
        ctx.strokeRect(cardX - 3, cardY - 3, cardWidth + 6, cardHeight + 6);

        // Draw card
        ctx.drawImage(cardImg, cardX, cardY, cardWidth, cardHeight);

        // Right side - Criminal record text
        const textStartX = cardX + cardWidth + 50;
        const textWidth = canvas.width - textStartX - 50;
        let currentY = 100;

        // Get translations for current language
        const lang = params.lang || 'en';
        const t = fidTranslations[lang];

        // Generate backstory in user's language (defaults to English)
        const backstory = generateCriminalBackstory(params.backstoryData, lang);

        // Title
        ctx.fillStyle = '#d4af37';
        ctx.font = 'bold 42px serif';
        ctx.textAlign = 'left';
        ctx.fillText(t.criminalRecord, textStartX, currentY);
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
        ctx.fillText(t.wantedFor, textStartX, currentY);
        currentY += 30;

        ctx.fillStyle = '#d4af37';
        ctx.font = 'bold 22px serif';
        const wantedText = wrapText(ctx, backstory.wantedFor, textWidth, 22);
        // Limit to 4 lines max to prevent overflow
        const wantedLines = wantedText.slice(0, 4);
        wantedLines.forEach((line, idx) => {
          // Add ellipsis to last line if text was truncated
          const displayLine = (idx === 3 && wantedText.length > 4) ? line + '...' : line;
          ctx.fillText(displayLine, textStartX, currentY);
          currentY += 28;
        });
        currentY += 15;

        // Danger Level
        ctx.fillStyle = '#c9a961';
        ctx.font = 'bold 20px serif';
        ctx.fillText(t.dangerLevel, textStartX, currentY);
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
        ctx.fillText(t.lastSeen, textStartX, currentY);
        currentY += 28;

        ctx.fillStyle = '#f5f5dc';
        ctx.font = '18px serif';
        const lastSeenText = wrapText(ctx, backstory.lastSeen, textWidth, 18);
        // Limit to 3 lines max to prevent overflow
        const lastSeenLines = lastSeenText.slice(0, 3);
        lastSeenLines.forEach((line, idx) => {
          // Add ellipsis to last line if text was truncated
          const displayLine = (idx === 2 && lastSeenText.length > 3) ? line + '...' : line;
          ctx.fillText(displayLine, textStartX, currentY);
          currentY += 24;
        });

        // Warning box at bottom
        const warningY = canvas.height - 100;
        ctx.fillStyle = 'rgba(139, 0, 0, 0.3)';
        ctx.fillRect(textStartX - 10, warningY - 10, textWidth + 20, 60);

        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 2;
        ctx.strokeRect(textStartX - 10, warningY - 10, textWidth + 20, 60);

        ctx.fillStyle = '#ff6666';
        ctx.font = 'bold 18px serif';
        ctx.textAlign = 'center';
        ctx.fillText(t.warningCaution,
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
