import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const checkScript = path.resolve(
  process.cwd(),
  "scripts/check-production-moderation-artifacts.mjs",
);

describe("production moderation artifact check", () => {
  let projectRoot: string;

  beforeEach(() => {
    projectRoot = mkdtempSync(path.join(tmpdir(), "denn-web-build-check-"));
    mkdirSync(path.join(projectRoot, "dist/client"), { recursive: true });
    mkdirSync(path.join(projectRoot, ".output/server"), { recursive: true });
    writeFileSync(path.join(projectRoot, "dist/client/app.js"), "const app = true;");
    writeFileSync(path.join(projectRoot, ".output/server/index.mjs"), "export {};\n");
  });

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
  });

  it("accepts clean generated production output", () => {
    const result = runCheck(projectRoot);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("no development moderation preview route or artwork");
  });

  it("rejects a leaked server route chunk", () => {
    mkdirSync(path.join(projectRoot, ".output/server/chunks"), {
      recursive: true,
    });
    writeFileSync(
      path.join(projectRoot, ".output/server/chunks/dev-route.mjs"),
      'createFileRoute("/dev/moderation-preview");\n',
    );

    const result = runCheck(projectRoot);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Development moderation preview artifacts found");
    expect(result.stderr).toContain("dev-route.mjs");
  });

  it("rejects a preview-named chunk even when its content is opaque", () => {
    mkdirSync(path.join(projectRoot, ".output/server/chunks"), {
      recursive: true,
    });
    writeFileSync(
      path.join(projectRoot, ".output/server/chunks/dev.moderation-preview.mjs"),
      "",
    );

    const result = runCheck(projectRoot);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("dev.moderation-preview.mjs");
  });

  it("rejects preview artwork emitted under a hashed asset name", () => {
    mkdirSync(path.join(projectRoot, "dist/client/assets"), {
      recursive: true,
    });
    writeFileSync(
      path.join(projectRoot, "dist/client/assets/opaque-123.svg"),
      "<svg><text>SYNTHETIC FIXTURE ARTWORK</text></svg>",
    );

    const result = runCheck(projectRoot);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("opaque-123.svg");
  });
});

function runCheck(root: string) {
  return spawnSync(process.execPath, [checkScript, root], { encoding: "utf8" });
}
