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
python3 -m venv .venv
source .venv/bin/activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Set up environment variables**

Create a `.env` file in the project root:
```env
SECRET_KEY=tu-clave-secreta-super-segura-aqui
DEBUG=False
ALLOWED_HOSTS=tu-app.railway.app,tu-dominio-personalizado.com

PGDATABASE=${{Postgres.PGDATABASE}}
PGUSER=${{Postgres.PGUSER}}
PGPASSWORD=${{Postgres.PGPASSWORD}}
PGHOST=${{Postgres.PGHOST}}
PGPORT=${{Postgres.PGPORT}}

CORS_ALLOWED_ORIGINS=https://tu-frontend.vercel.app,https://otro-dominio.com

TMDB_API_KEY=tu_tmdb_api_key
IGDB_CLIENT_ID=tu_igdb_client_id
IGDB_CLIENT_SECRET=tu_igdb_client_secret
SPOTIFY_CLIENT_ID=tu_spotify_client_id
SPOTIFY_CLIENT_SECRET=tu_spotify_client_secret
OPENLIBRARY_USER_AGENT=DennAPI/1.0 (tu-email@example.com)
```

5. **Run migrations**
```bash
./.venv/bin/python manage.py migrate
```

6. **Create a superuser (optional)**
```bash
./.venv/bin/python manage.py createsuperuser
```

7. **Start the development server**
```bash
./.venv/bin/python manage.py runserver
```

### Tests

```bash
./.venv/bin/python manage.py test
```

The API will be available at `http://localhost:8000`

---

## 📖 API Documentation

For detailed API endpoints, request/response examples, and integration guides, see [API_REFERENCE.md](./API_REFERENCE.md).

### Health Check

**Check API status:**
```bash
GET http://localhost:8000/
```
Response:
```json
{
  "status": "healthy",
  "service": "Denn API",
  "version": "2.0"
}
```

### Quick Examples

**Search for movies:**
```bash
GET http://localhost:8000/api/proxy/video/search?query=Kimetsu
```

**Get album details:**
```bash
GET http://localhost:8000/api/proxy/music/7ycBtnsMtyVbbwTfJwRjSP
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

## 🚀 Despliegue en Producción

### Railway (Recomendado)

Este proyecto está completamente preparado para desplegarse en [Railway](https://railway.app/) con PostgreSQL.

**Inicio Rápido (5 minutos):**
1. Sube tu código a GitHub
2. Crea un proyecto en Railway desde tu repositorio
3. Agrega PostgreSQL al proyecto
4. Configura las variables de entorno (ver `ENV_VARIABLES.md`)
5. ¡Listo! Railway desplegará automáticamente

📖 **Guías detalladas:**
- [🚀 Inicio Rápido (5 pasos)](./DEPLOY_QUICK_START.md)
- [📚 Guía Completa de Despliegue](./RAILWAY_DEPLOYMENT_GUIDE.md)
- [🔐 Variables de Entorno](./ENV_VARIABLES.md)

### Características de Producción

✅ **Listo para producción:**
- Servidor Gunicorn
- Archivos estáticos con Whitenoise
- Base de datos PostgreSQL
- Configuración dual (desarrollo/producción)
- Migraciones automáticas
- Health checks configurados
- Variables de entorno seguras

---

## 👤 Authors

- [Emmanuel López - @emlopezr](https://github.com/emlopezr)
- [Emmanuel Arizabaleta - @imEag](https://github.com/imEag)

---

## 🙏 Acknowledgments

- [The Movie Database (TMDB)](https://www.themoviedb.org/) for movie and TV data
- [IGDB](https://www.igdb.com/) for video game information
- [Spotify](https://www.spotify.com/) for music data
- [OpenLibrary](https://openlibrary.org/) for book information
