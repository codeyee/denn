import type { ReactNode } from "react";

import { cn } from "@/lib/utils/tailwindUtils";

export const COMPACT_BANNER_SIZE =
  "h-[clamp(21rem,90vw,27rem)] md:h-[clamp(30rem,49vw,35rem)]";
export const BANNER_MEDIA_POSITION = "object-[center_35%]";

interface BannerShellProps {
  children: ReactNode;
  media?: ReactNode;
  fallback?: ReactNode;
  className?: string;
}

export function BannerShell({
  children,
  media,
  fallback,
  className,
}: BannerShellProps) {
  return (
    <section
      data-banner-shell
      className={cn(
        "relative mb-6 w-full overflow-hidden rounded-none bg-[#160b19] md:mb-10 md:rounded-2xl",
        COMPACT_BANNER_SIZE,
        className,
      )}
    >
      {media ?? (
        <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_25%_20%,rgba(123,63,152,0.48),transparent_48%),linear-gradient(145deg,#211126_0%,#08050a_70%)]">
          {fallback}
        </div>
      )}
      <div className="absolute inset-0 bg-black/35" />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-black/95 via-black/55 to-transparent" />
      <div
        className="absolute inset-x-0 bottom-0 h-20 md:h-24"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0) 0%, var(--color-background-logged-in) 100%)",
        }}
      />
      <div className="relative z-30 flex h-full items-end">{children}</div>
    </section>
  );
}
