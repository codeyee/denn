# Sprint 08
# Performance medible y velocidad percibida

## Objetivo
Atacar la lentitud actual de la app con cambios de alto impacto y bajo costo, antes y en paralelo a las grandes inversiones arquitectónicas (Sprint 5 endurece el proxy, Sprint 7 mueve la metadata a local-first).

La tesis del sprint: **la mayoría de la lentitud actual no requiere reescribir nada**. Es producto de fetching sincrónico, queries no medidas, falta de caché del lado del cliente y waterfalls de render. Se ataca con instrumentación, fixes tácticos y mejoras de UX percibida.

Este sprint **no reemplaza** a 5 ni a 7. Los complementa: lo que se haga acá baja la percepción de lentitud antes de que esos sprints estén listos, y deja la base de medición para verificar que esos sprints efectivamente ayudaron.

## Entregable principal
- Instrumentación de performance permanente en backend (medición por endpoint, query count, tiempo en proxy).
- Instrumentación de Web Vitals en frontend (LCP, INP, TTFB) con baseline registrada.
- Fixes tácticos de N+1, paralelismo y caché en `core` que no requieren rediseño.
- UX percibida: streaming SSR para detalle, optimistic updates, prefetch en hover, React Query con stale time.
- Documento de baseline antes/después con números reales por endpoint y por flujo de usuario.

## Skills guía
- `python-performance-optimization`
- `vercel-react-best-practices`
- `systematic-debugging`
- `django-expert`
- `clean-code`

## Alcance
- `core/core/settings.py` — toggles de instrumentación.
- `core/content/utils.py` — `bulk_fetch_source_data`, paralelismo, batching.
- `core/content/views/*.py` — `select_related`/`prefetch_related` faltantes, paginación.
- `core/core/middleware/` — middleware de timing por request.
- `web/lib/api/*` — config de React Query / SWR (lo que esté en uso).
- `web/app/_components/pages/ContentDetailPage/*` — streaming SSR.
- `web/app/_components/common/cards/*` — prefetch en hover.
- `web/lib/web-vitals.ts` — reporter de Web Vitals.
- `docs/perf/baseline.md` — documento de baseline.

## No objetivos
- No reescribir el core en otro lenguaje.
- No introducir un sistema de observabilidad completo (eso es Sprint 6C).
- No implementar el local-first (eso es Sprint 7) — pero sí instrumentar para que su impacto sea medible.
- No tocar la política de retries del proxy (eso es Sprint 5B).
- No optimizar el bundle de Next a profundidad (image optimization, code splitting agresivo) en este sprint salvo que aparezca un caso obvio.

## Dependencias
- Recomendado **antes o en paralelo** a Sprint 5.
- Idealmente termina antes de Sprint 7 para tener baseline contra la cual comparar el local-first.
- No depende de 4.5 (que ya está cerrado), pero se beneficia de su browse_meta para algunas mediciones.

## Backlog por lotes

### Lote 8A
**Nombre:** Medir antes que optimizar
**Resultado:** existe instrumentación que dice exactamente dónde se va el tiempo en cada request del backend y cada navegación del frontend. Hay un baseline registrado.

### Lote 8B
**Nombre:** Fixes tácticos de backend
**Resultado:** N+1 conocidos eliminados, paralelismo de `bulk_fetch_source_data` afinado, caché de queries derivadas (counts, ratings) revisada.

### Lote 8C
**Nombre:** Velocidad percibida en frontend
**Resultado:** la app se siente rápida aun cuando el backend tarda — streaming SSR, optimistic updates, prefetch en hover, stale-while-revalidate.

### Lote 8D
**Nombre:** Verificación y documentación
**Resultado:** baseline antes/después documentada, regresiones de performance detectables vía CI o checklist manual.

## Secuencia sugerida de PRs

### PR-8A Performance instrumentation
- Activar `django-silk` o `django-debug-toolbar` en dev (no en prod).
- Middleware en `core` que loggea por request: endpoint, latencia total, query count, tiempo en proxy (si aplica).
- Reporter de Web Vitals en `web/lib/web-vitals.ts` que envía a consola en dev y a un endpoint de logging en prod (usar el que decida Sprint 6C; mientras tanto, `console.log` estructurado).
- Capturar baseline: 5 endpoints más usados del backend, 3 flujos de usuario más comunes del frontend. Documentarlo en `docs/perf/baseline.md`.

### PR-8B Backend tactical fixes
- Auditar `select_related`/`prefetch_related` en views más usadas. Agregar lo que falte. Tests con `assertNumQueries`.
- `bulk_fetch_source_data`: subir `max_workers` del `ThreadPoolExecutor` de 4 a un valor calibrado (probablemente 8-16 según latencia del proxy).
- Verificar que se usan los bulk endpoints del proxy en todos los caminos donde aplique (no llamadas individuales en loop).
- Revisar caches de DB (Django query cache, `cached_property` en serializers donde aplique).

### PR-8C Frontend perceived speed
- Convertir `ContentDetailPage` a streaming SSR de Next.js: skeleton inmediato + datos en chunks.
- React Query/SWR (el que esté en uso) con `staleTime` agresivo en endpoints idempotentes (lists, content detail).
- Optimistic updates en mutaciones rápidas: rate, toggle status, add to list, reorder. Rollback en error.
- Prefetch en hover de cards: pre-cargar el detalle del item al pasar el mouse 200ms.
- `<Link prefetch>` revisado en navegaciones internas.

### PR-8D Baseline comparison and CI gate
- Documento `docs/perf/baseline.md` con métricas pre/post de PR-8B y PR-8C.
- Definir umbrales aceptables por endpoint (e.g. "lista de 100 items < 400ms p95").
- Checklist manual para pre-merge en PRs de feature: "¿este PR afecta perf? ¿corriste el flujo X y comparaste?".
- Opcional si hay tiempo: workflow de GitHub Actions que corre Lighthouse contra una preview y comenta en el PR.

## Tareas

### T1. Instrumentar backend
- Subtareas:
  - decidir entre `django-silk` (UI rica, persistencia en DB), `django-debug-toolbar` (más liviano, dev-only), o middleware custom mínimo;
  - middleware que en cada request emite log estructurado: `{path, method, status, duration_ms, query_count, db_time_ms, proxy_time_ms, proxy_calls}`;
  - feature flag por env var: `PERF_LOGGING_ENABLED=true` para encender/apagar sin redeploy;
  - test que valida que el middleware no rompe ningún request existente.
- Recomendación:
  - el middleware debe ser barato (<1ms overhead) o se vuelve parte del problema. Medir el overhead antes de mergear.

### T2. Instrumentar frontend
- Subtareas:
  - usar `web-vitals` package oficial (next/web-vitals) para LCP, INP, CLS, TTFB, FCP;
  - reporter que en dev imprime en consola con threshold de color, en prod manda a un endpoint;
  - registrar las métricas por ruta para distinguir lentitud de detalle vs lista vs home;
  - capturar baseline manual en al menos 3 flujos: cargar home, abrir un detalle, listar 100 items en una lista.
- Recomendación:
  - Web Vitals son distintos a lo que mide el backend. INP captura interacción real, no solo respuesta de servidor.

### T3. Eliminar N+1 conocidos
- Subtareas:
  - usar la instrumentación de T1 para identificar endpoints con query_count > 10;
  - corregir con `select_related` (FK) o `prefetch_related` (M2M, reverse FK);
  - tests con `assertNumQueries` que fijan el contrato de query count para no regresar;
  - prioridad: `/lists/`, `/lists/<id>/`, `/lists/<id>/items/`, `/content/<id>/`.
- Recomendación:
  - Sprint 4 ya redujo el caso de 109 queries para 100 items. Validar que sigue así y que no aparecieron nuevos.

### T4. Afinar paralelismo y bulk del proxy
- Subtareas:
  - medir latencia del proxy bajo distintos `max_workers` del `ThreadPoolExecutor`;
  - encontrar el sweet spot (probablemente entre 8 y 16 según el rate limit del proxy);
  - asegurar que todas las llamadas usan endpoints bulk (`/movies/bulk`, `/tv-shows/bulk`, etc.) y no individuales en loop;
  - timeout configurable y razonable (ya existe en proxy client, validar que sea sano);
  - métricas: latencia proxy p50/p95, error rate, cache hit ratio (esto último depende de Sprint 5).
- Recomendación:
  - subir el paralelismo es gratis hasta que el proxy se queja. Aprovechar.

### T5. Streaming SSR y skeleton
- Subtareas:
  - Next.js App Router soporta streaming nativo con `Suspense` y `loading.tsx`;
  - `ContentDetailPage` muestra skeleton del header/imagen instantáneo, hidratado luego;
  - data fetching en componentes server con `Suspense` boundaries;
  - validar Web Vitals antes/después: LCP debería bajar significativamente.
- Recomendación:
  - el skeleton debe matchear el layout final lo más posible para no causar CLS.

### T6. React Query / SWR con stale-while-revalidate
- Subtareas:
  - identificar qué cliente está en uso hoy (revisar `package.json` y `web/lib/api/`);
  - `staleTime` por tipo de recurso:
    - lista de listas del usuario: 60s;
    - detalle de lista: 30s;
    - items de lista: 30s;
    - detalle de content item: 5min (después de Sprint 7, 30min);
  - `refetchOnWindowFocus` decidido por recurso, no global;
  - cache compartido entre rutas para que navegar atrás sea instantáneo.
- Recomendación:
  - el patrón "stale data instantly + revalidate in background" da la sensación más fuerte de velocidad.

### T7. Optimistic updates en mutaciones críticas
- Subtareas:
  - identificar mutaciones donde el usuario espera ver cambio inmediato:
    - toggle item status (pending/completed),
    - rate item,
    - add item to list,
    - reorder (ya tiene algo de optimismo, validar);
  - implementar optimistic update con rollback en error;
  - mostrar error toast en rollback.
- Recomendación:
  - empezar con las 2-3 mutaciones más frecuentes. No optimistic-update todo.

### T8. Prefetch en hover y `<Link prefetch>`
- Subtareas:
  - en `ListItemRenderer` y `ContentCard`, agregar handler que al hover por 150-200ms haga prefetch del detalle;
  - usar el cliente de data fetching existente para que el prefetch popule el caché;
  - revisar `<Link>` de Next.js: `prefetch={true}` por default en links internos visibles en viewport.
- Recomendación:
  - prefetch agresivo es gratis si el endpoint es barato. Si después de Sprint 7 el detalle tarda 30ms, prefetch en hover hace que el click se sienta instantáneo.

### T9. Documentar baseline y umbrales
- Subtareas:
  - `docs/perf/baseline.md` con tabla por endpoint: nombre, condiciones (n items, etc.), p50/p95 antes, p50/p95 después, query count;
  - tabla por flujo de frontend: nombre, LCP, INP, TTFB antes/después;
  - umbrales aceptables documentados: e.g. "p95 de lista de 100 items debe ser < 400ms";
  - cómo reproducir las mediciones (qué endpoint, qué payload, qué herramienta).
- Recomendación:
  - sin baseline documentada, en 6 meses nadie sabe si la app está más rápida o más lenta que antes.

## Checklist de implementación

### Lote 8A
- [ ] Middleware de timing instalado en `core` con feature flag.
- [ ] Reporter de Web Vitals instalado en `web`.
- [ ] Baseline inicial registrado en `docs/perf/baseline.md` para los 5 endpoints más usados y los 3 flujos más comunes.
- [ ] La instrumentación tiene overhead < 1ms por request en backend.

### Lote 8B
- [ ] No hay endpoints en uso real con query_count > 10 sin justificación documentada.
- [ ] `bulk_fetch_source_data` usa el `max_workers` calibrado y endpoints bulk consistentemente.
- [ ] Tests con `assertNumQueries` cubren los 4 endpoints prioritarios.
- [ ] Latencia p95 medida en al menos un endpoint mejoró respecto al baseline.

### Lote 8C
- [ ] `ContentDetailPage` renderiza skeleton instantáneo y stream de datos.
- [ ] React Query/SWR configurado con `staleTime` por recurso.
- [ ] Mutaciones críticas (toggle status, rate, add to list) son optimistic.
- [ ] Cards hacen prefetch del detalle en hover.
- [ ] `<Link prefetch>` revisado en navegaciones internas.

### Lote 8D
- [ ] `docs/perf/baseline.md` actualizado con números antes/después.
- [ ] Umbrales aceptables por endpoint y flujo documentados.
- [ ] Checklist de pre-merge para PRs que afectan perf, escrita y referenciada en CONTRIBUTING o equivalente.

## Checklist de validación
- [ ] La instrumentación no afecta producción (feature flags off por default en prod).
- [ ] LCP de `ContentDetailPage` mejoró al menos 30% respecto al baseline.
- [ ] La navegación entre lista y detalle es instantánea (sin loader visible) cuando ambos están en cache.
- [ ] Toggle status de un item se siente inmediato (optimistic).
- [ ] Hover en card prefetchea el detalle.
- [ ] `npm run build` y `manage.py test` siguen pasando.

## Riesgos
- **Optimización prematura**: si se hace antes de medir, se gasta tiempo en lo equivocado. Mitigación: T1/T2 son prerrequisito de todo lo demás.
- **Optimistic updates con bugs**: rollback mal hecho deja UI mintiendo. Mitigación: empezar con 2-3 mutaciones, tests visuales, error toasts claros.
- **Prefetch agresivo agota el proxy**: si cada hover dispara una request al backend, y el backend va al proxy, se multiplica el costo. Mitigación: prefetch debería golpear el cache de React Query primero; los hits a backend solo si el cache expiró. Y después de Sprint 7 esto deja de ser un problema (DB local).
- **Streaming SSR rompe SEO o accessibility**: si el contenido crítico se sirve fuera del HTML inicial, crawlers viejos no lo ven. Mitigación: el contenido SEO-importante (título, descripción) va en el server component primario, no en `Suspense`.
- **CLS por skeleton mal dimensionado**: si el skeleton no matchea el layout real, el contenido salta al hidratar. Mitigación: medir CLS con Web Vitals, iterar.
- **Stale data molesta**: si `staleTime` es demasiado agresivo, el usuario ve datos viejos en lugares donde espera frescura. Mitigación: por recurso, no global. Mutaciones invalidan su key.

## Criterios de aceptación
- Existe medición continua de performance en backend y frontend.
- Hay un documento de baseline que sobrevive a este sprint.
- Al menos un endpoint backend bajó su latencia p95 medida.
- Al menos una vista del frontend bajó su LCP medido.
- La app se siente más rápida en navegaciones repetidas (cache hits visibles).
- Las mutaciones críticas son optimistic y no bloquean la UI esperando al backend.

## Interdependencias
- **Sprint 5** (proxy reliability) reduce la latencia upstream que mide este sprint. Coordinar para que las métricas de baseline reflejen el estado actual del proxy.
- **Sprint 6C** (observability mínima) entrega correlation IDs y métricas estructuradas. Ideal que la instrumentación de este sprint use el formato compatible.
- **Sprint 7** (local-first) es el cambio más grande de performance percibida. La baseline de este sprint es la línea contra la cual se medirá el impacto de 7.
- Habilita features futuras de tipo "infinite scroll", "search instantáneo", "prefetch agresivo en background" porque deja la base de instrumentación para validarlas.

## Refactors recomendados
- No introducir un APM externo (Datadog, NewRelic) en este sprint. Logs estructurados + Web Vitals son suficientes hasta que aparezca una necesidad real.
- Centralizar la configuración de React Query/SWR en un lugar único, no por componente.
- Mantener la instrumentación opcional vía feature flag, no acoplada al código de negocio.
- No optimizar a ciegas: cada PR de optimización debe tener un número antes y un número después.

## Follow-ups (NO se hacen en este sprint)
- **APM real (Datadog, NewRelic, OpenTelemetry)**: cuando el equipo crezca y haga falta debug en producción a profundidad.
- **Lighthouse CI en pull requests**: si Sprint 8D no llegó, hacerlo en un sprint posterior.
- **Code splitting agresivo y route-based bundle optimization**: si el bundle del frontend se vuelve un problema medible.
- **Image optimization end-to-end (next/image con CDN configurado)**: si las imágenes externas (TMDB, IGDB) son cuello de botella en LCP.
- **Service Worker para offline-first del frontend**: solo si el caso de uso lo justifica (PWA real).
- **Cache server-side de respuestas de `core` (Redis)**: solo si después de Sprint 7 sigue habiendo endpoints calientes lentos.
- **Database read replicas**: solo cuando la carga lo justifique. Hoy no.
