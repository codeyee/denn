import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useBannerGestures } from "./useBannerGestures";

describe("useBannerGestures", () => {
  it("navigates with horizontal touch swipes", () => {
    const onPrevious = vi.fn();
    const onNext = vi.fn();
    render(
      <GestureHarness onPrevious={onPrevious} onNext={onNext} />,
    );

    const banner = screen.getByLabelText("Gesture banner");
    fireEvent.touchStart(banner, {
      touches: [{ clientX: 220, clientY: 100 }],
    });
    fireEvent.touchEnd(banner, {
      changedTouches: [{ clientX: 120, clientY: 108 }],
    });
    expect(onNext).toHaveBeenCalledOnce();

    fireEvent.touchStart(banner, {
      touches: [{ clientX: 120, clientY: 100 }],
    });
    fireEvent.touchEnd(banner, {
      changedTouches: [{ clientX: 220, clientY: 108 }],
    });
    expect(onPrevious).toHaveBeenCalledOnce();
  });

  it("uses horizontal trackpad gestures but ignores vertical scrolling", () => {
    const onPrevious = vi.fn();
    const onNext = vi.fn();
    render(
      <GestureHarness onPrevious={onPrevious} onNext={onNext} />,
    );

    const banner = screen.getByLabelText("Gesture banner");
    fireEvent.wheel(banner, { deltaX: 40, deltaY: 2 });
    expect(onNext).toHaveBeenCalledOnce();

    fireEvent.wheel(banner, { deltaX: 2, deltaY: 40 });
    expect(onPrevious).not.toHaveBeenCalled();
    expect(onNext).toHaveBeenCalledOnce();
  });
});

function GestureHarness({
  onPrevious,
  onNext,
}: {
  onPrevious: () => void;
  onNext: () => void;
}) {
  const gestures = useBannerGestures({ onPrevious, onNext });

  return (
    <section
      aria-label="Gesture banner"
      onTouchStart={gestures.handleTouchStart}
      onTouchEnd={gestures.handleTouchEnd}
      onTouchCancel={gestures.handleTouchCancel}
      onWheel={gestures.handleWheel}
    />
  );
}
