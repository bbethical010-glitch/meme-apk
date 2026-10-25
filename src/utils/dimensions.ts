export interface CanvasDimensions {
  width: number;
  height: number;
}

export const memeDimensionCache = new Map<string, { width: number; height: number }>();

/**
 * Computes optimal dynamic canvas dimensions based on image natural dimensions and viewport constraints.
 * Ensures the meme card canvas dynamically matches the natural aspect ratio of the image (square, portrait, landscape)
 * without awkward black letterboxing bars or stretching.
 */
export function computeCanvasDimensions(
  naturalWidth?: number,
  naturalHeight?: number,
  viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 390,
  viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800
): CanvasDimensions {
  // Mobile-first bounds: max 88% width (max 380px), max 52% height (max 460px)
  const maxW = Math.min(viewportWidth * 0.88, 380);
  const maxH = Math.min(viewportHeight * 0.52, 460);

  // Minimum dimensions to prevent extreme collapse
  const minW = Math.min(230, maxW);
  const minH = 190;

  if (!naturalWidth || !naturalHeight) {
    const defaultW = Math.min(maxW, 350);
    return { width: Math.round(defaultW), height: Math.round(defaultW * 0.95) };
  }

  const ratio = naturalWidth / naturalHeight;

  let width: number;
  let height: number;

  if (ratio >= maxW / maxH) {
    // Width-constrained (landscape / wide images)
    width = maxW;
    height = maxW / ratio;
    if (height < minH) {
      height = minH;
      width = Math.min(minH * ratio, viewportWidth * 0.92);
    }
  } else {
    // Height-constrained (portrait / vertical images)
    height = maxH;
    width = maxH * ratio;
    if (width < minW) {
      width = minW;
      height = Math.min(minW / ratio, maxH);
    }
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}
