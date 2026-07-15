const DEFAULT_JSON_BODY_LIMIT = 2_048;

export class RequestBodyTooLargeError extends Error {}

export async function readLimitedJson(
  request: Request,
  maxBytes = DEFAULT_JSON_BODY_LIMIT,
): Promise<unknown> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxBytes) {
    throw new RequestBodyTooLargeError("Request body exceeds the allowed size");
  }

  if (!request.body) {
    return JSON.parse("");
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let body = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    bytesRead += value.byteLength;
    if (bytesRead > maxBytes) {
      await reader.cancel();
      throw new RequestBodyTooLargeError("Request body exceeds the allowed size");
    }
    body += decoder.decode(value, { stream: true });
  }

  body += decoder.decode();
  return JSON.parse(body);
}

export function createFixedWindowRateLimiter(options: {
  limit: number;
  windowMs: number;
  now?: () => number;
}) {
  const now = options.now ?? Date.now;
  let windowStartedAt = now();
  let count = 0;

  return {
    consume(): boolean {
      const currentTime = now();
      if (currentTime - windowStartedAt >= options.windowMs) {
        windowStartedAt = currentTime;
        count = 0;
      }

      if (count >= options.limit) return false;
      count += 1;
      return true;
    },
  };
}
