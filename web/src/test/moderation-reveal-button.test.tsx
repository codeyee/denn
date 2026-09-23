import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ModerationRevealButton } from "@/components/common/cards/ContentCard/ModerationRevealButton";

describe("ModerationRevealButton", () => {
  it("exposes a keyboard-operable pressed state and toggle action", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const { rerender } = render(
      <ModerationRevealButton isRevealed={false} onToggle={onToggle} />,
    );

    const revealButton = screen.getByRole("button", { name: "Reveal artwork" });
    expect(revealButton).toHaveAttribute("aria-pressed", "false");
    await user.tab();
    expect(revealButton).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onToggle).toHaveBeenCalledOnce();

    rerender(<ModerationRevealButton isRevealed onToggle={onToggle} />);
    expect(screen.getByRole("button", { name: "Blur artwork" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
