# Performance Hotspots

## 1. Resumen de Hotspots

### Top hotspots detectados
1. `FE-PERF-001`: shell del frontend demasiado client-side.
2. `FE-PERF-003`: `ListDetailPage` hace overfetch del dataset completo y lo procesa/renderiza en cliente.
3. `FE-PERF-006`: landing hero extremadamente costosa por DOM 3D, canvas y animación continua.
4. `CORE-PERF-001`: `core` depende síncronamente del `proxy` para `source_data`.
5. `CORE-PERF-002`: listas con query count alto en caso de ratings.
6. `PROXY-PERF-001`: `/homepage` hace fan-out y enriquecimiento doble, costoso por diseño.

### Severidad e impacto UX/latencia
- Crítica:
  - `FE-PERF-003`
- Alta:
  - `FE-PERF-001`
  - `FE-PERF-002`
  - `FE-PERF-006`
  - `CORE-PERF-001`
  - `PROXY-PERF-001`
- Media:
  - `FE-PERF-005`
  - `FE-PERF-007`
  - `FE-PERF-008`
  - `CORE-PERF-002`

## 2. Frontend Hotspots

### `FE-PERF-001` Shell principal forzado a CSR
- Evidencia:
  - `web/app/page.tsx`
  - `web/app/search/page.tsx`
  - `web/app/content/page.tsx`
  - `web/app/lists/[id]/page.tsx`
  - `web/app/layout.tsx`
- Zona afectada: home, search, content detail, list detail, shell global.
- Mecanismo:
  - App Router se usa con muchas rutas críticas como `use client`.
  - providers globales cliente envuelven toda la app.
  - se paga hidratación y ejecución de stores/hooks para demasiada superficie.
- Impacto:
  - peor TTI/TBT,
  - más JS inicial,
  - carga más lenta en dispositivos medios.
- Recomendación:
  - mover data inicial y shell a server components,
  - minimizar providers globales,
  - dejar client-side sólo para interacción.
- Esfuerzo: alto.
- Prioridad: alta.

### `FE-PERF-002` Homepage en waterfall
- Evidencia:
  - `web/app/_components/pages/HomePage/hooks/useHomeData.ts`
- Zona afectada: homepage autenticada.
- Mecanismo:
  - `fetchSuggestions()` corre primero.
  - `fetchLists()` espera a `suggestionsLoaded`.
- Impacto:
  - latencia acumulada innecesaria.
- Recomendación:
  - ejecutar requests en paralelo,
  - separar estado de error por request.
- Esfuerzo: bajo.
- Prioridad: alta.

### `FE-PERF-003` List detail hace overfetch secuencial y render sin virtualización
- Evidencia:
  - `web/app/_components/pages/ListDetailPage/hooks/useListData.ts`
  - `web/app/_components/pages/ListDetailPage/hooks/useListGrouping.ts`
  - `web/app/_components/pages/ListDetailPage/index.tsx`
- Archivo/zona afectada: `ListDetailPage`.
- Mecanismo:
  - se pide `items_size=50`,
  - 500 ms después se descarga todo en páginas de 100 con `await` secuencial,
  - luego se agrupa/ordena/pagina en memoria,
  - se renderiza sobre vistas y DnD sin virtualización.
- Impacto:
  - consumo alto de red, heap y CPU,
  - jank en listas medianas/grandes,
  - percepción clara de UI “pesada”.
- Recomendación:
  - no descargar todo por defecto,
  - fetch incremental por ventana,
  - virtualización,
  - reorder sobre carga explícita.
- Esfuerzo: alto.
- Prioridad: crítica.

### `FE-PERF-004` `useListGrouping` repite trabajo O(n)
- Evidencia:
  - `web/app/_components/pages/ListDetailPage/hooks/useListGrouping.ts`
- Zona afectada: list detail.
- Mecanismo:
  - agrupa, ordena, aplana, pagina, reagrupa y reordena.
- Impacto:
  - más CPU por cada cambio de sort/group/page.
- Recomendación:
  - definir una sola estrategia:
    - o agrupar después de paginar,
    - o paginar por grupo,
    - pero evitar doble pipeline.
- Esfuerzo: medio.
- Prioridad: alta.

### `FE-PERF-005` Search usa doble debounce y router como estado
- Evidencia:
  - `web/app/_components/pages/SearchPage/hooks/useSearchQuery.ts`
  - `web/app/_components/pages/SearchPage/hooks/useSearchResults.ts`
- Zona afectada: búsqueda.
- Mecanismo:
  - input local -> debounce -> `router.push()` -> debounce -> fetch.
- Impacto:
  - sensación de búsqueda lenta y más renders/navegación.
- Recomendación:
  - dejar una sola fuente de debounce,
  - sincronizar URL de forma secundaria.
- Esfuerzo: bajo.
- Prioridad: media-alta.

### `FE-PERF-006` Landing hero excesivamente costosa
- Evidencia:
  - `web/app/_components/pages/LandingPage/components/DomeGallery/index.tsx`
  - `web/app/_components/pages/LandingPage/components/Background.tsx`
  - `web/app/_components/common/Noise.tsx`
- Archivo/zona afectada: landing.
- Mecanismo:
  - muchos tiles 3D,
  - `next/image` con `unoptimized`,
  - `requestAnimationFrame` continuo,
  - canvas de ruido regenerado cada pocos frames.
- Impacto:
  - CPU/GPU altas,
  - peor batería,
  - frame drops y mayor coste de render inicial.
- Recomendación:
  - hero liviano por defecto,
  - motion degradable,
  - eliminar `unoptimized` salvo necesidad demostrada,
  - convertir ruido en textura estática o muy esporádica.
- Esfuerzo: medio.
- Prioridad: alta.

### `FE-PERF-007` Hover cards con listeners globales y portal animado
- Evidencia:
  - `web/app/_components/common/cards/Card/hooks/useCardHover.ts`
  - `web/app/_components/common/cards/Card/index.tsx`
- Mecanismo:
  - listeners globales `scroll` y `resize`,
  - recálculo de layout con `getBoundingClientRect()`,
  - portal con animación.
- Impacto:
  - jank al mover mouse sobre grids/carruseles densos.
- Recomendación:
  - limitar overlays a interacciones más controladas,
  - deduplicar listeners,
  - medir si el popover aporta valor real.
- Esfuerzo: medio.
- Prioridad: media.

### `FE-PERF-008` Timers/intervalos innecesariamente recreados
- Evidencia:
  - `web/app/_components/pages/HomePage/FeaturedBanner/hooks/useBannerAutoRotation.ts`
- Mecanismo:
  - el `setInterval` se recrea por dependencia en `index`.
- Impacto:
  - churn evitable en una UI ya cargada de animación.
- Recomendación:
  - usar un único intervalo estable o `requestAnimationFrame` controlado.
- Esfuerzo: bajo.
- Prioridad: media.

## 3. API Core Hotspots

### `CORE-PERF-001` Dependencia síncrona de `source_data` hacia el `proxy`
- Evidencia:
  - `core/content/services/proxy_client.py`
  - `core/content/utils.py`
  - `core/content/serializers/content_item.py`
- Archivo/zona afectada: serializers de `ContentItem` y listas.
- Mecanismo:
  - serializar items puede disparar fetch de metadata externa.
  - aunque existe `bulk_fetch_source_data()`, sigue habiendo I/O síncrono durante request.
- Impacto:
  - latencia añadida,
  - sensibilidad a salud del `proxy`,
  - más ruido en tests.
- Recomendación:
  - cache local,
  - precálculo/TTL,
  - evitar fetch en serializer cuando no sea imprescindible.
- Esfuerzo: medio.
- Prioridad: alta.

### `CORE-PERF-002` Query count alto en ratings/listas
- Evidencia:
  - `core/content/tests/test_list_item_ratings.py`
  - salida local: `Query count for 100 items (showing 20): 109`
- Zona afectada: list items con ratings.
- Mecanismo:
  - persisten caminos de cálculo por item en serializer/fallback.
- Impacto:
  - escalado deficiente al crecer listas y ratings.
- Recomendación:
  - mover cálculo de `list_rating` y `member_rating_count` a annotations/prefetch consistente.
- Esfuerzo: medio.
- Prioridad: media-alta.

### `CORE-PERF-003` `page_size=0` permite bypass total de paginación
- Evidencia:
  - `core/core/pagination.py`
  - `core/content/views/list_item.py`
- Mecanismo:
  - al pedir `page_size=0`, la view devuelve queryset completo.
- Impacto:
  - respuestas grandes,
  - consumo de memoria y serialización costosos.
- Recomendación:
  - reservarlo a endpoints internos o casos controlados,
  - fijar límites máximos reales.
- Esfuerzo: bajo.
- Prioridad: media.

## 4. API Proxy Hotspots

### `PROXY-PERF-001` `/homepage` hace doble fan-out por diseño
- Evidencia:
  - `proxy/internal/handlers/homepage/handler.go`
  - `proxy/internal/services/tmdb/service/service.go`
- Zona afectada: homepage agregada.
- Mecanismo:
  - fase 1: trending/popular de 5 servicios,
  - fase 2: enriquecimiento con detalle/bulk por tipo.
- Impacto:
  - endpoint caro y sensible a upstreams lentos.
- Recomendación:
  - limitar payload,
  - cachear la respuesta agregada,
  - evaluar si todos los detalles completos son necesarios en home.
- Esfuerzo: medio.
- Prioridad: alta.

### `PROXY-PERF-002` Retries con backoff pueden inflar latencia
- Evidencia:
  - `proxy/internal/clients/httpclient.go`
- Mecanismo:
  - hasta 5 retries en 429/5xx con backoff creciente.
- Impacto:
  - mejora resiliencia, pero puede empeorar p95/p99.
- Recomendación:
  - revisar política por provider,
  - no tratar igual 429 que errores de parseo o server.
- Esfuerzo: medio.
- Prioridad: media.

### `PROXY-PERF-003` Rate limit depende del mismo backend de caché
- Evidencia:
  - `proxy/internal/middleware/ratelimit.go`
  - `proxy/internal/clients/cache.go`
- Mecanismo:
  - si Redis falla y se usa `NoOpCache`, el middleware queda fail-open.
- Impacto:
  - riesgo operativo más que latencia pura, pero puede amplificar carga.
- Recomendación:
  - separar política de degradación y telemetría de rate limiting.
- Esfuerzo: bajo-medio.
- Prioridad: media.

## 5. Problemas transversales

### Contratos costosos
- `web` y `core` consumen `proxy`; ambos pagan serialización, timeouts y mapping.

### Payloads grandes
- `source_data` viaja hasta `web` y puede incluir estructuras amplias.

### Duplicación de llamadas
- content detail puede hacer `get_or_create` en `core` y luego un detail fetch al `proxy`.

### Falta de caché coordinada
- `proxy` cachea por provider, pero `core` no gobierna su propia capa de `source_data`.

### Composición ineficiente
- home agrega dos requests desde `web`, y una de ellas ya es agregada/costosa en `proxy`.

### Serialización innecesaria
- demasiado trabajo de transformación ocurre en cliente, no donde se produce el dato.

## 6. Quick Wins de performance
- Paralelizar homepage.
- Eliminar doble debounce de search.
- Desactivar background full-fetch de listas salvo necesidad explícita.
- Quitar `unoptimized` en imágenes del hero si no hay una razón funcional.
- Limitar `page_size=0` o esconderlo del flujo normal.
- Añadir caché agregada para `/homepage`.

## 7. Mejoras estructurales de performance
- Adoptar estrategia server-first en frontend.
- Virtualizar listas/galerías y separar reorder de la vista general.
- Definir una sola ruta de consumo de metadata externa.
- Introducir caché coherente de `source_data` en `core`.
- Añadir observabilidad real para medir:
  - TTFB/TTI frontend,
  - latencia por endpoint,
  - tiempo de fan-out por provider,
  - tamaño de payloads.
