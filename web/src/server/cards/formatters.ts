import path from "path";

export function formatCardAlt(fileName: string) {
  const baseName = path.basename(fileName, path.extname(fileName));
  const [rawCategory, ...rest] = baseName.split("_");

  if (!rawCategory) {
    return `Background card ${baseName}`;
  }

  const category = rawCategory
    .replace(/[-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

  if (rest.length === 0) {
    return `${category} background card`;
  }

  const identifier = rest
    .map((segment) => segment.replace(/[-]+/g, " "))
    .join(" ")
    .trim();

  return `${category} background card ${identifier}`.trim();
}
