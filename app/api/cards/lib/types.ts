import type { ProviderAttribution } from "@/app/_components/LandingPage/data";

export type BackgroundCardImage = {
  src: string;
  alt: string;
};

export type ContentTypeBackground = {
  type: string;
  title: string;
  description: string;
  provider: ProviderAttribution;
  backgroundImage: string;
  alt: string;
  isFallback: boolean;
};
