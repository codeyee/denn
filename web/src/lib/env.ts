declare global {
  interface Window {
    __ENV__?: {
      PROXY_API_URL?: string;
    };
  }
}

interface ApiEnvironment {
  API_URL?: string;
  NEXT_PUBLIC_API_URL?: string;
}

export function getApiUrl(env: ApiEnvironment = process.env): string {
  return (
    env.API_URL ||
    env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8000/api"
  );
}

export function getProxyApiUrl(): string {
  if (typeof window !== "undefined" && window.__ENV__?.PROXY_API_URL) {
    return window.__ENV__.PROXY_API_URL;
  }
  return (
    process.env.PROXY_API_URL ||
    process.env.NEXT_PUBLIC_PROXY_API_URL ||
    "http://localhost:8080/v1/proxy"
  );
}

export {};
