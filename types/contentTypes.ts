import { contentTypeEnum } from "./types"

export interface Movie {
  id: number
  type: contentTypeEnum | string
  title: string
  original_title?: string
  description?: string
  image_url?: string
  release_date?: string
}

export interface TVShow {
  id: number
  type: contentTypeEnum | string
  title: string
  original_title?: string
  description?: string
  image_url?: string
  release_date?: string
}

export interface Game {
  id: number
  title: string
  type?: string
  release_date?: string
  description?: string
  image_url?: string
  authors?: string[]
  platforms?: string[]
}

export interface MusicAlbum {
  id: string
  type?: string
  title: string
  authors?: string[]
  image_url?: string
  release_date?: string
  total_tracks?: number
  album_type?: string
  external_url?: string
}

export interface Book {
  id: string
  title: string
  authors?: string[]
  image_url?: string
  release_date?: string
  pages?: number
  description?: string
}

export type ContentItem = Movie | TVShow | Game | MusicAlbum | Book

export interface ContentApiResponse {
  movies: Movie[]
  tv_shows: TVShow[]
  games: Game[]
  music: MusicAlbum[]
  books: Book[]
}

export default ContentApiResponse
