import {
  MovieDetail,
  TVShowDetail,
  AlbumDetail,
  GameDetail,
  BookDetail,
  UserList,
  TVSeasonDetail,
  ListItem,
} from "./api";

export type Content =
  | MovieDetail
  | TVShowDetail
  | AlbumDetail
  | GameDetail
  | BookDetail
  | TVSeasonDetail;

export type ListWithItems = UserList & { items?: ListItem[] };
