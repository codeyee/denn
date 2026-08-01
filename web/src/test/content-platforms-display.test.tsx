import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GamePlatformsDisplay } from "@/components/pages/ContentDetailPage/platforms/GamePlatformsDisplay";
import { PlatformsDisplay } from "@/components/pages/ContentDetailPage/platforms/PlatformsDisplay";

describe("content detail platform displays", () => {
  it("omits the watch section when no content platforms are available", () => {
    const { container } = render(<PlatformsDisplay platforms={[]} />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText("Where to Watch")).not.toBeInTheDocument();
    expect(screen.queryByText("No platforms available.")).not.toBeInTheDocument();
  });

  it("omits the play section when no game platforms are available", () => {
    const { container } = render(<GamePlatformsDisplay groups={[]} />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText("Where to Play")).not.toBeInTheDocument();
    expect(screen.queryByText("No platforms available.")).not.toBeInTheDocument();
  });
});
