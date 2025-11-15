"use client";

import { useEffect, useState } from "react";
import { useSettingsStore } from "@/app/_stores/settings-store";
import { DEFAULT_COUNTRY, detectCountryFromCloudflare, getCountryFromCookie } from "@/lib/utils/countryUtils";

export function useCountryDetection() {
    const { countryCode, setCountryCode } = useSettingsStore();
    const [isDetecting, setIsDetecting] = useState(false);

    useEffect(() => {
        if (countryCode) return;

        const detectCountry = async () => {
            setIsDetecting(true);

            try {
                const cookieCountry = getCountryFromCookie();
                if (cookieCountry) {
                    setCountryCode(cookieCountry);
                    return;
                }

                const detectedCountry = await detectCountryFromCloudflare();
                setCountryCode(detectedCountry);
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
