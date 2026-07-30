import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";

describe("useDebouncedSearch", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("waits for typing to settle before publishing a normalized query", () => {
    vi.useFakeTimers();
    const onDebouncedChange = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedSearch({ onDebouncedChange }),
    );

    act(() => result.current.onChange("  phase zero  "));
    act(() => vi.advanceTimersByTime(499));

    expect(onDebouncedChange).not.toHaveBeenCalled();
    expect(result.current.isDebouncing).toBe(true);

    act(() => vi.advanceTimersByTime(1));

    expect(onDebouncedChange).toHaveBeenCalledOnce();
    expect(onDebouncedChange).toHaveBeenCalledWith("phase zero");
    expect(result.current.debouncedValue).toBe("phase zero");
    expect(result.current.isDebouncing).toBe(false);
  });

  it("restarts the delay when the query changes again", () => {
    vi.useFakeTimers();
    const onDebouncedChange = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedSearch({ onDebouncedChange }),
    );

    act(() => result.current.onChange("phase"));
    act(() => vi.advanceTimersByTime(400));
    act(() => result.current.onChange("phase zero"));
    act(() => vi.advanceTimersByTime(400));

    expect(onDebouncedChange).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(100));

    expect(onDebouncedChange).toHaveBeenCalledOnce();
    expect(onDebouncedChange).toHaveBeenCalledWith("phase zero");
  });

  it("commits and clears immediately when the user takes an explicit action", () => {
    vi.useFakeTimers();
    const onDebouncedChange = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedSearch({ onDebouncedChange }),
    );

    act(() => result.current.onChange("phase"));
    act(() => result.current.commit());

    expect(onDebouncedChange).toHaveBeenLastCalledWith("phase");
    expect(result.current.isDebouncing).toBe(false);

    act(() => result.current.clear());

    expect(onDebouncedChange).toHaveBeenLastCalledWith("");
    expect(result.current.value).toBe("");
  });
});
