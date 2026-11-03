import { describe, it, expect } from "vitest";
import {
  resolveGalleryImages,
  clampGalleryIndex,
  handleColorSelection,
  getAdjacentGalleryIndex,
} from "@/lib/gallery-selection";

describe("Product Gallery & Image Selection Logic", () => {
  describe("resolveGalleryImages", () => {
    it("returns active colour's images when present and non-empty", () => {
      const colorImgs = ["/img1.jpg", "/img2.jpg"];
      const productImgs = ["/default1.jpg", "/default2.jpg"];
      expect(resolveGalleryImages(colorImgs, productImgs)).toEqual(colorImgs);
    });

    it("falls back to product images when colour has no images", () => {
      const productImgs = ["/default1.jpg", "/default2.jpg"];
      expect(resolveGalleryImages([], productImgs)).toEqual(productImgs);
      expect(resolveGalleryImages(null, productImgs)).toEqual(productImgs);
      expect(resolveGalleryImages(undefined, productImgs)).toEqual(productImgs);
    });

    it("falls back to placeholder when both colour and product images are empty", () => {
      expect(resolveGalleryImages([], [])).toEqual(["/placeholder.svg"]);
      expect(resolveGalleryImages(null, null)).toEqual(["/placeholder.svg"]);
    });
  });

  describe("clampGalleryIndex", () => {
    it("preserves index when within bounds", () => {
      expect(clampGalleryIndex(0, 4)).toBe(0);
      expect(clampGalleryIndex(2, 4)).toBe(2);
      expect(clampGalleryIndex(3, 4)).toBe(3);
    });

    it("clamps out-of-range index to valid upper bound", () => {
      expect(clampGalleryIndex(4, 4)).toBe(3);
      expect(clampGalleryIndex(10, 2)).toBe(1);
    });

    it("clamps negative index to 0", () => {
      expect(clampGalleryIndex(-1, 4)).toBe(0);
      expect(clampGalleryIndex(-99, 4)).toBe(0);
    });

    it("returns 0 if image count is zero", () => {
      expect(clampGalleryIndex(3, 0)).toBe(0);
      expect(clampGalleryIndex(0, 0)).toBe(0);
    });
  });

  describe("handleColorSelection", () => {
    it("resets selectedIndex to 0 for the new colour", () => {
      const res = handleColorSelection(1);
      expect(res.selectedColorIdx).toBe(1);
      expect(res.selectedIndex).toBe(0);
    });

    it("works when switching between any colour indices", () => {
      expect(handleColorSelection(0)).toEqual({ selectedColorIdx: 0, selectedIndex: 0 });
      expect(handleColorSelection(2)).toEqual({ selectedColorIdx: 2, selectedIndex: 0 });
    });
  });

  describe("getAdjacentGalleryIndex", () => {
    it("navigates next clamped to upper bound", () => {
      expect(getAdjacentGalleryIndex(0, 4, "next")).toBe(1);
      expect(getAdjacentGalleryIndex(2, 4, "next")).toBe(3);
      expect(getAdjacentGalleryIndex(3, 4, "next")).toBe(3); // clamped
    });

    it("navigates prev clamped to lower bound 0", () => {
      expect(getAdjacentGalleryIndex(3, 4, "prev")).toBe(2);
      expect(getAdjacentGalleryIndex(1, 4, "prev")).toBe(0);
      expect(getAdjacentGalleryIndex(0, 4, "prev")).toBe(0); // clamped
    });

    it("handles single-image and zero-image gracefully", () => {
      expect(getAdjacentGalleryIndex(0, 1, "next")).toBe(0);
      expect(getAdjacentGalleryIndex(0, 1, "prev")).toBe(0);
      expect(getAdjacentGalleryIndex(0, 0, "next")).toBe(0);
    });
  });
});
