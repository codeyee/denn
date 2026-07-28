import { describe, expect, it } from "vitest";
import type { Platform } from "@/lib/types";
import {
  CONTENT_ACTION_FILTER_ALL,
  filterContentPlatformsByAction,
  getAvailableContentActions,
  normalizeContentPlatforms,
} from "@/lib/platforms/contentPlatforms";
import { groupGamePlatforms, resolveGamePlatform } from "@/lib/platforms/gamePlatforms";
import { getPlatformGroupConfig } from "@/lib/platforms/platformGroupConfig";

const platform = (name: string, overrides: Partial<Platform> = {}): Platform => ({
  name,
  image_url: null,
  ...overrides,
});

describe("normalizeContentPlatforms", () => {
  it("deduplicates Netflix and combines actions on one provider", () => {
    const result = normalizeContentPlatforms({
      stream: [
        platform("Netflix", { provider_id: 8, image_url: "https://cdn.example/netflix.png" }),
        platform(" NETFLIX ", { provider_id: 8 }),
      ],
      buy: [platform("Netflix", { provider_id: 8, url: "https://example.com/netflix" })],
    });

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Netflix");
    expect(result[0].actions.map((action) => action.key)).toEqual(["stream", "buy"]);
    expect(result[0].actions[1].urls).toEqual(["https://example.com/netflix"]);
  });

  it("combines aliases, removes repeated actions and keeps valid URLs only", () => {
    const result = normalizeContentPlatforms({
      buy: [
        platform("Amazon Video", { url: "https://example.com/amazon" }),
        platform("Amazon Prime Video", { url: "https://example.com/amazon" }),
        platform("Amazon Prime", { url: "javascript:alert(1)" }),
      ],
      rent: [platform("Amazon Prime Video", { url: "https://example.com/amazon-rent" })],
    });

    expect(result).toHaveLength(1);
    expect(result[0].actions.map((action) => action.key)).toEqual(["buy", "rent"]);
    expect(result[0].actions[0].urls).toEqual(["https://example.com/amazon"]);
    expect(result[0].actions[1].urls).toEqual(["https://example.com/amazon-rent"]);
  });

  it("filters plan-name variants such as Netflix Standard with Ads", () => {
    const result = normalizeContentPlatforms({
      stream: [platform("Netflix"), platform("Netflix Standard with Ads")],
      ads: [platform("Netflix")],
    });

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Netflix");
    expect(result[0].actions.map((action) => action.key)).toEqual(["stream", "ads"]);
  });

  it("keeps a provider without a logo renderable", () => {
    const result = normalizeContentPlatforms({ stream: [platform("Local provider")] });

    expect(result[0].logoUrl).toBeNull();
    expect(result[0].actions[0].label).toBe("Stream");
    expect(result[0].actions[0].icon).toBeDefined();
  });

  it("lists available actions and filters providers without changing normalized data", () => {
    const result = normalizeContentPlatforms({
      stream: [platform("Netflix")],
      rent: [platform("Amazon Video")],
    });
    const actions = getAvailableContentActions(result);

    expect(actions.map((action) => action.key)).toEqual(["stream", "rent"]);
    expect(filterContentPlatformsByAction(result, "rent").map((item) => item.name)).toEqual([
      "Amazon Video",
    ]);
    expect(filterContentPlatformsByAction(result, CONTENT_ACTION_FILTER_ALL)).toEqual(result);
  });

  it("returns an empty normalized collection for an empty response", () => {
    expect(normalizeContentPlatforms(null)).toEqual([]);
    expect(normalizeContentPlatforms({})).toEqual([]);
  });
});

describe("game platform classification", () => {
  it("groups PlayStation generations without losing original names", () => {
    const groups = groupGamePlatforms([
      platform("PlayStation 4"),
      platform("PlayStation 5"),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe("known:playstation");
    expect(groups[0].platforms.map((item) => item.originalName).sort()).toEqual([
      "PlayStation 4",
      "PlayStation 5",
    ]);
  });

  it("keeps platform families separate and preserves Nintendo identities", () => {
    const groups = groupGamePlatforms([
      platform("Xbox One"),
      platform("Xbox Series X|S"),
      platform("PC (Microsoft Windows)"),
      platform("Linux"),
      platform("Mac"),
      platform("Nintendo Switch"),
      platform("Nintendo Switch 2"),
      platform("Nintendo DS"),
      platform("Nintendo 3DS"),
    ]);

    expect(groups.map((group) => group.key)).toEqual([
      "known:xbox",
      "known:windows",
      "known:linux",
      "known:mac",
      "known:nintendo_switch",
      "known:nintendo_3ds",
      "known:nintendo_ds",
    ]);
  });

  it("resolves distribution networks and normalized names", () => {
    const groups = groupGamePlatforms([], [platform("Web   browser"), platform("Google Stadia")]);

    expect(groups.map((group) => group.key)).toEqual(["known:browser", "known:cloud_gaming"]);
    expect(resolveGamePlatform("Web browser").suggestedGroup).toBe("browser");
  });

  it("keeps unknown platforms visible and does not assign them to other", () => {
    const groups = groupGamePlatforms([platform("Future Console")]);

    expect(groups[0].isKnown).toBe(false);
    expect(groups[0].key).toBe("unknown:future console");
    expect(groups[0].platforms[0].originalName).toBe("Future Console");
    expect(groups[0].platforms[0].groupImage).toBeNull();
  });

  it("deduplicates a platform, handles null dates and tolerates missing group config", () => {
    const groups = groupGamePlatforms([platform("AirConsole"), platform("AirConsole")]);
    const fallback = getPlatformGroupConfig("future_family");

    expect(groups).toHaveLength(1);
    expect(groups[0].platforms).toHaveLength(1);
    expect(groups[0].platforms[0].mostRecentVersion).toBeNull();
    expect(fallback.label).toBe("Future Family");
    expect(fallback.image).toBeNull();
  });
});
