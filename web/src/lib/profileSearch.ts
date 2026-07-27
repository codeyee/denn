import { z } from "zod";

import type { ProfileSearchParams } from "@/lib/types";

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
const optionalBoolean = optionalFavorite;
const profileContentTypes = [
  "MOVIE",
  "TV_SHOW",
  "SEASON",
  "GAME",
  "ALBUM",
  "BOOK",
] as const;
const trackingStatuses = [
  "backlog",
  "in_progress",
  "completed",
  "on_hold",
  "dropped",
] as const;

export const publicProfileSearchSchema = z.object({
  tab: z.enum(["overview", "progress", "lists"]).catch("overview"),
  type: profileFilterArray(profileContentTypes),
  q: z.string().trim().max(100).optional().catch(undefined),
  sort: z.string().trim().max(24).optional().catch(undefined),
  order: z.enum(["asc", "desc"]).optional().catch(undefined),
  page: positivePage,
  status: profileFilterArray(trackingStatuses),
  tvKind: z.enum(["all", "series", "seasons"]).optional().catch(undefined),
  rated: optionalBoolean,
  reviewed: optionalBoolean,
  favorite: optionalFavorite,
  minScore: optionalScore,
  maxScore: optionalScore,
  role: z.enum(["all", "owner", "member"]).optional().catch(undefined),
  view: z.enum(["grid", "list"]).optional().catch(undefined),
});

export const publicProfileSearchValidator = {
  types: {} as {
    input: Partial<ProfileSearchParams>;
    output: ProfileSearchParams;
  },
  parse(input: unknown): ProfileSearchParams {
    return publicProfileSearchSchema.parse(input);
  },
};

export function profileDataSearchParams(search: ProfileSearchParams) {
  const { view: _view, ...requestParams } = search;
  return requestParams;
}

export function profileDataSearchKey(search: ProfileSearchParams) {
  return JSON.stringify({
    tab: search.tab,
    page: search.page,
    q: search.q ?? null,
    type: search.type ?? [],
    status: search.status ?? [],
    sort: search.sort ?? null,
    order: search.order ?? null,
    tvKind: search.tvKind ?? null,
    rated: search.rated ?? null,
    reviewed: search.reviewed ?? null,
    favorite: search.favorite ?? null,
    minScore: search.minScore ?? null,
    maxScore: search.maxScore ?? null,
    role: search.role ?? null,
  });
}

function profileFilterArray<const T extends readonly [string, ...string[]]>(
  allowedValues: T,
) {
  return z
    .preprocess(
      normalizeFilterArray,
      z.array(z.enum(allowedValues)).max(allowedValues.length).optional(),
    )
    .transform(
      (values): Array<T[number]> | undefined =>
        values
          ? allowedValues.filter((value) => values.includes(value))
          : undefined,
    )
    .catch(undefined);
}

function normalizeFilterArray(value: unknown) {
  if (value === undefined || value === "") return undefined;
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return value;
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}
