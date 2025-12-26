import {
  MovieDetail,
  TVShowDetail,
  AlbumDetail,
  GameDetail,
  BookDetail,
  TVSeasonDetail,
} from "./api";

export type Content =
  | MovieDetail
  | TVShowDetail
  | AlbumDetail
  | GameDetail
  | BookDetail
  | TVSeasonDetail;
