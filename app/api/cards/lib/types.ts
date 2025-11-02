import type { ProviderAttribution } from "@/types/types";

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
