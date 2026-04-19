# Auditoría Técnica Completa

> **Estado (Sprint 06 cerrado).** Varios hallazgos estructurales de
> esta auditoría ya tienen una decisión registrada o una mitigación
> aplicada. Léelos junto con:
>
> - `docs/adr/0001-external-metadata-integration.md` - formaliza la
>   topología híbrida `web ↔ proxy` y `core → proxy`, sustituyendo la
>   discusión de "doble fan-out" en este documento.
> - `docs/adr/0002-web-auth-cookies.md` - plan multifase para mover
>   las sesiones del frontend a cookies `HttpOnly`. La Fase 1 (no
>   persistir tokens en `localStorage`) ya está en código.
> - `docs/contracts/internal-http.md` - contrato canónico de headers,
>   sobre de error y `request_id` entre los tres servicios.
> - `docs/observability.md` - logs estructurados, correlación por
>   `X-Request-Id` y métricas mínimas.
>
> Esta auditoría se conserva como referencia histórica del diagnóstico
> que originó el Sprint 06; los ADRs son la fuente de verdad de las
> decisiones tomadas a partir de ella.

## 1. Resumen Ejecutivo

### Descripción del sistema
`denn` es una solución de gestión y descubrimiento de contenido multimedia con tres aplicaciones principales:
- `web`: frontend Next.js para explorar contenido, buscar, gestionar listas, puntuar y navegar detalles.
- `core`: API Django/DRF para autenticación, listas, ratings, invitaciones y persistencia del dominio.
- `proxy`: gateway Go/Gin que agrega metadata externa desde TMDB, IGDB, Spotify y OpenLibrary.

### Estado general
El sistema es funcional y tiene una base técnica razonable en el backend, pero hoy arrastra cuatro problemas estructurales:
- la raíz no es un monorepo integrado sino una carpeta contenedora de tres repos separados;
- el frontend usa App Router casi como CSR tradicional, con sobrecarga clara de hidratación y render;
- el flujo `web -> proxy` y `core -> proxy` duplica contratos, manejo de errores y puntos de latencia;
- la calidad operativa está desalineada: lint roto en frontend, tests lentos en core y suite parcialmente rota en proxy.

### Fortalezas
- Separación funcional clara entre UI, dominio persistido y metadata externa.
- `core` tiene esfuerzo real de optimización ORM con `select_related`, `prefetch_related` y tests de query count.
- `proxy` encapsula providers y caching por proveedor con TTLs explícitos.
- Cobertura de tests relativamente buena en `proxy` y `core/content`.
- Dockerfiles multistage razonables en las tres apps.

### Debilidades
- No existe gobierno técnico central de workspace, calidad, versionado o compatibilidad cruzada.
- La documentación contradice al código en puntos clave, especialmente en `core`.
- El frontend prioriza UX visual y estado cliente por encima de server rendering, peso inicial y simplicidad.
- El dominio en `core` mezcla bastante lógica de negocio con serializers/viewsets.
- La confiabilidad de tests del proxy está degradada por mocks y contratos desalineados.

### Top 10 hallazgos
1. `MONO-001`: La raíz no es un monorepo integrado sino tres repos anidados sin governance central.
2. `FE-001`: El shell y las rutas principales del frontend están forzados a `use client`, elevando JS inicial e hidratación.
3. `FE-002`: Homepage serializa requests independientes en waterfall.
4. `FE-003`: `ListDetailPage` hace overfetch progresivo del dataset completo y lo procesa en memoria sin virtualización.
5. `FE-004`: Landing usa una galería 3D y un canvas de ruido con trabajo continuo de CPU/GPU.
6. `CORE-001`: `bulk_check` tiene side effects persistentes sobre una operación de consulta.
7. `CORE-002`: La invariante “no duplicar un item en una lista” no está garantizada en DB, sólo en serializer.
8. `CORE-003`: `core` depende síncronamente del `proxy` para `source_data`, sin caché propia efectiva.
9. `PROXY-001`: La suite `go test ./...` no está limpia; fallan tests de `games` y `spotify`.
10. `OPS-001`: La calidad operativa está rota en local: `npm run lint` falla y el frontend depende de red en build para Google Fonts.

### Riesgos prioritarios
- Lentitud percibida en frontend por hidratación, waterfalls, render client-side y trabajo visual excesivo.
- Latencia compuesta por doble fan-out hacia `proxy`.
- Inconsistencias de contrato entre frontend, `core` y `proxy`.
- Mayor dificultad de evolución por no existir workspace unificado.
- Riesgo de regresiones silenciosas por pipelines sin lint/typecheck/test integrados.

### Conclusión ejecutiva
El sistema tiene una dirección arquitectónica útil, pero hoy está penalizado por deuda de integración y decisiones de frontend que lo vuelven “pesado”. La prioridad no es reescribirlo, sino simplificar el flujo de datos, recuperar disciplina operativa y atacar primero los hotspots de performance y calidad que ya tienen evidencia local.

## 2. Alcance y Metodología

### Qué se auditó
- Código real, configuración, dependencias, Docker, CI, tests y flujos entre `web`, `core` y `proxy`.
- Arquitectura, funcionalidades implementadas e incompletas, calidad, seguridad básica, confiabilidad y performance.

### Cómo se auditó
- Lectura directa del árbol y entrypoints.
- Inspección de manifests, settings, middlewares, stores, hooks, serializers, handlers y tests.
- Validaciones locales no mutantes:
  - `web`: `npm run build`, `npm run lint`
  - `core`: `./.venv/bin/python manage.py test`
  - `proxy`: `env GOCACHE=/tmp/go-build-cache go test ./...`
- Dos pasadas:
  - pasada 1: mapa real, stack, rutas de integración y contradicciones docs-código;
  - pasada 2: profundización en performance, fragilidad y riesgos de evolución.

### Subagentes utilizados
- arquitectura/topología del workspace
- frontend funcional
- performance frontend
- API Core funcional/arquitectural
- performance API Core
- API Proxy/gateway

### Skills aplicadas en la consolidación
- `brainstorming`
- `systematic-debugging`
- `clean-code`
- `django-expert`
- `python-performance-optimization`
- `python-project-structure`
- `api-design-principles`
- `security-review`
- `docker-expert`
- `vercel-react-best-practices`

### Criterios de evaluación
- claridad de responsabilidades
- acoplamiento y cohesión
- performance percibida y real inferible
- caching
- paginación
- validación de datos
- manejo de errores
- seguridad básica
- mantenibilidad
- testabilidad
- confiabilidad operativa

### Limitaciones
- Alcance de performance: `local-only`.
- No se asumió disponibilidad de credenciales válidas ni profiling contra entornos reales.
- Algunos tests del `core` emiten errores de conexión al `proxy` local bajo sandbox, pero la suite completa terminó en `OK`.

## 3. Mapa del Monorepo

### Estructura general real
La raíz `/home/perso/codeyee/denn` no contiene un workspace manager (`pnpm-workspace.yaml`, `turbo.json`, `nx.json`, etc.). En la práctica es una carpeta contenedora con tres repos Git anidados:
- `web/.git`
- `core/.git`
- `proxy/.git`

### Apps
- `web`
  - Next.js 16, React 19, TypeScript 5.
  - App Router.
  - Zustand para estado global.
- `core`
  - Django 5.2, DRF, JWT.
  - Apps: `authentication`, `content`.
- `proxy`
  - Go 1.25, Gin, Redis opcional.
  - Providers: TMDB, IGDB, Spotify, OpenLibrary.

### Paquetes compartidos
- No hay librerías compartidas versionadas o paquetes internos de workspace.
- El “compartido” es por contrato HTTP y tipos locales ad hoc dentro de `web` y `core`.

### Infra y tooling
- Dockerfiles independientes:
  - `web/Dockerfile`
  - `core/Dockerfile`
  - `proxy/Dockerfile`
- En el momento de la auditoría existía compose sólo para `proxy` + Redis; luego se centralizó la operación local en el workspace root.
- Workflows centralizados en la raíz del monorepo:
  - `.github/workflows/monorepo-ci.yml`
  - `.github/workflows/deploy-web.yml`
  - `.github/workflows/deploy-core.yml`
  - `.github/workflows/deploy-proxy.yml`

### Relaciones entre componentes
- `web -> core`
  - auth, listas, ratings, `content_item`, invitaciones.
  - evidencia: `web/lib/api/api.ts`, `web/lib/api/actions/*.ts`
- `web -> proxy`
  - search, homepage, detalles multimedia.
  - evidencia: `web/lib/api/proxyApi.ts`, `web/lib/api/actions/homepage.ts`, `web/lib/api/actions/search.ts`
- `web -> /api/proxy`
  - BFF ligero en Next que inyecta `X-Api-Key`.
  - evidencia: `web/app/api/proxy/[...path]/route.ts`
- `core -> proxy`
  - enriquecimiento de `source_data` para `ContentItem`.
  - evidencia: `core/content/services/proxy_client.py`, `core/content/utils.py`

## 4. Qué Hace el Proyecto

### Objetivo del sistema
Centraliza descubrimiento y organización personal/compartida de contenido multimedia: películas, series, juegos, álbumes y libros.

### Actores
- usuario autenticado
- propietario de lista
- miembro de lista compartida
- administrador del `core`

### Problema de negocio inferido
El sistema resuelve dos necesidades:
- unificar búsqueda y detalle de contenido heterogéneo desde varias APIs externas;
- permitir que usuarios gestionen listas, estados y ratings sobre ese contenido.

### Flujo general
1. El usuario entra al frontend.
2. El frontend resuelve autenticación contra `core`.
3. Para buscar o cargar homepage usa `proxy`.
4. Para persistir items/rating/listas usa `core`.
5. Cuando `core` necesita metadata externa, consulta al `proxy`.

## 5. Aplicaciones y Responsabilidades

### 5.1 Frontend

**Propósito**
- Presentar homepage, landing, búsqueda, detalle de contenido, perfil, login/register y detalle de listas.

**Responsabilidades**
- UI, navegación, stores de auth/content/lists/UI/settings.
- Gating de auth desde cliente.
- BFF local `/api/proxy` para no exponer `API_KEY` directamente en el browser.

**Límites**
- No persiste dominio; delega todo a `core`.
- No agrega metadata externa directamente salvo vía `proxy`.

**Dependencias**
- `next`, `react`, `zustand`, `react-hook-form`, `zod`, `motion`, `gsap`, `@dnd-kit`.

**Integración**
- `getApiUrl()` contra `core`.
- `getProxyApiUrl()` contra `/api/proxy` o `proxy` directo.

### 5.2 API Core

**Propósito**
- Gestionar autenticación, usuarios, listas, invitaciones, ratings y canónicos locales de contenido.

**Responsabilidades**
- JWT auth.
- CRUD de listas e items.
- ratings y agregados (`rating_count`, `average_rating`).
- permisos y membresía.
- composición parcial con `source_data` externo.

**Límites**
- No es el gateway multimedia principal, aunque el README lo sugiera.
- No expone `/api/proxy/*`.

**Dependencias**
- Django, DRF, SimpleJWT, drf-spectacular, django-redis, whitenoise.

**Integración**
- consume `proxy` por `requests.Session`.

### 5.3 API Proxy

**Propósito**
- Gateway de lectura con auth por API key y rate limiting, que agrega metadata externa.

**Responsabilidades**
- búsqueda multi-fuente
- homepage/trending
- bulk endpoints
- detalles por provider
- caching Redis por provider

**Límites**
- no persiste dominio de usuario
- no conoce listas/rating/auth de usuarios del producto

**Dependencias**
- Gin, `go-redis`, providers por API externa.

**Integración**
- consumido por `web` y `core`.

## 6. Funcionalidades Detectadas

### Frontend
- landing pública visualmente rica
- login y registro
- homepage autenticada con sugerencias y listas
- multi-search por películas, TV, juegos, álbumes y libros
- detalle de contenido
- detalle de listas
- reordenamiento drag-and-drop
- ratings y modal “add to list”
- perfil

### API Core
- auth/register/login/logout
- CRUD de listas
- CRUD de list items
- ratings
- invitaciones a listas
- stats por lista
- `content_item` get/create por canónico local
- healthcheck, schema y endpoints de cache management

### API Proxy
- `/v1/proxy/health`
- `/search`
- `/homepage`
- `/movies`, `/tv-shows`, `/games`, `/albums`, `/books`
- `/bulk`, `/trending`, `/:id`, y season detail para TV

## 7. Funcionalidades Faltantes o Incompletas

- `README` y docs prometen capacidades que no están en el código actual de `core` como gateway multimedia.
- features “coming soon” del frontend no tienen implementación visible completa:
  - social features
  - analytics/estadísticas avanzadas
  - notifications
  - share de listas más allá de invitaciones existentes
- no hay una estrategia visible de observabilidad real: logs, métricas, tracing o dashboards.
- `proxy` no tiene cobertura limpia en servicios `games` y `spotify`.
- el pipeline no valida lint/typecheck/tests en CI.

## 8. Arquitectura

### Patrones observados
- BFF social/persistente en `core`
- gateway agregador de metadata en `proxy`
- frontend con BFF mínimo en `/api/proxy`

### Acoplamientos
- `web` depende tanto de `core` como de `proxy`.
- `core` también depende de `proxy`.
- Resultado: dos consumidores y dos capas distintas interpretando contratos externos.

### Cohesión
- `proxy` es razonablemente cohesivo.
- `core` tiene buen dominio, pero mezcla más lógica HTTP/serializer que lo deseable.
- `web` tiene mucha responsabilidad cliente concentrada en componentes y hooks pesados.

### Riesgos
- duplicación de fetch y serialización
- latencia compuesta
- contratos inconsistentes
- evolución lenta por ausencia de workspace unificado

### Oportunidades de simplificación
- definir una única ruta de consumo de metadata externa:
  - o `web -> proxy` y `core` sólo persiste,
  - o `web -> core` y `core` centraliza composición.
- reducir stores globales y mover lectura inicial a server-first en `web`.
- extraer lógica de dominio desde serializers/viewsets en `core`.

## 9. Stack Tecnológico

### `web`
- lenguaje: TypeScript
- framework: Next.js 16 + React 19
- runtime: Node 20 en Docker
- package manager: npm (`package-lock.json`)
- build tool: Next build
- testing stack: no se detectó suite de tests local en el árbol principal
- config: `web/lib/env.ts`, `EnvConfig.tsx`, env vars `API_URL`, `PROXY_API_URL`

### `core`
- lenguaje: Python
- framework: Django 5.2 + DRF
- runtime: Python 3.11 en Docker
- package manager: pip/requirements.txt
- DB: PostgreSQL o SQLite dev
- cache: Redis opcional vía `django-redis`
- auth: JWT
- docs: drf-spectacular

### `proxy`
- lenguaje: Go
- framework: Gin
- runtime: Go 1.25 / distroless runtime
- cache: Redis opcional
- auth: API key header o Bearer API key
- rate limiting: Redis key por IP

## 10. Casos de Uso Principales

### Caso 1: Home autenticada
- `web` llama `/homepage` del `proxy`.
- luego llama `/content/lists/` del `core`.
- punto débil: waterfall innecesario y payloads con `source_data`.

### Caso 2: Buscar contenido
- `web` sincroniza input con URL.
- luego llama `/search` del `proxy`.
- punto débil: doble debounce y navegación como mecanismo de estado.

### Caso 3: Ver detalle de contenido
- `web` llama `contentItemActions.getOrCreate()`.
- si no hay `source_data`, llama al action específico del `proxy`.
- punto débil: doble request y lógica condicional cliente.

### Caso 4: Gestionar lista
- `web` obtiene detalle de lista desde `core`.
- después dispara background fetch de todas las páginas de items.
- punto débil: overfetch, grouping pesado, DnD sobre datasets grandes.

## 11. Auditoría de Performance

### 11.1 Frontend
- rutas principales client-side: `web/app/page.tsx`, `web/app/search/page.tsx`, `web/app/content/page.tsx`, `web/app/lists/[id]/page.tsx`
- homepage en waterfall: `web/app/_components/pages/HomePage/hooks/useHomeData.ts`
- list detail:
  - carga inicial + background fetch completo: `web/app/_components/pages/ListDetailPage/hooks/useListData.ts`
  - agrupación/ordenamiento duplicados: `web/app/_components/pages/ListDetailPage/hooks/useListGrouping.ts`
- landing costosa:
  - `DomeGallery` con `next/image` `unoptimized`
  - `Background.tsx` con `requestAnimationFrame`
  - `Noise.tsx` generando `ImageData` de `1024x1024`

### 11.2 API Core
- dependencia síncrona al `proxy` para `source_data`.
- `bulk_fetch_source_data()` mitiga parte del N+1, pero el costo sigue siendo red síncrona.
- la propia suite muestra `109` queries para 100 items mostrando 20 resultados en `core/content/tests/test_list_item_ratings.py`.
- `page_size=0` permite bypass de paginación y devolución completa, riesgo para listas grandes.

### 11.3 API Proxy
- `homepage` hace doble fase:
  - fetch trending por servicio,
  - enriquecimiento por detalle/bulk por servicio.
- esto reduce latencia relativa frente a serializar todo, pero sigue siendo costoso y sensible a upstreams.
- `BaseClient` reintenta hasta 5 veces con backoff sobre 429 y 5xx, lo cual mejora resiliencia pero puede inflar latencia cola.

### 11.4 Hallazgos transversales
- contratos duplicados `web <-> proxy` y `core <-> proxy`
- payloads con `source_data` voluminoso
- ausencia de deduplicación cross-layer
- assets locales y animación continua empeoran performance percibida

## 12. Auditoría de Calidad de Código

### Organización y modularidad
- `proxy` está mejor estructurado por capas.
- `core` tiene dominio útil pero demasiada lógica en viewsets/serializers.
- `web` tiene componentes y hooks con tamaños altos para zonas críticas:
  - `ListDetailPage/utils.ts`: 607 líneas
  - `ListSidebarPlaceholder.tsx`: 510
  - `ListDetailPage/index.tsx`: 444

### Consistencia y contratos
- `core` tiene inconsistencias entre serializer, modelo y stats de listas.
- `get_or_create` por query params en un `POST` es un contrato frágil.
- `custom_exception_handler` en `core` aplana errores DRF y pierde granularidad por campo.

### Duplicación
- workflows de Docker build duplicados en las tres apps.
- duplicación de contratos externos entre `core` y `web`.

### Testabilidad
- `core/content` está razonablemente cubierto.
- frontend sin suite visible.
- `proxy` con buena intención de cobertura, pero suite rota en varios paquetes.

## 13. Hallazgos Priorizados

### `MONO-001` La raíz no es un monorepo integrado
- Severidad: alta
- Área: monorepo / arquitectura
- Evidencia: `web/.git`, `core/.git`, `proxy/.git`, ausencia de workspace root
- Explicación técnica: no hay una fuente central de build, dependencias o quality gates.
- Impacto: compatibilidad cruzada manual, releases más frágiles, difícil due diligence.
- Recomendación: definir workspace real o aceptar explícitamente tres repos con governance común.
- Esfuerzo estimado: medio
- Tipo: refactor estructural

### `FE-001` Shell client-side excesivo
- Severidad: alta
- Área: frontend
- Evidencia: rutas críticas con `use client`, `web/app/layout.tsx`
- Explicación técnica: se paga hidratación, stores y lógica cliente incluso en vistas que podrían ser server-first.
- Impacto: peor TTI/TBT y carga inicial.
- Recomendación: mover shell, auth gating y data inicial a server-first donde sea viable.
- Esfuerzo estimado: alto
- Tipo: refactor estructural

### `FE-002` Homepage en waterfall
- Severidad: alta
- Área: frontend
- Evidencia: `useHomeData.ts`
- Explicación técnica: `fetchLists()` espera a que termine `fetchSuggestions()`.
- Impacto: latencia acumulada visible.
- Recomendación: paralelizar requests y deduplicar cache.
- Esfuerzo estimado: bajo
- Tipo: quick win

### `FE-003` Overfetch y procesamiento pesado en listas
- Severidad: crítica
- Área: frontend
- Evidencia: `useListData.ts`, `useListGrouping.ts`, `ListDetailPage/index.tsx`
- Explicación técnica: el cliente termina cargando y reordenando datasets completos en memoria.
- Impacto: alto costo de red, CPU y render en listas medianas/grandes.
- Recomendación: virtualización, fetch por ventana, evitar background full-fetch por defecto.
- Esfuerzo estimado: alto
- Tipo: refactor estructural

### `FE-004` Landing visual excesivamente costosa
- Severidad: alta
- Área: frontend / UX
- Evidencia: `DomeGallery`, `Background.tsx`, `Noise.tsx`
- Explicación técnica: RAF continuo, 180 tiles, `next/image` sin optimización, canvas regenerado.
- Impacto: jank, peor batería y peor render inicial.
- Recomendación: simplificar hero, degradar animación por device, eliminar `unoptimized`.
- Esfuerzo estimado: medio
- Tipo: mejora incremental

### `CORE-001` `bulk_check` escribe en una operación de consulta
- Severidad: alta
- Área: api core / diseño API
- Evidencia: `core/content/views/user_list.py`
- Explicación técnica: una operación orientada a check crea `ContentItem` persistidos.
- Impacto: contaminación de base y contrato sorprendente.
- Recomendación: separar check puro de ensure/create.
- Esfuerzo estimado: medio
- Tipo: mejora incremental

### `CORE-002` Invariante de no duplicación no garantizada en DB
- Severidad: alta
- Área: api core / dominio
- Evidencia: `core/content/models/list_item.py`, `ListItemCreateSerializer.create()`
- Explicación técnica: la restricción vive en serializer, no en DB/modelo.
- Impacto: inconsistencias si se crean items fuera del serializer.
- Recomendación: agregar constraint única o rediseñar explícitamente soporte de duplicados.
- Esfuerzo estimado: medio
- Tipo: mejora incremental

### `CORE-003` Dependencia síncrona al proxy sin caché efectiva local
- Severidad: alta
- Área: api core / performance
- Evidencia: `core/content/services/proxy_client.py`, `core/content/utils.py`, `core/core/settings/cache.py`
- Explicación técnica: `core` delega performance al `proxy`; su caché propia no protege este flujo.
- Impacto: latencia, fragilidad ante caídas del `proxy`, suites ruidosas.
- Recomendación: cachear `source_data` por vista o por `ContentItem` con TTL e invalidación definida.
- Esfuerzo estimado: medio
- Tipo: mejora incremental

### `PROXY-001` Suite del proxy no está limpia
- Severidad: alta
- Área: proxy / confiabilidad
- Evidencia: `go test ./...` falló en `internal/services/games/service`, `internal/services/spotify/service`, `internal/services/spotify/mapper`
- Explicación técnica: hay mezcla de mocks mal aislados y lógica/aserciones desalineadas.
- Impacto: menos confianza para cambios en gateway y performance.
- Recomendación: estabilizar mocks, separar tests online/offline y arreglar regresiones reales.
- Esfuerzo estimado: medio
- Tipo: mejora incremental

### `OPS-001` Tooling de calidad roto en frontend
- Severidad: media
- Área: frontend / operaciones
- Evidencia: `npm run lint` falla con `TypeError: expand is not a function`
- Explicación técnica: conflicto de dependencias o configuración ESLint/Minimatch rota.
- Impacto: se pierde una barrera básica de calidad.
- Recomendación: fijar dependencia/config rota e integrar lint en CI.
- Esfuerzo estimado: bajo
- Tipo: quick win

## 14. Riesgos Principales

- Riesgo de performance percibida crónica en frontend si no se reduce CSR y overfetch.
- Riesgo de latencia compuesta y fallos cascada por doble dependencia al `proxy`.
- Riesgo de evolución lenta por ausencia de workspace y pipelines homogéneos.
- Riesgo de inconsistencias del dominio en `core` por invariantes no garantizadas en DB.
- Riesgo operativo por tests/lint no confiables en dos de las tres apps.

## 15. Conclusión General
La plataforma ya resuelve su caso de uso principal y tiene partes bien pensadas, especialmente el dominio de listas/ratings en `core` y la separación del gateway externo en `proxy`. El problema hoy no es falta de funcionalidad base, sino acumulación de complejidad accidental: frontend excesivamente client-side, integración duplicada con el `proxy`, documentación desalineada y disciplina operativa incompleta. El retorno más alto está en simplificar flujo de datos, endurecer contratos e institucionalizar quality gates.

## 16. Anexo Técnico

### Archivos inspeccionados
- `web/package.json`
- `web/next.config.ts`
- `web/app/layout.tsx`
- `web/app/page.tsx`
- `web/app/search/page.tsx`
- `web/app/content/page.tsx`
- `web/app/lists/[id]/page.tsx`
- `web/lib/api/api.ts`
- `web/lib/api/proxyApi.ts`
- `web/app/api/proxy/[...path]/route.ts`
- `web/app/_components/pages/HomePage/hooks/useHomeData.ts`
- `web/app/_components/pages/ListDetailPage/hooks/useListData.ts`
- `web/app/_components/pages/ListDetailPage/hooks/useListGrouping.ts`
- `web/app/_components/pages/LandingPage/components/DomeGallery/index.tsx`
- `web/app/_components/common/Noise.tsx`
- `core/core/settings/base.py`
- `core/core/settings/drf.py`
- `core/core/settings/cache.py`
- `core/core/urls.py`
- `core/core/healthcheck.py`
- `core/content/services/proxy_client.py`
- `core/content/utils.py`
- `core/content/views/user_list.py`
- `core/content/views/list_item.py`
- `core/content/views/list_member.py`
- `core/content/views/content_item.py`
- `core/content/serializers/content_item.py`
- `core/content/serializers/list_item.py`
- `core/content/models/list_item.py`
- `core/content/models/content_item.py`
- `proxy/cmd/api/main.go`
- `proxy/internal/config/config.go`
- `proxy/internal/middleware/auth.go`
- `proxy/internal/middleware/ratelimit.go`
- `proxy/internal/clients/httpclient.go`
- `proxy/internal/clients/cached_client.go`
- `proxy/internal/handlers/homepage/handler.go`
- `proxy/internal/handlers/multisearch/handler.go`
- `proxy/internal/services/tmdb/service/service.go`
- `proxy/internal/services/games/service/service.go`
- `proxy/internal/services/spotify/service/service.go`

### Observaciones de subagentes
- La raíz es una carpeta contenedora, no un workspace real.
- El `core` actúa como BFF de dominio, no como gateway multimedia.
- El frontend concentra los hotspots de performance más graves.

### Hipótesis abiertas
- Cuánto de la latencia percibida proviene de red real vs trabajo de render local.
- Si la dependencia doble al `proxy` fue una transición temporal o una decisión estable.

### Contradicciones detectadas entre docs y código
- La documentación histórica de `core` describía endpoints `/api/proxy/*` que el servicio no exponía.
- La documentación histórica de `core` describía health/version incompatibles con `core/core/healthcheck.py`.
- la “idea de monorepo” contradice la estructura real del workspace.
