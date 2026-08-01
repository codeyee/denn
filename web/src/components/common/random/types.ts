import type { ContentType, TrackingStatus } from "@/lib/types";

export interface RandomPickerItem {
  id: number;
  contentId: number;
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  contentType: ContentType;
  status?: TrackingStatus | null;
}

export type RandomPickerPhase = "idle" | "rolling" | "settling" | "settled";
