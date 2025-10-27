# Guía Completa: Setup y Uso de la API

## 📋 Prerrequisitos

- Python 3.8+
- pip
- Virtualenv (recomendado)

## 🚀 Paso 1: Setup Inicial

### 1.1 Crear y activar entorno virtual

```bash
# Linux/Mac
cd /home/perso/proyectos/dennv2/api/core
python3 -m venv venv
source venv/bin/activate

# Windows
python -m venv venv
venv\Scripts\activate
```

### 1.2 Instalar dependencias

```bash
pip install -r requirements.txt
```

### 1.3 Configurar variables de entorno

Crea un archivo `.env` en el directorio `/home/perso/proyectos/dennv2/api/core/`:

```bash
# .env
SECRET_KEY=tu-clave-secreta-aqui-generala-con-django

# TMDB API
TMDB_API_KEY=tu_tmdb_api_key

# IGDB API (Twitch)
IGDB_CLIENT_ID=tu_igdb_client_id
IGDB_CLIENT_SECRET=tu_igdb_client_secret

# Spotify API
SPOTIFY_CLIENT_ID=tu_spotify_client_id
SPOTIFY_CLIENT_SECRET=tu_spotify_client_secret

# OpenLibrary
OPENLIBRARY_USER_AGENT=MyApp/1.0 (your@email.com)
```

Para generar el `SECRET_KEY`:
```bash
py -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

## 🗄️ Paso 2: Crear las Tablas de la Base de Datos

### 2.1 Crear migraciones

```bash
py manage.py makemigrations
```

Deberías ver algo como:
```
Migrations for 'content':
  content/migrations/0001_initial.py
    - Create model ContentItem
    - Create model UserList
    - Create model Rating
    - Create model ListItem
```

### 2.2 Aplicar migraciones

```bash
py manage.py migrate
```

Esto creará todas las tablas:
```
Running migrations:
  Applying contenttypes.0001_initial... OK
  Applying auth.0001_initial... OK
  Applying admin.0001_initial... OK
  ...
  Applying content.0001_initial... OK
```

### 2.3 Crear superusuario (para acceder al admin)

```bash
py manage.py createsuperuser
```

Ingresa:
- Username: `admin`
- Email: `admin@example.com`
- Password: `admin123` (usa una contraseña segura en producción)

## 🏃 Paso 3: Correr el Servidor

```bash
py manage.py runserver
```

El servidor estará disponible en: `http://localhost:8000`

Panel de administración: `http://localhost:8000/admin`

---

## 🧪 Paso 4: Probar los Endpoints con cURL

### Variables de entorno para los ejemplos

```bash
# Linux/Mac
export API_URL="http://localhost:8000"
export TOKEN=""  # Se llenará después del registro/login

# Windows (PowerShell)
$API_URL="http://localhost:8000"
$TOKEN=""  # Se llenará después del registro/login
```

---

## 🔐 AUTENTICACIÓN (`/api/auth/`)

### 1. Registro de Usuario

```bash
curl -X POST "${API_URL}/api/auth/registration/" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john",
    "email": "john@example.com",
    "password": "SecurePass123!",
    "password_confirm": "SecurePass123!",
    "first_name": "John",
    "last_name": "Doe"
  }'
```

**Respuesta:**
```json
{
  "user": {
    "id": 1,
    "username": "john",
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe"
  },
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

**Guardar el token:**
```bash
# Linux/Mac
export TOKEN="eyJ0eXAiOiJKV1QiLCJhbGc..."

# Windows (PowerShell)
$TOKEN="eyJ0eXAiOiJKV1QiLCJhbGc..."
```

### 2. Login

```bash
curl -X POST "${API_URL}/api/auth/login/" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john",
    "password": "SecurePass123!"
  }'
```

**Respuesta:**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": 1,
    "username": "john",
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

### 3. Obtener Usuario Actual

```bash
curl -X GET "${API_URL}/api/auth/user/" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 4. Logout

```bash
curl -X POST "${API_URL}/api/auth/logout/" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 5. Refresh Token

```bash
curl -X POST "${API_URL}/api/auth/token/refresh/" \
  -H "Content-Type: application/json" \
  -d '{
    "refresh": "tu_refresh_token_aqui"
  }'
```

### 6. Cambiar Contraseña

```bash
curl -X POST "${API_URL}/api/auth/password/change/" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "old_password": "SecurePass123!",
    "new_password1": "NewSecurePass456!",
    "new_password2": "NewSecurePass456!"
  }'
```

---

## 📝 GESTIÓN DE LISTAS (`/api/lists/`)

### 1. Crear Lista Personal

```bash
curl -X POST "${API_URL}/api/lists/" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mis Películas Favoritas",
    "description": "Películas que he visto y me encantaron",
    "list_type": "PERSONAL"
  }'
```

**Respuesta:**
```json
{
  "id": 1,
  "name": "Mis Películas Favoritas",
  "description": "Películas que he visto y me encantaron",
  "list_type": "PERSONAL",
  "owner": {
    "id": 1,
    "username": "john",
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe"
  },
  "member_count": 1,
  "item_count": 0,
  "created_at": "2024-10-26T10:30:00Z",
  "updated_at": "2024-10-26T10:30:00Z"
}
```

### 2. Crear Lista Compartida

```bash
curl -X POST "${API_URL}/api/lists/" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Películas para Ver en Familia",
    "description": "Lista compartida para decidir qué ver",
    "list_type": "SHARED"
  }'
```

### 3. Listar Mis Listas

```bash
curl -X GET "${API_URL}/api/lists/" \
  -H "Authorization: Bearer ${TOKEN}"
```

**Respuesta:**
```json
{
  "count": 2,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "Mis Películas Favoritas",
      "description": "Películas que he visto y me encantaron",
      "list_type": "PERSONAL",
      "owner": {...},
      "member_count": 1,
      "item_count": 0,
      "created_at": "2024-10-26T10:30:00Z",
      "updated_at": "2024-10-26T10:30:00Z"
    }
  ]
}
```

### 4. Ver Detalles de una Lista

```bash
curl -X GET "${API_URL}/api/lists/1/" \
  -H "Authorization: Bearer ${TOKEN}"
```

**Respuesta:**
```json
{
  "id": 1,
  "name": "Mis Películas Favoritas",
  "description": "Películas que he visto y me encantaron",
  "list_type": "PERSONAL",
  "owner": {...},
  "members": [{...}],
  "items": [],
  "created_at": "2024-10-26T10:30:00Z",
  "updated_at": "2024-10-26T10:30:00Z"
}
```

### 5. Actualizar Lista

```bash
curl -X PATCH "${API_URL}/api/lists/1/" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mis Películas Favoritas de Todos los Tiempos",
    "description": "Nueva descripción"
  }'
```

### 6. Eliminar Lista

```bash
curl -X DELETE "${API_URL}/api/lists/1/" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 7. Ver Estadísticas de Lista

```bash
curl -X GET "${API_URL}/api/lists/1/stats/" \
  -H "Authorization: Bearer ${TOKEN}"
```

**Respuesta:**
```json
{
  "total_items": 15,
  "pending_items": 8,
  "completed_items": 7,
  "member_count": 3,
  "content_types": {
    "MOVIE": 10,
    "TV_SHOW": 5
  }
}
```

---

## 📦 ÍTEMS DE LISTA (`/api/lists/{list_id}/items/`)

### 1. Añadir Película a Lista (TMDB)

```bash
curl -X POST "${API_URL}/api/lists/1/items/" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "source_api": "tmdb",
    "external_id": "550",
    "content_type": "MOVIE",
    "status": "PENDING",
    "notes": "Fight Club - Recomendada por María"
  }'
```

**Respuesta:**
```json
{
  "id": 1,
  "user_list": 1,
  "content_item": {
    "id": 1,
    "source_api": "tmdb",
    "external_id": "550",
    "content_type": "MOVIE",
    "created_at": "2024-10-26T10:40:00Z"
  },
  "added_by": {
    "id": 1,
    "username": "john",
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe"
  },
  "status": "PENDING",
  "added_at": "2024-10-26T10:40:00Z",
  "completed_at": null,
  "notes": "Fight Club - Recomendada por María"
}
```

### 2. Añadir Serie de TV

```bash
curl -X POST "${API_URL}/api/lists/1/items/" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "source_api": "tmdb",
    "external_id": "1396",
    "content_type": "TV_SHOW",
    "status": "PENDING"
  }'
```

### 3. Añadir Juego (IGDB)

```bash
curl -X POST "${API_URL}/api/lists/1/items/" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "source_api": "igdb",
    "external_id": "1942",
    "content_type": "GAME",
    "status": "PENDING"
  }'
```

### 4. Añadir Álbum (Spotify)

```bash
curl -X POST "${API_URL}/api/lists/1/items/" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "source_api": "spotify",
    "external_id": "4aawyAB9vmqN3uQ7FjRGTy",
    "content_type": "ALBUM",
    "status": "PENDING"
  }'
```

### 5. Añadir Libro (OpenLibrary)

```bash
curl -X POST "${API_URL}/api/lists/1/items/" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "source_api": "openlibrary",
    "external_id": "OL7353617M",
    "content_type": "BOOK",
    "status": "PENDING"
  }'
```

### 6. Listar Ítems de una Lista

```bash
curl -X GET "${API_URL}/api/lists/1/items/" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 7. Ver Detalles de un Ítem

```bash
curl -X GET "${API_URL}/api/lists/1/items/1/" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 8. Marcar Ítem como Completado

```bash
curl -X PATCH "${API_URL}/api/lists/1/items/1/" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "COMPLETED"
  }'
```

### 9. Actualizar Notas de un Ítem

```bash
curl -X PATCH "${API_URL}/api/lists/1/items/1/" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Vi esta película ayer, increíble!"
  }'
```

### 10. Eliminar Ítem de Lista

```bash
curl -X DELETE "${API_URL}/api/lists/1/items/1/" \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## 👥 MIEMBROS DE LISTA (`/api/lists/{list_id}/members/`)

### 1. Ver Miembros de una Lista

```bash
curl -X GET "${API_URL}/api/lists/2/members/" \
  -H "Authorization: Bearer ${TOKEN}"
```

**Respuesta:**
```json
{
  "owner": {
    "id": 1,
    "username": "john",
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe"
  },
  "members": [
    {
      "id": 1,
      "username": "john",
      "email": "john@example.com",
      "first_name": "John",
      "last_name": "Doe"
    }
  ]
}
```

### 2. Invitar Usuario por Username

```bash
curl -X POST "${API_URL}/api/lists/2/members/" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "maria"
  }'
```

**Respuesta:**
```json
{
  "detail": "Usuario maria añadido a la lista.",
  "member": {
    "id": 2,
    "username": "maria",
    "email": "maria@example.com",
    "first_name": "María",
    "last_name": "García"
  }
}
```

### 3. Invitar Usuario por Email

```bash
curl -X POST "${API_URL}/api/lists/2/members/" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "carlos@example.com"
  }'
```

### 4. Eliminar Miembro de Lista

```bash
curl -X DELETE "${API_URL}/api/lists/2/members/2/" \
  -H "Authorization: Bearer ${TOKEN}"
```

**Respuesta:**
```json
{
  "detail": "Usuario maria eliminado de la lista."
}
```

---

## 📨 INVITACIONES A LISTAS (`/api/content/invitations/`)

El nuevo sistema de invitaciones permite a los propietarios de listas compartidas enviar invitaciones que los usuarios deben aceptar o rechazar, en lugar de añadirlos directamente.

### 1. Enviar Invitación a Lista

```bash
curl -X POST "${API_URL}/api/content/lists/2/invitations/" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "maria"
  }'
```

**O por email:**
```bash
curl -X POST "${API_URL}/api/content/lists/2/invitations/" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "maria@example.com"
  }'
```

**Respuesta:**
```json
{
  "id": 1,
  "user_list": {
    "id": 2,
    "name": "Películas de Acción",
    "description": "Las mejores películas de acción",
    "list_type": "SHARED",
    "owner": {
      "id": 1,
      "username": "john",
      "email": "john@example.com",
      "first_name": "John",
      "last_name": "Doe"
    },
    "created_at": "2024-10-26T10:00:00Z",
    "updated_at": "2024-10-26T10:00:00Z"
  },
  "inviter": {
    "id": 1,
    "username": "john",
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe"
  },
  "invitee": {
    "id": 2,
    "username": "maria",
    "email": "maria@example.com",
    "first_name": "María",
    "last_name": "García"
  },
  "status": "PENDING",
  "created_at": "2024-10-26T12:00:00Z",
  "responded_at": null
}
```

### 2. Ver Invitaciones Recibidas

```bash
curl -X GET "${API_URL}/api/content/invitations/" \
  -H "Authorization: Bearer ${TOKEN}"
```

**Respuesta:**
```json
[
  {
    "id": 1,
    "user_list": {
      "id": 2,
      "name": "Películas de Acción",
      "list_type": "SHARED",
      "owner": {...}
    },
    "inviter": {
      "id": 1,
      "username": "john"
    },
    "invitee": {
      "id": 2,
      "username": "maria"
    },
    "status": "PENDING",
    "created_at": "2024-10-26T12:00:00Z",
    "responded_at": null
  }
]
```

### 3. Ver Invitaciones Enviadas

```bash
curl -X GET "${API_URL}/api/content/invitations/?sent=true" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 4. Filtrar Invitaciones por Estado

```bash
# Solo pendientes (único estado que existe, ya que las invitaciones se eliminan al aceptar/rechazar)
curl -X GET "${API_URL}/api/content/invitations/?status=PENDING" \
  -H "Authorization: Bearer ${TOKEN}"
```

> **Nota:** Las invitaciones solo tienen estado `PENDING` porque se eliminan automáticamente cuando son aceptadas o rechazadas.

### 5. Ver Invitaciones de una Lista (solo propietario)

```bash
curl -X GET "${API_URL}/api/content/invitations/?list_id=2" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 6. Aceptar Invitación

```bash
curl -X POST "${API_URL}/api/content/invitations/1/respond/" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "accept"
  }'
```

**Respuesta:**
```json
{
  "detail": "Invitation accepted. You are now a member of \"Películas de Acción\"."
}
```

> **Nota:** La invitación se elimina automáticamente después de ser aceptada.

### 7. Rechazar Invitación

```bash
curl -X POST "${API_URL}/api/content/invitations/1/respond/" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "reject"
  }'
```

**Respuesta:**
```json
{
  "detail": "Invitation rejected."
}
```

> **Nota:** La invitación se elimina automáticamente después de ser rechazada.

### 8. Cancelar Invitación Pendiente (solo quien invitó o propietario)

```bash
curl -X DELETE "${API_URL}/api/content/invitations/1/" \
  -H "Authorization: Bearer ${TOKEN}"
```

**Respuesta:**
```json
{
  "detail": "Invitation cancelled."
}
```

### 9. Ver Detalles de una Invitación

```bash
curl -X GET "${API_URL}/api/content/invitations/1/" \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## ⭐ CALIFICACIONES (`/api/ratings/`)

### Campos Cacheados en ContentItem

Los `ContentItem` ahora incluyen campos cacheados de calificaciones que se actualizan automáticamente:
- `rating_count`: Número total de calificaciones
- `average_rating`: Calificación promedio (de 0.5 a 10.0)

Estos campos aparecen en todas las respuestas de ContentItem:

```json
{
  "id": 1,
  "source_api": "tmdb",
  "external_id": "550",
  "content_type": "MOVIE",
  "rating_count": 15,
  "average_rating": 8.73,
  "created_at": "2024-10-26T10:40:00Z"
}
```

### 1. Crear Calificación

```bash
curl -X POST "${API_URL}/api/ratings/" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "source_api": "tmdb",
    "external_id": "550",
    "content_type": "MOVIE",
    "score": 9.5,
    "comment": "Una obra maestra del cine moderno. Cinematografía impecable y actuaciones soberbias."
  }'
```

**Respuesta:**
```json
{
  "id": 1,
  "user": {
    "id": 1,
    "username": "john",
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe"
  },
  "content_item": {
    "id": 1,
    "source_api": "tmdb",
    "external_id": "550",
    "content_type": "MOVIE",
    "created_at": "2024-10-26T10:40:00Z"
  },
  "score": 9.5,
  "comment": "Una obra maestra del cine moderno. Cinematografía impecable y actuaciones soberbias.",
  "created_at": "2024-10-26T12:00:00Z",
  "updated_at": "2024-10-26T12:00:00Z"
}
```

### 2. Listar Todas las Calificaciones

```bash
curl -X GET "${API_URL}/api/ratings/" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 3. Ver Detalles de una Calificación

```bash
curl -X GET "${API_URL}/api/ratings/1/" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 4. Filtrar Calificaciones por ContentItem

```bash
curl -X GET "${API_URL}/api/ratings/?content_item_id=1" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 5. Filtrar por Contenido Externo

```bash
curl -X GET "${API_URL}/api/ratings/?source_api=tmdb&external_id=550" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 6. Filtrar por Usuario

```bash
curl -X GET "${API_URL}/api/ratings/?user_id=1" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 7. Ver Estadísticas de Calificaciones

```bash
curl -X GET "${API_URL}/api/ratings/?source_api=tmdb&external_id=550&stats_only=true" \
  -H "Authorization: Bearer ${TOKEN}"
```

**Respuesta:**
```json
{
  "average_score": 8.7,
  "total_ratings": 12
}
```

### 8. Actualizar Calificación

```bash
curl -X PATCH "${API_URL}/api/ratings/1/" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "score": 10.0,
    "comment": "Después de verla de nuevo, es perfecta. 10/10."
  }'
```

### 9. Eliminar Calificación

```bash
curl -X DELETE "${API_URL}/api/ratings/1/" \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## 🎬 PROXY - VIDEO (TMDB) (`/proxy/video/`)

### 1. Buscar Películas

```bash
curl -X GET "${API_URL}/proxy/video/search?query=inception" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 2. Detalles de Película

```bash
curl -X GET "${API_URL}/proxy/video/movie/550" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 3. Detalles de Serie

```bash
curl -X GET "${API_URL}/proxy/video/tv/1396" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 4. Detalles de Temporada

```bash
curl -X GET "${API_URL}/proxy/video/tv/1396/season/1" \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## 🎮 PROXY - GAMES (IGDB) (`/proxy/game/`)

### 1. Buscar Juegos

```bash
curl -X GET "${API_URL}/proxy/game/search?query=zelda" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 2. Detalles de Juego

```bash
curl -X GET "${API_URL}/proxy/game/1942" \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## 🎵 PROXY - MUSIC (Spotify) (`/proxy/music/`)

### 1. Buscar Álbumes

```bash
curl -X GET "${API_URL}/proxy/music/search?query=taylor+swift" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 2. Detalles de Álbum

```bash
curl -X GET "${API_URL}/proxy/music/album/4aawyAB9vmqN3uQ7FjRGTy" \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## 📚 PROXY - BOOKS (OpenLibrary) (`/proxy/book/`)

### 1. Buscar Libros

```bash
curl -X GET "${API_URL}/proxy/book/search?query=harry+potter" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 2. Detalles de Libro

```bash
curl -X GET "${API_URL}/proxy/book/OL7353617M" \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## 🧪 Flujo Completo de Ejemplo

### Escenario: Usuario crea lista y añade contenido

```bash
# 1. Registrarse
curl -X POST "${API_URL}/api/auth/registration/" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Test123456!",
    "password_confirm": "Test123456!",
    "first_name": "Test",
    "last_name": "User"
  }'

# Guarda el token de la respuesta
export TOKEN="el_token_que_recibes"

# 2. Crear lista compartida
curl -X POST "${API_URL}/api/lists/" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Películas de Terror 2024",
    "description": "Las mejores películas de terror",
    "list_type": "SHARED"
  }'

# 3. Añadir película
curl -X POST "${API_URL}/api/lists/1/items/" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "source_api": "tmdb",
    "external_id": "550",
    "content_type": "MOVIE",
    "notes": "Fight Club"
  }'

# 4. Marcar como completada
curl -X PATCH "${API_URL}/api/lists/1/items/1/" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"status": "COMPLETED"}'

# 5. Calificar
curl -X POST "${API_URL}/api/ratings/" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "source_api": "tmdb",
    "external_id": "550",
    "content_type": "MOVIE",
    "score": 9.5,
    "comment": "¡Increíble!"
  }'
```

---

## 🐛 Solución de Problemas

### Error: "Authentication credentials were not provided"
- Asegúrate de incluir el header: `-H "Authorization: Bearer ${TOKEN}"`
- Verifica que el token no haya expirado (5 horas de vida)

### Error: "Given token not valid for any token type"
- El token ha expirado, usa el refresh token para obtener uno nuevo

### Error: "No such table"
- No has corrido las migraciones: `py manage.py migrate`

### Error: "UNIQUE constraint failed"
- Estás intentando crear un registro duplicado (ej: mismo username)

### Error de conexión
- Verifica que el servidor esté corriendo: `py manage.py runserver`

---

## 📊 Verificar Base de Datos

### Ver tablas creadas

```bash
py manage.py dbshell
```

```sql
.tables
-- Deberías ver:
-- auth_user, content_items, user_lists, list_items, ratings, etc.

-- Ver datos
SELECT * FROM content_items;
SELECT * FROM user_lists;
SELECT * FROM list_items;
SELECT * FROM ratings;

.exit
```

---

## 🎯 Tips Útiles

1. **Usar variables de entorno:**
   ```bash
   export API_URL="http://localhost:8000"
   export TOKEN="tu_token_aqui"
   ```

2. **Formatear respuestas JSON (opcional):**
   ```bash
   curl ... | python -m json.tool
   ```

3. **Guardar respuestas:**
   ```bash
   curl ... > response.json
   ```

4. **Ver headers de respuesta:**
   ```bash
   curl -i ...
   ```

5. **Modo verbose (debug):**
   ```bash
   curl -v ...
   ```

---

¡Listo! Ahora tienes una guía completa para usar toda la API 🚀

