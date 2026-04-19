# Oportunidades de Mejora para denn-proxy

Este documento detalla los puntos de mejora identificados para cada entidad y los pasos siguientes para optimizar la API.

## 1. Mejoras por Entidad (Quick Wins)

Datos que ya están presentes en las respuestas de las APIs externas pero que actualmente se descartan o no se solicitan en la consulta inicial.

### TMDB (Películas y Series de TV)

**Mejoras en Mapeo (Datos ya presentes en la respuesta de detalle):**
- **`genres`**: Mapear el array de `{id, name}` directamente (evita llamadas extra). - Dejar como Lista de strings como en los juegos
- **`original_language`**: Idioma original de la obra.
- **`imdb_id` (Películas)**: Usar el ID del detalle en lugar de requerir `external_ids` append.

**Mejoras en Series de TV (Campos adicionales):**
- **`in_production`**: Estado de producción de la serie.
- **`last_air_date`**: Fecha del último episodio emitido.
- **`last_episode_to_air`**: Información completa del último episodio.
- **`next_episode_to_air`**: Detalles del próximo episodio programado.
- **`type`**: Tipo de serie (ej. "Scripted", "Reality").

**Búsqueda/Tendencias:**
- Mapear `original_language` en todos los resultados de búsqueda.

### IGDB (Juegos)

**Ampliación de `defaultFields` (Sin llamadas extra):**
- **`involved_companies`**: Extraer distribuidores (`publisher: true`) además de desarrolladores.
- **`websites`**: Enlaces tipificados (Steam, Epic, GOG, etc.).
- **`game_status`**: Estado (released, alpha, etc.). **Acción: Filtrar fuera `cancelled` y `rumored`**.
- **`age_ratings`**: Calificaciones ESRB/PEGI con descriptores de contenido.

### Spotify (Álbumes)

- **`album_type`**: Clasificación dinámica basada en la lógica oficial de la industria/Spotify:
    - **Album**: Si `album_type` es `"album"`. (OK)
    - **EP**: Si `album_type` es `"single"` Y `total_tracks` está entre 4 y 6. (OK)
    - **Single**: Si `album_type` es `"single"` Y `total_tracks` está entre 1 y 3. (Filtrar/Ignorar)
    - **Compilation**: Si `album_type` es `"compilation"`. (Filtrar/Ignorar)
- **Artist IDs**: Guardar los IDs de los artistas para permitir enriquecimiento futuro.
- **`explicit`**: Mapear el flag de contenido explícito a nivel de pista.

---

## 2. Endpoints de Recomendaciones

La estrategia principal para contenido relacionado será mediante endpoints específicos de recomendaciones por dominio.

| Dominio | Fuente de Datos | Endpoint Propuesto |
|---------|-----------------|--------------------|
| **Películas** | TMDB `similar` + `recommendations` | `GET /movies/:id/recommendations` |
| **TV Shows** | TMDB `similar` + `recommendations` | `GET /tv_shows/:id/recommendations` |
| **Juegos** | IGDB `similar_games` + `remakes` + `remasters` | `GET /games/:id/recommendations` |
| **Álbumes** | Búsqueda Relacionada (Simulada vía Search) | `GET /albums/:id/recommendations` |

---

## 3. Próximos Pasos y Mejoras Globales

### Nota sobre Spotify
Dado que los endpoints de recomendaciones (`/recommendations`) y artistas relacionados (`/related-artists`) de Spotify están marcados como **Deprecated**, la estrategia de "recomendaciones" para álbumes se basará en realizar una búsqueda (`search`) utilizando el nombre del artista o términos del álbum, excluyendo el ID del álbum actual de los resultados. Esto garantiza estabilidad y relevancia sin depender de endpoints legacy.

### Parámetros de Consulta Necesarios
- **`sort`**: Permitir ordenación por `release_date:desc`, `popularity:desc`, etc.
- **`genre`**: Filtrado por género en búsqueda y tendencias.
- **`language`**: Filtrado por idioma original.
- **`platform`**: Filtrado por plataforma (Juegos/TV/Cine).

### Paginación y Resiliencia
- **IGDB Pagination**: Buscar solución para determinar si existe una página siguiente (actualmente devuelve 0 en totales).
- **Bulk Endpoints**: Mejorar la gestión de errores para que no fallen silenciosamente. Devolver información de error por ítem (siguiendo el patrón de `homepage` y `multisearch`).

### Infraestructura
- **Versioning**: Inyectar versión en el endpoint de salud vía `ldflags`.
- **Headers de Caché**: Implementar `Cache-Control` y `ETag`.
- **Tracing**: Soporte para `X-Request-ID`.
- **Multi-idioma**: Pasar `language` o `X-User-Language` desde el cliente hacia TMDB/OpenLibrary.
- **OpenAPI**: Autogeneración de documentación desde el código.

---

## 4. Notas de Modelado (Campos a Corregir)

| Campo | Estado Actual / Acción |
|-------|------------------------|
| **Genres** | Faltan en Película, TV, Álbum y Libro (mapear). |
| **External IDs** | Solo IMDb actualmente; ampliar a otros proveedores. |
| **Age Rating** | Implementar para TV y Juegos (usar `age_ratings` de IGDB). |
| **Collection** | Mantener solo donde exista nativamente (Películas y Juegos). |
| **Publishers** | En Juegos, tratar como un "autor" adicional. |
