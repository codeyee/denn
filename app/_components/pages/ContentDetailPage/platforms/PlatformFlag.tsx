"use client";

import Image from "next/image";

interface PlatformFlagProps {
  countryCode: string;
  size?: number;
}

export function PlatformFlag({
  countryCode,
  size = 28,
}: PlatformFlagProps) {
  return (
    <div
      className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center"
      title={countryCode}
      style={{ width: size, height: size }}
    >
      <Image
        src={`https://flagsapi.com/${countryCode}/flat/64.png`}
        alt={countryCode}
        title={countryCode}
        width={size}
        height={size}
        className="h-14 w-auto object-cover"
      />
    </div>
  );
}
