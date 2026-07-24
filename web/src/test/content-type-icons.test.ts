import {
  Book,
  CircleHelp,
  Film,
  Gamepad2,
  Music,
  Tv,
  UserRound,
} from "lucide-react";
import { describe, expect, it } from "vitest";

import {
  getContentTypeIcon,
  getContentTypeLabel,
} from "@/lib/icons/contentTypeIcons";
import { ContentType } from "@/lib/types";

describe("content type icons", () => {
  it.each([
    ["movie", Film, "Movie"],
    ["tv_show", Tv, "TV Show"],
    ["season", Tv, "Season"],
    ["game", Gamepad2, "Game"],
    ["album", Music, "Album"],
    ["book", Book, "Book"],
    ["person", UserRound, "Person"],
  ])("maps the proxy type %s to its icon and label", (type, icon, label) => {
    expect(getContentTypeIcon(type)).toBe(icon);
    expect(getContentTypeLabel(type)).toBe(label);
  });

  it("continues to support normalized core content types", () => {
    expect(getContentTypeIcon(ContentType.TV_SHOW)).toBe(Tv);
    expect(getContentTypeLabel(ContentType.TV_SHOW)).toBe("TV Show");
  });

  it("uses a neutral icon for an unknown type", () => {
    expect(getContentTypeIcon("podcast")).toBe(CircleHelp);
    expect(getContentTypeLabel("podcast")).toBe("podcast");
  });
});
