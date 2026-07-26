import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Carousel } from ".";
import { animateCarouselWrap } from "./animations";
import { calculateVisibleCarouselItems } from "./hooks/useCarouselScroll";
import {
  getCarouselPageDistance,
  getCarouselScrollDestination,
  getCarouselScrollState,
} from "./utils";

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

  it("keeps both controls visible while wrapping and updates fades independently", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
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
      name: "View previous content",
    });
    const next = await screen.findByRole("button", {
      name: "View next content",
    });
    expect(previous).toBeVisible();
    expect(next).toBeVisible();
    expect(
      document.querySelector('[data-carousel-edge="previous"]'),
    ).not.toBeInTheDocument();
    expect(document.querySelector('[data-carousel-edge="next"]')).toBeVisible();

    await user.click(previous);
    expect(scrollTo).toHaveBeenLastCalledWith({ behavior: "auto", left: 200 });
    fireEvent.scroll(scroller);

    expect(previous).toBeVisible();
    expect(next).toBeVisible();
    expect(
      document.querySelector('[data-carousel-edge="previous"]'),
    ).toBeVisible();
    expect(
      document.querySelector('[data-carousel-edge="next"]'),
    ).not.toBeInTheDocument();

    await user.click(next);
    expect(scrollTo).toHaveBeenLastCalledWith({ behavior: "auto", left: 0 });
    fireEvent.scroll(scroller);
    expect(next).toHaveFocus();
    expect(
      document.querySelector('[data-carousel-edge="previous"]'),
    ).not.toBeInTheDocument();
    expect(document.querySelector('[data-carousel-edge="next"]')).toBeVisible();

    await user.click(next);
    expect(scrollTo).toHaveBeenLastCalledWith({ behavior: "smooth", left: 85 });
    fireEvent.scroll(scroller);
    expect(
      document.querySelector('[data-carousel-edge="previous"]'),
    ).toBeVisible();
    expect(document.querySelector('[data-carousel-edge="next"]')).toBeVisible();
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
        screen.queryByRole("button", { name: "View previous content" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "View next content" }),
      ).not.toBeInTheDocument();
      expect(document.querySelector("[data-carousel-edge]")).not.toBeInTheDocument();
    });
  });

  it("recomputes navigation when the viewport stops overflowing", async () => {
    render(
      <Carousel title="Movies">
        <div>Movie one</div>
        <div>Movie two</div>
        <div>Movie three</div>
      </Carousel>,
    );

    const scroller = screen.getByLabelText("Movies items");
    setScrollerGeometry(scroller, { clientWidth: 100, scrollWidth: 300 });
    fireEvent.scroll(scroller);
    expect(
      await screen.findByRole("button", { name: "View next content" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "View previous content" }),
    ).toBeVisible();

    setScrollerGeometry(scroller, { clientWidth: 300, scrollWidth: 300 });
    fireEvent.resize(window);

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "View next content" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "View previous content" }),
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

  it("adds columns on ultrawide containers instead of capping at ten", () => {
    expect(
      calculateVisibleCarouselItems({
        availableWidth: 1_344,
        targetCardWidth: 250,
        gap: 16,
      }),
    ).toBe(5);
    expect(
      calculateVisibleCarouselItems({
        availableWidth: 4_904,
        targetCardWidth: 250,
        gap: 16,
      }),
    ).toBe(18);
  });

  it("uses a tolerance for boundaries and advances by full card steps", () => {
    expect(
      getCarouselScrollState({
        scrollLeft: 0,
        scrollWidth: 600,
        clientWidth: 300,
      }),
    ).toEqual({
      hasOverflow: true,
      isAtStart: true,
      isAtEnd: false,
    });
    expect(
      getCarouselScrollState({
        scrollLeft: 150,
        scrollWidth: 600,
        clientWidth: 300,
      }),
    ).toEqual({
      hasOverflow: true,
      isAtStart: false,
      isAtEnd: false,
    });
    expect(
      getCarouselScrollState({
        scrollLeft: 299,
        scrollWidth: 600,
        clientWidth: 300,
      }),
    ).toEqual({
      hasOverflow: true,
      isAtStart: false,
      isAtEnd: true,
    });
    expect(
      getCarouselPageDistance({
        clientWidth: 300,
        itemWidth: 80,
        gap: 20,
      }),
    ).toBe(200);
    expect(
      getCarouselScrollDestination({
        scrollLeft: 0,
        maximumScroll: 300,
        direction: -1,
        pageDistance: 200,
      }),
    ).toEqual({ target: 300, isWrapping: true });
    expect(
      getCarouselScrollDestination({
        scrollLeft: 300,
        maximumScroll: 300,
        direction: 1,
        pageDistance: 200,
      }),
    ).toEqual({ target: 0, isWrapping: true });
    expect(
      getCarouselScrollDestination({
        scrollLeft: 150,
        maximumScroll: 300,
        direction: 1,
        pageDistance: 100,
      }),
    ).toEqual({ target: 250, isWrapping: false });
  });

  it("animates a circular jump in two directional phases", async () => {
    const container = document.createElement("div");
    const scrollTo = vi.fn();
    const cancel = vi.fn();
    const animate = vi.fn().mockReturnValue({
      cancel,
      finished: Promise.resolve(),
    });
    Object.defineProperties(container, {
      animate: { configurable: true, value: animate },
      scrollTo: { configurable: true, value: scrollTo },
    });

    await animateCarouselWrap({
      container,
      target: 300,
      direction: -1,
    });

    expect(animate).toHaveBeenCalledTimes(2);
    expect(animate).toHaveBeenNthCalledWith(
      1,
      expect.arrayContaining([
        expect.objectContaining({
          opacity: 0.18,
          transform: "translate3d(24px, 0, 0)",
        }),
      ]),
      expect.objectContaining({ duration: 100 }),
    );
    expect(scrollTo).toHaveBeenCalledWith({ behavior: "auto", left: 300 });
    expect(animate).toHaveBeenNthCalledWith(
      2,
      expect.arrayContaining([
        expect.objectContaining({
          opacity: 0.18,
          transform: "translate3d(-24px, 0, 0)",
        }),
      ]),
      expect.objectContaining({ duration: 160 }),
    );
    expect(container).not.toHaveAttribute("data-carousel-wrap-phase");
    expect(cancel).toHaveBeenCalledTimes(2);
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
