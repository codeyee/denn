import { z } from "zod";

import { ContentType } from "@/lib/types";

const positivePage = z.preprocess(
  (value) => Number(value),
  z.number().int().min(1).catch(1),
);
const optionalScore = z
  .preprocess(
    (value) =>
      value === undefined || value === "" ? undefined : Number(value),
    z.number().min(0.5).max(10),
  )
  .optional()
  .catch(undefined);
const optionalFavorite = z
  .preprocess(
    (value) => {
      if (value === true || value === "true") return true;
      if (value === false || value === "false") return false;
      return undefined;
    },
    z.boolean(),
  )
  .optional()
  .catch(undefined);

export const publicProfileSearchSchema = z.object({
  tab: z.enum(["overview", "completed", "ratings", "lists"]).catch("overview"),
  type: z
    .enum([
      ContentType.MOVIE,
      ContentType.TV_SHOW,
      ContentType.SEASON,
      ContentType.GAME,
      ContentType.ALBUM,
      ContentType.BOOK,
    ])
    .optional()
    .catch(undefined),
  q: z.string().trim().max(100).optional().catch(undefined),
  sort: z.string().trim().max(24).optional().catch(undefined),
  page: positivePage,
  kind: z
    .enum(["all", "reviews", "ratings_only"])
    .optional()
    .catch(undefined),
  favorite: optionalFavorite,
  minScore: optionalScore,
  maxScore: optionalScore,
  role: z.enum(["all", "owner", "member"]).optional().catch(undefined),
});
