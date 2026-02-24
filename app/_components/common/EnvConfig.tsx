export { };

declare global {
  interface Window {
    __ENV__: {
      API_URL?: string;
      PROXY_API_URL?: string;
      PROXY_API_KEY?: string;
    };
  }
}

import { headers } from "next/headers";

export async function EnvConfig() {
  await headers();

  const env = {
    API_URL: process.env.API_URL || process.env.NEXT_PUBLIC_API_URL,
    PROXY_API_URL: process.env.PROXY_API_URL || process.env.NEXT_PUBLIC_PROXY_API_URL,
    PROXY_API_KEY: process.env.PROXY_API_KEY || process.env.NEXT_PUBLIC_PROXY_API_KEY,
  };

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `window.__ENV__ = ${JSON.stringify(env)}`,
      }}
    />
  );
}
