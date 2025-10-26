# 🚀 Quick Start Guide

## Opción 1: Setup Automático (Recomendado)

### Linux/Mac:
```bash
# 1. Hacer ejecutable el script
chmod +x quick_start.sh

# 2. Ejecutar
./quick_start.sh

# 3. Crear superusuario
py manage.py createsuperuser

# 4. Iniciar servidor
py manage.py runserver
```

### Windows:
```bash
# Doble clic en quick_start.bat o ejecutar:
quick_start.bat

# Luego crear superusuario:
py manage.py createsuperuser

# Iniciar servidor:
py manage.py runserver
```

## Opción 2: Setup Manual

```bash
# 1. Copiar .env.example a .env
cp .env.example .env
# Editar .env y añadir tus API keys

# 2. Instalar dependencias
pip install -r requirements.txt

# 3. Crear y aplicar migraciones
py manage.py makemigrations
py manage.py migrate

# 4. Crear superusuario
py manage.py createsuperuser

# 5. Iniciar servidor
py manage.py runserver
```

## 📝 Obtener API Keys

### TMDB (Películas y Series)
1. Registrarse en https://www.themoviedb.org
2. Ir a Settings → API
3. Copiar la "API Key (v3 auth)"

### IGDB (Videojuegos)
1. Crear cuenta en https://dev.twitch.tv
2. Ir a Console → Applications
3. Crear nueva app
4. Copiar Client ID y Client Secret

### Spotify (Música)
1. Ir a https://developer.spotify.com/dashboard
2. Crear una app
3. Copiar Client ID y Client Secret

### OpenLibrary (Libros)
- No requiere API key
- Solo necesitas un User-Agent personalizado

## 🧪 Probar la API

### 1. Registrar usuario:
```bash
curl -X POST http://localhost:8000/api/auth/registration/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Test123456!",
    "password_confirm": "Test123456!"
  }'
```

### 2. Guardar el token:
```bash
export TOKEN="el_access_token_que_recibes"
```

### 3. Crear una lista:
```bash
curl -X POST http://localhost:8000/api/lists/ \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mi Primera Lista",
    "list_type": "PERSONAL"
  }'
```

### 4. Añadir contenido:
```bash
curl -X POST http://localhost:8000/api/lists/1/items/ \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "source_api": "tmdb",
    "external_id": "550",
    "content_type": "MOVIE"
  }'
```

## 📚 Documentación Completa

Para ver todos los endpoints disponibles, consulta: **SETUP_AND_USAGE.md**

## 🐛 Problemas Comunes

### "No module named 'dotenv'"
```bash
pip install python-dotenv
```

### "No such table: auth_user"
```bash
py manage.py migrate
```

### "SECRET_KEY not found"
- Asegúrate de tener el archivo .env en la raíz del proyecto
- Verifica que contenga todas las variables necesarias

## 🎯 Accesos

- **API Base**: http://localhost:8000
- **Admin Panel**: http://localhost:8000/admin
- **API Docs**: Consulta SETUP_AND_USAGE.md

## 🔐 Credenciales de Admin

Después de ejecutar `py manage.py createsuperuser`:
- Username: `admin` (o el que elijas)
- Password: (la que definas)

Accede al panel de admin en: http://localhost:8000/admin

