# Ejemplos de Uso de la API

Este documento contiene ejemplos prácticos de cómo usar la API de gestión de contenido.

## Variables de Entorno

```bash
export API_URL="http://localhost:8000"
export ACCESS_TOKEN="tu_token_jwt_aqui"
```

## 1. Autenticación

### Registro de Usuario

```bash
curl -X POST "${API_URL}/api/auth/registration/" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "juan",
    "email": "juan@ejemplo.com",
    "password": "MiPassword123!",
    "password_confirm": "MiPassword123!",
    "first_name": "Juan",
    "last_name": "Pérez"
  }'
```

**Respuesta:**
```json
{
  "user": {
    "id": 1,
    "username": "juan",
    "email": "juan@ejemplo.com",
    "first_name": "Juan",
    "last_name": "Pérez"
  },
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### Login

```bash
curl -X POST "${API_URL}/api/auth/login/" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "juan",
    "password": "MiPassword123!"
  }'
```

**Respuesta:**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": 1,
    "username": "juan",
    "email": "juan@ejemplo.com",
    "first_name": "Juan",
    "last_name": "Pérez"
  }
}
```

### Refresh Token

```bash
curl -X POST "${API_URL}/api/auth/token/refresh/" \
  -H "Content-Type: application/json" \
  -d '{
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
  }'
```

### Logout

```bash
curl -X POST "${API_URL}/api/auth/logout/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

---

## 2. Gestión de Listas

### Crear Lista Personal

```bash
curl -X POST "${API_URL}/api/lists/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
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
    "username": "juan",
    "email": "juan@ejemplo.com",
    "first_name": "Juan",
    "last_name": "Pérez"
  },
  "member_count": 1,
  "item_count": 0,
  "created_at": "2024-10-26T10:30:00Z",
  "updated_at": "2024-10-26T10:30:00Z"
}
```

### Crear Lista Compartida

```bash
curl -X POST "${API_URL}/api/lists/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Películas para Ver en Familia",
    "description": "Lista compartida para decidir qué ver",
    "list_type": "SHARED"
  }'
```

### Listar Mis Listas

```bash
curl -X GET "${API_URL}/api/lists/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

**Respuesta:**
```json
{
  "count": 2,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 2,
      "name": "Películas para Ver en Familia",
      "description": "Lista compartida para decidir qué ver",
      "list_type": "SHARED",
      "owner": {...},
      "member_count": 1,
      "item_count": 0,
      "created_at": "2024-10-26T10:35:00Z",
      "updated_at": "2024-10-26T10:35:00Z"
    },
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

### Ver Detalles de una Lista

```bash
curl -X GET "${API_URL}/api/lists/1/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
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

### Actualizar Lista

```bash
curl -X PATCH "${API_URL}/api/lists/1/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mis Películas Favoritas de Todos los Tiempos"
  }'
```

### Eliminar Lista

```bash
curl -X DELETE "${API_URL}/api/lists/1/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

### Ver Estadísticas de Lista

```bash
curl -X GET "${API_URL}/api/lists/1/stats/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
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

## 3. Gestión de Ítems en Listas

### Añadir Película a Lista (usando ID de TMDB)

```bash
curl -X POST "${API_URL}/api/lists/1/items/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "source_api": "tmdb",
    "external_id": "550",
    "content_type": "MOVIE",
    "status": "PENDING",
    "notes": "Recomendada por María"
  }'
```

**Respuesta:**
```json
{
  "id": 1,
  "content_item": {
    "id": 1,
    "source_api": "tmdb",
    "external_id": "550",
    "content_type": "MOVIE",
    "created_at": "2024-10-26T10:40:00Z"
  },
  "added_by": {
    "id": 1,
    "username": "juan",
    "email": "juan@ejemplo.com",
    "first_name": "Juan",
    "last_name": "Pérez"
  },
  "status": "PENDING",
  "added_at": "2024-10-26T10:40:00Z",
  "completed_at": null,
  "notes": "Recomendada por María"
}
```

### Añadir Serie de TV

```bash
curl -X POST "${API_URL}/api/lists/1/items/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "source_api": "tmdb",
    "external_id": "1396",
    "content_type": "TV_SHOW",
    "status": "PENDING"
  }'
```

### Añadir Juego (usando ID de IGDB)

```bash
curl -X POST "${API_URL}/api/lists/2/items/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "source_api": "igdb",
    "external_id": "1942",
    "content_type": "GAME",
    "status": "PENDING"
  }'
```

### Listar Ítems de una Lista

```bash
curl -X GET "${API_URL}/api/lists/1/items/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

### Marcar Ítem como Completado

```bash
curl -X PATCH "${API_URL}/api/lists/1/items/1/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "COMPLETED"
  }'
```

**Respuesta:**
```json
{
  "id": 1,
  "content_item": {...},
  "added_by": {...},
  "status": "COMPLETED",
  "added_at": "2024-10-26T10:40:00Z",
  "completed_at": "2024-10-26T11:30:00Z",
  "notes": "Recomendada por María"
}
```

### Eliminar Ítem de Lista

```bash
curl -X DELETE "${API_URL}/api/lists/1/items/1/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

---

## 4. Gestión de Miembros (Listas Compartidas)

### Ver Miembros de una Lista

```bash
curl -X GET "${API_URL}/api/lists/2/members/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

**Respuesta:**
```json
{
  "owner": {
    "id": 1,
    "username": "juan",
    "email": "juan@ejemplo.com",
    "first_name": "Juan",
    "last_name": "Pérez"
  },
  "members": [
    {
      "id": 1,
      "username": "juan",
      "email": "juan@ejemplo.com",
      "first_name": "Juan",
      "last_name": "Pérez"
    }
  ]
}
```

### Invitar Usuario por Username

```bash
curl -X POST "${API_URL}/api/lists/2/members/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
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
    "email": "maria@ejemplo.com",
    "first_name": "María",
    "last_name": "García"
  }
}
```

### Invitar Usuario por Email

```bash
curl -X POST "${API_URL}/api/lists/2/members/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "carlos@ejemplo.com"
  }'
```

### Eliminar Miembro de Lista

```bash
curl -X DELETE "${API_URL}/api/lists/2/members/2/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

**Respuesta:**
```json
{
  "detail": "Usuario maria eliminado de la lista."
}
```

---

## 5. Gestión de Calificaciones

### Crear Calificación

```bash
curl -X POST "${API_URL}/api/ratings/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "source_api": "tmdb",
    "external_id": "550",
    "content_type": "MOVIE",
    "score": 9.5,
    "comment": "Una obra maestra del cine moderno. Cinematografía impecable."
  }'
```

**Respuesta:**
```json
{
  "id": 1,
  "user": {
    "id": 1,
    "username": "juan",
    "email": "juan@ejemplo.com",
    "first_name": "Juan",
    "last_name": "Pérez"
  },
  "content_item": {
    "id": 1,
    "source_api": "tmdb",
    "external_id": "550",
    "content_type": "MOVIE",
    "created_at": "2024-10-26T10:40:00Z"
  },
  "score": 9.5,
  "comment": "Una obra maestra del cine moderno. Cinematografía impecable.",
  "created_at": "2024-10-26T12:00:00Z",
  "updated_at": "2024-10-26T12:00:00Z"
}
```

### Listar Todas las Calificaciones

```bash
curl -X GET "${API_URL}/api/ratings/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

### Filtrar Calificaciones por ContentItem

```bash
curl -X GET "${API_URL}/api/ratings/?content_item_id=1" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

### Filtrar Calificaciones por Contenido Externo

```bash
curl -X GET "${API_URL}/api/ratings/?source_api=tmdb&external_id=550" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

### Ver Estadísticas de Calificaciones

```bash
curl -X GET "${API_URL}/api/ratings/?source_api=tmdb&external_id=550&stats_only=true" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

**Respuesta:**
```json
{
  "average_score": 8.7,
  "total_ratings": 12
}
```

### Actualizar Calificación

```bash
curl -X PATCH "${API_URL}/api/ratings/1/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "score": 10.0,
    "comment": "Después de verla de nuevo, es perfecta. 10/10."
  }'
```

### Eliminar Calificación

```bash
curl -X DELETE "${API_URL}/api/ratings/1/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

---

## 6. Flujo Completo: Caso de Uso Real

### Escenario: Crear lista de películas compartida con amigos

#### Paso 1: Registrarse
```bash
curl -X POST "${API_URL}/api/auth/registration/" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "pepe",
    "email": "pepe@ejemplo.com",
    "password": "PepePass123!",
    "password_confirm": "PepePass123!",
    "first_name": "Pepe",
    "last_name": "López"
  }'
```

#### Paso 2: Crear lista compartida
```bash
curl -X POST "${API_URL}/api/lists/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Noche de Películas - Viernes",
    "description": "Películas para ver el viernes con amigos",
    "list_type": "SHARED"
  }'
```

#### Paso 3: Invitar amigos
```bash
curl -X POST "${API_URL}/api/lists/1/members/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"username": "maria"}'

curl -X POST "${API_URL}/api/lists/1/members/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"username": "carlos"}'
```

#### Paso 4: Cada uno añade sus sugerencias

**Pepe añade:**
```bash
curl -X POST "${API_URL}/api/lists/1/items/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "source_api": "tmdb",
    "external_id": "550",
    "content_type": "MOVIE",
    "notes": "Fight Club - Clásico que todos deben ver"
  }'
```

**María añade (con su token):**
```bash
curl -X POST "${API_URL}/api/lists/1/items/" \
  -H "Authorization: Bearer ${MARIA_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "source_api": "tmdb",
    "external_id": "680",
    "content_type": "MOVIE",
    "notes": "Pulp Fiction - Mi favorita de Tarantino"
  }'
```

#### Paso 5: Ver la lista completa
```bash
curl -X GET "${API_URL}/api/lists/1/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

#### Paso 6: Después de ver una película, marcarla como completada
```bash
curl -X PATCH "${API_URL}/api/lists/1/items/1/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"status": "COMPLETED"}'
```

#### Paso 7: Calificar la película
```bash
curl -X POST "${API_URL}/api/ratings/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "source_api": "tmdb",
    "external_id": "550",
    "content_type": "MOVIE",
    "score": 9.0,
    "comment": "Increíble película, muy profunda. La actuación de Brad Pitt es genial."
  }'
```

---

## 7. Manejo de Errores

### Error: No autenticado
```bash
curl -X GET "${API_URL}/api/lists/"
```

**Respuesta (401):**
```json
{
  "detail": "Authentication credentials were not provided."
}
```

### Error: Token expirado
**Respuesta (401):**
```json
{
  "detail": "Given token not valid for any token type",
  "code": "token_not_valid",
  "messages": [
    {
      "token_class": "AccessToken",
      "token_type": "access",
      "message": "Token is invalid or expired"
    }
  ]
}
```

**Solución:** Usar el refresh token para obtener un nuevo access token.

### Error: Sin permisos
```bash
# Intentar modificar lista de otro usuario
curl -X PATCH "${API_URL}/api/lists/5/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"name": "Nuevo nombre"}'
```

**Respuesta (403):**
```json
{
  "detail": "You do not have permission to perform this action."
}
```

### Error: Recurso no encontrado
```bash
curl -X GET "${API_URL}/api/lists/999/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

**Respuesta (404):**
```json
{
  "detail": "Not found."
}
```

### Error: Validación
```bash
# Score inválido (debe ser múltiplo de 0.5)
curl -X POST "${API_URL}/api/ratings/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "source_api": "tmdb",
    "external_id": "550",
    "content_type": "MOVIE",
    "score": 8.3
  }'
```

**Respuesta (400):**
```json
{
  "score": [
    "El score debe ser un múltiplo de 0.5 (ej: 1.0, 1.5, 2.0, etc.)"
  ]
}
```

---

## 8. Testing con Python Requests

```python
import requests

BASE_URL = "http://localhost:8000"

# 1. Registro
response = requests.post(f"{BASE_URL}/api/auth/registration/", json={
    "username": "testuser",
    "email": "test@ejemplo.com",
    "password": "TestPass123!",
    "password_confirm": "TestPass123!",
    "first_name": "Test",
    "last_name": "User"
})
data = response.json()
access_token = data['access']

# Headers con autenticación
headers = {
    "Authorization": f"Bearer {access_token}",
    "Content-Type": "application/json"
}

# 2. Crear lista
list_response = requests.post(f"{BASE_URL}/api/lists/", 
    headers=headers,
    json={
        "name": "Mi Lista de Prueba",
        "list_type": "PERSONAL"
    }
)
list_id = list_response.json()['id']

# 3. Añadir película
item_response = requests.post(f"{BASE_URL}/api/lists/{list_id}/items/",
    headers=headers,
    json={
        "source_api": "tmdb",
        "external_id": "550",
        "content_type": "MOVIE"
    }
)

# 4. Calificar
rating_response = requests.post(f"{BASE_URL}/api/ratings/",
    headers=headers,
    json={
        "source_api": "tmdb",
        "external_id": "550",
        "content_type": "MOVIE",
        "score": 9.5,
        "comment": "Excelente!"
    }
)

print("✅ Pruebas completadas exitosamente")
```

---

## Notas Finales

- Todos los timestamps están en formato ISO 8601 (UTC)
- Los scores deben ser múltiplos de 0.5 entre 0.5 y 10.0
- Los tokens JWT expiran después de 5 horas (configurable)
- La paginación por defecto es de 20 ítems por página
- Para obtener más ítems: `?page=2`, `?page=3`, etc.

