import { describe, expect, it } from "vitest";

import { buildMosaicRows } from "@/components/auth/MosaicGallery/utils";

describe("auth mosaic", () => {
  it("builds flat rows with staggered image selections", () => {
    const rows = buildMosaicRows(
      [
        { src: "/one.jpg" },
        { src: "/two.jpg" },
        { src: "/three.jpg" },
        { src: "/four.jpg" },
      ],
      3,
      6,
    );

    expect(rows).toHaveLength(3);
    expect(rows.every((row) => row.length === 6)).toBe(true);
    expect(rows[0][0].src).toBe("/one.jpg");
    expect(rows[1][0].src).toBe("/two.jpg");
    expect(rows[2][0].src).toBe("/three.jpg");
    expect(new Set(rows.flat().map((item) => item.src))).toEqual(
      new Set(["/one.jpg", "/two.jpg", "/three.jpg", "/four.jpg"]),
    );
  });

  it("returns no rows when images are unavailable", () => {
    expect(buildMosaicRows([], 5, 16)).toEqual([]);
  });
});
