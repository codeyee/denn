import {
  getCookie,
  setCookie,
} from "@tanstack/react-start/server";

import { getProxyApiKey } from "@/server/proxy";

const CATALOG_VISITOR_COOKIE = "denn-catalog-visitor";
const CATALOG_VISITOR_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;
const VISITOR_ID_PATTERN = /^[0-9a-f]{32}$/;
const SIGNATURE_PATTERN = /^[0-9a-f]{64}$/;

export async function buildCatalogVisitorHeaders() {
  const apiKey = getProxyApiKey();
  if (!apiKey) {
    throw new Error("PROXY_API_KEY is required to identify catalog visitors");
  }

  const fingerprint = await getOrCreateCatalogVisitorFingerprint(apiKey);
  return {
    "X-Api-Key": apiKey,
    "X-Api-Consumer": "web",
    "X-Catalog-Visitor": fingerprint,
  };
}

export async function createCatalogVisitorCookieValue(
  visitorId: string,
  secret: string,
) {
  if (!VISITOR_ID_PATTERN.test(visitorId) || !secret) return null;
  const signature = await signVisitorId(visitorId, secret);
  return `${visitorId}.${signature}`;
}

export async function readCatalogVisitorId(
  cookieValue: string | null | undefined,
  secret: string,
) {
  if (!cookieValue || !secret) return null;
  const [visitorId, signature, ...extra] = cookieValue.split(".");
  if (
    extra.length > 0 ||
    !visitorId ||
    !signature ||
    !VISITOR_ID_PATTERN.test(visitorId) ||
    !SIGNATURE_PATTERN.test(signature)
  ) {
    return null;
  }

  const key = await importHmacKey(secret);
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    hexToBytes(signature),
    new TextEncoder().encode(visitorId),
  );
  return valid ? visitorId : null;
}

async function getOrCreateCatalogVisitorFingerprint(secret: string) {
  const existing = getCookie(CATALOG_VISITOR_COOKIE);
  let visitorId = await readCatalogVisitorId(existing, secret);

  if (!visitorId) {
    visitorId = crypto.randomUUID().replaceAll("-", "");
    const cookieValue = await createCatalogVisitorCookieValue(
      visitorId,
      secret,
    );
    if (!cookieValue) {
      throw new Error("Could not sign catalog visitor identity");
    }
    setCookie(CATALOG_VISITOR_COOKIE, cookieValue, {
      httpOnly: true,
      maxAge: CATALOG_VISITOR_MAX_AGE_SECONDS,
      path: "/",
      sameSite: "lax",
      secure: secureCookiesEnabled(),
    });
  }

  return signVisitorId(visitorId, secret);
}

async function signVisitorId(visitorId: string, secret: string) {
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(visitorId),
  );
  return bytesToHex(new Uint8Array(signature));
}

async function importHmacKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(value: string) {
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function secureCookiesEnabled() {
  const configured = process.env.AUTH_COOKIE_SECURE?.trim().toLowerCase();
  if (configured === "true") return true;
  if (configured === "false") return false;
  return process.env.NODE_ENV === "production";
}
