declare global {
  interface Window {
    __ENV__?: {
      API_URL?: string;
      PROXY_API_URL?: string;
    };
  }
}

export function getApiUrl(): string {
  if (typeof window !== "undefined" && window.__ENV__?.API_URL) {
    return window.__ENV__.API_URL;
  }
  return (
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
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
