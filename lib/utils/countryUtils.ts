export function getUserCountryCode(): string {
  // TODO: Implement actual country detection
  return "CO";
}

export function isValidCountryCode(code: string): boolean {
  return /^[A-Z]{2}$/.test(code);
}