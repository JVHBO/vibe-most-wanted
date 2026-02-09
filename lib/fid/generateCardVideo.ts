/**
 * Generate MP4 video of card with foil animation
 *
 * Uses Canvas + MediaRecorder API to capture video with foil animation
 * Supports animated PFPs (GIFs) that animate in sync with the video
 *
 * STANDARD: All VibeFID videos are 3 seconds, 30 FPS
 */

import fixWebmDuration from 'fix-webm-duration';
import { extractGifFrames, imageDataToCanvas, type ExtractedGif } from './gifExtractor';

// Standard video parameters for all VibeFID cards
const STANDARD_DURATION = 3;      // 3 seconds for static PFP
const ANIMATED_PFP_DURATION = 5;  // 5 seconds for animated PFP
const STANDARD_FPS = 30;          // 30 FPS for smooth foil animation

export interface VideoCardParams {
  cardImageDataUrl: string;
  foilType: 'None' | 'Standard' | 'Prize';
  duration?: number; // seconds (default: 3)
  fps?: number;      // frames per second (default: 30)
  pfpUrl?: string;   // Original PFP URL to check for animation
}

// PFP area dimensions in the video (scaled from 500x700 card)
// Original: PFP at (100, 200) with size 300x300
// Scale factor: 600/500 = 1.2
const PFP_AREA = {
  x: 120,      // 100 * 1.2
  y: 240,      // 200 * 1.2
  size: 360,   // 300 * 1.2
};

export async function generateCardVideo({
  cardImageDataUrl,
  foilType,
  duration = STANDARD_DURATION,
  fps = STANDARD_FPS,
  pfpUrl,
}: VideoCardParams): Promise<Blob> {
  return new Promise(async (resolve, reject) => {
    try {
      // Create off-screen canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      // Card dimensions (playing card aspect ratio 2.5:3.5)
      const width = 600;
      const height = 840;
      canvas.width = width;
      canvas.height = height;

      // Load card image
      const cardImg = new Image();
      cardImg.crossOrigin = 'anonymous';

      await new Promise<void>((res, rej) => {
        cardImg.onload = () => res();
        cardImg.onerror = () => rej(new Error('Failed to load card image'));
        cardImg.src = cardImageDataUrl;
      });

      // Check for animated PFP
      let animatedPfp: ExtractedGif | null = null;
      let gifFrameCanvases: HTMLCanvasElement[] = [];

      if (pfpUrl) {
        try {
          animatedPfp = await extractGifFrames(pfpUrl);
          if (animatedPfp) {
            console.log(`Animated PFP detected: ${animatedPfp.frames.length} frames, ${animatedPfp.totalDuration}ms total`);
            // Pre-convert all frames to canvases for faster rendering
            gifFrameCanvases = animatedPfp.frames.map(f => imageDataToCanvas(f.imageData));
          }
        } catch (e) {
          console.log('PFP is not animated or failed to extract frames');
        }
      }

      // Use extended duration for animated PFPs (5 seconds vs 3 seconds for static)
      const actualDuration = animatedPfp ? ANIMATED_PFP_DURATION : duration;
      console.log(`Video duration: ${actualDuration}s (animated PFP: ${!!animatedPfp})`);

      // Setup MediaRecorder
      const stream = canvas.captureStream(fps);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 2500000, // 2.5 Mbps
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const webmBlob = new Blob(chunks, { type: 'video/webm' });

        // FIX: Add duration metadata to WebM for seamless looping
        const durationMs = actualDuration * 1000;
        const fixedBlob = await fixWebmDuration(webmBlob, durationMs);

        resolve(fixedBlob);
      };

      mediaRecorder.onerror = (e) => {
        reject(new Error('MediaRecorder error'));
      };

      // Start recording
      mediaRecorder.start();

      // Track start time for accurate duration
      const startTime = performance.now();
      const targetDurationMs = actualDuration * 1000;

      // Render animation frames
      const totalFrames = actualDuration * fps;
      let frame = 0;

      // Calculate GIF frame timing
      let gifFrameIndex = 0;
      let gifFrameAccumulator = 0;
      const msPerVideoFrame = 1000 / fps;

      const renderFrame = () => {
        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Draw card image (with static PFP baked in)
        ctx.drawImage(cardImg, 0, 0, width, height);

        // If we have animated PFP, overlay the current GIF frame
        if (animatedPfp && gifFrameCanvases.length > 0) {
          // Calculate which GIF frame to show based on accumulated time
          gifFrameAccumulator += msPerVideoFrame;

          // Advance GIF frame(s) based on their individual delays
          while (gifFrameAccumulator >= animatedPfp.frames[gifFrameIndex].delay) {
            gifFrameAccumulator -= animatedPfp.frames[gifFrameIndex].delay;
            gifFrameIndex = (gifFrameIndex + 1) % animatedPfp.frames.length;
          }

          // Draw the animated PFP frame over the static one
          const gifCanvas = gifFrameCanvases[gifFrameIndex];

          // Draw the GIF frame in the PFP area
          ctx.drawImage(
            gifCanvas,
            PFP_AREA.x,
            PFP_AREA.y,
            PFP_AREA.size,
            PFP_AREA.size
          );

          // Re-apply vintage filter overlay on animated PFP
          const gradient = ctx.createLinearGradient(
            PFP_AREA.x,
            PFP_AREA.y,
            PFP_AREA.x,
            PFP_AREA.y + PFP_AREA.size
          );
          gradient.addColorStop(0, 'rgba(101, 67, 33, 0.15)');
          gradient.addColorStop(0.5, 'rgba(101, 67, 33, 0.05)');
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
          ctx.fillStyle = gradient;
          ctx.fillRect(PFP_AREA.x, PFP_AREA.y, PFP_AREA.size, PFP_AREA.size);

          // Re-apply vignette
          const radialGrad = ctx.createRadialGradient(
            PFP_AREA.x + PFP_AREA.size/2,
            PFP_AREA.y + PFP_AREA.size/2,
            PFP_AREA.size * 0.3,
            PFP_AREA.x + PFP_AREA.size/2,
            PFP_AREA.y + PFP_AREA.size/2,
            PFP_AREA.size * 0.7
          );
          radialGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
          radialGrad.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
          ctx.fillStyle = radialGrad;
          ctx.fillRect(PFP_AREA.x, PFP_AREA.y, PFP_AREA.size, PFP_AREA.size);
        }

        // Apply foil effect overlay
        if (foilType !== 'None') {
          drawFoilEffect(ctx, width, height, frame, foilType, totalFrames);
        }

        frame++;

        // Check both frame count AND elapsed time to prevent runaway recording
        const elapsedMs = performance.now() - startTime;
        if (frame >= totalFrames || elapsedMs >= targetDurationMs + 500) {
          // Stop the interval and recording
          clearInterval(intervalId);
          mediaRecorder.stop();
          console.log(`Video recording stopped: ${frame} frames in ${elapsedMs.toFixed(0)}ms`);
        }
      };

      // Use setInterval instead of requestAnimationFrame to ensure consistent timing
      // even when the browser tab is not in focus (requestAnimationFrame is throttled)
      const intervalId = setInterval(renderFrame, msPerVideoFrame);

      // Safety timeout - force stop if recording goes too long
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          console.warn(`Safety timeout triggered! Forcing stop after ${targetDurationMs + 1000}ms`);
          clearInterval(intervalId);
          mediaRecorder.stop();
        }
      }, targetDurationMs + 1000);

    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Draw foil effect on canvas (simulating CSS animation)
 */
function drawFoilEffect(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: number,
  foilType: 'Standard' | 'Prize',
  totalFrames: number
) {
  // Save context
  ctx.save();

  // Set blend mode (overlay works better on varied backgrounds)
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = foilType === 'Prize' ? 0.8 : 0.6; // INCREASED for visibility

  // Calculate animation progress (0 to 1)
  // FIX: Use totalFrames to ensure seamless loop - foil cycle matches video duration
  const progress = frame / totalFrames;

  // Create gradient that shifts with animation
  // Both use 45deg direction for consistency
  const gradient = ctx.createConicGradient(
    (progress * Math.PI * 2) + (45 * Math.PI / 180),
    width * -0.3,
    height * -0.3
  );

  if (foilType === 'Prize') {
    // Prize foil: strong, aggressive rainbow shimmer
    gradient.addColorStop(0, 'rgba(139, 0, 255, 0.7)'); // violet (stronger!)
    gradient.addColorStop(0.143, 'rgba(0, 0, 255, 0.7)'); // blue
    gradient.addColorStop(0.286, 'rgba(0, 255, 255, 0.7)'); // cyan
    gradient.addColorStop(0.429, 'rgba(0, 255, 0, 0.7)'); // green
    gradient.addColorStop(0.571, 'rgba(255, 255, 0, 0.7)'); // yellow
    gradient.addColorStop(0.714, 'rgba(255, 127, 0, 0.7)'); // orange
    gradient.addColorStop(0.857, 'rgba(255, 0, 0, 0.6)'); // red
    gradient.addColorStop(1, 'rgba(139, 0, 255, 0.7)'); // violet
  } else {
    // Standard foil: softer pastel
    gradient.addColorStop(0, 'rgba(139, 0, 255, 0.4)'); // violet
    gradient.addColorStop(0.143, 'rgba(0, 0, 255, 0.4)'); // blue
    gradient.addColorStop(0.286, 'rgba(0, 255, 255, 0.4)'); // cyan
    gradient.addColorStop(0.429, 'rgba(0, 255, 0, 0.4)'); // green
    gradient.addColorStop(0.571, 'rgba(255, 255, 0, 0.4)'); // yellow
    gradient.addColorStop(0.714, 'rgba(255, 127, 0, 0.4)'); // orange
    gradient.addColorStop(0.857, 'rgba(255, 0, 0, 0.3)'); // red (softer)
    gradient.addColorStop(1, 'rgba(139, 0, 255, 0.4)'); // violet
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Add diagonal stripes overlay
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = foilType === 'Prize' ? 0.45 : 0.3; // Prize: 0.45 (stronger!), Standard: 0.3

  const stripeWidth = 5;
  const stripeSpacing = 10;
  const offset = (progress * 100) % stripeSpacing;

  // Prize: more visible stripes, Standard: subtle
  ctx.strokeStyle = foilType === 'Prize' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = stripeWidth;

  for (let i = -height; i < width + height; i += stripeSpacing) {
    ctx.beginPath();
    ctx.moveTo(i + offset, 0);
    ctx.lineTo(i + offset + height, height);
    ctx.stroke();
  }

  // Restore context
  ctx.restore();
}
