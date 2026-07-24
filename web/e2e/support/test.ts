import {
  test as base,
  expect,
  type Request,
  type TestInfo,
} from "@playwright/test";
import { writeFile } from "node:fs/promises";

interface NetworkEntry {
  method: string;
  url: string;
  resource_type: string;
  status?: number;
  failed?: true;
}

function redactUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  url.username = "";
  url.password = "";
  for (const key of url.searchParams.keys()) {
    url.searchParams.set(key, "<redacted>");
  }
  url.pathname = url.pathname
    .split("/")
    .map((segment) => (segment.includes("@") ? "<redacted>" : segment))
    .join("/");
  return url.toString();
}

function requestEntry(request: Request): NetworkEntry {
  return {
    method: request.method(),
    url: redactUrl(request.url()),
    resource_type: request.resourceType(),
  };
}

export const test = base.extend<{ redactedNetworkLog: void }>({
  redactedNetworkLog: [
    async ({ page }, use, testInfo: TestInfo) => {
      const entries = new Map<Request, NetworkEntry>();

      page.on("request", (request) => {
        entries.set(request, requestEntry(request));
      });
      page.on("response", (response) => {
        const entry = entries.get(response.request());
        if (entry) entry.status = response.status();
      });
      page.on("requestfailed", (request) => {
        const entry = entries.get(request);
        if (entry) entry.failed = true;
      });

      try {
        await use();
      } finally {
        const outputPath = testInfo.outputPath("network.redacted.json");
        await writeFile(
          outputPath,
          `${JSON.stringify([...entries.values()], null, 2)}\n`,
          "utf8",
        );
        await testInfo.attach("network.redacted.json", {
          path: outputPath,
          contentType: "application/json",
        });
      }
    },
    { auto: true },
  ],
});

export { expect };
