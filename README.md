# 📜 Denn API

![Python](https://img.shields.io/badge/Python-FFD43B?style=for-the-badge&logo=python&logoColor=blue)
![Django](https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=green)
![Postgres](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![TMDB](https://img.shields.io/badge/TMDB-01B4E4?style=for-the-badge&logo=themoviedatabase&logoColor=white)
![IGDB](https://img.shields.io/badge/IGDB-9147FF?style=for-the-badge&logo=twitch&logoColor=white)
![Spotify](https://img.shields.io/badge/Spotify-1ED760?style=for-the-badge&logo=spotify&logoColor=white)
![OpenLibrary](https://img.shields.io/badge/OpenLibrary-4B8BBE?style=for-the-badge&logo=bookstack&logoColor=white)

A secure, centralized API gateway for managing multi-media content. Protect your API keys while accessing movies, TV shows, music, games, and books through a single unified interface.

---

## 🚀 Features

### Current Features (Proxy API)
- **🔒 Secure API Proxy:** Hide external API keys from frontend applications by routing all requests through the backend
- **🎬 Movies & TV Shows:** Integration with The Movie Database (TMDB) for comprehensive video content
- **🎮 Video Games:** Access to IGDB (Internet Game Database) for game information
- **🎵 Music:** Spotify API integration for music discovery and album details
- **📚 Books:** OpenLibrary integration for book search and information
- **⚡ Unified Interface:** Consistent API structure across all media types
- **🛡️ Error Handling:** Robust error management with detailed responses
- **🔄 CORS Support:** Configured for seamless frontend integration

### Coming Soon
- **👥 User Management:** Registration, authentication, and user profiles
- **📋 Custom Lists:** Create, organize, and share personalized media collections
- **💬 Social Features:** Ratings, comments, and "watched/played/read" status tracking
- **🗄️ Data Persistence:** Store user-generated content and preferences
- **📊 Analytics:** Track usage patterns and popular content
- **⚡ Caching Layer:** Improved performance and reduced external API calls

---

## 🛠️ Tech Stack

- **Backend Framework:** Django
- **API Framework:** Django REST Framework
- **Database:** PostgreSQL / SQLite _(development)_
- **HTTP Client:** Python Requests
- **Environment Management:** python-dotenv
- **CORS Handling:** django-cors-headers

### External API Integrations
- **TMDB (The Movie Database)** - Movies & TV Shows
- **IGDB (Internet Game Database)** - Video Games
- **Spotify Web API** - Music & Albums
- **OpenLibrary API** - Books & Literature

---

## 📦 Getting Started

### Prerequisites
- Python 3.10+
- pip (Python package manager)
- API keys for:
  - [TMDB API](https://www.themoviedb.org/settings/api)
  - [IGDB/Twitch](https://api-docs.igdb.com/#getting-started)
  - [Spotify](https://developer.spotify.com/dashboard)
  - OpenLibrary (User-Agent string)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/...
cd api/core
```

2. **Create a virtual environment**
```bash
python -m venv venv
source venv/bin/activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Set up environment variables**

Create a `.env` file in the project root:
```env
# Django Configuration
SECRET_KEY=your-super-secret-key-here

# TMDB Configuration
TMDB_API_KEY=your_tmdb_api_key

# IGDB Configuration
IGDB_CLIENT_ID=your_igdb_client_id
IGDB_CLIENT_SECRET=your_igdb_client_secret

# Spotify Configuration
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

# OpenLibrary Configuration
OPENLIBRARY_USER_AGENT=YourAppName/1.0 (your-email@example.com)
```

5. **Run migrations**
```bash
python manage.py migrate
```

6. **Create a superuser (optional)**
```bash
python manage.py createsuperuser
```

7. **Start the development server**
```bash
python manage.py runserver
```

The API will be available at `http://localhost:8000`

---

## 📖 API Documentation

For detailed API endpoints, request/response examples, and integration guides, see [API_REFERENCE.md](./API_REFERENCE.md).

### Quick Example

**Search for movies:**
```bash
GET http://localhost:8000/proxy/video/search?query=Kimetsu
```

**Get album details:**
```bash
GET http://localhost:8000/proxy/music/7ycBtnsMtyVbbwTfJwRjSP
```

## 🔐 Security Features

- **API Key Protection:** All external API keys are stored server-side and never exposed to clients _(backend-for-frontend)_
- **CORS Configuration:** Controlled cross-origin access for authorized frontends
- **Environment Variables:** Sensitive data managed through `.env` files
- **Request Validation:** Input sanitization and parameter validation
- **Error Masking:** Internal errors don't leak sensitive information

### Adding New External APIs

1. Create a new client in `proxy/clients/`
2. Add configuration to `PROXY_API` in `settings.py`
3. Create views in `proxy/views/`
4. Register URLs in `proxy/urls/`

---

## 📝 Environment Setup Guide

### Development
- DEBUG enabled
- SQLite database
- Detailed error messages
- CORS permissive for localhost

### Production (Recommended)
- Set `DEBUG = False`
- Use PostgreSQL or similar production database
- Configure proper `ALLOWED_HOSTS`
- Use environment-specific secret keys
- Enable HTTPS
- Configure proper CORS origins

---

## 👤 Author

[Emmanuel López - @emlopezr](https://github.com/emlopezr)

---

## 🙏 Acknowledgments

- [The Movie Database (TMDB)](https://www.themoviedb.org/) for movie and TV data
- [IGDB](https://www.igdb.com/) for video game information
- [Spotify](https://www.spotify.com/) for music data
- [OpenLibrary](https://openlibrary.org/) for book information
