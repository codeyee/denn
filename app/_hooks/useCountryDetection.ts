"use client";

import { useEffect, useState } from "react";
import { useSettingsStore } from "@/app/_stores/settings-store";
import { DEFAULT_COUNTRY } from "@/lib/utils/countryUtils";
import Cookies from "js-cookie";

export function useCountryDetection() {
    const { countryCode, setCountryCode } = useSettingsStore();
    const [isDetecting, setIsDetecting] = useState(false);

    useEffect(() => {
        const detectCountry = async () => {
            if (countryCode) {
                return;
            }

            setIsDetecting(true);

            try {
                const cookieCountry = Cookies.get("user-country");
                if (cookieCountry && cookieCountry !== "XX") {
                    setCountryCode(cookieCountry);
                    setIsDetecting(false);
                    return;
                }

                const response = await fetch(
                    "https://www.cloudflare.com/cdn-cgi/trace"
                );
                const data = await response.text();

                const lines = data.split("\n");
                const locLine = lines.find((line) => line.startsWith("loc="));

                if (locLine) {
                    const country = locLine.split("=")[1].trim();
                    if (country && country !== "XX") {
                        setCountryCode(country);
                        setIsDetecting(false);
                        return;
                    }
                }

                setCountryCode(DEFAULT_COUNTRY);
            } catch (error) {
                console.error("Failed to detect country:", error);
                setCountryCode(DEFAULT_COUNTRY);
            } finally {
                setIsDetecting(false);
            }
        };

        detectCountry();
    }, [countryCode, setCountryCode]);

    return {
        countryCode: countryCode || DEFAULT_COUNTRY,
        isDetecting,
    };
}
