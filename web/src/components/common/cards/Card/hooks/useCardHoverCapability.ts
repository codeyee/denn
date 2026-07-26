import { useSyncExternalStore } from "react";

const HOVER_CAPABILITY_QUERY =
  "(min-width: 64rem) and (hover: hover) and (pointer: fine)";

const subscribers = new Set<() => void>();
let mediaQuery: MediaQueryList | null = null;

function getMediaQuery(): MediaQueryList | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return null;
  }
  mediaQuery ??= window.matchMedia(HOVER_CAPABILITY_QUERY);
  return mediaQuery;
}

function notifySubscribers() {
  subscribers.forEach((subscriber) => subscriber());
}

function subscribe(subscriber: () => void) {
  const query = getMediaQuery();
  subscribers.add(subscriber);
  if (subscribers.size === 1) {
    query?.addEventListener("change", notifySubscribers);
  }

  return () => {
    subscribers.delete(subscriber);
    if (subscribers.size === 0) {
      query?.removeEventListener("change", notifySubscribers);
    }
  };
}

function getSnapshot() {
  return getMediaQuery()?.matches ?? false;
}

function getServerSnapshot() {
  return false;
}

export function useCardHoverCapability() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
