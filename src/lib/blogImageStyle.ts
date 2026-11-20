/**
 * How a blog picture is sized and aligned. Used by both the editor and the public page, so what
 * you see while writing is how it looks when published. Full class names are spelled out here so
 * Tailwind can find them.
 */
export const IMAGE_SIZES = ['small', 'medium', 'large', 'full'] as const;
export const IMAGE_ALIGNS = ['left', 'center', 'right'] as const;
export type ImageSize = (typeof IMAGE_SIZES)[number];
export type ImageAlign = (typeof IMAGE_ALIGNS)[number];

export const DEFAULT_IMAGE_SIZE: ImageSize = 'large';
export const DEFAULT_IMAGE_ALIGN: ImageAlign = 'center';

// On a phone every picture uses the full width (a third of a phone is too small to read).
export const SIZE_CLASS: Record<ImageSize, string> = {
  small: 'w-full sm:w-1/3',
  medium: 'w-full sm:w-1/2',
  large: 'w-full sm:w-3/4',
  full: 'w-full',
};
export const ALIGN_CLASS: Record<ImageAlign, string> = {
  left: 'mr-auto',
  center: 'mx-auto',
  right: 'ml-auto',
};
export const SIZE_LABEL: Record<ImageSize, string> = { small: 'Small', medium: 'Medium', large: 'Large', full: 'Full width' };
export const ALIGN_LABEL: Record<ImageAlign, string> = { left: 'Left', center: 'Centre', right: 'Right' };
