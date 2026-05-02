import { useSettingsStore } from "@/stores/settings-store";
import Cookies from "js-cookie";

export const DEFAULT_COUNTRY = "CO";
export const CLOUDFLARE_TRACE_URL = "https://www.cloudflare.com/cdn-cgi/trace";

export function getUserCountryCode(): string {
    if (typeof window !== "undefined") {
        try {
            const state = useSettingsStore.getState();
            if (state.countryCode) {
                return state.countryCode;
            }

            const cookieCountry = Cookies.get("user-country");
            if (cookieCountry && cookieCountry !== "XX") {
                return cookieCountry.toUpperCase();
            }
        } catch (error) {
            console.warn("Failed to get country code from store:", error);
        }
    }

    return DEFAULT_COUNTRY;
}

export async function detectCountryFromCloudflare(): Promise<string> {
    try {
        const response = await fetch(CLOUDFLARE_TRACE_URL);
        const data = await response.text();
        const lines = data.split("\n");
        const locLine = lines.find((line) => line.startsWith("loc="));

        if (locLine) {
            const country = locLine.split("=")[1]?.trim();
            if (country && country !== "XX") {
                return country;
            }
        }
    } catch (error) {
        console.error("Failed to detect country from Cloudflare:", error);
    }

    return DEFAULT_COUNTRY;
}

export function getCountryFromCookie(): string | null {
    const cookieCountry = Cookies.get("user-country");
    if (cookieCountry && cookieCountry !== "XX") {
        return cookieCountry;
    }
    return null;
}
