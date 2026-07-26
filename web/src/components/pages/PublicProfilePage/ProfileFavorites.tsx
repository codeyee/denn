import { useMemo, useState } from "react";

import {
  CONTENT_TYPE_DEFINITIONS,
  FILTERABLE_CONTENT_TYPES,
} from "@/lib/contentTypes";
import type { ContentType, PublicFavorite } from "@/lib/types";
import { FavoriteGrid } from "./ProfileCollections";

interface ProfileFavoritesProps {
  favorites: Partial<Record<ContentType, PublicFavorite[]>>;
}

export function ProfileFavorites({ favorites }: ProfileFavoritesProps) {
  const [selectedTypes, setSelectedTypes] = useState<ContentType[]>([]);
  const allFavorites = useMemo(
    () =>
      sortFavoritesByScore(
        Object.values(favorites).flatMap((items) => items ?? []),
      ),
    [favorites],
  );
  const visibleFavorites = useMemo(
    () =>
      selectedTypes.length === 0
        ? allFavorites
        : allFavorites.filter((favorite) =>
            selectedTypes.includes(favorite.content.type),
          ),
    [allFavorites, selectedTypes],
  );

  function toggleType(type: ContentType) {
    setSelectedTypes((current) =>
      current.includes(type)
        ? current.filter((selectedType) => selectedType !== type)
        : [...current, type],
    );
  }

  return (
    <section aria-labelledby="profile-favorites-title">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2
          id="profile-favorites-title"
          className="text-2xl font-bold text-white"
        >
          Favorites
        </h2>
        {allFavorites.length > 0 ? (
          <div
            className="flex flex-wrap justify-end gap-2"
            role="group"
            aria-label="Filter favorites by content type"
          >
            {FILTERABLE_CONTENT_TYPES.map((type) => {
              const definition = CONTENT_TYPE_DEFINITIONS[type];
              const Icon = definition.icon;
              const isSelected = selectedTypes.includes(type);

              return (
                <button
                  key={type}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => toggleType(type)}
                  className="flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-4 text-sm text-white/70 outline-none transition-colors duration-200 hover:bg-white/10 hover:text-white focus-visible:ring-4 focus-visible:ring-white/70 motion-reduce:transition-none aria-pressed:border-white aria-pressed:bg-white aria-pressed:text-black"
                >
                  <Icon aria-hidden="true" className="size-4 shrink-0" />
                  <span>{definition.pluralLabel}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {visibleFavorites.length > 0 ? (
        <FavoriteGrid items={visibleFavorites} />
      ) : (
        <ProfileFavoritesEmpty hasFavorites={allFavorites.length > 0} />
      )}
    </section>
  );
}

export function sortFavoritesByScore(
  favorites: PublicFavorite[],
): PublicFavorite[] {
  return [...favorites].sort((left, right) => {
    const scoreDifference =
      favoriteScore(right.score) - favoriteScore(left.score);
    if (scoreDifference !== 0) return scoreDifference;

    const dateDifference =
      favoriteTimestamp(right.favorited_at) -
      favoriteTimestamp(left.favorited_at);
    if (dateDifference !== 0) return dateDifference;

    if (left.content.title !== right.content.title) {
      return left.content.title < right.content.title ? -1 : 1;
    }
    return left.content.id - right.content.id;
  });
}

function favoriteScore(score: string | null): number {
  if (score === null) return Number.NEGATIVE_INFINITY;
  const value = Number(score);
  return Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY;
}

function favoriteTimestamp(value: string | null): number {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function ProfileFavoritesEmpty({ hasFavorites }: { hasFavorites: boolean }) {
  return (
    <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-white/15 bg-list-item-background px-6 text-center text-white/60">
      {hasFavorites
        ? "No favorites match the selected content types."
        : "No public favorites yet."}
    </div>
  );
}
