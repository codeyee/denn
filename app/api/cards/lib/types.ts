import type { ProviderAttribution } from "@/types";

export type BackgroundCardImage = {
  src: string;
  alt: string;
};

export type ContentTypeBackground = {
  type: string;
  title: string;
  description: string;
  provider: {
    name: string;
    logo: string;
    url: string;
  };
  backgroundImage: string;
  alt: string;
  isFallback: boolean;
};
