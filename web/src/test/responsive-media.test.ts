import { describe, expect, it } from "vitest";

import { buildResponsiveSourceSet } from "@/components/common/media/ResponsiveMedia";

describe("responsive media source sets", () => {
  it("builds OpenLibrary variants only for the canonical HTTPS origin", () => {
    expect(
      buildResponsiveSourceSet("https://covers.openlibrary.org/b/id/123-L.jpg"),
    ).toBe(
      "https://covers.openlibrary.org/b/id/123-S.jpg 120w, https://covers.openlibrary.org/b/id/123-M.jpg 360w, https://covers.openlibrary.org/b/id/123-L.jpg 720w",
    );
  });

  it.each([
    "https://attacker.example/covers.openlibrary.org/b/id/123-L.jpg",
    "https://covers.openlibrary.org.attacker.example/b/id/123-L.jpg",
    "https://covers.openlibrary.org@attacker.example/b/id/123-L.jpg",
    "http://covers.openlibrary.org/b/id/123-L.jpg",
    "not a URL with covers.openlibrary.org/b/id/123-L.jpg",
  ])("rejects an untrusted OpenLibrary-like URL: %s", (src) => {
    expect(buildResponsiveSourceSet(src)).toBeUndefined();
  });
});
