import { describe, expect, it } from "vitest";

import { buildDomeItems } from "@/components/auth/DomeGallery/utils";

describe("auth dome", () => {
  it("builds a centered, bounded dome with five rows per segment", () => {
    const items = buildDomeItems(
      [
        { src: "/one.jpg" },
        { src: "/two.jpg" },
      ],
      12,
    );

    expect(items).toHaveLength(60);
    expect(Math.min(...items.map((item) => item.x))).toBe(-11);
    expect(Math.max(...items.map((item) => item.x))).toBe(11);
    expect(new Set(items.map((item) => item.src))).toEqual(
      new Set(["/one.jpg", "/two.jpg"]),
    );
  });
});
