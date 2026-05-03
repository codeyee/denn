# 0003. Migrar `web/` de Next.js App Router a TanStack Start

- Estado: Accepted
- Fecha: 2026-05-01
- Decisores: equipo `web`

## Contexto

`web/` se construyó originalmente sobre Next.js 16 App Router. Las APIs de
Next.js (Server Components, Server Actions, `next/image`, `next/font`,
`next/navigation`, `next/headers`, `'use client'`) se introdujeron de forma
incremental, pero el resto del stack ya vivía en TanStack Query: el catálogo
completo de queries, mutaciones y prefetch helpers (`web/lib/api/queries/*`,
`web/lib/api/mutations/*`) está expresado contra el cliente Query.

Las consecuencias prácticas:

- El SSR de Next.js exige `<HydrationBoundary>` envolviendo cada page.tsx
  para rehidratar el caché Query. Es duplicado de lo que TanStack Start ya
  ofrece nativamente vía contexto del router.
- Los componentes pesados se marcaban como `'use client'` (67 archivos) sin
  beneficio real porque toda la app es interactiva.
- El boundary entre componentes de servidor y de cliente añadía complejidad
  sin beneficio; las únicas funciones realmente "server only" son la
  resolución de sesión, la lectura del país desde headers y la inyección
  de `window.__ENV__`.
- El BFF (`/api/proxy/[...path]`, `/api/cards`, `/api/perf/vitals`) es
  una capa fina sobre `proxy` (Go) que solo necesita un handler HTTP estándar.
- Vite + Nitro publica un bundle servidor (`.output/server/index.mjs`) más
  ligero que la build de Next.js standalone.
- Los rules en `AGENTS.md` ya prescriben el patrón de prefetch en loaders
  con TanStack Query; Next.js era el único pedazo del stack que no estaba
  alineado con esa filosofía.

## Decisión

Migrar `web/` a **TanStack Start** sobre **Vite** (build) + **Nitro** (runtime
de producción), reorganizando el código bajo `web/src/` con la estructura
canónica de TanStack Router (`routes/__root.tsx`, `routes/$param.tsx`,
`routes/$.ts`, `routes/api/**`).

- Routing: file-system de TanStack Router en `web/src/routes/`.
- Layouts: `__root.tsx` con `createRootRouteWithContext<{ queryClient,
  session, country }>()` y `beforeLoad` que invoca server functions.
- Data fetching: `loader` por ruta llama a `prefetchXxxQueries` reusando
  el `QueryClient` del contexto del router. Se elimina `<HydrationBoundary>`.
- Server-only RPC: `createServerFn` en `web/src/server/{session,runtime-env}.ts`
  para cookies, headers y env runtime.
- API routes: `createServerFileRoute('/api/...').methods({ GET, POST })`
  usando `Request`/`Response` estándar.
- Imágenes: `<img>` con `width`/`height`/`loading="lazy"`. Se elimina
  `next/image`.
- Fuentes: `@font-face` directamente en `globals.css` (las TTF ya están
  self-hosted en `public/fonts/`). Se elimina `next/font/local`.
- Web vitals: `web-vitals` directamente desde `WebVitalsReporter`. Se
  elimina `next/web-vitals`.

## Alternativas consideradas

### Opción A — Quedarnos en Next.js 16 y limpiar `'use client'` y `<HydrationBoundary>` a mano

- Pros:
  - Cero migración de build tooling.
  - Mantiene `next/image` y `next/font` para optimización automática.
- Contras:
  - El acoplamiento con la separación server/client de Next.js no aporta a
    una app totalmente interactiva.
  - `next.config.ts`, Webpack vs Turbopack, `'use client'`, `next/headers`,
    `next/server` y `cookies()` siguen siendo APIs específicas que dificultan
    portar lógica entre servidor y cliente.
  - El BFF en `route.ts` con `NextRequest`/`NextResponse` es un wrapper
    innecesario sobre `Request`/`Response`.

### Opción B — Migrar a TanStack Start sobre Vite + Nitro (decidida)

- Pros:
  - Stack único: TanStack Router + TanStack Query + TanStack Start.
  - Loaders nativos del router rehidratan el `QueryClient` sin
    `<HydrationBoundary>`.
  - `createServerFn` aísla código server-only sin que cada componente
    tenga que declarar `'use client'`.
  - Build con Vite (HMR sub-segundo) y producción con Nitro (`.output/`)
    son más ligeras que `next build` standalone.
  - Permite borrar 67 directivas `'use client'` y unificar el patrón de
    componentes.
- Contras:
  - Migración cross-cutting: 67 archivos con `'use client'`, ~11 sitios
    con `next/image`, `next/font/local`, `next/navigation`, `next/headers`,
    `next/server`, `next/web-vitals`.
  - Requiere reescribir el Dockerfile (`.next/standalone` →
    `.output/server/index.mjs`).
  - `next/image`/`next/font` reemplazos manuales (sin reescaling
    automático). Mitigación: las imágenes ya vienen del proxy con tamaños
    razonables; `loading="lazy"` cubre la mayoría de los casos.

### Opción C — Migrar a Remix / React Router 7

- Pros:
  - Modelo de loaders/actions maduro.
- Contras:
  - Reescribiría TanStack Query → loaders nativos (gran trabajo) o forzaría
    convivencia awkward de loaders + queries.
  - Pierde la integración nativa con TanStack Query que ya tenemos.

## Consecuencias

- En el código:
  - `web/app/` se elimina completo.
  - `web/lib/` se mueve a `web/src/lib/` y `web/src/server/`.
  - `web/test/` se mueve a `web/src/test/`.
  - Nueva entrada `web/src/router.tsx` y `web/src/routes/__root.tsx`.
  - Imports `next/*` reemplazados por equivalentes de
    `@tanstack/react-router` y `@tanstack/react-start/server`.
  - `next.config.ts`, `next-env.d.ts`, `postcss.config.mjs`,
    `types/routes.d.ts`, `web/.next/` eliminados.
- En la operación:
  - `make validate-web` ahora ejecuta `eslint` + `vite build`. Sigue
    siendo el mínimo CI gate; ya no usa `next build --webpack`.
  - El runtime de Docker arranca `node .output/server/index.mjs`.
  - Variables públicas: el cliente lee `window.__ENV__`, inyectado por
    `getRuntimeEnvFn` en el `<head>`. `NEXT_PUBLIC_*` siguen siendo
    válidos como fallback hasta limpiar el deployment.
- En la documentación:
  - `AGENTS.md` Web Rules actualizadas (sin referencias a Next.js).
  - `.docs/architecture/current-state.md` actualizado a TanStack Start.
  - `.docs/perf/baseline.md` mantiene los thresholds; las medidas
    concretas se rebaselinan tras el merge.
- Deuda explícita:
  - Sin equivalente directo a `next/image`. Si más adelante se quiere
    optimización on-the-fly, evaluar `@unpic/react` o un servicio de
    transformación delante del proxy.
  - Hot Module Replacement con `tanstackStart` está sujeto a evolución
    upstream del plugin.

## Referencias

- Plan: `.cursor/plans/next.js_to_tanstack_start_migration_b3708f30.plan.md`
- ADR previo: [0002 Sesión web sobre cookies HttpOnly](./0002-web-auth-cookies.md)
- TanStack Start docs: <https://tanstack.com/start/latest>
- TanStack Router docs: <https://tanstack.com/router/latest>
