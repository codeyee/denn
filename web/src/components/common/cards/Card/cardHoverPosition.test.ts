import { describe, expect, it } from "vitest";

import {
  calculateCardHoverPosition,
  isCardAnchorVisible,
} from "./cardHoverPosition";

const viewport = {
  viewportWidth: 1440,
  viewportHeight: 900,
};

describe("card hover positioning", () => {
  it("keeps the real card width even when it is wider than the old cap", () => {
    expect(
      calculateCardHoverPosition({
        anchor: {
          top: 120,
          right: 620,
          bottom: 920,
          left: 120,
          width: 500,
          height: 800,
        },
        popoverHeight: 800,
        ...viewport,
      }),
    ).toMatchObject({
      left: 120,
      width: 500,
    });
  });

  it("keeps the popover inside the viewport on every edge", () => {
    expect(
      calculateCardHoverPosition({
        anchor: {
          top: 780,
          right: 1520,
          bottom: 1180,
          left: 1220,
          width: 300,
          height: 400,
        },
        popoverHeight: 560,
        ...viewport,
      }),
    ).toEqual({
      top: 324,
      left: 1124,
      width: 300,
      maxHeight: 868,
    });
  });

  it("shrinks only when the card itself is wider than the viewport", () => {
    expect(
      calculateCardHoverPosition({
        anchor: {
          top: 0,
          right: 420,
          bottom: 600,
          left: -80,
          width: 500,
          height: 600,
        },
        popoverHeight: 600,
        viewportWidth: 360,
        viewportHeight: 640,
      }),
    ).toEqual({
      top: 16,
      left: 16,
      width: 328,
      maxHeight: 608,
    });
  });

  it("detects when scrolling moved the anchor outside the viewport", () => {
    expect(
      isCardAnchorVisible(
        {
          top: -500,
          right: 300,
          bottom: -20,
          left: 20,
          width: 280,
          height: 480,
        },
        viewport.viewportWidth,
        viewport.viewportHeight,
      ),
    ).toBe(false);
  });
});
