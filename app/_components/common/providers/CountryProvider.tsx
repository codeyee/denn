"use client";

import { useCountryDetection } from "@/app/_hooks/useCountryDetection";

export function CountryProvider() {
  useCountryDetection();
  return null;
}