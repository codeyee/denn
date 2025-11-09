export function getUserCountryCode(): string {
  // TODO: Implement actual country detection
  return "CO";
}

export function getCountryFromLanguage(): string | null {
  if (typeof window === "undefined") return null;

  const language = navigator.language || (navigator as any).userLanguage;
  if (!language) return null;

  const parts = language.split("-");
  if (parts.length > 1) {
    return parts[1].toUpperCase();
  }

  return null;
}

export async function detectCountryFromIP(): Promise<string | null> {
  try {
    // TODO: Implement IP geolocation
    return null;
  } catch (error) {
    console.error("Failed to detect country from IP:", error);
    return null;
  }
}
export async function getCountryCodeWithFallback(): Promise<string> {
  // TODO: Check user preferences first
  // TODO: Try IP-based detection

  const languageCountry = getCountryFromLanguage();
  if (languageCountry) return languageCountry;

  return "CO";
}

export function isValidCountryCode(code: string): boolean {
  return /^[A-Z]{2}$/.test(code);
}