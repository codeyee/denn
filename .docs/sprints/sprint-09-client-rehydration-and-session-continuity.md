# Sprint 09
# Hidratación del cliente y continuidad de sesión

> **Nota sobre el nombre.** "Hidratación" aquí se refiere **exclusivamente** a
> poblar el estado del cliente (cookies/`localStorage` → Zustand) en cada carga
> de página. No tiene relación con la **rehidratación de metadatos de contenido**
> (refresh de `MovieDetail`/`TvShowDetail`/etc. contra TMDB/IGDB/Spotify según
> edad del item), que se trata en
> [`sprint-10-dynamic-content-rehydration-by-age.md`](./sprint-10-dynamic-content-rehydration-by-age.md).

## Objetivo
Formalizar, endurecer y verificar la política de rehidratación del estado del cliente en `web` para que un hard refresh (`F5`), un deep-link o una apertura desde bookmark sobre **cualquier ruta protegida** restaure la sesión sin enviar al usuario a `/login` y sin "pérdida de funcionalidad silenciosa" por estado a medio hidratar.

Hoy el problema no es de diseño, es de cobertura: la mecánica de rehidratación (`resolveSession` server-side + `AuthSessionBootstrap` client-side) sólo estaba montada en `HomeRouteShell` y `SearchRouteShell`. Cualquier otra ruta protegida (`/content/[id]`, `/lists/[id]`, futuras rutas) quedaba con el store inconsistente tras un refresh, la request autenticada fallaba con 401, el refresh fallaba con "No refresh token available" y el usuario era expulsado.

Este sprint cierra esa brecha, formaliza el contrato y deja tests + telemetría para que no vuelva a aparecer.

## Entregable principal
- Política de rehidratación de sesión documentada en un lugar único (`docs/architecture/client-rehydration.md` + este sprint).
- Bootstrap de sesión montado globalmente en `app/layout.tsx`, no por shell.
- `ProtectedRoute` con guarda contra la ventana de carrera hijo→padre (`useEffect` de hijos corre antes que el del bootstrap).
- Redirect server-side para rutas protegidas cuando `resolveSession()` devuelve "no autenticado", eliminando el flash de contenido protegido.
- Tests de regresión que cubren al menos: hard refresh en `/content/[id]`, cookies muertas + `localStorage` stale, proxy/core caído durante la resolución de sesión.
- Señal estructurada (log o Web Vital custom) que detecte regresiones del bootstrap global.

## Skills guía
- `vercel-react-best-practices`
- `security-review`
- `systematic-debugging`
- `clean-code`
- `interface-design`

## Alcance
- `web/app/layout.tsx` — resolución de sesión server-side y montaje del bootstrap (ya hecho en el fix inicial).
- `web/app/_components/routes/AuthSessionBootstrap.tsx` — contrato del bridge cookies→store.
- `web/app/_components/common/providers/ProtectedRoute.tsx` — guarda anti-race.
- `web/app/_stores/auth-store.ts` — `partialize`, `onRehydrateStorage`, invariantes.
- `web/lib/auth/session-server.ts` / `session-client.ts` — contratos de cookies vs store.
- `web/app/_components/routes/HomeRouteShell.tsx`, `SearchRouteShell.tsx` — eliminación de los `AuthSessionBootstrap` duplicados.
- `web/middleware.ts` (nuevo si no existe) o equivalente en Next App Router — redirect server-side para rutas protegidas.
- `web/__tests__/` o `web/e2e/` — tests de rehidratación y race conditions.
- `docs/architecture/client-rehydration.md` — documento de política (nuevo).
- `docs/adr/0002-web-auth-cookies.md` — extender con la decisión del bootstrap global y el redirect server-side (addendum o superseded by nuevo ADR).

## No objetivos
- **No** ejecutar la fase 2 del ADR-0002 (migración a `HttpOnly`). Eso queda para un sprint posterior con cambios de backend.
- **No** mover login/register/logout a un BFF en `web/app/api/auth/*`. Es el próximo paso pero requiere decisiones de CSRF, dominios y rotación de refresh.
- **No** reemplazar Zustand por otro store (TanStack Query, Jotai, etc.). El sprint se centra en la política de rehidratación del estado actual.
- **No** resolver offline-first. La app sigue requiriendo backend vivo para la primera carga.
- **No** cachear respuestas autenticadas en Service Worker.

## Dependencias
- Requiere `Sprint 06` (ADR-0002 aceptado, `resolveSession` y `AuthSessionBootstrap` existen).
- Requiere `Sprint 07` (routing por `id` interno ya consolidado — las rutas donde más duele el bug son `/content/[id]`).
- Puede ejecutarse en paralelo con `Sprint 08` (performance). De hecho, la guarda de `isBootingSession` afecta LCP percibido en la primera carga, así que los números de Sprint 8 se ven impactados por la implementación de Sprint 9.
- Precede (no bloquea) la **fase 2 del ADR-0002** (`HttpOnly` + BFF): ese sprint asume que el bootstrap global ya existe.

## Contexto técnico y diagnóstico

### Por qué fallaba antes del fix inicial

1. `ADR-0002` phase 1 movió los JWTs fuera de `localStorage`. Sólo persiste `user` + `isAuthenticated`.
2. Los JWTs viven en cookies `SameSite=Lax` **no-HttpOnly** (`auth-token`, `refresh-token`).
3. `AuthSessionBootstrap` es el único puente cookies→Zustand, pero estaba montado sólo en `HomeRouteShell` y `SearchRouteShell`.
4. En `/content/[id]` tras un `F5`:
   - Zustand rehidrata `isAuthenticated: true` (de `localStorage`) pero `accessToken === null` (no viene de ahí).
   - `ProtectedRoute` veía `isAuthenticated: true` → renderizaba el árbol protegido.
   - `useContentData` disparaba `GET /api/content/1455/?country=CO` sin `Authorization`.
   - 401 → `performTokenRefresh` → `refreshToken` también `null` → `throw "No refresh token available"` → `clearSession()` → redirect a `/login`.

### Invariantes que debe mantener el sistema

- **I1 — Single source of truth por tipo de dato**: los tokens viven en cookies. El store los tiene en memoria sólo durante la sesión del tab. `localStorage` no los toca.
- **I2 — Orden garantizado**: antes de que un `useEffect` de una página protegida dispare una request autenticada, el bootstrap tiene que haber copiado los tokens al store. Como React corre los efectos de hijos antes que los del padre, la guarda no puede depender sólo del orden de efectos.
- **I3 — Sin flash de contenido protegido**: un usuario sin sesión que abre `/content/1455` directo debe ver `/login` sin parpadeo del contenido protegido.
- **I4 — Degradación limpia con backend caído**: si `resolveSession()` falla (core caído), la app no se cae entera; renderiza como logged-out y reintenta en la próxima navegación.
- **I5 — Cookies muertas ≠ sesión viva**: si las cookies existen pero el core las rechaza, el bootstrap debe limpiar `localStorage` y cookies (`needsCookieSync: true && !accessToken`) para que la próxima carga no reintente con un token muerto.
- **I6 — El bootstrap corre en cada request server-rendered**: una navegación client-side no lo reejecuta (el store ya tiene los tokens). Un hard refresh sí. Un deep-link también.

## Modelo funcional

### Política de rehidratación por capa

| Dato | Capa | Persistencia | Rehidratado por | Cuándo |
|---|---|---|---|---|
| `accessToken`, `refreshToken` | Cookies | 30 días (`AUTH_COOKIE_DAYS`) | `resolveSession()` → `AuthSessionBootstrap` | Cada SSR (hard refresh, deep-link, nav server-rendered) |
| `user`, `isAuthenticated` | `localStorage` (`auth-storage`) | Persistente | `zustand/persist` | Automático al mount del store |
| `animationsEnabled`, `countryCode` | `localStorage` (`app-settings`) | Persistente | `zustand/persist` | Automático al mount |
| `user-country` (cookie) | Cookie | 30 días | `CountryProvider` + SSR (`getServerCountryCode`) | Cada SSR |

### Contrato del bootstrap global

`app/layout.tsx` (server) es el único punto donde se llama `resolveSession()`. El resultado (`SessionSnapshot`) se inyecta como prop a `<AuthSessionBootstrap>` (client), que en un único `useEffect`:

- Si `needsCookieSync && !accessToken` → `clearSession()` + limpia cookies no-HttpOnly.
- Si no → `setSession({ user, accessToken, refreshToken })` + sincroniza cookies.

Este componente **no renderiza nada visible**. Su único propósito es mantener la invariante I1.

### Guarda de `ProtectedRoute`

La ventana de carrera (I2) se cierra con:

```ts
const isBootingSession = isAuthenticated && !accessToken;

if (isLoading || isBootingSession) return <Spinner />;
```

- `isAuthenticated: true` viene de `localStorage` (rehidratado por `persist`).
- `accessToken: null` significa que el bootstrap aún no corrió.
- La combinación es el síntoma exacto de la ventana de carrera. Mientras dure, mostramos spinner.
- Cuando el bootstrap corre: o escribe el token (→ render children), o limpia la sesión (→ `isAuthenticated: false` → el efecto redirige a `/login`).

### Redirect server-side para rutas protegidas (pendiente, I3)

Hoy la redirección a `/login` la hace el cliente vía `router.push`. Eso implica:

1. Montar árbol server → enviar al navegador.
2. Cliente monta → `useEffect` de `ProtectedRoute` corre → `router.push('/login')`.
3. Flash de spinner → `/login`.

Solución: `web/middleware.ts` (Next App Router middleware) que intercepta rutas protegidas y redirige server-side cuando no hay cookie `auth-token` o cuando `resolveSession()` dice no autenticado. Matcher conservador: sólo rutas que sabemos son protegidas (`/content/*`, `/lists/*`, no `/login`, `/register`, `/`).

## Backlog por lotes

### Lote 9A
**Nombre:** Bootstrap global y guarda anti-race
**Resultado:** `AuthSessionBootstrap` montado en `app/layout.tsx`, eliminado de shells. `ProtectedRoute` con guarda `isBootingSession`. Toda ruta protegida sobrevive a un `F5`.

### Lote 9B
**Nombre:** Tests de regresión
**Resultado:** tests automatizados que prueban hard refresh en rutas protegidas, cookies muertas, backend caído. Un PR que rompa el bootstrap global falla CI.

### Lote 9C
**Nombre:** Redirect server-side y eliminación de flash
**Resultado:** `web/middleware.ts` intercepta rutas protegidas sin cookie de auth y redirige a `/login` antes de renderizar. El spinner de `ProtectedRoute` sólo aparece en la ventana de bootstrap legítima (~<100ms).

### Lote 9D
**Nombre:** Observabilidad y documentación
**Resultado:** señal estructurada cuando se entra a `isBootingSession` >200ms (síntoma de regresión). `docs/architecture/client-rehydration.md` con la política completa. `AGENTS.md` o `CONTRIBUTING.md` referencia la política para nuevos contribuidores.

## Secuencia sugerida de PRs

### PR-9A Global session bootstrap
- Mover `AuthSessionBootstrap` de `HomeRouteShell`/`SearchRouteShell` a `app/layout.tsx`.
- `RootLayout` pasa a ser `async`, llama a `resolveSession()` con `try/catch` que degrada a `EMPTY_SESSION`.
- `ProtectedRoute` agrega `isBootingSession = isAuthenticated && !accessToken` a la condición del spinner.
- Ajustar imports y remover duplicados en los shells.
- Ya implementado en el hotfix; este PR lo formaliza con tests de tipo y lint.

### PR-9B Regression tests
- Test unitario de `ProtectedRoute`:
  - `isAuthenticated=true, accessToken=null` → muestra spinner, no renderiza children.
  - `isAuthenticated=false` → redirige a `/login`.
  - `isAuthenticated=true, accessToken=set` → renderiza children.
- Test unitario de `AuthSessionBootstrap`:
  - `session.needsCookieSync && !session.accessToken` → llama `clearSession()`.
  - `session` válido → llama `setSession()`.
- Test E2E (Playwright) o equivalente:
  - login → navegar a `/content/1455` → `F5` → la página carga sin parpadear a `/login`.
  - login → borrar cookies desde el test → `F5` sobre ruta protegida → termina en `/login`.
  - login → backend devuelve 500 en `/auth/user/` → `F5` → la app no crashea, muestra shell logged-out.

### PR-9C Server-side protected routes
- Crear `web/middleware.ts` con matcher de rutas protegidas (`/content/:path*`, `/lists/:path*`, `/profile`).
- Middleware lee `auth-token` cookie; si no existe, `NextResponse.redirect('/login?next=...')`.
- El middleware **no** intenta refresh (eso queda para el layout/bootstrap). Sólo detecta ausencia total de cookie.
- Test manual: deep-link a `/content/1455` sin sesión → 302 a `/login` sin renderizar contenido protegido.

### PR-9D Observability and docs
- Agregar un timer en `ProtectedRoute`: si `isBootingSession` dura más de 200ms, emitir `console.warn` estructurado con path y duración.
- Integrar con el reporter de Web Vitals del Sprint 08 si ya existe (métrica custom `client_hydration_ms`).
- Crear `docs/architecture/client-rehydration.md` con la política completa (tabla de capas, diagrama de flujo, invariantes).
- Addendum al `ADR-0002` que referencia este sprint y formaliza el bootstrap global.
- Actualizar `AGENTS.md` con "dónde vive el bootstrap" y "cómo agregar una ruta protegida nueva".

## Tareas

### T1. Formalizar el bootstrap global
- Subtareas:
  - verificar que `RootLayout` resuelve sesión una vez por request (no por componente);
  - verificar que `AuthSessionBootstrap` está dentro de `StoreProvider` para que el store esté montado cuando corra su efecto;
  - confirmar que el shell no renderiza el `<AuthSessionBootstrap>` duplicado;
  - medir overhead de `resolveSession()` en el layout (un HEAD a `/auth/user/` por request con cookie); si es >50ms p95, cachear el user profile por request.
- Recomendación:
  - `resolveSession()` hoy hace hasta 2 round-trips (`/auth/user/` + `/auth/token/refresh/`). En un layout que corre en cada request, eso es costo real. Considerar cachear `user` en memoria server-side por tiempo corto (<5s) con clave = hash del `accessToken`, o mover a un endpoint `/auth/session/` en `core` que haga ambas cosas en un solo call.

### T2. Guarda en ProtectedRoute
- Subtareas:
  - `isBootingSession = isAuthenticated && !accessToken`;
  - cuando `isAuthenticated: false` y `isLoading: false`, redirigir a `/login` con `next` param preservando path actual;
  - test unitario de los 4 estados (loading, booting, unauth, authed);
  - considerar un timeout: si `isBootingSession` dura >5s (bootstrap nunca corrió), forzar `clearSession()` y redirigir. Esto detecta regresiones.
- Recomendación:
  - el spinner debe ser visualmente idéntico al del Suspense fallback de la página para que no haya "doble loading".

### T3. Middleware server-side para rutas protegidas
- Subtareas:
  - `web/middleware.ts` con `matcher: ['/content/:path*', '/lists/:path*', '/profile']`;
  - el middleware sólo valida **presencia** de la cookie `auth-token`, no su validez (eso lo hace `resolveSession` en el layout);
  - si no hay cookie, `NextResponse.redirect(new URL('/login?next=<path>', request.url))`;
  - preservar query params y scroll (Next lo hace por default en redirect);
  - documentar el matcher en `docs/architecture/client-rehydration.md` y sincronizarlo con la lista de rutas protegidas en `ProtectedRoute`.
- Recomendación:
  - no hacer refresh de token en el middleware. El Edge Runtime tiene limitaciones (no Node APIs completas), y duplicar el flujo de refresh lleva a inconsistencias. El middleware es sólo un guard grueso; el refino lo hace el layout.

### T4. Tests de regresión
- Subtareas:
  - unit tests de `ProtectedRoute` y `AuthSessionBootstrap` con React Testing Library;
  - E2E con Playwright (o Cypress si ya existe) que cubra: login → `F5` en ruta protegida, deep-link sin sesión, cookies manualmente corruptas, backend caído;
  - si no hay infra E2E, al menos un script de test manual reproducible en `docs/runbooks/client-hydration-smoke.md`;
  - correr los E2E en CI en un job aparte (son más lentos que unit).
- Recomendación:
  - el smoke E2E mínimo es: "login, abrir `/content/[cualquier id válido]`, `F5`, verificar que la URL final es la misma y la página cargó". Si eso falla, el bootstrap global está roto.

### T5. Observabilidad de la ventana de bootstrap
- Subtareas:
  - marcar en `ProtectedRoute` el timestamp cuando entra a `isBootingSession` y cuando sale;
  - si la duración >200ms, emitir `console.warn` estructurado: `{event: "slow_session_bootstrap", path, duration_ms, has_cookie}`;
  - si la duración >5s, emitir `console.error` y forzar redirect a `/login`;
  - integrar con el reporter de Web Vitals si llegó Sprint 08 (métrica `client_hydration_ms`);
  - dashboard mental (no hace falta grafana): en dev, la mayor parte de las cargas deben tener `isBootingSession` = 0 o <20ms.
- Recomendación:
  - no mandar esta señal a un endpoint en prod hasta que Sprint 6C tenga definido el formato. Mientras tanto, `console.warn` es suficiente para detectar regresiones en dev.

### T6. Política documentada
- Subtareas:
  - `docs/architecture/client-rehydration.md` con:
    - tabla de capas de estado (cookies / localStorage / memoria);
    - diagrama de flujo del hard refresh;
    - invariantes I1–I6 enunciadas;
    - reglas para agregar una ruta protegida nueva (checklist);
    - antipattern: "montar `AuthSessionBootstrap` en un shell o page" (ya hay un caso real que documentar).
  - link desde `ADR-0002` a este documento;
  - link desde `AGENTS.md` para que nuevos contribuidores no repitan el bug.

## Checklist de implementación

### Lote 9A
- [x] `AuthSessionBootstrap` montado en `app/layout.tsx`.
- [x] `RootLayout` es `async`, llama `resolveSession()` con `try/catch`.
- [x] `HomeRouteShell` y `SearchRouteShell` **no** montan `AuthSessionBootstrap` (eliminados).
- [x] `ProtectedRoute` incluye guarda `isBootingSession`.
- [ ] `tsc --noEmit` y `npm run lint` pasan en `web`.

### Lote 9B
- [ ] Test unitario de `ProtectedRoute` cubre los 4 estados (loading, booting, unauth, authed).
- [ ] Test unitario de `AuthSessionBootstrap` cubre `needsCookieSync` y path normal.
- [ ] Test E2E (o script manual documentado) valida hard refresh en ruta protegida.
- [ ] Test E2E cubre "cookies muertas → redirect a `/login`".
- [ ] Test E2E cubre "backend caído → shell logged-out sin crash".

### Lote 9C
- [ ] `web/middleware.ts` existe y protege `/content/:path*`, `/lists/:path*`, `/profile`.
- [ ] Deep-link sin sesión a ruta protegida resulta en 302 server-side a `/login?next=...`.
- [ ] El login page lee `next` y redirige a la ruta original tras autenticar.
- [ ] No hay flash de contenido protegido medible en DevTools Network.

### Lote 9D
- [ ] Warning estructurado cuando `isBootingSession` >200ms.
- [ ] Error + redirect forzado cuando `isBootingSession` >5s (detector de regresión).
- [ ] `docs/architecture/client-rehydration.md` existe y cubre invariantes + checklist de ruta nueva.
- [ ] `ADR-0002` tiene addendum que referencia este sprint.
- [ ] `AGENTS.md` referencia la política.

## Checklist de validación
- [ ] Hard refresh en `/content/<id>` con sesión válida: la página carga, no se va a `/login`.
- [ ] Hard refresh en `/lists/<id>` con sesión válida: idem.
- [ ] Deep-link en nueva pestaña a `/content/<id>` sin sesión: redirige a `/login` sin parpadeo de contenido.
- [ ] Login → navegar a `/content/<id>` → borrar cookies en DevTools → `F5` → redirige a `/login`.
- [ ] Core apagado (`make down core`) + `F5` en ruta protegida: la app no crashea; muestra estado logged-out o mensaje "Servicio no disponible".
- [ ] `npm run build` y `npm run lint` pasan.
- [ ] Los tests nuevos corren en CI.
- [ ] No hay `console.warn("slow_session_bootstrap")` en navegación normal (dev).

## Riesgos
- **Overhead del `resolveSession()` en cada SSR**: llama `/auth/user/` (y eventualmente `/auth/token/refresh/`) en el layout raíz, o sea una vez por request server-rendered. Si core está lento, LCP se degrada. Mitigación: cachear `user` por hash de token en memoria server-side por <5s; o endpoint `/auth/session/` combinado en core; o mover a Edge Runtime con validación local del JWT (fase 2 del ADR).
- **Middleware vs App Router edge cases**: `web/middleware.ts` corre en Edge Runtime, que no soporta todas las APIs de Node. Si alguien agrega una dependencia Node-only al middleware, rompe. Mitigación: mantener el middleware minimal (sólo lectura de cookie y redirect), tests que verifican que no se importa nada de `lib/auth/session-server.ts` (que sí usa APIs server-only).
- **Flash de spinner por bootstrap lento**: si `resolveSession()` es lento, el usuario ve spinner de `ProtectedRoute` antes del contenido. Mitigación: el spinner visual debería matchear el skeleton de la página (Sprint 08). Si el spinner dura >500ms consistentemente, el problema no es hidratación sino latencia de `/auth/user/` — escalar al core.
- **Stale `isAuthenticated: true` en localStorage**: si el usuario cerró sesión en otro tab, `localStorage` de este tab sigue con `isAuthenticated: true` hasta que la próxima navegación lo corrija via bootstrap. Aceptable — la página protegida se ve un instante antes del redirect. Mitigación real: escuchar `storage` event en window para sincronizar entre tabs.
- **Middleware + SSR double-work**: tanto el middleware como el layout validan sesión. El middleware es barato (lectura de cookie), el layout es caro (`/auth/user/`). No hay duplicación real si el middleware sólo verifica presencia. Documentar la división de responsabilidades para no tentarse a mover `resolveSession` al middleware.
- **Regresión silenciosa**: alguien agrega una ruta protegida nueva y se olvida de agregarla al matcher del middleware. El layout global protege el estado (bootstrap corre), pero el flash vuelve. Mitigación: test que lista todas las rutas de `web/app/**/page.tsx` y verifica que las que usan `ProtectedRoute` están en el matcher del middleware.

## Criterios de aceptación
- Un `F5` sobre cualquier ruta protegida (`/content/<id>`, `/lists/<id>`, `/profile`) con sesión válida restaura la UI sin redirigir a `/login`.
- Un deep-link a una ruta protegida sin sesión termina en `/login` sin renderizar contenido protegido.
- Un usuario con cookies muertas + `localStorage` stale es limpiado y ve `/login`, no un estado híbrido.
- Un bootstrap roto (ej. alguien remueve `AuthSessionBootstrap` del layout) **falla CI** gracias al test E2E de hard refresh.
- La política de rehidratación está escrita en `docs/architecture/client-rehydration.md` y es la fuente de verdad para futuras rutas.
- `isBootingSession` dura <100ms p95 en dev con core local corriendo.

## Interdependencias
- **Sprint 06 (Lote 6B, T4/T6)** entregó `resolveSession`, `AuthSessionBootstrap` y el `partialize` restringido. Este sprint cierra el gap de cobertura.
- **Sprint 07 (Lote 7C)** consolidó las rutas por `id` interno (`/content/[id]`). El sprint 9 asegura que esas rutas sobreviven a un refresh.
- **Sprint 08 (Lote 8A, T5)** instrumenta Web Vitals y streaming SSR. Este sprint emite `client_hydration_ms` en el mismo formato.
- **Fase 2 del ADR-0002** (`HttpOnly` + BFF en `web/app/api/auth/*`) es el siguiente paso. Este sprint lo habilita porque deja el bootstrap formalizado y con tests.
- Habilita features futuras:
  - middleware de Edge que valide JWT localmente sin llamar a core;
  - persistencia de otras preferencias por usuario (sabiendo que Zustand + persist tiene política clara);
  - multi-tab sync vía `storage` event sobre la misma política.

## Refactors recomendados
- Renombrar `AuthSessionBootstrap` a `SessionBootstrap` si en el futuro incluye país o preferencias (hoy sólo sesión).
- Extraer un hook `useSessionStatus()` que retorne `{ isLoading, isBooting, isAuthenticated }` para que los consumidores no repliquen la lógica de `isBootingSession`.
- Consolidar `CountryProvider` + `AuthSessionBootstrap` + `EnvConfig` en un único `<AppBootstrap />` si la lista crece, siempre server-snapshot-driven.
- Considerar mover `user` fuera de `localStorage` una vez que haya un endpoint server-side que devuelva todo en una sola llamada (`/auth/session/`). `localStorage` hoy es sólo para evitar un flash de "user=null" antes de que el bootstrap llegue.

## Follow-ups (NO se hacen en este sprint)
- **Fase 2 del ADR-0002** (cookies `HttpOnly` + BFF): sprint dedicado, requiere cambios de core, CSRF y dominios.
- **Multi-tab session sync via `storage` event**: si un tab hace logout, los otros deberían reaccionar. Hoy requiere refresh manual.
- **`/auth/session/` endpoint consolidado en core**: hoy `resolveSession()` hace hasta 2 round-trips. Un endpoint unificado reduciría latencia del layout.
- **Edge Runtime JWT validation**: validar el access token localmente en el middleware (con llave pública rotable) para evitar el hit a `/auth/user/` en el layout. Requiere JWT con `exp` razonable y clock skew tolerance.
- **Optimistic bootstrap**: si el `localStorage` dice `isAuthenticated: true` y la cookie existe, renderizar children optimísticamente y validar en background. Hoy esperamos al token. Optimización prematura hasta que haya métricas que lo justifiquen.
- **Prefetch de `/auth/user/` en el middleware**: usar `NextResponse.next()` con headers precargados si en el futuro se mueve validación al Edge.
