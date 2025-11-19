/**
 * Generate MP4 video of card with foil animation
 *
 * Uses Canvas + MediaRecorder API to capture 3 seconds of foil animation
 */

export interface VideoCardParams {
  cardImageDataUrl: string;
  foilType: 'None' | 'Standard' | 'Prize';
  duration?: number; // seconds
  fps?: number;
}

export async function generateCardVideo({
  cardImageDataUrl,
  foilType,
  duration = 3,
  fps = 30,
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

        // For now, return WebM (most NFT platforms support it)
        // Can convert to MP4 later if needed
        resolve(webmBlob);
      };

      mediaRecorder.onerror = (e) => {
        reject(new Error('MediaRecorder error'));
      };

      // Start recording
      mediaRecorder.start();

      // Render animation frames
      const totalFrames = duration * fps;
      let frame = 0;

      const renderFrame = () => {
        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Draw card image
        ctx.drawImage(cardImg, 0, 0, width, height);

        // Apply foil effect overlay
        if (foilType !== 'None') {
          drawFoilEffect(ctx, width, height, frame, foilType);
        }

        frame++;

        if (frame < totalFrames) {
          requestAnimationFrame(renderFrame);
        } else {
          // Stop recording after duration
          mediaRecorder.stop();
        }
      };

      // Start rendering
      renderFrame();

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
  foilType: 'Standard' | 'Prize'
) {
  // Save context
  ctx.save();

  // Set blend mode
  ctx.globalCompositeOperation = 'hard-light';
  ctx.globalAlpha = foilType === 'Prize' ? 0.4 : 0.25;

  // Calculate animation progress (0 to 1)
  const speed = foilType === 'Prize' ? 2 : 4; // seconds per cycle
  const progress = (frame % (30 * speed)) / (30 * speed);

  // Create gradient that shifts with animation
  const gradient = ctx.createConicGradient(
    (progress * Math.PI * 2) + (foilType === 'Prize' ? (225 * Math.PI / 180) : (45 * Math.PI / 180)),
    width * -0.3,
    height * -0.3
  );

  if (foilType === 'Prize') {
    // Prize foil: bright rainbow
    gradient.addColorStop(0, 'rgba(255, 0, 0, 1)');
    gradient.addColorStop(0.143, 'rgba(255, 127, 0, 1)');
    gradient.addColorStop(0.286, 'rgba(255, 255, 0, 1)');
    gradient.addColorStop(0.429, 'rgba(0, 255, 0, 1)');
    gradient.addColorStop(0.571, 'rgba(0, 255, 255, 1)');
    gradient.addColorStop(0.714, 'rgba(0, 0, 255, 1)');
    gradient.addColorStop(0.857, 'rgba(139, 0, 255, 1)');
    gradient.addColorStop(1, 'rgba(255, 0, 0, 1)');
  } else {
    // Standard foil: softer pastel (inverted)
    gradient.addColorStop(0, 'rgba(139, 0, 255, 0.8)');
    gradient.addColorStop(0.143, 'rgba(0, 0, 255, 0.8)');
    gradient.addColorStop(0.286, 'rgba(0, 255, 255, 0.8)');
    gradient.addColorStop(0.429, 'rgba(0, 255, 0, 0.8)');
    gradient.addColorStop(0.571, 'rgba(255, 255, 0, 0.8)');
    gradient.addColorStop(0.714, 'rgba(255, 127, 0, 0.8)');
    gradient.addColorStop(0.857, 'rgba(255, 0, 0, 0.8)');
    gradient.addColorStop(1, 'rgba(139, 0, 255, 0.8)');
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Add diagonal stripes overlay
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.3;

  const stripeWidth = 10;
  const stripeSpacing = 15;
  const offset = (progress * 100) % stripeSpacing;

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
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
