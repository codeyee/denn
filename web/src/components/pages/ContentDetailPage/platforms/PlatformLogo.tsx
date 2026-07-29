import { Gamepad2, Store } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";

interface PlatformLogoProps {
  src: string | null;
  alt: string;
  kind: "content" | "game";
  fallbackIcon?: LucideIcon;
  compact?: boolean;
}

export function PlatformLogo({ src, alt, kind, fallbackIcon, compact = false }: PlatformLogoProps) {
  const [hasError, setHasError] = useState(false);
  const isContent = kind === "content";
  const FallbackIcon = fallbackIcon ?? (isContent ? Store : Gamepad2);
  const containerSize = compact ? "size-12" : "size-14";
  const iconSize = compact ? "size-7" : "size-8";
  const imageSize = compact ? 48 : 56;

  return (
    <div className={`flex ${containerSize} shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/10`}>
      {src && !hasError ? (
        <img
          src={src}
          alt={alt}
          width={imageSize}
          height={imageSize}
          loading="lazy"
          onError={() => setHasError(true)}
          className="size-full object-cover"
        />
      ) : (
        <FallbackIcon aria-hidden="true" className={`${iconSize} text-white/60`} strokeWidth={1.5} />
      )}
    </div>
  );
}
