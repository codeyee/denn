# Sprint 02
# Frontend Home/Search Server-First

## Objetivo
Reducir la lentitud percibida en las entradas más visitadas del frontend (`home` y `search`) eliminando waterfalls, doble debounce y exceso de trabajo cliente.

## Entregable principal
- Homepage sin waterfall entre sugerencias y listas.
- Search con flujo de datos simplificado y menor churn de router.
- Primera reducción visible de JS y trabajo cliente en rutas críticas.
- Métricas base comparables antes/después para `home` y `search`.

## Skills guía
- `vercel-react-best-practices`
- `clean-code`
- `web-design-guidelines`

## Alcance
- `web/app/page.tsx`
- `web/app/search/page.tsx`
- `web/app/_components/pages/HomePage/*`
- `web/app/_components/pages/SearchPage/*`
- `web/app/_stores/content-store.ts`
- `web/app/_stores/lists-store.ts`

## No objetivos
- No resolver todavía `ListDetailPage`.
- No rehacer todo el modelo de auth.
- No tocar landing hero pesada salvo impacto colateral menor.

## Dependencias
- Requiere `Sprint 01` al menos en lo referente a lint funcional y CI mínima.

## Backlog por lotes

### Lote 2A
**Nombre:** Homepage sin waterfall  
**Resultado:** `home` con requests paralelos y estados independientes

### Lote 2B
**Nombre:** Search simplificado  
**Resultado:** un único flujo de búsqueda, menos churn de router y menos render innecesario

### Lote 2C
**Nombre:** Primer recorte de client boundaries  
**Resultado:** menor superficie client-only en `home` y `search`

## Secuencia sugerida de PRs

### PR-2A Homepage data flow
- Paralelizar `suggestions` y `lists`.
- Revisar loading/error handling.

### PR-2B Search flow simplification
- Unificar debounce.
- Reducir dependencia del router como fuente de estado.

### PR-2C Server-first cleanup
- Reducir client boundaries.
- Revisar uso de stores globales de lectura.

## Tareas

### T1. Eliminar waterfall de homepage
- Subtareas:
  - Reescribir `useHomeData()` para disparar `suggestions` y `lists` en paralelo.
  - Separar loading y error states por bloque.
  - Revisar si `lists` realmente necesita esperar contenido para render.
- Recomendación de refactor:
  - Si el equipo acepta server-first, mover carga inicial a RSC o route segment server-side.
  - Si se mantiene cliente, usar un modelo explícito de requests paralelos.

### T2. Simplificar search
- Subtareas:
  - Reemplazar el patrón input -> URL -> input -> debounce -> fetch por una sola fuente de verdad.
  - Dejar la URL como sincronización secundaria, no como cuello de botella.
  - Validar que la experiencia móvil no dependa de re-focus innecesario.
- Recomendación de código:
  - Estado local simple y un único debounce.
  - `router.push()` sólo cuando aporte navegación/compartibilidad real.

### T3. Reducir client boundaries en rutas críticas
- Subtareas:
  - Auditar qué parte de `page.tsx` y `search/page.tsx` realmente necesita `use client`.
  - Mover shell y data inicial a server components donde sea barato hacerlo.
  - Revisar providers globales en `app/layout.tsx`.
- Recomendación de refactor:
  - No intentar “serverificar” todo de una vez.
  - Empezar por layout shell, navbar data-less y carga inicial de homepage/search.

### T4. Revisar stores de lectura
- Subtareas:
  - Reducir uso de Zustand para datos de lectura cacheables.
  - Introducir selectors/slices donde hoy hay suscripciones anchas.
  - Dejar Zustand para estado interactivo, no para reemplazar todas las lecturas de página.
- Recomendación de código:
- Menos stores globales, más data flow explícito.
  - Evitar persistir cosas que sólo empeoran hidratación.

## Checklist de implementación

### Lote 2A
- [x] `useHomeData()` ya no serializa requests independientes.
- [x] `home` puede renderizar listas aunque sugerencias fallen, y viceversa.
- [x] Los estados de loading están desacoplados por bloque.

### Lote 2B
- [x] La búsqueda tiene un solo debounce efectivo.
- [x] El fetch no depende de dos ciclos de sincronización.
- [x] La URL sigue siendo compartible sin convertirse en cuello de botella.

### Lote 2C
- [x] Se auditaron `page.tsx` y `search/page.tsx` para mover lo posible a server components.
- [x] El store de lectura no reemplaza innecesariamente la carga de página.
- [x] Las suscripciones a Zustand usan slices/selectors cuando aplique.

## Checklist de validación
- [x] Comparativa antes/después de secuencia de requests de `home`.
- [x] Comparativa antes/después del flujo de búsqueda.
- [x] No se rompen deep links de `/search?q=...`.
- [x] `npm run lint` y `npm run build` siguen pasando.

## Estado al cierre
- `home` entra por server component y elimina el waterfall entre `suggestions` y `lists`.
- `search` entra por server component y reemplaza el flujo de doble debounce por una sola fuente de verdad local.
- Se introduce un bridge mínimo de sesión con cookies legibles por servidor para habilitar server-first en rutas autenticadas sin rehacer toda la auth.
- La evidencia comparativa y validación técnica del sprint queda documentada en `web/docs/MVP_SPRINT_2/SPRINT_02_VALIDATION.md`.

## Riesgos
- Romper deep-linking de search si no se respeta sincronización básica con URL.
- Mezclar auth gating con refactor de data flow y terminar agrandando el cambio.

## Criterios de aceptación
- Homepage carga sugerencias y listas sin dependencia secuencial.
- Search usa un único debounce y no necesita dos ciclos de sincronización.
- La cantidad de client-only surface en `home`/`search` baja respecto al estado actual.
- El PR deja medición simple comparativa:
  - número de requests iniciales,
  - secuencia de requests,
  - bundle/client work cualitativo.

## Interdependencias
- Puede ejecutarse en paralelo parcial con `Sprint 04` si no cambia contratos.
- Prepara terreno para `Sprint 06` si luego se centraliza el acceso a metadata.

## Refactors recomendados
- Preferir server-first data fetching en App Router.
- Evitar hook “orquestador” con demasiadas responsabilidades.
- Si un store sólo cachea lecturas de una pantalla, considerar moverlo fuera de Zustand global.
