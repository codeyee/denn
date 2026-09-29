export function isWebModerationVisibilityEnabled(): boolean {
  return (
    process.env.WEB_MODERATION_VISIBILITY_ENABLED?.trim().toLowerCase() ===
    "true"
  );
}
