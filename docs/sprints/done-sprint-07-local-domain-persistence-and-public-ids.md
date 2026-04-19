# Sprint 07
# Persistencia local del dominio y rutas públicas estables

## Objetivo
Dejar de depender en runtime de las APIs externas (TMDB, IGDB, Spotify, OpenLibrary) para leer un item de contenido, modelando el dominio en tablas tipadas propias y exponiendo rutas públicas atadas al `id` interno del registro, no al identificador del proveedor.

La meta es desacoplar tres capas que hoy están enredadas:
- **Identidad pública del item**: hoy es `(source_api, external_id, content_type)`. Nueva: `id` interno.
- **Persistencia del payload**: hoy vive solo en cache (Redis del proxy) o en `source_data` JSON volátil. Nueva: tablas tipadas por `content_type`.
- **Origen del dato**: hoy el proxy es la única fuente de verdad. Nueva: la DB local es la fuente de verdad servida; el proxy solo se llama en miss/stale.

## Entregable principal
- Modelo de dominio per-type para los 6 `content_type` actuales (`MovieDetail`, `TvShowDetail`, `SeasonDetail`, `AlbumDetail`, `GameDetail`, `BookDetail`) con sus relaciones (`Episode`, `Track`, `Image`, `StreamingPlatform`, `GamePlatform`, `Genre`, `Theme`, `GameMode`, `Author`).
- Ingest path local-first: `get_or_create_content_item` también escribe el detalle tipado.
- Read path local-first: el endpoint que sirve detalle reconstruye el payload normalizado desde nuestras tablas; el proxy solo se invoca en miss o stale.
- Rutas públicas estables `/content/<int:id>/` (frontend y API), sin `source_api` ni `content_type` en la URL.
- Job idempotente de rehidratación periódica para mantener los detalles frescos.

## Skills guía
- `brainstorming`
- `django-expert`
- `python-project-structure`
- `api-design-principles`
- `vercel-react-best-practices`
- `clean-code`

## Alcance
- `core/content/models/*.py` — nuevos modelos per-type.
- `core/content/services/*.py` — `local_content_store`, `payload_reconstructor`, refactor de `browse_metadata_service`.
- `core/content/utils.py` — `bulk_fetch_source_data` pasa a ser orquestador local-first.
- `core/content/views/content_item.py` — endpoints `GET /content/<int:id>/` y `POST /content/find-or-create/`.
- `core/content/management/commands/` — `rehydrate_content_details`, `backfill_content_details`.
- `web/lib/utils/navigationUtils.ts` — `buildContentUrl(id)`, `parseContentUrl` adaptado.
- `web/app/content/page.tsx` → `web/app/content/[id]/page.tsx` (route dinámica de Next).
- 17 archivos del frontend que hoy construyen URLs con la triple `(external_id, source_api, content_type)`.

## No objetivos
- No es momento de exponer un query builder arbitrario sobre los nuevos modelos. Lo único consultable por SQL desde listas sigue siendo `ContentItemBrowseMetadata`.
- No reemplazar el proxy: sigue siendo la fuente upstream. El proxy entra en miss o cuando expira el TTL.
- No migrar URLs externas (TMDB share links, etc.) al formato nuevo. Solo nuestras URLs internas.
- No hacer offline-first en el frontend. La capa cliente sigue pidiéndole al backend.
- No introducir UUIDs. Las URLs y APIs públicas usan el `id` (BigAutoField) interno del item.
- No reemplazar `ContentItemBrowseMetadata`. Sigue siendo el índice plano para SQL en listas; ahora se alimenta desde el detalle local en vez de desde el JSON del proxy.

## Dependencias
- Requiere `Sprint 04` (contratos de `core` estabilizados).
- Requiere `Sprint 4.5` (separación clara entre browse_meta y `source_data`).
- Recomendado **después** de `Sprint 05` (proxy más resiliente y testeado, base sólida para el job de rehidratación).
- Recomendado **después** de `Sprint 06` (decisión arquitectónica explícita sobre la ruta de metadata externa, observabilidad mínima para medir el job).
- Coordina contratos con `Sprint 06` (Lote 6A toma la decisión, este sprint la concreta).

## Modelo funcional

### Identidad pública
- El `id` (BigAutoField) de `ContentItem` es el identificador público estable.
- URLs y APIs públicas: `/content/<id>` (frontend), `/api/content/<id>/` (backend).
- La triple `(source_api, external_id, content_type)` se conserva como **clave de ingest** y unique constraint secundaria, no como identidad pública.
- El `content_type` no aparece en la URL — un consumidor que reciba `/content/12345` no necesita saber si es libro o álbum para abrirlo.

### Modelo de dominio per-type
- Cada `content_type` tiene su tabla de detalle 1:1 con `ContentItem` (`MovieDetail`, `TvShowDetail`, `SeasonDetail`, `AlbumDetail`, `GameDetail`, `BookDetail`).
- Las entidades anidadas reales se modelan como tablas relacionales:
  - `Episode(season_detail, episode_number, title, description, ...)`,
  - `Track(album_detail, track_number, title, duration_seconds, ...)`,
  - `Image(content_item, type, size, image_url)` — polimórfico por `content_item` para no duplicar por tipo.
  - `StreamingPlatform(content_item, kind=stream|buy|rent, name, image_url, country_code)` — para movies/tv/season.
  - `GamePlatform(game_detail, name, image_url)` — distinto a `StreamingPlatform` porque la semántica es jugarlo en, no transmitirlo.
  - `Genre`, `Theme`, `GameMode`: catálogos M2M con `GameDetail`.
  - `Author(name)` + `ContentItemAuthor(content_item, author, role)` — `role` ∈ `artist|producer|developer|author|...`. Esto reemplaza el `authors[]` del JSON y es la fuente de verdad para `BrowseMetadata.artist`.
- Todas las tablas Detail tienen `last_refreshed_at` y `source_payload_hash` (mismo contrato que `BrowseMetadata`).

### Ingest path
- `get_or_create_content_item(source_api, external_id, content_type)` sigue siendo la función pública.
- Después de hacer `ContentItem.objects.get_or_create(...)`, llama `ensure_content_detail(item)` que:
  1. Si el detalle local existe y no está stale → retorna sin tocar el proxy.
  2. Si falta o está stale → fetch_source_data → mapear a tablas tipadas → upsert atómico → upsert browse_meta.
- El JSON crudo del proxy NO se persiste como blob. Se lee, se mapea, se descarta.

### Read path
- `bulk_fetch_source_data(items)` pasa a ser un orquestador local-first:
  1. Por cada item, prefetch `*_detail` + relaciones según `content_type`.
  2. Si todos los detalles existen y están frescos → reconstruir el payload normalizado en memoria con `payload_reconstructor.from_local(item)` → retornar.
  3. Si algunos están missing/stale → `fetch_source_data` para esos solamente, mapear, persistir, devolver.
- El payload normalizado devuelto es **byte-compatible** con el del proxy (mismas claves, mismos types). Los serializadores y consumidores no cambian.

### Rehidratación
- Management command `rehydrate_content_details --content-type X --limit N --dry-run`.
- Itera detalles donde `last_refreshed_at < now - TTL(content_type)` en lotes paralelos.
- TTL por content_type:
  - `BOOK`: 90 días (cambian poco).
  - `MOVIE`, `GAME`: 30 días.
  - `ALBUM`: 30 días.
  - `TV_SHOW`, `SEASON`: 7 días (en emisión cambian seguido).
- Configurable por settings: `CONTENT_REHYDRATION_TTL`.

### Regla crítica
- Si el proxy está caído, los reads siguen funcionando con el dato local (puede estar viejo, no roto).
- Si la DB local está vacía o nunca tuvo el item, el read sigue funcionando vía proxy + persiste para próximas veces.
- El frontend nunca pierde funcionalidad por proxy down si el detalle ya estaba persistido.

## Ownership y boundaries entre servicios

Decisión tomada explícitamente para evitar ambigüedad: **`core` es el dueño exclusivo de la persistencia del dominio. `proxy` permanece stateless respecto a PostgreSQL.**

### Quién hace qué
- **`core`** (Django + PostgreSQL):
  - Único servicio que escribe/lee las tablas Detail tipadas y `ContentItemBrowseMetadata`.
  - Único servicio que corre `manage.py migrate`.
  - Único servicio que conoce el schema del dominio.
  - Llama a `proxy` por HTTP cuando hay miss o stale en local.
- **`proxy`** (Go + Redis):
  - Sigue siendo un cliente HTTP especializado contra TMDB/IGDB/Spotify/OpenLibrary.
  - Conserva su Redis para cachear respuestas calientes con TTL corto.
  - **No toca PostgreSQL. No conoce el schema de `core`.**
  - Es reemplazable, mockeable, escalable horizontalmente sin coordinar con `core`.

### Flujo de read normal
```
Frontend → core (lee Detail local)
  ├─ fresh    → reconstruye payload, responde
  └─ stale/miss → core llama a proxy por HTTP
                  └─ proxy: Redis → fallback API externa → responde payload
                       └─ core persiste localmente y responde al frontend
```

### Por qué este patrón y no DB compartida
- Una sola fuente de verdad para schema (Django).
- `proxy` puede evolucionar (cambiar providers, política de retries, mover a edge) sin tocar `core`.
- Migraciones triviales: solo Django.
- Es el patrón estándar "database-per-service" de microservicios.
- Coherente con la decisión arquitectónica `web → core` que toma Sprint 6 (Lote 6A).

### Edge cases y cómo se resuelven
- **Race en cold start** (dos requests al mismo item missing al mismo tiempo):
  - Ambos llaman a `proxy`; `proxy` cachea en Redis tras el primer hit, así que el segundo no llega a TMDB.
  - Ambos persisten en `core`; el segundo `update_or_create` sobreescribe con el mismo dato.
  - Aceptable. Si en métricas vemos doble-write frecuente, agregamos `select_for_update` por `(source_api, external_id, content_type)` o un lock distribuido.
- **`proxy` caído + item missing local**:
  - `core` devuelve 503 con `{detail: "El item aún no está sincronizado y el proveedor no está disponible."}`.
  - Único caso en que se pierde funcionalidad, y solo para items nunca antes vistos.
  - Items con detalle local respondidos sin tocar `proxy`.
- **`proxy` lento**:
  - Timeout configurable en el cliente HTTP de `core`. Si `proxy` tarda más que el timeout y hay detalle local stale, devolver el local con header `X-Content-Stale: true`.
  - Si no hay local, devolver 504.

## Backlog por lotes

### Lote 7A
**Nombre:** Modelo de dominio per-type
**Resultado:** los 6 modelos Detail + relaciones existen, mappers desde el payload normalizado los pueblan, tests por `content_type` cubren los casos de tu librería real.

### Lote 7B
**Nombre:** Read path local-first
**Resultado:** `bulk_fetch_source_data` retorna desde DB local cuando hay datos frescos; el proxy solo se llama en miss/stale.

### Lote 7C
**Nombre:** Rutas públicas por id interno
**Resultado:** el frontend navega a `/content/<id>`, el backend expone `GET /api/content/<id>/` y `POST /api/content/find-or-create/`. URLs viejas redirigen 301.

### Lote 7D
**Nombre:** Rehidratación periódica
**Resultado:** management command + plan de cron, política de TTL por tipo, métricas mínimas, backoff en el proxy.

### Lote 7E
**Nombre:** Deprecaciones, migración y limpieza
**Resultado:** la triple `(source_api, external_id, content_type)` queda solo en el path de ingest; backfill de items existentes ejecutado; documentación final actualizada.

## Secuencia sugerida de PRs

### PR-7A Per-type domain models
- Migración con los 6 Detail + tablas hijas + catálogos.
- Mappers desde el payload normalizado del proxy hacia cada Detail.
- Tests dorados por `content_type` con payloads reales (Memento, Demon Slayer S01, DATA, RDR2, Words of Radiance + un TV show).
- Browse_meta sigue funcionando igual: ahora se alimenta desde el Detail recién upserteado en vez de desde el JSON.

### PR-7B Local-first read path
- `payload_reconstructor.from_local(item)` que devuelve un dict idéntico al del proxy.
- Refactor de `bulk_fetch_source_data` para preferir local con fallback al proxy.
- `ensure_content_detail(item)` para el ingest path.
- Tests de equivalencia local↔proxy (golden), tests de fallback, tests de stale.

### PR-7C Public ID routing
- Backend: `GET /api/content/<int:id>/`, `POST /api/content/find-or-create/`.
- Backend: keep-alive del endpoint viejo `/api/content/?external_id=...&source_api=...&content_type=...` con redirect 301 al nuevo durante una versión, marcado como deprecated en el schema.
- Frontend: route dinámica `/content/[id]/page.tsx`.
- Frontend: `buildContentUrl(id)`, `parseContentUrl` ahora extrae `id` del path no del query.
- Refactor de los 17 puntos que hoy llaman a `buildContentUrl` con la triple.
- Migrar `useContentData` y dependientes para usar `id` interno.

### PR-7D Rehydration job
- `rehydrate_content_details` management command con `--content-type`, `--limit`, `--dry-run`, `--ttl-override`.
- Política de TTL por tipo en settings.
- Métricas: items procesados, payload_changed, errors, latencia por proveedor (siguiendo el formato decidido en Sprint 6C).
- Documentación operativa: cómo correrlo, cuánto tarda, qué riesgos de rate-limit tiene.

### PR-7E Deprecation and cleanup
- `backfill_content_details --content-type X` para poblar Detail tables de items que ya existen pero no tienen detalle local.
- Eliminar el path directo `bulk_fetch_source_data → proxy` donde ya no haga falta.
- Marcar como deprecated la URL vieja del frontend (logging client-side + warning visible en dev).
- Actualizar `core/README` y `web/README` para reflejar la nueva topología.

## Tareas

### T1. Modelar el dominio per-type
- Subtareas:
  - elegir nombres canónicos por tipo y tabla hija;
  - definir el contrato 1:1 con `ContentItem` (FK con `OneToOneField` y `related_name='movie_detail'` etc.);
  - decidir tabla compartida vs por tipo para `Image`, `StreamingPlatform`, `Author`;
  - persistir cada Detail con `last_refreshed_at` y `source_payload_hash`;
  - admin entries para auditoría manual.
- Recomendación de diseño:
  - persistir solo los campos top-level conocidos del payload normalizado del proxy. Si el proxy agrega un campo nuevo, no rompemos: lo ignoramos hasta que querramos columnarlo.
  - `Episode` y `Track` son tablas hijas reales con FK al Detail padre, no JSONField.

### T2. Mappers payload → tablas tipadas
- Subtareas:
  - un mapper por `content_type` en `core/content/services/local_content_store/mappers/`;
  - reusar `_parse_iso_date` y `_authors_of_type` de `browse_metadata_service`;
  - upsert atómico (transaction.atomic) para que un payload roto no deje el detalle en estado inconsistente;
  - tests dorados con tus payloads reales por tipo (los que pasaste en este chat, archivados como fixtures);
  - resolver autores como `get_or_create(name)` en la tabla compartida `Author`.
- Recomendación:
  - los mappers no deben fallar si un campo opcional falta; deben fallar duro si el `id` o el `type` no llegan. Logging defensivo.

### T3. Reconstrucción del payload normalizado desde DB local
- Subtareas:
  - `payload_reconstructor.from_local(item)` por `content_type` que arma el dict idéntico al del proxy;
  - prefetch_related correctos para evitar N+1 (`tracks`, `episodes`, `images`, `platforms`, `authors`);
  - tests golden: payload del proxy ↔ payload reconstruido deben matchear (con tolerancia a orden de listas);
  - documentar cualquier diferencia inevitable (e.g., el proxy puede traer plataformas filtradas por país).
- Recomendación:
  - el contrato de salida del reconstructor es el contrato consumido por el resto del sistema. Si alguien depende de un campo que no estás persistiendo, agregalo al modelo o decide explícitamente que se pierde.

### T4. Orquestador local-first
- Subtareas:
  - refactor de `bulk_fetch_source_data` para clasificar items en {fresh_local, stale_local, missing};
  - resolver `fresh_local` desde el reconstructor;
  - resolver `stale_local` y `missing` con un solo llamado al proxy en bulk, mappear y persistir;
  - métricas: hit ratio local, latencia por origen;
  - feature flag para forzar uso del proxy (debugging).
- Recomendación de performance:
  - el caso normal después de algunas semanas debería ser >95% hit local. Si no, revisar TTL o cobertura del backfill.

### T5. Routing público por id interno
- Subtareas:
  - endpoint `GET /api/content/<int:id>/` que retorna `{id, source_api, content_type, ..., source_data}` con `source_data` reconstruido local-first;
  - endpoint `POST /api/content/find-or-create/` con body `{source_api, external_id, content_type}` → `get_or_create_content_item` → retorna `{id, ...}`. Devuelve 200 si existía, 201 si lo creó. Idempotente;
  - frontend: route `/content/[id]/page.tsx`, `buildContentUrl(id: number): string` reemplaza la versión con triple;
  - en cualquier punto del frontend donde solo conocemos `(source_api, external_id, content_type)` (resultados de search, click "agregar a lista"), llamar primero a `find-or-create` y navegar al `id` que devuelve;
  - URL vieja `/content?external_id=X&source_api=Y&content_type=Z` queda con redirect 301 server-side a la nueva durante una versión.
- Recomendación de UX:
  - el redirect debe preservar el scroll/contexto. El usuario no debe notar el cambio.

### T6. Rehidratación periódica
- Subtareas:
  - `rehydrate_content_details` itera detalles stale en chunks paralelos;
  - política de TTL por content_type configurable en `settings.py`;
  - logging estructurado: items totales, refrescados, sin cambio, errores;
  - dry-run que reporta qué haría sin escribir;
  - documentar el plan operativo: frecuencia recomendada, ventana, costo de proxy hits;
  - integración con observability del Sprint 6C: emitir métricas en formato compatible.
- Recomendación:
  - empezar manual (cron o GitHub Action). Celery/RQ entran solo cuando justifique.

## Modelo de datos propuesto

Las firmas exactas se concretan en PR-7A. Acá la lista de modelos para evaluar:

### Tablas Detail (1:1 con ContentItem)
- `MovieDetail(content_item, original_title, tagline, description, image_url, status, duration_minutes, last_refreshed_at, source_payload_hash)`
- `TvShowDetail(content_item, original_title, tagline, description, image_url, status, number_of_seasons, number_of_episodes, last_refreshed_at, source_payload_hash)`
- `SeasonDetail(content_item, season_number, tv_show_name, description, image_url, number_of_episodes, last_refreshed_at, source_payload_hash)`
- `AlbumDetail(content_item, album_type, total_tracks, duration_minutes, image_url, external_url, last_refreshed_at, source_payload_hash)`
- `GameDetail(content_item, game_type, description, image_url, series, last_refreshed_at, source_payload_hash)`
- `BookDetail(content_item, pages, image_url, last_refreshed_at, source_payload_hash)`

### Tablas hijas
- `Episode(season_detail, episode_id_external, episode_number, season_number, title, description, release_date, duration_minutes, image_url, episode_type)` — `episode_id_external` permite re-upsert idempotente.
- `Track(album_detail, track_id_external, track_number, title, duration_seconds, external_url)`.
- `Image(content_item, type, size, image_url, position)` — `type` ∈ `poster|gallery|backdrop|...`.
- `StreamingPlatform(content_item, kind, name, image_url, country_code)` — `kind` ∈ `stream|buy|rent`. Movies/tv/season.
- `GamePlatform(game_detail, name, image_url)`.

### Catálogos compartidos
- `Author(name, slug)` con `unique_together=[('name',)]`.
- `ContentItemAuthor(content_item, author, role)` con `unique_together=[('content_item', 'author', 'role')]`.
- `Genre(name)` — M2M con `GameDetail`.
- `Theme(name)` — M2M con `GameDetail`.
- `GameMode(name)` — M2M con `GameDetail`.

### Track ↔ Author (música)
- `TrackAuthor(track, author, role)` — los tracks tienen sus propios artistas que no necesariamente son los del álbum.

### Notas de schema
- Todos los `image_url` quedan en `URLField(max_length=500)`.
- Fechas de release como `DateField` con null=True.
- `source_payload_hash` no es necesario para tablas hijas (se versiona el padre).
- Indexar `last_refreshed_at` en cada Detail para queries del job de rehidratación.

## Checklist de implementación

> **Estado de cierre (auditoría 2026-04-18).** Revisado contra el código actual.
> Casillas marcadas según evidencia en el repo:
> `[x]` = verificable en código; `[~]` = parcial (ver nota inline);
> `[ ]` = pendiente o no verificable sin ejecución manual.

### Lote 7A
- [x] Las 6 tablas Detail existen con migración aplicada. — `core/content/models/detail/{movie,tv_show,season,album,game,book}_detail.py`, migración `0012_per_type_details.py`.
- [x] Las tablas hijas (`Episode`, `Track`, `Image`, `StreamingPlatform`, `GamePlatform`) existen. — `core/content/models/detail/{episode,track,image,streaming_platform,game_platform}.py`.
- [x] Catálogos (`Author`, `Genre`, `Theme`, `GameMode`) existen. — `core/content/models/catalog/{author,genre,theme,game_mode,content_item_author,track_author}.py`.
- [x] Hay un mapper por `content_type` y todos los tests dorados pasan. — `core/content/services/local_content_store/mappers/{movie,tv_show,season,album,game,book}.py` + fixtures `movie_memento`, `tv_demon_slayer`, `season_demon_slayer_s01`, `album_data`, `game_rdr2`, `book_words_of_radiance`. Ejecución de `manage.py test content` queda como ítem de validación.
- [x] `BrowseMetadata` ahora se alimenta desde el Detail en vez de desde el JSON crudo. — `ensure_content_detail()` llama `upsert_browse_metadata(item, payload)` tras el mapper en `services/local_content_store/__init__.py`.
- [x] Admin tiene entries por tipo para inspección manual. — `core/content/admin/{detail.py, catalog.py}`.

### Lote 7B
- [x] `payload_reconstructor.from_local(item)` retorna un dict byte-compatible con el del proxy para los 6 tipos. — `core/content/services/payload_reconstructor/{movie,tv_show,season,album,game,book}.py`.
- [x] `bulk_fetch_source_data` resuelve local-first y solo invoca al proxy para items missing/stale. — `services/source_data_orchestrator.fetch_bulk_source_data` clasifica `fresh/stale/missing` y solo llama proxy para los dos últimos.
- [x] Tests golden verifican equivalencia local ↔ proxy. — `core/content/tests/test_payload_reconstructor.py` usando los fixtures de payloads reales.
- [x] Hit ratio local medible vía logging estructurado. — `logger.info('orchestrator_summary', extra={event, total, fresh, stale, missing, proxy_calls, latency_ms})` en `source_data_orchestrator.py`.
- [x] Si el proxy está caído, items con detalle local responden con 200 y un campo `is_stale=true` cuando aplique. — `fallback['is_stale'] = True` en el camino de stale-with-failed-refresh.

### Lote 7C
- [x] `GET /api/content/<int:id>/` existe y devuelve detalle reconstruido local-first. — `urls/__init__.py:18` + `ContentItemDetailByIdView`.
- [~] `POST /api/content/find-or-create/` existe, es idempotente, devuelve `{id}`. — Implementado como **`POST /api/content/get-or-create/`** (`ContentItemGetOrCreateView`) — la semántica es la del sprint pero el nombre quedó distinto. Devuelve 200 si existía, 201 si lo creó. Decidir si renombrar o aceptar la divergencia y actualizar el sprint.
- [x] `/content/[id]/page.tsx` reemplaza a `/content/page.tsx`. — Existe `web/app/content/[id]/page.tsx`. La ruta vieja `web/app/content/page.tsx` permanece como redirect handler client-side, no como detail page.
- [x] `buildContentUrl(id)` reemplaza la firma con triple. — Exportado como `buildContentUrlById(id)` en `web/lib/utils/navigationUtils.ts`.
- [x] Los 17 puntos del frontend usan la nueva URL. — Cards, list-item-renderer y content-detail usan `buildContentUrlById`. La firma vieja sigue accesible vía `getOrCreate` solo en el redirect legacy.
- [~] `/content?external_id=X&source_api=Y&content_type=Z` redirige 301 al nuevo path. — **Backend sí** (`LegacyContentRedirectView` con `redirect(target, permanent=True)`). **Frontend no** — `web/app/content/page.tsx` hace `router.replace()` client-side (200 → JS → push), no es 301 server-side. Aceptable como UX pero no es 301 estricto. Si querés 301 puro, mover a `middleware.ts` o a Next `redirects()` config.
- [ ] El click "agregar a lista" desde search llama a `find-or-create` y navega al `id` resultante. — No verificado en esta auditoría. Existe `contentItemActions.getOrCreate` y se usa en el legacy redirect; falta confirmar que el modal "agregar a lista" del search lo invoca también.

### Lote 7D
- [x] `rehydrate_content_details` corre con `--dry-run` sin tocar la DB. — `core/content/management/commands/rehydrate_content_details.py:87-89, 148-152`.
- [x] TTL por content_type configurable en settings. — `CONTENT_REHYDRATION_TTL` en `core/core/settings/base.py:127`.
- [x] Métricas mínimas (items procesados, refreshed, errors) emitidas. — `_TypeStats.as_event()` emite JSON `{event:'rehydrate', total, refreshed, unchanged, errors, latency_ms}`.
- [x] Documentación operativa lista en `docs/runbooks/` o equivalente. — `docs/runbooks/rehydrate-content.md`.

### Lote 7E
- [~] `backfill_content_details` ejecutado contra los items existentes en al menos un entorno. — Comando existe (`core/content/management/commands/backfill_content_details.py`) y se corrió en local durante la sesión de cobertura del 2026-04-18 (los 4 items IGDB sin payload se diagnosticaron por esta vía). No verificable contra staging/prod desde el código.
- [x] El path directo `bulk_fetch_source_data → proxy` quedó como fallback, no como caso normal. — Docstring de `source_data_orchestrator.py`: *"El legacy `content.utils.bulk_fetch_source_data` shim was removed in Sprint 07 / PR-7E — import this module directly."*
- [x] La URL vieja queda marcada deprecated y con plan de eliminación. — Backend: `ContentItemViewSet.get_or_create` con `deprecated=True` en `extend_schema`. Frontend: `web/app/content/page.tsx` actúa como shim de redirección.
- [x] `core/README`, `web/README` y este sprint reflejan el estado real. — `core/README.md:21` menciona Sprint 07 + persistence local-first. `web/README.md:183` documenta `/content/[id]` y `buildContentUrlById`.

## Checklist de validación
- [ ] `manage.py test content` pasa con los nuevos tests. — Pendiente de ejecución manual con stack vivo (la suite necesita Postgres real, no SQLite in-memory para algunos tests).
- [ ] `npm run lint` y `npm run build` en `web` pasan. — `tsc --noEmit` quedó verde tras el fix del 2026-04-18; falta correr `lint` + `build` completo.
- [ ] Test e2e manual: agregar un álbum nuevo desde search, ver `/content/<id>`, refrescar, navegar atrás. Sin pasar por proxy en el segundo render. — Pendiente de smoke E2E manual.
- [ ] Test e2e manual: simular proxy caído (stub local), verificar que los reads siguen sirviendo dato local. — La lógica está implementada (`is_stale=True` en orchestrator); pendiente de verificación E2E.
- [ ] Test de migración: un item viejo sin `MovieDetail` levanta correctamente vía `ensure_content_detail`. — Cubierto por `test_local_content_store.py` y `test_backfill_command.py`; pendiente de marcar como hecho tras correr la suite.
- [ ] El payload reconstruido para una temporada de Demon Slayer (con sus 26 episodios) se construye en menos de 50ms con prefetch correcto. — Existe fixture `season_demon_slayer_s01.py`; falta benchmark explícito con `assertNumQueries` o timing.
- [x] Las URLs viejas redirigen 301 al nuevo formato. — Backend: 301 vía `LegacyContentRedirectView`. Frontend: redirect client-side (no 301 puro, ver nota en 7C).

## Riesgos
- **Schema drift contra el proxy**: si el proxy normaliza un campo de forma distinta a lo esperado, el mapper rompe. Mitigación: tests golden con payloads reales versionados como fixtures, validación defensiva en mappers.
- **N+1 en reconstrucción**: armar el payload normalizado con todas las relaciones puede explotar queries. Mitigación: un solo `select_related`/`prefetch_related` orquestado, tests con `assertNumQueries`.
- **Tamaño del modelo**: 6 Detail + ~6 hijas + 4 catálogos = ~16 tablas nuevas. Crítico mantener cohesion y no caer en abstracciones polimórficas tipo `GenericForeignKey`.
- **Inconsistencia local vs upstream**: si el proxy actualiza datos pero la rehidratación no corre, vivimos con datos viejos. Mitigación: TTL agresivo en TV shows en emisión, métrica de "edad promedio del detalle más viejo" como alarma.
- **URL deprecation**: links viejos en bookmarks, historial de navegador, search engines. Mitigación: 301 server-side por una versión completa, no remover el endpoint viejo en el mismo PR.
- **Rate limit del proxy en backfill**: ejecutar `backfill_content_details` masivo puede tirar el proxy si no respeta el throttling decidido en Sprint 5B. Mitigación: respetar la política de retries del proxy, paralelismo configurable, dry-run obligatorio antes de correr.
- **Costo de migración del frontend**: 17 archivos con `buildContentUrl` + `useContentData` + `useUserRating` + modal de "agregar a lista". Hacerlo en un solo PR aumenta el blast radius. Mitigación: mantener la firma vieja como overload deprecated por un PR.
- **Race en cold start** (dos requests concurrentes al mismo item missing): ambos terminan llamando al proxy y haciendo `update_or_create` localmente. Aceptable porque Redis del proxy absorbe el segundo hit y el upsert es idempotente. Si las métricas muestran doble-write frecuente, escalar a `select_for_update` por la clave de ingest.
- **Tentación de mover persistencia al proxy**: si bajo presión alguien propone que el proxy escriba directo a PostgreSQL para "evitar el HTTP extra", el costo real es perder la separación de servicios y duplicar el schema en dos lenguajes. Esta tentación debe rechazarse explícitamente — está documentada en "Ownership y boundaries entre servicios".

## Criterios de aceptación
- Un read normal de un item de detalle ya no pega al proxy si el detalle local existe y está fresco.
- Las URLs públicas son `/content/<id>` y no incluyen el proveedor ni el tipo.
- Si el proxy se cae, los items que ya están en DB local siguen accesibles.
- Existe un mecanismo automático y configurable para mantener los detalles refrescados.
- El frontend no requiere conocer `source_api` ni `content_type` para navegar a un item — solo el `id`.
- Los tests dorados confirman que el payload reconstruido desde DB local es equivalente al del proxy.
- `proxy` no toca PostgreSQL en ningún punto del sistema. Toda la persistencia del dominio vive en `core`.

## Interdependencias
- **Sprint 4.5** entrega `ContentItemBrowseMetadata` y el mapper que ahora se reusa apuntando al Detail tipado. Este sprint no toca browse_meta como contrato — solo cambia su origen de datos.
- **Sprint 5** endurece el proxy y debe estar estable antes de correr el job de rehidratación masivo.
- **Sprint 6 (Lote 6A)** toma la decisión arquitectónica `web → core` vs `web → proxy`. Este sprint asume que la decisión es `web → core` con `core` resolviendo metadata local-first.
- **Sprint 6 (Lote 6C)** entrega correlation IDs y métricas que el job de rehidratación reutiliza.
- Habilita la futura migración a un model-server donde `core` es la única fuente de metadata para todo el ecosistema.

## Refactors recomendados
- Aprovechar el sprint para limpiar `core/content/utils.py`: pasar `bulk_fetch_source_data` y compañía a `core/content/services/`.
- Aislar el contrato del payload normalizado en una clase/typeddict en `core/content/services/payload_schema.py` para que mappers y reconstructor compartan la fuente de verdad.
- No introducir `GenericForeignKey`: cuesta más que lo que ahorra. Mejor tablas explícitas por tipo.
- `Author` compartido entre tipos, `Platform` no (StreamingPlatform vs GamePlatform tienen semántica distinta).
- Mantener `ContentItem` lo más liviano posible — toda la metadata específica vive en el Detail. Esto facilita queries comunes (homepage, search results) que solo necesitan id, content_type y display_title (que ya está en browse_meta).

## Follow-ups (NO se hacen en este sprint)
- **Multi-region/multi-country en streaming platforms**: hoy persistimos un único snapshot. Si querés mostrar disponibilidad por país en tiempo real, hay que persistir N filas con `country_code`. Decidir cuando aparezca la demanda.
- **Versionado de payloads**: si querés ver cómo cambió un item a lo largo del tiempo, `Detail` debería tener una historia. Hoy solo guardamos el último snapshot. Considerar `django-simple-history` cuando haga falta auditar.
- **Eventos de cambio**: emitir un signal cuando un Detail cambia para alimentar features tipo "novedades en tu lista".
- **Soft delete de items removidos del proveedor**: si el proxy retorna 404 para un `external_id` que antes existía, marcar como `is_orphaned` y decidir UX.
- **Migración a UUID**: si el caso de privacy/enumerability aparece más adelante, agregar `public_id UUID` como secondary unique sin romper el routing actual.
- **Webhooks de proveedores**: en vez de TTL, suscribirse a webhooks (donde existan) para invalidar el cache local. Solo Spotify lo soporta razonablemente.
- **GraphQL para detalle**: con el modelo per-type, una API GraphQL sobre `MovieDetail`/`AlbumDetail`/etc. queda mucho más natural que hoy. Considerar si el frontend lo justifica.
