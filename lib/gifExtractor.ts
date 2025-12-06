/**
 * GIF Frame Extractor
 *
 * Uses gifuct-js to extract frames from animated GIFs
 */

import { parseGIF, decompressFrames } from 'gifuct-js';

export interface GifFrame {
  imageData: ImageData;
  delay: number; // in ms
}

export interface ExtractedGif {
  frames: GifFrame[];
  width: number;
  height: number;
  totalDuration: number; // in ms
}

/**
 * Check if a URL points to an animated GIF
 */
export async function isAnimatedGif(url: string): Promise<boolean> {
  try {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const gif = parseGIF(buffer);
    const frames = decompressFrames(gif, true);
    return frames.length > 1;
  } catch {
    return false;
  }
}

/**
 * Extract all frames from a GIF URL
 */
export async function extractGifFrames(url: string): Promise<ExtractedGif | null> {
  try {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const gif = parseGIF(buffer);
    const frames = decompressFrames(gif, true);

    if (frames.length <= 1) {
      return null; // Not an animated GIF
    }

    const width = gif.lsd.width;
    const height = gif.lsd.height;

    // Create a canvas to composite frames
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    const extractedFrames: GifFrame[] = [];
    let totalDuration = 0;

    // Previous frame for disposal method handling
    let previousImageData: ImageData | null = null;

    // Calculate average delay to detect GIFs with broken timing
    const avgDelay = frames.reduce((sum, f) => sum + (f.delay * 10), 0) / frames.length;
    const hasSlowTiming = avgDelay > 200; // If avg > 200ms, GIF likely has broken/slow timing

    for (const frame of frames) {
      let delay = frame.delay * 10; // gifuct-js returns delay in centiseconds

      // Cap delay to reasonable range for smooth animation
      // Min 30ms (~33fps), Max 150ms (~7fps) for PFP animations
      // If GIF has very slow timing (>200ms avg), assume it's broken and use 80ms
      if (hasSlowTiming) {
        delay = 80; // Force ~12fps for GIFs with slow/broken timing
      } else {
        delay = Math.max(30, Math.min(150, delay || 80));
      }

      totalDuration += delay;

      // Handle disposal method
      if (frame.disposalType === 2) {
        // Restore to background
        ctx.clearRect(0, 0, width, height);
      } else if (frame.disposalType === 3 && previousImageData) {
        // Restore to previous
        ctx.putImageData(previousImageData, 0, 0);
      }

      // Save current state before drawing if needed for next frame
      if (frames[frames.indexOf(frame) + 1]?.disposalType === 3) {
        previousImageData = ctx.getImageData(0, 0, width, height);
      }

      // Draw frame patch
      const imageData = ctx.createImageData(frame.dims.width, frame.dims.height);
      imageData.data.set(frame.patch);

      // Create temp canvas for the patch
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = frame.dims.width;
      tempCanvas.height = frame.dims.height;
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCtx.putImageData(imageData, 0, 0);

      // Draw patch onto main canvas at correct position
      ctx.drawImage(tempCanvas, frame.dims.left, frame.dims.top);

      // Get the full frame
      extractedFrames.push({
        imageData: ctx.getImageData(0, 0, width, height),
        delay // Already capped to 30-150ms range
      });
    }

    return {
      frames: extractedFrames,
      width,
      height,
      totalDuration
    };
  } catch (error) {
    console.error('Failed to extract GIF frames:', error);
    return null;
  }
}

/**
 * Convert ImageData to canvas for easier drawing
 */
export function imageDataToCanvas(imageData: ImageData): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}
