
import { useCountryDetection } from "@/hooks/useCountryDetection";

export function CountryProvider() {
  useCountryDetection();
  return null;
}