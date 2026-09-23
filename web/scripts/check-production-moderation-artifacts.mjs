import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const defaultProjectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const projectRoot = path.resolve(process.argv[2] ?? defaultProjectRoot);
const outputDirectories = ["dist/client", ".output"];
const previewMarkers = [
  /\/dev\/moderation-preview/i,
  /dev\.moderation-preview/i,
  /DevModerationPreview/,
  /moderation-preview-artwork/i,
  /SYNTHETIC FIXTURE ARTWORK/i,
  /LOCAL PREVIEW/i,
];

const files = [];
for (const directory of outputDirectories) {
  const absoluteDirectory = path.join(projectRoot, directory);
  const directoryStat = await stat(absoluteDirectory).catch(() => null);
  if (!directoryStat?.isDirectory()) {
    throw new Error(`Missing production build output directory: ${directory}`);
  }
  files.push(...(await collectFiles(absoluteDirectory)));
}

const violations = [];
for (const file of files) {
  const relativePath = path.relative(projectRoot, file);
  const pathMarker = previewMarkers.find((marker) => marker.test(relativePath));
  if (pathMarker) {
    violations.push(relativePath);
    continue;
  }

  const source = await readFile(file, "utf8");
  if (previewMarkers.some((marker) => marker.test(source))) {
    violations.push(relativePath);
  }
}

if (violations.length > 0) {
  throw new Error(
    [
      "Development moderation preview artifacts found in the production build:",
      ...violations.slice(0, 20).map((file) => `- ${file}`),
      violations.length > 20 ? `- ... and ${violations.length - 20} more` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

process.stdout.write(
  `Verified ${files.length} production files: no development moderation preview route or artwork.\n`,
);

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const descendants = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return collectFiles(entryPath);
      return entry.isFile() ? [entryPath] : [];
    }),
  );
  return descendants.flat();
}
