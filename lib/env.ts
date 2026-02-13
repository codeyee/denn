export function getApiUrl(): string {
  if (typeof window !== "undefined" && window.__ENV__?.API_URL) {
    return window.__ENV__.API_URL;
  }
  return process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
}
