import { ContentType, SourceApi } from "@/lib/api/types";

interface ContentTypeConfig {
    sourceApi: SourceApi;
    displayName: string;
}

export const CONTENT_TYPE_CONFIG: Record<ContentType, ContentTypeConfig> = {
    [ContentType.MOVIE]: {
        sourceApi: SourceApi.TMDB,
        displayName: "Movie",
    },
    [ContentType.TV_SHOW]: {
        sourceApi: SourceApi.TMDB,
        displayName: "TV Show",
    },
    [ContentType.SEASON]: {
        sourceApi: SourceApi.TMDB,
        displayName: "Season",
    },
    [ContentType.GAME]: {
        sourceApi: SourceApi.IGDB,
        displayName: "Game",
    },
    [ContentType.ALBUM]: {
        sourceApi: SourceApi.SPOTIFY,
        displayName: "Album",
    },
    [ContentType.BOOK]: {
        sourceApi: SourceApi.OPENLIBRARY,
        displayName: "Book",
    },
    [ContentType.PERSON]: {
        sourceApi: SourceApi.TMDB,
        displayName: "Person",
    },
};

export function getSourceApi(contentType: ContentType): SourceApi {
    return CONTENT_TYPE_CONFIG[contentType]?.sourceApi ?? SourceApi.TMDB;
}
