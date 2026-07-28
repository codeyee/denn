import { Gamepad2, Store } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";

interface PlatformLogoProps {
  src: string | null;
  alt: string;
  kind: "content" | "game";
  fallbackIcon?: LucideIcon;
}

export function PlatformLogo({ src, alt, kind, fallbackIcon }: PlatformLogoProps) {
  const [hasError, setHasError] = useState(false);
  const isContent = kind === "content";
  const FallbackIcon = fallbackIcon ?? (isContent ? Store : Gamepad2);

  return (
    <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/10">
      {src && !hasError ? (
        <img
          src={src}
          alt={alt}
          width={56}
          height={56}
          loading="lazy"
          onError={() => setHasError(true)}
          className="size-full object-cover"
        />
      ) : (
        <FallbackIcon aria-hidden="true" className="size-8 text-white/60" strokeWidth={1.5} />
      )}
    </div>
  );
}
