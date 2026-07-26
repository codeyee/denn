import type { LucideIcon } from "lucide-react";

interface SectionTitleProps {
  title: string;
  icon?: LucideIcon;
  id?: string;
  level?: 2 | 3;
  className?: string;
}

export function SectionTitle({
  title,
  icon: Icon,
  id,
  level = 2,
  className = "",
}: SectionTitleProps) {
  const Heading = level === 3 ? "h3" : "h2";

  return (
    <Heading
      id={id}
      className={`flex items-center gap-3 text-wrap-balance text-2xl font-bold text-white md:text-3xl ${className}`}
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
}
