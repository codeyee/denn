import type { ProviderAttribution } from "@/types";

export type BackgroundCardImage = {
  src: string;
  alt: string;
};

export type Provider = {
  name: string;
  url: string;
};

export type ContentTypeBackground = {
  type: string;
  title: string;
  description: string;
  provider: Provider | Provider[];
  backgroundImage: string;
  alt: string;
  isFallback: boolean;
};
