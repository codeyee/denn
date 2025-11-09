import { contentTypeEnum } from "./types"
import { Author, Platform, Image, AlbumType } from "@/lib/api/types"

export interface Movie {
  id: number
  type: contentTypeEnum | string
  title: string
  original_title?: string
  description?: string
  image_url?: string
  release_date?: string
  images?: Image[]
  authors?: Author[]
  platforms?: Record<string, Platform[]>
}

export interface TVShow {
  id: number
  type: contentTypeEnum | string
  title: string
  original_title?: string
  description?: string
  image_url?: string
  release_date?: string
  images?: Image[]
  authors?: Author[]
  platforms?: Record<string, Platform[]>
}

export interface Game {
  id: number
  title: string
  type?: string
  release_date?: string
  description?: string
  image_url?: string
  authors?: Author[]
  platforms?: Platform[]
  images?: Image[]
}

export interface MusicAlbum {
  id: string
  type?: string
  title: string
  authors?: Author[]
  image_url?: string
  release_date?: string
  total_tracks?: number
  album_type?: AlbumType
  external_url?: string
  images?: Image[]
}

export interface Book {
  id: string
  title: string
  authors?: Author[]
  image_url?: string
  release_date?: string
  pages?: number
  description?: string
  images?: Image[]
}

export type ContentItem = Movie | TVShow | Game | MusicAlbum | Book

export interface ContentApiResponse {
  movies: Movie[]
  tv_shows: TVShow[]
  games: Game[]
  music: MusicAlbum[]
  books: Book[]
}

export interface ListOwner {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
}

export enum ListType {
  PERSONAL = "PERSONAL",
  SHARED = "SHARED",
}

export interface List {
  id: number
  name: string
  description: string
  list_type: ListType
  owner: ListOwner
  members?: ListMember[]
  member_count?: string
  items?: ListItem[]
  item_count?: string
  created_at: string
  updated_at: string
}

export interface ListMember {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
}

export interface ApiMetadata {
  count: number
  page_size: number
  current_page: number
  total_pages: number
  next: string | null
  previous: string | null
}

export interface ListsApiResponse {
  metadata: ApiMetadata
  results: List[]
}

export interface ListItemOwner {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
}

export interface SourceData {
  id: number
  title: string
  original_title?: string
  description?: string
  image_url?: string
  release_date?: string
  duration_minutes?: number
  status?: string
}

export interface ContentItemData {
  id: number
  source_api: string
  external_id: string
  content_type: string
  rating_count: number
  average_rating: number | null
  created_at: string
  source_data: SourceData
}

export interface ListItem {
  id: number
  user_list: number
  list_order: number
  content_item: ContentItemData
  added_by: ListItemOwner
  status: string
  added_at: string
  completed_at: string | null
  notes: string | null
  member_ratings: unknown[]
  list_rating: number | null
  member_rating_count: number
}

export interface ListItemsApiResponse {
  metadata: ApiMetadata
  results: ListItem[]
}

export default ContentApiResponse
