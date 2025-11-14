"use client";

interface PlatformFlagProps {
  countryCode: string;
  size?: number;
}

export default function PlatformFlag({
  countryCode,
  size = 28,
}: PlatformFlagProps) {
  return (
    <div
      className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center"
      title={countryCode}
      style={{ width: size, height: size }}
    >
      <img
        src={`https://flagsapi.com/${countryCode}/flat/64.png`}
        alt={countryCode}
        title={countryCode}
        className="h-14 w-auto object-cover"
      />
    </div>
  );
}
