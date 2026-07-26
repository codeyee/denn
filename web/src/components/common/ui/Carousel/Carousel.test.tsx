import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Carousel } from ".";

describe("Carousel", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
  });

  it("keeps both controls available and wraps in either direction", async () => {
    const user = userEvent.setup();
    render(
      <Carousel title="Your Lists">
        <div>List one</div>
        <div>List two</div>
        <div>Create list</div>
      </Carousel>,
    );

    const scroller = screen.getByLabelText("Your Lists items");
    setScrollerGeometry(scroller, { clientWidth: 100, scrollWidth: 300 });
    const scrollTo = vi.fn((options: ScrollToOptions) => {
      if (typeof options === "object") {
        Object.defineProperty(scroller, "scrollLeft", {
          configurable: true,
          value: options.left ?? 0,
          writable: true,
        });
      }
    });
    Object.defineProperty(scroller, "scrollTo", {
      configurable: true,
      value: scrollTo,
    });
    fireEvent.scroll(scroller);

    const previous = await screen.findByRole("button", {
      name: "Previous items",
    });
    const next = screen.getByRole("button", { name: "Next items" });

    await user.click(previous);
    expect(scrollTo).toHaveBeenLastCalledWith({ behavior: "auto", left: 200 });
    expect(previous).toBeVisible();
    expect(next).toBeVisible();

    fireEvent.scroll(scroller);
    await user.click(next);
    expect(scrollTo).toHaveBeenLastCalledWith({ behavior: "auto", left: 0 });
    expect(next).toHaveFocus();
  });

  it("does not render navigation when every item fits", async () => {
    render(
      <Carousel title="Movies">
        <div>Movie one</div>
        <div>Movie two</div>
      </Carousel>,
    );

    const scroller = screen.getByLabelText("Movies items");
    setScrollerGeometry(scroller, { clientWidth: 300, scrollWidth: 300 });
    fireEvent.scroll(scroller);

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Previous items" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Next items" }),
      ).not.toBeInTheDocument();
    });
  });

  it("keeps the scrollbar hidden and handles horizontal trackpad gestures", () => {
    render(
      <Carousel title="Albums">
        <div>Album one</div>
        <div>Album two</div>
        <div>Album three</div>
      </Carousel>,
    );

    const scroller = screen.getByLabelText("Albums items");
    setScrollerGeometry(scroller, { clientWidth: 100, scrollWidth: 300 });

    expect(scroller).toHaveClass("[scrollbar-width:none]");

    fireEvent.wheel(scroller, { deltaX: 48, deltaY: 2 });
    expect(scroller.scrollLeft).toBe(48);

    fireEvent.wheel(scroller, { deltaX: 2, deltaY: 48 });
    expect(scroller.scrollLeft).toBe(48);
  });
});

function setScrollerGeometry(
  scroller: HTMLElement,
  dimensions: { clientWidth: number; scrollWidth: number },
) {
  Object.defineProperties(scroller, {
    clientWidth: { configurable: true, value: dimensions.clientWidth },
    scrollLeft: { configurable: true, value: 0, writable: true },
    scrollWidth: { configurable: true, value: dimensions.scrollWidth },
  });
}
