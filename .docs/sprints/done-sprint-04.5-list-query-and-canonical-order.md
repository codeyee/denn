# Sprint 4.5
# Lists: Query Model, Canonical Order y Exploración Avanzada

## Objetivo
Rediseñar el manejo funcional de listas para que explorar, filtrar, agrupar, ordenar y reordenar sean capacidades coherentes, rápidas y predecibles sobre listas grandes.

La meta es separar claramente:
- el orden canónico real de la lista (`list_order`);
- la vista de exploración del usuario (`list view query`).

## Entregable principal
- Query model real para list items con filtros, sort multi-campo y agrupación.
- Paginación global estable incluso cuando hay agrupación activa.
- Distinción explícita entre modo `Explore` y modo `Edit Order`.
- Capacidad de promover un sort global a nuevo `list_order` canónico de la lista.

## Skills guía
- `brainstorming`
- `django-expert`
- `api-design-principles`
- `vercel-react-best-practices`
- `clean-code`

## Alcance
- `web/app/_components/pages/ListDetailPage/*`
- `web/lib/types/listView.ts`
- `web/lib/api/actions/listItem.ts`
- `core/content/views/list_item.py`
- `core/content/serializers/*.py` relacionados con browse/query de listas
- `core/content/models/*.py` si hacen falta campos auxiliares o metadata indexable

## No objetivos
- No introducir vistas guardadas en servidor en esta fase.
- No rehacer completamente el diseño visual del sitio.
- No soportar desde v1 un query builder arbitrario para todos los tipos de contenido.
- No resolver toda la estrategia global de metadata externa fuera del contexto de listas.

## Dependencias
- Requiere `Sprint 03` como base de separación entre viewer/reorder.
- Requiere decisiones y contratos de `Sprint 04` sobre payloads, `source_data`, performance y semántica del core.

## Modelo funcional

### Orden canónico
- `list_order` sigue siendo el orden real persistido de la lista.
- Ese orden puede modificarse de dos formas:
  - reorder manual en modo `Edit Order`;
  - promoción explícita de un sort global a orden canónico.

### Vista de exploración
- La vista de exploración vive como estado local del usuario.
- Incluye:
  - filtros;
  - sort multi-campo;
  - agrupación;
  - paginación.
- No modifica `list_order` por sí misma.

### Regla crítica
- Guardar un nuevo orden canónico sólo se permite sobre la lista completa:
  - sin filtros activos;
  - sin agrupación activa.

## Backlog por lotes

### Lote 4.5A
**Nombre:** Query contract de listas  
**Resultado:** el backend acepta filtros, sort multi-campo y agrupación como una query explícita y estable

### Lote 4.5B
**Nombre:** Browse metadata y campos indexables  
**Resultado:** las listas ya no dependen de reconstrucción pesada desde `source_data` para ordenar o filtrar

### Lote 4.5C
**Nombre:** UX de exploración  
**Resultado:** toolbar simple, paginación siempre visible y semántica clara entre explorar y editar orden

### Lote 4.5D
**Nombre:** Canonical order workflows  
**Resultado:** reorder manual y “apply sort as list order” conviven sin ambigüedad

## Secuencia sugerida de PRs

### PR-4.5A Query model contract
- Definir parámetros y respuesta del endpoint de list items.
- Mover grouping/sorting/filtering al backend.

### PR-4.5B Browse metadata
- Exponer campos mínimos y útiles para browse.
- Dejar list items preparados para casos como álbumes por artista/título/release date.

### PR-4.5C Explore mode UX
- Reemplazar controles actuales por toolbar/query builder.
- Mantener paginación visible y consistente con grouping.

### PR-4.5D Canonical order actions
- Formalizar `Edit Order`.
- Agregar acción explícita para promover un sort global a `list_order`.

## Tareas

### T1. Definir un query model explícito para list items
- Subtareas:
  - soportar filtros estructurados;
  - soportar sort multi-campo con prioridad;
  - soportar `group_by` en v1 con un solo campo;
  - mantener `page` y `page_size` como parte del contrato principal.
- Recomendación de diseño:
  - el frontend no debe inferir semántica de grouping/sorting a partir de arrays cargados localmente.

### T2. Introducir browse metadata usable
- Subtareas:
  - definir campos comunes:
    - `display_title`,
    - `status`,
    - `added_at`,
    - `completed_at`,
    - `list_rating`,
    - `added_by`,
    - `content_type`;
  - definir campos contextuales por tipo de contenido;
  - para álbumes, soportar al menos:
    - `artist`,
    - `album_title`,
    - `release_date`.
- Recomendación de diseño:
  - ordenar y filtrar no debe depender de parsear `source_data` completo en el cliente.

### T3. Fijar la semántica de agrupación y paginación
- Subtareas:
  - aplicar filtros y sort sobre el conjunto global;
  - paginar globalmente el resultado;
  - renderizar la página visible agrupada cuando `group_by` esté activo;
  - devolver metadata suficiente para headers/resúmenes de grupo.
- Recomendación:
  - la agrupación debe cambiar la presentación, no romper la navegación.

### T4. Rediseñar la UX de `ListDetailPage`
- Subtareas:
  - sustituir el sidebar actual de grouping/sort por una toolbar de exploración;
  - mostrar filtros, sort multi-campo y agrupación de manera simple;
  - mantener paginación visible siempre;
  - persistir localmente la vista por lista.
- Recomendación de producto:
  - el usuario debe sentir que “explora” una lista, no que está manipulando un pipeline interno.

### T5. Separar `Explore` de `Edit Order`
- Subtareas:
  - modo `Explore` para query local + respuesta paginada;
  - modo `Edit Order` para reorder manual del orden canónico;
  - deshabilitar acciones ambiguas cuando la lista esté filtrada o agrupada.
- Recomendación:
  - no mezclar drag-and-drop manual con exploración compleja.

### T6. Formalizar “Apply sort as list order”
- Subtareas:
  - permitirlo sólo sobre lista completa;
  - definir endpoint o acción explícita;
  - reflejar el nuevo orden canónico sin depender de hacks del cliente.
- Recomendación de dominio:
  - promover un sort al orden real es una operación distinta de “ver” la lista.

## Checklist de implementación

### Lote 4.5A
- [x] Existe un query model claro para filtros, sort y grouping.
- [x] El endpoint de list items soporta paginación global consistente.
- [x] La respuesta no obliga al frontend a recalcular toda la lista.

### Lote 4.5B
- [x] Las listas usan browse metadata específica y liviana.
- [x] Casos como álbumes por artista/título/release date son soportables de forma nativa.
- [x] El cliente no depende de `source_data` completo para browse normal.

### Lote 4.5C
- [x] La paginación no desaparece con grouping.
- [x] La toolbar de exploración reemplaza la UX actual de grouping/sort.
- [x] La vista local se recuerda por lista.

### Lote 4.5D
- [x] `Edit Order` queda separado de `Explore`.
- [x] Reorder manual sigue disponible para el orden canónico.
- [x] `Apply sort as list order` existe y sólo aparece en contexto válido.

## Checklist de validación
- [x] Lista larga de álbumes con sort `artist > album title > release date`.
- [x] Filtro por `completed`.
- [x] Agrupación con paginación visible y estable.
- [x] Reorder manual sin romper query state.
- [x] Promoción de sort global a `list_order`.
- [x] `npm run lint` y `npm run build` en `web` siguen pasando.
- [x] Tests de `core` para el endpoint de list items siguen pasando.

## Estado final de implementación

Sprint completo. Resumen de PRs entregados:

### PR-4.5A — Query model contract
- Backend: nuevo módulo `core/content/services/list_item_query.py` con `parse_list_item_query`, `apply_query`, `build_group_metadata` y whitelists `ALLOWED_FILTERS`/`RANGE_FILTERS`/`ALLOWED_SORTS`/`ALLOWED_GROUPS`.
- `ListItemViewSet.list` parsea `?filter[<f>]=`, `?sort=`, `?group_by=`, valida con whitelist (400 si campo desconocido), aplica `annotate_items_with_ratings`, pagina globalmente y emite `metadata.groups` cuando hay grouping.
- Frontend: tipos `SortField`, `FilterField`, `RangeFilterField`, `GroupByField`, `SortClause`, `ListItemQuery`, `GroupHeader` en `web/lib/types/listView.ts`. `PaginationMetadata.groups` opcional en `web/lib/types/api.ts`. `buildListItemQuery` serializa el `ListItemQuery` en `web/lib/api/actions/listItem.ts`.

### PR-4.5B — Browse metadata
- Modelo `ContentItemBrowseMetadata` (1:1 con `ContentItem`) + migración + admin.
- Mapper por `content_type` (`movie`, `tv_show`, `season`, `album`, `game`, `book`) en `core/content/services/browse_metadata_service.py`, con `upsert_browse_metadata`, `upsert_many`, `is_stale`, `refresh_if_stale` (stub de rehidratación).
- Hook oportunista en `bulk_fetch_source_data`: cuando hay datos frescos, hace `_opportunistic_upsert_browse_metadata` (best-effort).
- Management command `python manage.py backfill_browse_metadata` con `--limit`, `--dry-run`, `--content-type`, `--include-stale`.
- `ListItemViewSet.get_queryset` agrega `select_related('content_item__browse_meta')`. Sorts `display_title`/`artist`/`album_title`/`release_date` mapean a `content_item__browse_meta__*`. Range filter `release_date_(gte|lte)` también usa la tabla auxiliar.

### PR-4.5C — Explore mode UX
- Hook `useExploreQuery` en `web/app/_components/pages/ListDetailPage/hooks/useExploreQuery.ts`: URL querystring como única fuente de verdad (`useSearchParams` + `router.replace`), seed inicial desde `localStorage` por lista (`list-explore-query-${listId}`), persiste cada cambio en storage.
- Componente `ExploreToolbar` con filtros (status, content_type), grouping single-field, page size, sort multi-campo con prioridad explícita y reset.
- `useListData` recibe `ListItemQuery` completo, fetchea con la query del backend y expone `pageMetadata`. `useDataStrategy` propaga `pageMetadata` y usa `total_pages` de la respuesta.
- `useViewerState` ya no agrupa en cliente: construye `groupedItems` a partir de `pageMetadata.groups` (orden y labels los manda el backend).
- Limpieza: borrados `useListPagination.ts` (huérfano), `useListGrouping.ts` y `useListPreferences.ts`. `ListSidebar` queda con stats y acciones canónicas únicamente. `ItemsHeader` queda con conteo + paginación + view mode.

### PR-4.5D — Canonical order workflows
- Backend: action `ListItemViewSet.apply_sort` + ruta `POST /api/content/lists/<pk>/items/apply-sort/`. Body `{ "sort": "<csv>" }`. Rechaza filtros activos, grouping activo, sort vacío, y sort que se reduce a `list_order` (no-op). Reusa el truco de posiciones negativas + `bulk_update` del `reorder` para respetar la unique constraint.
- Frontend: `listItemActions.applySortAsListOrder(listId, sort)`. Botón "Apply sort as list order" en `ExploreToolbar` con confirm, refresh y reset del sort. `ListSidebar` recibe `reorderDisabledReason` que bloquea la entrada a Edit Order cuando hay filtros, grouping o sort no canónico activos.
- Tests: `ApplySortAsListOrderTests` cubre happy path + 4 guardrails (filtros, grouping, sort vacío, sort no-op).

### Validación ejecutada
- `cd web && npm run lint` → ok (solo warning preexistente de `<img>` en `PlatformsDisplay`).
- `cd web && npm run build` → ok.
- `cd core && manage.py test content` → 131 tests OK (incluye 23 nuevos en `test_list_item_query.py` y los de `test_browse_metadata.py`).

## Follow-ups (no resueltos en este sprint, planteados para más adelante)

### Sistema de rehidratación de `ContentItemBrowseMetadata`
- Existe el stub: `is_stale(meta, ttl)` y `refresh_if_stale(content_item)` en `core/content/services/browse_metadata_service.py`, además del campo `last_refreshed_at` y `source_payload_hash` en el modelo. Falta:
  - cron / Celery beat / management command periódico que itere metadatos viejos en lotes;
  - política de TTL por `content_type` (e.g. movies más estables que TV shows en emisión);
  - métricas y backoff para no martillar los proxies.

### Filtros adicionales en la toolbar
- El backend ya acepta `filter[source_api]`, `filter[added_by]`, `filter[list_rating_gte/lte]`, `filter[added_at_*]`, `filter[completed_at_*]`, `filter[release_date_*]`. La UI actual solo expone `status` y `content_type`; ampliar la toolbar cuando haya feedback de uso real.

### Sort drag-and-drop
- Hoy el orden de prioridad de sort se gestiona con add/remove y posición de inserción. Si los usuarios piden reordenar prioridades sin borrar, agregar drag handles en cada `SortClause`.

### Apply-sort sobre listas grandes
- `apply_sort` materializa el queryset (`list(queryset)`) y hace dos `bulk_update`. Para listas de miles de items conviene paginar el bulk_update o usar SQL crudo con `CASE WHEN`.

### Search dentro de explore
- `ListNavigationSearch` sigue siendo independiente de la query (search local en items cargados + "search all"). Una v2 podría integrarse al backend como `?search=` participando del query model.

## Riesgos
- Intentar soportar demasiados campos cross-content desde v1.
- Sobrecargar el contrato del endpoint con demasiada flexibilidad.
- Introducir ambigüedad entre vista temporal y orden persistido.

## Criterios de aceptación
- El usuario puede explorar listas grandes con filtros, sort y grouping sin inconsistencias visibles.
- La paginación sigue siendo comprensible y estable cuando la lista está agrupada.
- El orden canónico de la lista queda separado de la vista temporal del usuario.
- Casos concretos como una lista de cientos de álbumes son funcionales y rápidos.

## Interdependencias
- `Sprint 04` prepara contratos, payloads y performance para habilitar este rediseño.
- `Sprint 4.5` concreta esas mejoras del core en una experiencia funcional de listas.
- `Sprint 06` se beneficia directamente de un comportamiento de listas más predecible y observable.

## Refactors recomendados
- Query contract primero, UX después.
- Browse metadata explícita en vez de dependencia implícita de `source_data`.
- Mantener separados:
  - exploración,
  - orden canónico,
  - reorder manual.
