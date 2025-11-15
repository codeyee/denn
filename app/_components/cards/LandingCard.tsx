import { Card } from "./Card";
import { LucideIcon } from "lucide-react";
import { Provider } from "@/app/api/cards/lib/contentTypeDefinitions";

interface LandingCardProps {
  id: string | number;
  title: string;
  icon: LucideIcon;
  backgroundImage: string;
  backgroundImageAlt?: string;
  providers: Provider[];
  className?: string;
}

export function LandingCard({
  id,
  title,
  icon,
  backgroundImage,
  backgroundImageAlt,
  providers,
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
        <div className="flex items-center gap-2 flex-wrap">
          {providers.map((provider, index) => (
            <span key={provider.name} className="flex items-center gap-1">
              {provider.url ? (
                <a
                  href={provider.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-white leading-none hover:underline"
                  aria-label={`Powered by ${provider.name}`}
                >
                  {provider.name}
                </a>
              ) : (
                <span className="font-semibold text-white leading-none">
                  {provider.name}
                </span>
              )}
              {index < providers.length - 1 && (
                <span className="text-white/60">•</span>
              )}
            </span>
          ))}
        </div>
      </Card.Footer>
    </Card>
  );
}
