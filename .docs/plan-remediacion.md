# Plan de Remediación

> **Estado (Sprint 06 cerrado).** Las acciones de gobernanza, contratos
> internos y observabilidad de este plan se ejecutaron en el Sprint 06.
> Las decisiones derivadas viven ahora en:
>
> - `docs/adr/0001-external-metadata-integration.md` - topología
>   `web ↔ proxy` y `core → proxy` (cierra la discusión sobre el
>   "doble fan-out").
> - `docs/adr/0002-web-auth-cookies.md` - plan multifase para sesión
>   por cookies `HttpOnly`; Fase 1 implementada.
> - `docs/contracts/internal-http.md` - contrato HTTP interno
>   canónico (headers, sobre de error, `request_id`, paginación).
> - `docs/observability.md` - logs JSON, `X-Request-Id` end-to-end y
>   métricas mínimas en el `proxy`.
>
> Los quick wins de frontend y los hallazgos de calidad operativa
> siguen vigentes salvo donde el sprint los haya cerrado; este plan se
> mantiene como guía táctica complementaria a los ADRs.

## 1. Estrategia General
- Atacar primero lo que da retorno inmediato en UX y confiabilidad sin bloquear la arquitectura futura.
- Orden recomendado:
  1. recuperar quality gates y corregir tooling roto;
  2. reducir waterfalls y overfetch del frontend;
  3. endurecer contratos e invariantes en `core`;
  4. estabilizar `proxy` y sus tests;
  5. decidir la topología objetivo del workspace y de la integración con el `proxy`.
- Dependencias clave:
  - no conviene optimizar fino el frontend antes de decidir si seguirá consumiendo `proxy` directo o vía `core`;
  - no conviene consolidar documentación hasta definir topología real de repos/workspace.

## 2. Quick Wins (1-3 días)

### QW-1 Corregir lint roto del frontend
- Problema: `npm run lint` falla con `TypeError: expand is not a function`.
- Acción concreta: fijar/actualizar la dependencia o configuración que rompe `minimatch`/ESLint y dejar `npm run lint` estable.
- Impacto esperado: recupera una barrera básica de calidad y permite integrar lint en CI.
- Riesgo: bajo.
- Área responsable: frontend/platform.

### QW-2 Paralelizar requests de homepage
- Problema: `useHomeData()` serializa `fetchSuggestions()` y `fetchLists()`.
- Acción concreta: disparar ambos requests en paralelo y consolidar estado/error de forma independiente.
- Impacto esperado: menor latencia percibida en home.
- Riesgo: bajo.
- Área responsable: frontend.

### QW-3 Eliminar doble debounce/router churn en search
- Problema: búsqueda pasa por input -> debounce -> URL -> debounce -> fetch.
- Acción concreta: usar un único debounce como disparador de búsqueda y sincronizar URL sin convertirla en cuello de botella.
- Impacto esperado: búsqueda más reactiva y menos renders.
- Riesgo: bajo.
- Área responsable: frontend.

### QW-4 Integrar checks mínimos en CI
- Problema: los workflows sólo construyen y publican imágenes.
- Acción concreta: agregar jobs de `lint`, `test` y build antes de push de imagen, por repo.
- Impacto esperado: menos regresiones silenciosas.
- Riesgo: bajo.
- Área responsable: platform.

### QW-5 Corregir fallos de tests en `proxy`
- Problema: `go test ./...` falla en `games` y `spotify`.
- Acción concreta: arreglar mocks/aserciones desalineadas y separar tests que dependan de red/token real.
- Impacto esperado: confianza mínima para tocar gateway.
- Riesgo: medio.
- Área responsable: backend/proxy.

## 3. Corto Plazo (1-2 semanas)

### CP-1 Rediseñar carga de `ListDetailPage`
- Problema: muestra inicial + descarga completa en background + procesamiento en memoria.
- Acción concreta:
  - dejar de hacer `loadAllItems()` por defecto;
  - paginar por viewport o por interacción;
  - virtualizar vistas planas/galería;
  - reservar fetch completo sólo para reorder explícito.
- Impacto esperado: mejora fuerte de CPU, memoria y red.
- Riesgo: medio.
- Área responsable: frontend.

### CP-2 Reducir client boundaries en frontend
- Problema: shell y rutas críticas son casi totalmente client-side.
- Acción concreta:
  - mover data inicial y shell a server components donde aplique;
  - dejar stores cliente sólo para estado realmente interactivo;
  - minimizar providers globales.
- Impacto esperado: menos JS inicial e hidratación.
- Riesgo: medio-alto.
- Área responsable: frontend.

### CP-3 Corregir contratos frágiles en `core`
- Problema: `content_item.get_or_create` usa `POST` con query params; `bulk_check` escribe en una consulta.
- Acción concreta:
  - separar endpoint de “ensure/create” del endpoint de “check” puro;
  - mover inputs a body validado;
  - normalizar respuestas de error.
- Impacto esperado: API más predecible y menos side effects inesperados.
- Riesgo: medio.
- Área responsable: backend/core.

### CP-4 Asegurar invariantes de listas en DB
- Problema: evitar duplicados depende del serializer.
- Acción concreta:
  - decidir explícitamente si se permiten duplicados;
  - si no se permiten, agregar `UniqueConstraint(user_list, content_item)`;
  - si se permiten, alinear serializer, docs y UX con esa decisión.
- Impacto esperado: menos inconsistencias de dominio.
- Riesgo: medio.
- Área responsable: backend/core.

### CP-5 Endurecer hardening de secretos/config
- Problema: el route handler del frontend acepta `NEXT_PUBLIC_PROXY_API_KEY` como fallback; tokens JWT están en `localStorage` vía Zustand persist.
- Acción concreta:
  - eliminar cualquier fallback público para secretos;
  - revisar migración a cookies httpOnly para auth;
  - documentar env vars permitidas por contexto.
- Impacto esperado: reduce exposición de credenciales y superficie XSS.
- Riesgo: medio.
- Área responsable: frontend + backend.

## 4. Medio Plazo (2-6 semanas)

### MP-1 Definir una sola estrategia de acceso a metadata externa
- Problema: `web` y `core` consumen `proxy` en paralelo.
- Acción concreta:
  - decidir entre `web -> proxy` directo o `web -> core -> proxy`;
  - versionar y documentar el contrato resultante;
  - eliminar la ruta redundante.
- Impacto esperado: menos duplicación, menos latencia compuesta y menos manejo de errores duplicado.
- Riesgo: alto.
- Área responsable: arquitectura.

### MP-2 Introducir caché coherente de `source_data`
- Problema: `core` depende del caché del `proxy` y no protege su propio flujo.
- Acción concreta:
  - definir TTL por tipo de contenido;
  - cachear `source_data` por `ContentItem` o por respuesta serializada;
  - invalidar por tiempo o por cambios de contrato.
- Impacto esperado: menor latencia y menor presión sobre `proxy`.
- Riesgo: medio.
- Área responsable: backend/core.

### MP-3 Refactorizar lógica de dominio fuera de serializers/viewsets
- Problema: `core` concentra lógica de negocio en capa HTTP.
- Acción concreta:
  - extraer servicios de dominio para listas, membership, ratings y `source_data`;
  - dejar serializers para validación y mapping.
- Impacto esperado: mejor testabilidad y menor acoplamiento.
- Riesgo: medio.
- Área responsable: backend/core.

### MP-4 Simplificar la landing pesada
- Problema: hero 3D + ruido continuo + imágenes no optimizadas.
- Acción concreta:
  - crear modo liviano por device/perf budget;
  - eliminar `unoptimized` donde no sea imprescindible;
  - detener animaciones continuas fuera de viewport o en reduce-motion.
- Impacto esperado: mejora de render inicial, scroll y batería.
- Riesgo: bajo-medio.
- Área responsable: frontend/design engineering.

## 5. Largo Plazo / Refactor Estructural

### LP-1 Formalizar la topología del workspace
- Opción A: monorepo real con workspace, quality gates y release orchestration.
- Opción B: aceptar tres repos separados y crear governance compartida explícita.
- Resultado esperado: menos ambigüedad operativa y mejor trazabilidad de cambios cruzados.

### LP-2 Unificar observabilidad
- Introducir logging estructurado, correlation IDs, métricas de latencia por endpoint y trazas entre `web`, `core` y `proxy`.
- Resultado esperado: pasar de performance inferida a performance medible.

### LP-3 Versionar contratos internos
- Documentar y versionar contratos `web <-> core`, `web <-> proxy`, `core <-> proxy`.
- Resultado esperado: menos roturas por cambios implícitos.

## 6. Plan específico de performance frontend

### Prioridad 1
- Rediseñar `ListDetailPage` para:
  - no cargar todo por defecto,
  - virtualizar listas/galería,
  - hacer reorder sobre dataset explícitamente cargado.

### Prioridad 2
- Reducir CSR estructural:
  - server components para shell/data inicial,
  - stores sólo para estado interactivo,
  - slicing/selectors en Zustand.

### Prioridad 3
- Eliminar waterfalls:
  - home en paralelo,
  - search con un único debounce,
  - detail con deduplicación de fetch.

### Prioridad 4
- Bajar costo visual:
  - simplificar `DomeGallery`,
  - detener `Noise` continuo o hacerlo estático,
  - usar budgets de assets.

## 7. Plan específico de performance API

### `core`
- Convertir `bulk_check` en operación read-only.
- Evitar `page_size=0` como patrón por defecto; reservarlo a usos controlados.
- Cachear `source_data` de forma local y reducir llamadas redundantes al `proxy`.
- Revisar el caso que produce `109` queries en `test_list_item_ratings.py` y mover cálculo a annotations/prefetch consistente.

### `proxy`
- Revisar coste de `/homepage` y `/search` en volumen.
- Limitar retries efectivos por tipo de error para evitar colas largas.
- Estabilizar y perfilar `games`/`spotify`.
- Medir tamaño de payloads y considerar respuestas más compactas donde aplique.

## 8. Plan de mejora de calidad de código
- Endurecer contratos de API y errores.
- Extraer lógica de dominio desde viewsets/serializers.
- Reducir tamaño de componentes críticos en `web`.
- Quitar artefactos locales pesados del árbol activo o de la historia del repo si están versionados.
- Eliminar contradicciones docs-código y documentar arquitectura real.

## 9. Plan de testing, observabilidad y confiabilidad
- CI:
  - `web`: lint + build
  - `core`: tests
  - `proxy`: tests
- Separar tests offline de tests que dependan de proveedores.
- Añadir smoke tests para flujos críticos:
  - login
  - home
  - search
  - list detail
  - rating
- Introducir logs estructurados y health/readiness consistentes.

## 10. Orden recomendado de ejecución
1. Corregir `npm run lint` y estabilizar `go test ./...`.
2. Paralelizar homepage y simplificar search.
3. Rediseñar `ListDetailPage` y virtualizar renderizado.
4. Endurecer `core`: `bulk_check`, `get_or_create`, constraints e inconsistencias de membership/stats.
5. Definir la ruta única de consumo de metadata externa.
6. Introducir caché coherente y observabilidad.
7. Formalizar topología de repos/workspace y governance de CI.
