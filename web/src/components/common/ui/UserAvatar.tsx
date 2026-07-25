import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils/tailwindUtils";

interface UserAvatarProps {
  avatarUrl?: string;
  username: string;
  alt?: string;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
}

export function UserAvatar({
  avatarUrl = "",
  username,
  alt = "",
  className,
  imageClassName,
  fallbackClassName,
}: UserAvatarProps) {
  const [failed, setFailed] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setFailed(false);
    const image = imageRef.current;
    if (avatarUrl && image?.complete && image.naturalWidth === 0) {
      setFailed(true);
    }
  }, [avatarUrl]);

  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-full bg-[#32163a] font-black text-white",
        className,
      )}
    >
      {avatarUrl && !failed ? (
        <img
          ref={imageRef}
          src={avatarUrl}
          alt={alt}
          referrerPolicy="no-referrer"
          className={cn("h-full w-full object-cover", imageClassName)}
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          role={alt ? "img" : undefined}
          aria-label={alt || undefined}
          aria-hidden={alt ? undefined : "true"}
          className={fallbackClassName}
        >
          {username.slice(0, 1).toUpperCase()}
        </span>
      )}
    </span>
  );
}
