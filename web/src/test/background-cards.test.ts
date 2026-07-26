import { describe, expect, it } from "vitest";

import {
  BACKGROUND_CARD_LIMIT,
  getBackgroundCardImages,
} from "@/server/cards";

describe("background cards", () => {
  it("returns a bounded set of unique optimized covers", () => {
    const images = getBackgroundCardImages();

    expect(images).toHaveLength(BACKGROUND_CARD_LIMIT);
    expect(new Set(images.map((image) => image.src)).size).toBe(
      BACKGROUND_CARD_LIMIT,
    );
    expect(images.every((image) => image.src.endsWith(".webp"))).toBe(true);
  });
});
