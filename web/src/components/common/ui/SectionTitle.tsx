import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface SectionTitleProps {
  title: string;
  icon?: LucideIcon;
  id?: string;
  level?: 2 | 3;
  className?: string;
  action?: ReactNode;
}

export function SectionTitle({
  title,
  icon: Icon,
  id,
  level = 2,
  className = "",
  action,
}: SectionTitleProps) {
  const Heading = level === 3 ? "h3" : "h2";
  const heading = (
    <Heading
      id={id}
      className={`flex min-w-0 items-center gap-3 text-wrap-balance text-2xl font-bold text-white md:text-3xl ${className}`}
    >
      {Icon ? (
        <Icon
          aria-hidden="true"
          className="size-6 shrink-0 text-white/85 md:size-7"
        />
      ) : null}
      <span>{title}</span>
    </Heading>
  );

  if (!action) return heading;

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-2 sm:gap-x-4">
      {heading}
      {action}
    </div>
  );
}
