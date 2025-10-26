# 📚 Denn API Reference

This document provides detailed information about all available API endpoints in the Denn API.

## 📋 Table of Contents

- [Overview](#overview)
- [Base URL](#base-url)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [API Endpoints](#api-endpoints)
  - [Video (Movies & TV Shows)](#video-movies--tv-shows)
  - [Music](#music)
  - [Games](#games)
  - [Books](#books)

---

## 🔍 Quick Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/proxy/video/search` | GET | Search movies and TV shows |
| `/proxy/video/movie/{id}` | GET | Get movie details |
| `/proxy/video/tv/{id}` | GET | Get TV show details |
| `/proxy/video/tv/{id}/season/{num}` | GET | Get TV season details |
| `/proxy/music/search` | GET | Search music albums |
| `/proxy/music/{id}` | GET | Get album details |
| `/proxy/game/search` | GET | Search video games |
| `/proxy/book/search` | GET | Search books |

---

## 🌐 Overview

The Denn API acts as a secure proxy to various media databases, providing a unified interface for accessing information about movies, TV shows, music, games, and books. All external API keys are handled server-side for security.

### Key Features
- ✅ No authentication required _(for now - coming in future versions)_
- ✅ JSON responses with consistent structure
- ✅ Normalized data across all media types
- ✅ Pre-processed and optimized image URLs
- ✅ Consistent error format
- ✅ Automatic token management for OAuth services
- ✅ Request timeout: 30 seconds

### Response Normalization

All endpoints return normalized, clean data structures. The API processes external API responses to provide:
- **Consistent field names** across all media types (e.g., `title`, `authors`, `image_url`)
- **Ready-to-use image URLs** (no additional URL construction needed)
- **Standardized date formats** (YYYY-MM-DD)
- **Clean metadata structure** for all search endpoints
- **Null-safe fields** (missing data returns `null` instead of causing errors)

This normalization layer simplifies frontend development and ensures a uniform developer experience.

---

## 🔗 Base URL

```
http://localhost:8000/proxy/
```

**Production:** Replace with your deployed domain.

---

## 🔐 Authentication

**Current:** No authentication required. All endpoints are publicly accessible.

**Future:** User authentication will be required for:
- Call proxy endpoints
- Creating and managing lists
- Saving favorites
- Rating and reviewing content
- Social features

---

## ⚠️ Error Handling

All endpoints follow a consistent error response format:

### Error Response Structure

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error description"
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `TIMEOUT` | 504 | Request to external API timed out |
| `CONNECTION_ERROR` | 503 | Failed to connect to external API |
| `RESPONSE_NOT_JSON` | 502 | External API returned non-JSON response |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |
| `MISSING_QUERY` | 400 | Required query parameter is missing |
| `MISSING_PARAMETER` | 400 | Required parameter is missing |
| `INVALID_PARAMETER` | 400 | Parameter value is invalid |
| `RESOURCE_NOT_FOUND` | 404 | Requested resource not found |
| `UNAUTHORIZED` | 401 | Authentication required or invalid |
| `FORBIDDEN` | 403 | Access to resource is forbidden |
| `RATE_LIMIT_EXCEEDED` | 429 | API rate limit exceeded |

### Error Examples

**Missing Query Parameter:**
```json
{
  "error": "MISSING_QUERY",
  "message": "Query parameter is required"
}
```

**Timeout:**
```json
{
  "error": "TIMEOUT",
  "message": "Request to external API timed out"
}
```

---

## 🎬 Video (Movies & TV Shows)

Powered by **The Movie Database (TMDB)**

### Search Movies and TV Shows

Search for movies and TV shows by title.

**Endpoint:** `GET /proxy/video/search`

**Query Parameters:**
- `query` (required) - Search term
- `page` (optional) - Page number for pagination (default: 1)

**Example Request:**
```bash
GET /proxy/video/search?query=kimetsu&page=1
```

**Example Response:**
```json
{
  "metadata": {
    "page": 1,
    "page_results": 2,
    "total_pages": 5,
    "total_results": 48
  },
  "results": [
    {
      "id": 85937,
      "type": "tv",
      "title": "Demon Slayer: Kimetsu no Yaiba",
      "original_title": "鬼滅の刃",
      "description": "It is the Taisho Period in Japan...",
      "image_url": "https://image.tmdb.org/t/p/w500/wrCVHI5ErwXKGTeYIujENqiKLn3.jpg",
      "release_date": "2019-04-06"
    },
    {
      "id": 1311031,
      "type": "movie",
      "title": "Demon Slayer: Kimetsu no Yaiba -To the Hashira Training-",
      "original_title": "鬼滅の刃 絆の奇跡、そして柱稽古へ",
      "description": "A compilation film featuring the eleventh episode...",
      "image_url": "https://image.tmdb.org/t/p/w500/iSMiF6DklX2aL9WVaNYfhFytwL4.jpg",
      "release_date": "2024-02-02"
    }
  ]
}
```

---

### Get Movie Details

Retrieve detailed information about a specific movie.

**Endpoint:** `GET /proxy/video/movie/{movie_id}`

**Path Parameters:**
- `movie_id` (required) - TMDB movie ID

**Example Request:**
```bash
GET /proxy/video/movie/1311031
```

**Example Response:**
```json
{
  "id": 1311031,
  "title": "Demon Slayer: Kimetsu no Yaiba -To the Hashira Training-",
  "original_title": "鬼滅の刃 絆の奇跡、そして柱稽古へ",
  "description": "A compilation film featuring the eleventh episode of the Swordsmith Village Arc...",
  "image_url": "https://image.tmdb.org/t/p/w500/iSMiF6DklX2aL9WVaNYfhFytwL4.jpg",
  "release_date": "2024-02-02",
  "duration_minutes": 110,
  "status": "Released"
}
```

---

### Get TV Show Details

Retrieve detailed information about a specific TV show.

**Endpoint:** `GET /proxy/video/tv/{tv_id}`

**Path Parameters:**
- `tv_id` (required) - TMDB TV show ID

**Example Request:**
```bash
GET /proxy/video/tv/85937
```

**Example Response:**
```json
{
  "id": 85937,
  "title": "Demon Slayer: Kimetsu no Yaiba",
  "original_title": "鬼滅の刃",
  "description": "It is the Taisho Period in Japan. Tanjiro, a kindhearted boy who sells charcoal for a living...",
  "image_url": "https://image.tmdb.org/t/p/w500/wrCVHI5ErwXKGTeYIujENqiKLn3.jpg",
  "release_date": "2019-04-06",
  "status": "Returning Series",
  "number_of_seasons": 5,
  "number_of_episodes": 67,
  "seasons": [
    {
      "id": 118399,
      "season_number": 1,
      "title": "Season 1",
      "description": "It is the Taisho Period in Japan...",
      "release_date": "2019-04-06",
      "image_url": "https://image.tmdb.org/t/p/w500/vHRYk7oLYWgGM6mBAX40qYFYvCf.jpg",
      "number_of_episodes": 26
    },
    {
      "id": 135096,
      "season_number": 2,
      "title": "Entertainment District Arc",
      "description": "Tanjiro and his comrades embark on a new mission...",
      "release_date": "2021-12-05",
      "image_url": "https://image.tmdb.org/t/p/w500/6yqB8qKzSK4lruCx7COVyKFOBVS.jpg",
      "number_of_episodes": 11
    }
  ]
}
```

---

### Get TV Season Details

Retrieve detailed information about a specific season of a TV show.

**Endpoint:** `GET /proxy/video/tv/{tv_id}/season/{season_number}`

**Path Parameters:**
- `tv_id` (required) - TMDB TV show ID
- `season_number` (required) - Season number

**Example Request:**
```bash
GET /proxy/video/tv/85937/season/1
```

**Example Response:**
```json
{
  "id": 118399,
  "season_number": 1,
  "title": "Season 1",
  "description": "It is the Taisho Period in Japan. Tanjiro, a kindhearted boy...",
  "release_date": "2019-04-06",
  "image_url": "https://image.tmdb.org/t/p/w500/vHRYk7oLYWgGM6mBAX40qYFYvCf.jpg",
  "number_of_episodes": 26,
  "episodes": [
    {
      "id": 1551914,
      "episode_number": 1,
      "season_number": 1,
      "episode_type": "standard",
      "title": "Cruelty",
      "description": "Since ancient times, rumors have abounded of man-eating demons...",
      "release_date": "2019-04-06",
      "duration_minutes": 24,
      "image_url": "https://image.tmdb.org/t/p/w500/oHPf5AM5ySGKkbZJQQ8KxF5h9xY.jpg"
    },
    {
      "id": 1551915,
      "episode_number": 2,
      "season_number": 1,
      "episode_type": "standard",
      "title": "Trainer Sakonji Urokodaki",
      "description": "Tanjiro sets out on the road to become a demon slayer...",
      "release_date": "2019-04-13",
      "duration_minutes": 24,
      "image_url": "https://image.tmdb.org/t/p/w500/2lMdLXQLxcbGqJ3mFIYE8xBz7G8.jpg"
    }
  ]
}
```

---

## 🎵 Music

Powered by **Spotify Web API**

### Search Music

Search for artists, albums, tracks, or playlists on Spotify.

**Endpoint:** `GET /proxy/music/search`

**Query Parameters:**
- `query` (required) - Search term
- `limit` (optional) - Number of results (1-50, default: 20)
- `offset` (optional) - Offset for pagination (default: 0)
- `min_tracks` (optional) - Minimum number of tracks to filter albums (default: 4)

**Example Request:**
```bash
GET /proxy/music/search?query=kayne&limit=10
```

**Example Response:**
```json
{
  "metadata": {
    "page": 1,
    "page_results": 10,
    "total_pages": 15,
    "total_results": 296
  },
  "results": [
    {
      "id": "7ycBtnsMtyVbbwTfJwRjSP",
      "type": "album",
      "title": "Graduation",
      "authors": ["Kanye West"],
      "image_url": "https://i.scdn.co/image/ab67616d0000b2732c6ce1cbb235c45f8ded730b",
      "release_date": "2007-09-11",
      "total_tracks": 13,
      "album_type": "album",
      "external_url": "https://open.spotify.com/album/7ycBtnsMtyVbbwTfJwRjSP"
    },
    {
      "id": "2Ek1q2haOnxVqhvVKqMvJe",
      "type": "album",
      "title": "Late Registration",
      "authors": ["Kanye West"],
      "image_url": "https://i.scdn.co/image/ab67616d0000b273428d2255141c2119409a31b2",
      "release_date": "2005-08-30",
      "total_tracks": 21,
      "album_type": "album",
      "external_url": "https://open.spotify.com/album/2Ek1q2haOnxVqhvVKqMvJe"
    }
  ]
}
```

---

### Get Album Details

Retrieve detailed information about a specific album.

**Endpoint:** `GET /proxy/music/{album_id}`

**Path Parameters:**
- `album_id` (required) - Spotify album ID

**Example Request:**
```bash
GET /proxy/music/7ycBtnsMtyVbbwTfJwRjSP
```

**Example Response:**
```json
{
  "id": "7ycBtnsMtyVbbwTfJwRjSP",
  "title": "Graduation",
  "authors": ["Kanye West"],
  "image_url": "https://i.scdn.co/image/ab67616d0000b2732c6ce1cbb235c45f8ded730b",
  "release_date": "2007-09-11",
  "total_tracks": 13,
  "album_type": "album",
  "external_url": "https://open.spotify.com/album/7ycBtnsMtyVbbwTfJwRjSP",
  "tracks": [
    {
      "id": "2bzbPbLbq3OdYXlCMxKuni",
      "title": "Good Morning",
      "authors": ["Kanye West"],
      "track_number": 1,
      "duration_seconds": 193,
      "external_url": "https://open.spotify.com/track/2bzbPbLbq3OdYXlCMxKuni"
    },
    {
      "id": "0j2T0R9dR9qdJYsB7ciXhf",
      "title": "Champion",
      "authors": ["Kanye West"],
      "track_number": 2,
      "duration_seconds": 167,
      "external_url": "https://open.spotify.com/track/0j2T0R9dR9qdJYsB7ciXhf"
    },
    {
      "id": "32OlwWuMpZ6b0aN2RZOeMS",
      "title": "Stronger",
      "authors": ["Kanye West"],
      "track_number": 3,
      "duration_seconds": 311,
      "external_url": "https://open.spotify.com/track/32OlwWuMpZ6b0aN2RZOeMS"
    }
  ]
}
```

---

## 🎮 Games

Powered by **IGDB (Internet Game Database)**

### Search Games

Search for video games by title.

**Endpoint:** `GET /proxy/game/search`

**Query Parameters:**
- `query` (required) - Search term
- `limit` (optional) - Number of results (1-500, default: 50)
- `page` (optional) - Page number for pagination (default: 1)

**Example Request:**
```bash
GET /proxy/game/search?query=red%20dead&limit=5
```

**Example Response:**
```json
{
  "metadata": {
    "page": 1,
    "page_results": 5,
    "total_pages": 2,
    "total_results": null
  },
  "results": [
    {
      "id": 25076,
      "title": "Red Dead Redemption 2",
      "type": "Main game",
      "release_date": "2018-10-26",
      "description": "America, 1899. The end of the Wild West era has begun...",
      "image_url": "https://images.igdb.com/igdb/image/upload/t_720p/co1q1f.jpg",
      "authors": ["Rockstar Games"],
      "platforms": [
        "PC (Microsoft Windows)",
        "PlayStation 4",
        "Xbox One",
        "PlayStation 5",
        "Xbox Series X|S"
      ]
    },
    {
      "id": 421,
      "title": "Red Dead Redemption",
      "type": "Main game",
      "release_date": "2010-05-18",
      "description": "A former outlaw is forced by the federal government to hunt down the members of his old gang...",
      "image_url": "https://images.igdb.com/igdb/image/upload/t_720p/co1x7v.jpg",
      "authors": ["Rockstar San Diego"],
      "platforms": [
        "PlayStation 3",
        "Xbox 360",
        "PlayStation 4",
        "Nintendo Switch"
      ]
    }
  ]
}
```

---

## 📚 Books

Powered by **OpenLibrary API**

### Search Books

Search for books by title, author, or ISBN.

**Endpoint:** `GET /proxy/book/search`

**Query Parameters:**
- `query` (required) - Search term (title, author, or ISBN)
- `limit` (optional) - Number of results (default: 50)
- `page` (optional) - Page number for pagination (default: 1)

**Example Request:**
```bash
GET /proxy/book/search?query=chainsaw&limit=5
```

**Example Response:**
```json
{
  "metadata": {
    "page": 1,
    "page_results": 5,
    "total_pages": 32,
    "total_results": 157
  },
  "results": [
    {
      "id": "OL28346580W",
      "title": "Chainsaw Man, Vol. 1",
      "authors": ["Tatsuki Fujimoto"],
      "image_url": "https://covers.openlibrary.org/b/id/10401782-L.jpg",
      "release_date": "2020",
      "pages": 192,
      "description": "Denji's a poor young man who'll do anything for a bit of cash..."
    },
    {
      "id": "OL24989973W",
      "title": "The Texas Chain Saw Massacre Companion",
      "authors": ["Stefan Jaworzyn"],
      "image_url": "https://covers.openlibrary.org/b/id/8257715-L.jpg",
      "release_date": "2004-01-01",
      "pages": 160,
      "description": "The definitive book on the making of the classic horror film..."
    }
  ]
}
```

**Cover Image URL Format:**
```
https://covers.openlibrary.org/b/id/{cover_i}-L.jpg
```
Size options: S (small), M (medium), L (large)

---

## 🔄 Pagination

All search endpoints return a consistent pagination structure:

**Pagination Parameters:**
- **Video & Books:** `page` (page number) and `limit` (results per page)
- **Music:** `limit` (results per page) and `offset` (starting position)
- **Games:** `page` (page number) and `limit` (results per page)

**Response Metadata:**
All search endpoints return pagination metadata:
```json
{
  "metadata": {
    "page": 1,
    "page_results": 10,
    "total_pages": 5,
    "total_results": 48
  },
  "results": [...]
}
```

**Examples:**
```bash
GET /proxy/video/search?query=Star%20Wars&page=2&limit=20
GET /proxy/music/search?query=Beatles&limit=20&offset=20
GET /proxy/game/search?query=Mario&page=2&limit=50
GET /proxy/book/search?query=Tolkien&page=3&limit=10
```

---

## 📊 Rate Limits

The API respects rate limits of the underlying services:

- **TMDB:** 40 requests per 10 seconds
- **IGDB:** 4 requests per second
- **Spotify:** Variable based on token
- **OpenLibrary:** Generally unlimited but respectful usage encouraged

If you hit a rate limit, you'll receive a `429 RATE_LIMIT_EXCEEDED` error.

---

## 🌍 Image URLs

All media endpoints return pre-processed image URLs ready to use. The API automatically handles URL construction and size optimization.

### TMDB Images (Video)
Images are returned as full URLs with optimized sizes:
```
Example: https://image.tmdb.org/t/p/w500/wrCVHI5ErwXKGTeYIujENqiKLn3.jpg
```
- **Posters/Covers:** w500 size (optimized for display)
- **Episode Stills:** w500 size

### IGDB Images (Games)
Images are returned as HTTPS URLs with 720p resolution:
```
Example: https://images.igdb.com/igdb/image/upload/t_720p/co1q1f.jpg
```
- Automatically converted from protocol-relative URLs
- Optimized to t_720p size for quality and performance

### OpenLibrary Covers (Books)
Cover URLs use the large (L) size by default:
```
Example: https://covers.openlibrary.org/b/id/10401782-L.jpg
```
- Format: `https://covers.openlibrary.org/b/id/{cover_id}-L.jpg`
- Size: L (large) for best quality

### Spotify Images (Music)
Full image URLs are provided directly from Spotify:
```
Example: https://i.scdn.co/image/ab67616d0000b2732c6ce1cbb235c45f8ded730b
```
- Usually the highest resolution available
- No additional processing needed

---

## 🚀 Future Endpoints (Coming Soon)

### User Authentication
```
POST /auth/register
POST /auth/login
POST /auth/logout
GET  /auth/me
```

### Lists Management
```
GET    /lists/
POST   /lists/
GET    /lists/{id}
PUT    /lists/{id}
DELETE /lists/{id}
POST   /lists/{id}/items
DELETE /lists/{id}/items/{item_id}
```

### Social Features
```
POST /items/{id}/rate
POST /items/{id}/comment
POST /items/{id}/mark-watched
GET  /items/{id}/reviews
```

---

## 💡 Tips & Best Practices

1. **Always handle errors gracefully** - All errors follow the consistent format: `{ "error": "CODE", "message": "description" }`
2. **Cache responses** - Reduce unnecessary API calls and improve performance
3. **Use specific queries** - More precise searches yield better results
4. **Respect rate limits** - Implement exponential backoff for retries (429 errors)
5. **Store media IDs** - Use IDs from search results to fetch detailed information later
6. **Images are pre-optimized** - All image URLs are ready to use with optimal sizes
7. **Handle pagination** - Always check `metadata.total_pages` to navigate through results
8. **Consistent response structure** - All search endpoints use the same `metadata` + `results` format
9. **Filter music results** - Use `min_tracks` parameter to filter out singles/EPs
10. **Type awareness** - Video search returns both movies and TV shows (check the `type` field)

---

## 📧 Support

For questions, issues, or feature requests:
- Open an issue on GitHub
- Check existing documentation
- Review error messages carefully

---

## 🔄 Changelog

### Version 1.0.0 (Current - 2025-10-26)
- Initial proxy API implementation
- Video search and details (TMDB)
- Music search and album details (Spotify)
- Game search (IGDB)
- Book search (OpenLibrary)
- Comprehensive error handling
- CORS support
