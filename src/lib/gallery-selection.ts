/**
 * Pure helper functions for product gallery and image selection synchronization.
 */

/**
 * Resolves the active image list for a product:
 * 1. Returns active color's images if non-empty.
 * 2. Falls back to default product images if non-empty.
 * 3. Falls back to a safe placeholder if no images exist.
 */
export function resolveGalleryImages(
  colorImages?: string[] | null,
  productImages?: string[] | null
): string[] {
  if (colorImages && colorImages.length > 0) {
    return colorImages;
  }
  if (productImages && productImages.length > 0) {
    return productImages;
  }
  return ["/placeholder.svg"];
}

/**
 * Clamps a selected image index within the valid range [0, imageCount - 1].
 * Returns 0 if imageCount <= 0.
 */
export function clampGalleryIndex(index: number, imageCount: number): number {
  if (imageCount <= 0) return 0;
  return Math.max(0, Math.min(imageCount - 1, index));
}

/**
 * Returns the state transition when switching color variants.
 * Per specification: color change always selects the new color's FIRST image (index 0).
 */
export function handleColorSelection(newColorIdx: number): {
  selectedColorIdx: number;
  selectedIndex: number;
} {
  return {
    selectedColorIdx: newColorIdx,
    selectedIndex: 0,
  };
}

/**
 * Returns adjacent image index (prev/next) clamped to bounds.
 */
export function getAdjacentGalleryIndex(
  currentIndex: number,
  totalImages: number,
  direction: "prev" | "next"
): number {
  if (totalImages <= 0) return 0;
  if (direction === "prev") {
    return Math.max(0, currentIndex - 1);
  }
  return Math.min(totalImages - 1, currentIndex + 1);
}
