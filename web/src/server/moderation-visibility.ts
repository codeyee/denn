import { createServerFn } from "@tanstack/react-start";

import { isWebModerationVisibilityEnabled } from "@/server/moderation-visibility-config";

export const getWebModerationVisibilityEnabledFn = createServerFn({ method: "GET" })
  .handler(() => isWebModerationVisibilityEnabled());
