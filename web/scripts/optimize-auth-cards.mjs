import { chromium } from "@playwright/test";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const CARDS_DIRECTORY = path.resolve("public/images/cards");
const CARDS_PARENT_DIRECTORY = path.dirname(CARDS_DIRECTORY);
const EXPECTED_CARD_COUNT = 150;
const EXPECTED_CARDS_PER_CATEGORY = 30;
const MAX_WIDTH = 384;
const MAX_HEIGHT = 576;
const MAX_FILE_BYTES = 70 * 1024;
const MAX_TOTAL_BYTES = 4_000_000;
const WEBP_QUALITY = 0.65;
const CARD_NAME_PATTERN = /^(book|game|movie|music|tv)_\d{2}\.webp$/;
const SUPPORTED_SOURCE_EXTENSIONS = new Set([
  ".jpeg",
  ".jpg",
  ".png",
  ".webp",
]);

const mode = process.argv[2];

if (mode !== "--check" && mode !== "--write") {
  throw new Error(
    "Use `node scripts/optimize-auth-cards.mjs --check` or `--write`.",
  );
}

function readWebpDimensions(buffer) {
  if (
    buffer.length < 30 ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WEBP"
  ) {
    throw new Error("not a valid WebP container");
  }

  const chunkType = buffer.toString("ascii", 12, 16);

  if (chunkType === "VP8 ") {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }

  if (chunkType === "VP8L") {
    const bits = buffer.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }

  if (chunkType === "VP8X") {
    return {
      width: buffer.readUIntLE(24, 3) + 1,
      height: buffer.readUIntLE(27, 3) + 1,
    };
  }

  throw new Error(`unsupported WebP chunk ${chunkType}`);
}

async function listCardFiles(directory) {
  return (await fs.readdir(directory))
    .filter((file) => !file.startsWith("."))
    .sort();
}

async function validateCards(directory) {
  const files = await listCardFiles(directory);
  const errors = [];
  const categories = new Map();
  const hashes = new Map();
  let totalBytes = 0;

  if (files.length !== EXPECTED_CARD_COUNT) {
    errors.push(
      `expected ${EXPECTED_CARD_COUNT} cards, found ${files.length}`,
    );
  }

  for (const file of files) {
    const match = file.match(CARD_NAME_PATTERN);
    if (!match) {
      errors.push(`${file}: expected a normalized .webp card name`);
    } else {
      categories.set(match[1], (categories.get(match[1]) ?? 0) + 1);
    }

    const filePath = path.join(directory, file);
    const buffer = await fs.readFile(filePath);
    totalBytes += buffer.length;

    if (buffer.length > MAX_FILE_BYTES) {
      errors.push(`${file}: ${buffer.length} bytes exceeds the file budget`);
    }

    try {
      const { width, height } = readWebpDimensions(buffer);
      if (width > MAX_WIDTH || height > MAX_HEIGHT) {
        errors.push(`${file}: ${width}x${height} exceeds ${MAX_WIDTH}x${MAX_HEIGHT}`);
      }
      if (Math.abs(width * 3 - height * 2) > 1) {
        errors.push(`${file}: ${width}x${height} is not a 2:3 cover`);
      }
    } catch (error) {
      errors.push(`${file}: ${error.message}`);
    }

    const hash = createHash("sha256").update(buffer).digest("hex");
    const duplicate = hashes.get(hash);
    if (duplicate) {
      errors.push(`${file}: duplicates ${duplicate}`);
    } else {
      hashes.set(hash, file);
    }
  }

  for (const category of ["book", "game", "movie", "music", "tv"]) {
    const count = categories.get(category) ?? 0;
    if (count !== EXPECTED_CARDS_PER_CATEGORY) {
      errors.push(
        `${category}: expected ${EXPECTED_CARDS_PER_CATEGORY} cards, found ${count}`,
      );
    }
  }

  if (totalBytes > MAX_TOTAL_BYTES) {
    errors.push(
      `total size ${totalBytes} bytes exceeds ${MAX_TOTAL_BYTES} bytes`,
    );
  }

  if (errors.length > 0) {
    throw new Error(`Auth card validation failed:\n- ${errors.join("\n- ")}`);
  }

  return { count: files.length, totalBytes };
}

function normalizedOutputName(file) {
  const parsed = path.parse(file);
  return `${parsed.name.trim().replace(/\s+/g, "_")}.webp`;
}

function sourceMimeType(file) {
  return path.extname(file).toLowerCase() === ".png"
    ? "image/png"
    : path.extname(file).toLowerCase() === ".webp"
      ? "image/webp"
      : "image/jpeg";
}

async function encodeCard(page, filePath, file) {
  const source = await fs.readFile(filePath);
  const dataUrl = `data:${sourceMimeType(file)};base64,${source.toString("base64")}`;

  const encoded = await page.evaluate(
    async ({ dataUrl: imageUrl, maxHeight, maxWidth, quality }) => {
      const image = new globalThis.Image();
      image.src = imageUrl;
      await image.decode();

      const targetRatio = 2 / 3;
      const sourceRatio = image.naturalWidth / image.naturalHeight;
      let sourceX = 0;
      let sourceY = 0;
      let sourceWidth = image.naturalWidth;
      let sourceHeight = image.naturalHeight;

      if (sourceRatio > targetRatio) {
        sourceWidth = image.naturalHeight * targetRatio;
        sourceX = (image.naturalWidth - sourceWidth) / 2;
      } else {
        sourceHeight = image.naturalWidth / targetRatio;
        sourceY = (image.naturalHeight - sourceHeight) / 2;
      }

      const scale = Math.min(
        1,
        maxWidth / sourceWidth,
        maxHeight / sourceHeight,
      );
      const outputWidth = Math.max(1, Math.floor(sourceWidth * scale));
      const outputHeight = Math.max(1, Math.round(outputWidth * 1.5));
      const canvas = globalThis.document.createElement("canvas");
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const context = canvas.getContext("2d");
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        outputWidth,
        outputHeight,
      );

      return canvas.toDataURL("image/webp", quality).split(",", 2)[1];
    },
    {
      dataUrl,
      maxHeight: MAX_HEIGHT,
      maxWidth: MAX_WIDTH,
      quality: WEBP_QUALITY,
    },
  );

  return Buffer.from(encoded, "base64");
}

async function writeOptimizedCards() {
  const sourceFiles = await listCardFiles(CARDS_DIRECTORY);
  const unsupported = sourceFiles.filter(
    (file) => !SUPPORTED_SOURCE_EXTENSIONS.has(path.extname(file).toLowerCase()),
  );

  if (unsupported.length > 0) {
    throw new Error(`Unsupported card files: ${unsupported.join(", ")}`);
  }

  try {
    // A valid corpus is already the target state; re-encoding WebP adds generational loss.
    return await validateCards(CARDS_DIRECTORY);
  } catch {
    // Continue with the transactional conversion when the source misses a budget.
  }

  const stagingDirectory = await fs.mkdtemp(
    path.join(CARDS_PARENT_DIRECTORY, ".auth-cards-stage-"),
  );
  const backupDirectory = path.join(
    CARDS_PARENT_DIRECTORY,
    `.auth-cards-backup-${process.pid}-${Date.now()}`,
  );
  const outputNames = new Set();
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();

    for (const file of sourceFiles) {
      const outputName = normalizedOutputName(file);
      if (outputNames.has(outputName)) {
        throw new Error(`Multiple source cards resolve to ${outputName}`);
      }
      outputNames.add(outputName);

      const encoded = await encodeCard(
        page,
        path.join(CARDS_DIRECTORY, file),
        file,
      );
      await fs.writeFile(path.join(stagingDirectory, outputName), encoded);
    }

    await validateCards(stagingDirectory);
    await fs.rename(CARDS_DIRECTORY, backupDirectory);

    try {
      await fs.rename(stagingDirectory, CARDS_DIRECTORY);
      const summary = await validateCards(CARDS_DIRECTORY);
      await fs.rm(backupDirectory, { recursive: true });
      return summary;
    } catch (error) {
      await fs.rm(CARDS_DIRECTORY, { recursive: true, force: true });
      await fs.rename(backupDirectory, CARDS_DIRECTORY);
      throw error;
    }
  } finally {
    await browser.close();
    await fs.rm(stagingDirectory, { recursive: true, force: true });
  }
}

const summary =
  mode === "--write"
    ? await writeOptimizedCards()
    : await validateCards(CARDS_DIRECTORY);

process.stdout.write(
  `Auth cards valid: ${summary.count} WebP files, ${summary.totalBytes} bytes total.\n`,
);
