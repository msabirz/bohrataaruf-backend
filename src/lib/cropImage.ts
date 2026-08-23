/**
 * Draws the cropped pixel region (as reported by react-easy-crop's
 * onCropComplete) onto a canvas sized to that region, and exports it as a
 * File ready to upload — the standard canvas-crop pattern.
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', reject);
    img.setAttribute('crossOrigin', 'anonymous');
    img.src = src;
  });
}

export async function getCroppedImageFile(
  imageSrc: string,
  cropPixels: { x: number; y: number; width: number; height: number },
  fileName: string,
  mimeType: string = 'image/jpeg',
): Promise<File> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = cropPixels.width;
  canvas.height = cropPixels.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  ctx.drawImage(
    image,
    cropPixels.x, cropPixels.y, cropPixels.width, cropPixels.height,
    0, 0, cropPixels.width, cropPixels.height,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error('Crop failed')); return; }
      resolve(new File([blob], fileName, { type: mimeType }));
    }, mimeType, 0.92);
  });
}
