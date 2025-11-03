import Card from "../Card";
import { LucideIcon } from "lucide-react";
import { ProviderAttribution } from "@/types/types";

interface LandingCardProps {
  id: string | number;
  title: string;
  icon: LucideIcon;
  backgroundImage: string;
  backgroundImageAlt?: string;
  provider: ProviderAttribution;
  className?: string;
}

export default function LandingCard({
  id,
  title,
  icon,
  backgroundImage,
  backgroundImageAlt,
  provider,
  className = "",
}: LandingCardProps) {
  return (
    <Card
      id={id}
      title={title}
      icon={icon}
      backgroundImage={backgroundImage}
      backgroundImageAlt={backgroundImageAlt}
      className={`${className} h-[240px] md:h-[480px]`}
      noAspectRatio={true}
    >
      <Card.Footer>
        <span>Powered by</span>
        {provider.href ? (
          <a
            href={provider.href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-white leading-none"
            aria-label={`Powered by ${provider.name}`}
          >
            {provider.name}
          </a>
        ) : (
          <span className="font-semibold text-white leading-none">
            {provider.name}
          </span>
        )}
      </Card.Footer>
    </Card>
  );
}
