# 0002. Sesión web sobre cookies `HttpOnly`

- Estado: Accepted
- Fecha: 2026-04-18

## Contexto

Hoy `web` guarda los JWT de usuario en tres lugares simultáneos:

1. Estado en memoria (Zustand) — [`web/src/stores/auth-store.ts`](../../web/src/stores/auth-store.ts).
2. `localStorage`, vía el `partialize` del middleware `persist` de Zustand (claves `accessToken`, `refreshToken`, `user`, `isAuthenticated`).
3. Cookies escritas con `js-cookie` desde [`web/src/lib/auth/session-client.ts`](../../web/src/lib/auth/session-client.ts). Las cookies **no** son `HttpOnly` (`Cookies.set` no soporta esa flag desde JavaScript).

El backend está alineado con esa elección:

```python
# core/core/settings/drf.py
REST_AUTH = {
    "USE_JWT": True,
    "JWT_AUTH_COOKIE": "auth-token",
    "JWT_AUTH_REFRESH_COOKIE": "refresh-token",
    "JWT_AUTH_HTTPONLY": False,
    ...
}
```

Consecuencia práctica: cualquier XSS en el frontend permite exfiltrar la sesión completa (access + refresh) en una sola línea de JavaScript. Esto rompe la propiedad básica de "los JWT no deben ser legibles por código no confiable".

`resolveSession` ([`web/src/server/session.ts`](../../web/src/server/session.ts)) ya lee los tokens desde cookies en SSR y los re-hidrata vía `AuthSessionBootstrap` ([`web/src/components/routes/AuthSessionBootstrap.tsx`](../../web/src/components/routes/AuthSessionBootstrap.tsx)). El campo `needsCookieSync` de `SessionSnapshot` ya se consume para limpiar cookies + estado cuando el refresh falla, pero la migración a `HttpOnly` sigue pendiente.

## Decisión

Migrar la sesión web a **cookies `HttpOnly` / `Secure` / `SameSite=Lax`** emitidas por `core` (o por un BFF en `web`), con refresh manejado server-side. La transición es por fases para no romper rutas protegidas existentes.

### Fase 1 — Reducir superficie de exfiltración

- Quitar `accessToken` y `refreshToken` del `partialize` de Zustand. Sólo se persisten `user` e `isAuthenticated` (datos de UI no sensibles).
- Los tokens siguen existiendo en cookies legibles por JS (no se quita `js-cookie` aún), pero deja de existir la copia en `localStorage`.
- Cablear `needsCookieSync`: cuando el SSR detecta que el refresh falló, el cliente limpia cookies + estado.
- Hacer que cualquier flujo de cliente que necesite el access token lo lea de la store de Zustand (que ahora se hidrata desde el server snapshot) o de la cookie en cada request.

### Fase 2 — `core` emite cookies `HttpOnly`

- Cambiar `JWT_AUTH_HTTPONLY: False -> True` en `core/core/settings/drf.py`.
- Configurar `JWT_AUTH_SAMESITE`, `JWT_AUTH_SECURE`, dominio y path explícitamente.
- Mover login/register/refresh/logout a rutas BFF en `web/src/routes/api/auth/*` (TanStack server handlers) para que el browser nunca toque `core/auth/*` directo (necesario para mantener `SameSite=Lax` y evitar problemas de cross-site cookie con dominios distintos).
- Implementar protección CSRF: token CSRF en cookie no-HttpOnly + header `X-CSRF-Token` en mutaciones, validado server-side.

### Fase 3 — Eliminar tokens client-side

- Quitar `syncAuthCookies`, `clearAuthCookies` y `js-cookie` de la dependencia.
- Quitar `accessToken` y `refreshToken` del estado de Zustand. Los handlers de cliente que necesitaban el token llaman al BFF.
- Implementar logout-everywhere usando rotación de refresh y blacklist de tokens (ya existe `dj_rest_auth.token_blacklist`).

## Alternativas consideradas

### Opción A — Migración big-bang a `HttpOnly` ahora

- Pros: termina la deuda en un solo PR.
- Contras: rompe `home`, `search`, `lists/[id]` y todas las rutas protegidas que asumen acceso al token desde JS. Requiere también cambiar el BFF, el manejo de CSRF y los tests E2E al mismo tiempo. Riesgo alto de regresión visible.

### Opción B — Quedarse con tokens en `localStorage`

- Pros: cero trabajo.
- Contras: deja la propiedad de seguridad rota indefinidamente. No cumple el criterio de aceptación del sprint ("plan de migración para abandonar auth web dependiente de tokens legibles por JavaScript").

### Opción C — Migración por fases (la elegida)

- Pros: cada fase es shippable independientemente. Fase 1 reduce el blast radius más obvio (la copia persistida en `localStorage`). Fase 2 hace el cambio de cookies. Fase 3 limpia el plumbing.
- Contras: el estado intermedio sigue siendo imperfecto durante semanas/meses. Mitigado por commit explícito a la roadmap.

## Consecuencias

### Código (fase 1)

- `web/src/stores/auth-store.ts`: `partialize` excluye `accessToken` y `refreshToken`.
- `web/src/components/routes/AuthSessionBootstrap.tsx`: si `session.needsCookieSync` es true y `session.accessToken` es null, llama `clearSession()`.
- Documentar en este ADR las fases 2 y 3 con el alcance que tendrán.

### Código (fases 2–3)

- `core/core/settings/drf.py`: flip de `JWT_AUTH_HTTPONLY`, `JWT_AUTH_SAMESITE`, `JWT_AUTH_SECURE`.
- Nuevo BFF bajo `web/src/routes/api/auth/*` que media entre el browser y `core`.
- CSRF: cookie + header.
- Eliminar `js-cookie` y `web/src/lib/auth/session-client.ts`.

### Operación

- Ningún cambio en infra para fase 1.
- Fase 2 requiere alinear dominios o tener `web` y `core` detrás del mismo apex (necesario para `SameSite=Lax` con cookies del dominio de `core`). Documentar antes de fase 2.

### Documentación

- README de `web` referencia este ADR (PR-6D).
- `docs/contracts/internal-http.md` describe la auth actual y enlaza a este ADR para la dirección futura.
- [`../architecture/auth-session-bootstrap.md`](../architecture/auth-session-bootstrap.md)
  documenta el estado real del bootstrap global y sus gaps todavía
  abiertos.
- [`../architecture/client-rehydration.md`](../architecture/client-rehydration.md)
  documenta la política vigente de `beforeLoad` + `ProtectedRoute` +
  `next` redirect tras la migración a TanStack Start.

## Addendum — fase 1 completada en TanStack Start

Tras la migración de `web` a TanStack Start:

- la resolución de sesión sigue centralizada en el root route SSR;
- `AuthSessionBootstrap` permanece como el único bridge SSR -> Zustand;
- las rutas protegidas ya redirigen server-side con TanStack Router
  `beforeLoad` cuando el estado es `anonymous`;
- `ProtectedRoute` ya no es la primera barrera de auth sino el fallback
  para la ventana de bootstrap cliente y para el estado
  `resolution="unavailable"`;
- el login soporta `next` seguro para reanudar la navegación original
  tras autenticación.

## Referencias

- Historia de implementación: [`../history/implementation-history.md`](../history/implementation-history.md).
- Inventario de lecturas de token: [`web/src/stores/auth-store.ts`](../../web/src/stores/auth-store.ts), [`web/src/lib/auth/session-client.ts`](../../web/src/lib/auth/session-client.ts), [`web/src/lib/api/api.ts`](../../web/src/lib/api/api.ts), [`web/src/server/session.ts`](../../web/src/server/session.ts).
- Configuración backend actual: [`core/core/settings/drf.py`](../../core/core/settings/drf.py).
