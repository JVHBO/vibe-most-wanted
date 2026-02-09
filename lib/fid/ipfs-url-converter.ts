/**
 * IPFS URL converter - returns URL as-is (no gateway conversion)
 */
export function convertIpfsUrl(url: string | undefined): string | undefined {
  if (!url || url === "undefined" || url === "null" || url.trim() === "") {
    return undefined;
  }
  return url;
}

/**
 * Convert IPFS URL to base64 data URL using canvas
 */
export async function convertIpfsToDataUrl(ipfsUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };

    img.onerror = () => {
      reject(new Error(`Failed to load image: ${ipfsUrl}`));
    };

    img.src = ipfsUrl;
  });
}
