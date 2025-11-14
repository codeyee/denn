import { useSettingsStore } from "@/app/_stores/settings-store";
import Cookies from "js-cookie";

export const DEFAULT_COUNTRY = "CO";

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
