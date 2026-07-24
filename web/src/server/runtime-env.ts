import { createServerFn } from "@tanstack/react-start";

export interface RuntimeEnv {
  PROXY_API_URL: string;
}

export const getRuntimeEnvFn = createServerFn({ method: "GET" }).handler(
  (): RuntimeEnv => ({
    // Browser code always talks to the BFF proxy route, never directly to
    // the Go service. Keeping the value in one place avoids stale URLs in
    // older clients that loaded the script tag at build time.
    PROXY_API_URL: "/api/proxy",
  }),
);
