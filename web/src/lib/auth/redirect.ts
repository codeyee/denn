export function normalizeInternalRedirectTarget(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) {
    return null;
  }
  if (trimmed.startsWith("//")) {
    return null;
  }

  return trimmed;
}
