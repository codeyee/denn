import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useModerationArtworkReveal } from "@/components/common/media/useModerationArtworkReveal";

const explicit = { status: "complete", classification: "explicit" } as const;

describe("useModerationArtworkReveal", () => {
  it("resets a local reveal when the detail route changes content", () => {
    const { result, rerender } = renderHook(
      ({ contentId }: { contentId: number }) =>
        useModerationArtworkReveal(
          { id: contentId, image_url: `/cover/${contentId}.jpg` },
          explicit,
          false,
        ),
      { initialProps: { contentId: 10 } },
    );

    expect(result.current.isBlurred).toBe(true);
    act(() => result.current.toggle());
    expect(result.current.isBlurred).toBe(false);
    expect(result.current.isRevealed).toBe(true);

    rerender({ contentId: 11 });
    expect(result.current.isBlurred).toBe(true);
    expect(result.current.isRevealed).toBe(false);
  });

  it("does not blur explicit artwork when the preference allows it", () => {
    const { result } = renderHook(() =>
      useModerationArtworkReveal({ id: 12, image_url: "/cover/12.jpg" }, explicit, true),
    );

    expect(result.current.requiresBlur).toBe(false);
    expect(result.current.isBlurred).toBe(false);
  });
});
