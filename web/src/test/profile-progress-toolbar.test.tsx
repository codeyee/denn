import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ProfileProgressToolbar } from "@/components/pages/PublicProfilePage/ProfileProgressToolbar";
import type { ProfileSearchParams } from "@/lib/types";

const BASE_SEARCH: ProfileSearchParams = {
  tab: "progress",
  page: 1,
};

describe("profile progress toolbar", () => {
  it("switches between grid and list without changing the data filters", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <ProfileProgressToolbar search={BASE_SEARCH} onChange={onChange} />,
    );

    expect(screen.getByRole("button", { name: "Grid" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "List" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    await user.click(screen.getByRole("button", { name: "List" }));

    expect(onChange).toHaveBeenCalledWith({ view: "list" });
  });

  it("offers visual status shortcuts and collapses secondary filters", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <ProfileProgressToolbar search={BASE_SEARCH} onChange={onChange} />,
    );

    expect(
      screen.queryByRole("button", { name: /^Rating/ }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Completed" }));
    expect(onChange).toHaveBeenCalledWith({ status: ["completed"] });

    await user.click(screen.getByRole("button", { name: "More filters" }));
    expect(screen.getByRole("button", { name: /^Rating/ })).toBeVisible();
    expect(screen.getByRole("button", { name: /^Review/ })).toBeVisible();
    expect(screen.getByRole("button", { name: /^Favorite/ })).toBeVisible();
  });

  it("keeps active advanced filters visible and reports their count", () => {
    render(
      <ProfileProgressToolbar
        search={{
          ...BASE_SEARCH,
          reviewed: true,
          favorite: true,
        }}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /More filters/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByRole("button", { name: /^Review/ })).toBeVisible();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("combines content types and status values independently", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <ProfileProgressToolbar search={BASE_SEARCH} onChange={onChange} />,
    );

    await user.click(screen.getByRole("button", { name: "Movies" }));
    expect(onChange).toHaveBeenLastCalledWith({
      type: ["MOVIE"],
      tvKind: undefined,
    });

    rerender(
      <ProfileProgressToolbar
        search={{ ...BASE_SEARCH, type: ["MOVIE"] }}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: "TV Shows" }));
    expect(onChange).toHaveBeenLastCalledWith({
      type: ["MOVIE", "TV_SHOW"],
      tvKind: undefined,
    });

    rerender(
      <ProfileProgressToolbar
        search={{
          ...BASE_SEARCH,
          type: ["MOVIE", "TV_SHOW"],
          status: ["backlog"],
        }}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: "In progress" }));
    expect(onChange).toHaveBeenLastCalledWith({
      status: ["backlog", "in_progress"],
    });
  });

  it("separates the sort criterion from its direction", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <ProfileProgressToolbar search={BASE_SEARCH} onChange={onChange} />,
    );

    await user.click(
      screen.getByRole("button", { name: /^Sort criterion/ }),
    );
    await user.click(screen.getByRole("menuitemradio", { name: "Title" }));
    expect(onChange).toHaveBeenLastCalledWith({
      sort: "title",
      order: "asc",
    });

    rerender(
      <ProfileProgressToolbar
        search={{ ...BASE_SEARCH, sort: "title", order: "asc" }}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole("button", {
      name: "Sort direction: A–Z",
    }));
    expect(onChange).toHaveBeenLastCalledWith({
      sort: "title",
      order: "desc",
    });
  });

  it("uses icon menus for advanced categorical filters", async () => {
    const user = userEvent.setup();
    render(
      <ProfileProgressToolbar
        search={{ ...BASE_SEARCH, reviewed: true }}
        onChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /^Rating/ }));
    const ratedOption = screen.getByRole("menuitemradio", {
      name: "Rated only",
    });
    expect(ratedOption.querySelector("svg")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: /^Rating/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});
