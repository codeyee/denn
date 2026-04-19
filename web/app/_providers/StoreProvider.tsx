"use client";

import { type ReactNode } from "react";

interface StoreProviderProps {
  children: ReactNode;
}

/**
 * StoreProvider for handling Zustand stores with Next.js App Router
 * This prevents hydration errors by ensuring stores are only accessed on the client
 */
export function StoreProvider({ children }: StoreProviderProps) {
  return <>{children}</>;
}
