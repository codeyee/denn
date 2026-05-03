import { createServerFn } from "@tanstack/react-start";

export interface RuntimeEnv {
  API_URL: string;
  PROXY_API_URL: string;
}

export const getRuntimeEnvFn = createServerFn({ method: "GET" }).handler(
  (): RuntimeEnv => ({
    API_URL:
      process.env.API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:8000/api",
    // Browser code always talks to the BFF proxy route, never directly to
    // the Go service. Keeping the value in one place avoids stale URLs in
    // older clients that loaded the script tag at build time.
    PROXY_API_URL: "/api/proxy",
  }),
);
