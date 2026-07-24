# Contrato HTTP interno `web` ↔ `core` ↔ `proxy`

Fuente única de verdad para headers, env vars, paginación y forma de errores entre los tres servicios del workspace.

> Las decisiones que justifican este contrato viven en
> [`docs/adr/0001-external-metadata-integration.md`](../adr/0001-external-metadata-integration.md).

## 1. Topología canónica

```
web (browser)   → web BFF (/api/proxy/*)  → proxy (/v1/proxy/*)
web (browser)   → core   (/api/*)
web (server)    → proxy   (/v1/proxy/*)
core            → proxy   (/v1/proxy/*)   [enriquecimiento de ContentItem]
```

`core` no expone endpoints `/api/proxy/...`. `web` no expone metadata externa fuera de `/api/proxy/*`.

## 2. Headers

### 2.1 Request

| Header            | Quién lo envía     | Quién lo lee | Obligatoriedad | Notas |
|-------------------|--------------------|--------------|----------------|-------|
| `Authorization: Bearer <jwt>` | `web` (cliente y SSR) | `core` | Requerido en endpoints autenticados de `core` | JWT de usuario emitido por `core/auth/`. |
| `X-Api-Key`       | `web` (server-only), `core` | `proxy` | Requerido en `/v1/proxy/*` excepto `/health` | API key compartida del proxy. **Nunca viaja al navegador.** |
| `X-Api-Consumer`  | `web` (server-only), `core` | `proxy` | Requerido por convención interna | Valor acotado `web` o `core`; permite separar latencia/cache sin identidad de usuario. |
| `Authorization: Bearer <api-key>` | (alternativa a `X-Api-Key`) | `proxy` | Opcional | Soportado por el proxy; preferir `X-Api-Key` para no confundir con el JWT de usuario. |
| `X-User-Country`  | `web`, `core`      | `proxy` | Opcional | ISO-3166 alpha-2. Por defecto `US` en `proxy`. |
| `X-Request-Id`    | cualquiera         | todos   | Opcional (entrada) / generado por middleware si falta | Ver §5. |
| `Content-Type: application/json` | todos | todos | Requerido en POST/PUT/PATCH | |

### 2.2 Response

| Header             | Emite     | Significado |
|--------------------|-----------|-------------|
| `X-Request-Id`     | `core`, `proxy` | Eco del request ID para correlacionar logs entre capas. |
| `X-Cache`          | `proxy`, `web` BFF | Estado acotado `HIT`, `MISS`, `STALE` o `BYPASS`. |
| `Server-Timing`    | `core`, `web` BFF | Desglose no sensible de app/DB/proxy para diagnóstico de navegador. |
| `X-RateLimit-Limit`     | `proxy` | Límite por minuto del rate limiter. |
| `X-RateLimit-Remaining` | `proxy` | Llamadas restantes en la ventana actual. |
| `X-RateLimit-Degraded`  | `proxy` | Presente cuando el rate limiter está fail-open por caché degradado. Valores: `cache-error`, `noop-cache`. |

### 2.3 CORS (`web` navegador → `core`)

Cuando el SPA en `web` llama a `core` desde el navegador (origen distinto, p. ej. `localhost:3000` → `localhost:8000`), `core` debe listar en `Access-Control-Allow-Headers` los encabezados de request que el cliente envía en preflight. La configuración vive en `core/core/settings/cors.py`: además de los defaults de `django-cors-headers`, se permiten **`x-request-id`** y **`x-user-country`**, y se exponen `x-request-id`, `x-cache` y `server-timing` cuando aplica.

## 3. Sobre canónico de errores

Forma exacta usada por `core` y `proxy`:

```json
{
  "error":      "MACHINE_CODE",
  "message":    "Texto humano",
  "fields":     { "name": ["This field is required."] },
  "request_id": "5b8e...c7",
  "...":        "claves extra opcionales por error"
}
```

Reglas:

- `error` es un string estable (no localizado). Lista canónica de códigos: ver [`core/core/error_codes.py`](../../core/core/error_codes.py) y [`proxy/internal/handlers/common/response.go`](../../proxy/internal/handlers/common/response.go).
- `message` es texto humano. Puede cambiar entre versiones; nunca usarlo para lógica.
- `fields` aparece sólo en errores de validación (DRF). Mapa `nombre_campo -> [mensaje]`.
- `request_id` aparece sólo cuando el middleware de request ID corrió. Útil para grep en logs.
- Claves extra son específicas del error (ej. `existing_item_id` en `DUPLICATE_ITEM`).

Lo que el contrato **prohíbe**:

- Devolver `{ "error": "texto humano" }` sin código.
- Devolver `{ "code": "..." }` (campo legacy eliminado del contrato canónico).
- Anidar el sobre como `{ "error": { "code": ... } }` (rechazado por costo de migración cliente).

Tests de contrato:

- Go: [`proxy/internal/handlers/common/response_test.go`](../../proxy/internal/handlers/common/response_test.go).
- Django: [`core/core/tests/test_error_envelope.py`](../../core/core/tests/test_error_envelope.py).

## 4. Paginación

Los dos backends tienen formas distintas porque sus semánticas son distintas. Ambos están permitidos.

### 4.1 `core` (Django/DRF)

- Query: `?page=N&page_size=M` (cap 100).
- Bypass: `?unpaginated=true` (cap interno 200, emite warning en logs).
- Respuesta:

```json
{
  "metadata": {
    "count": 123,
    "next":  "...",
    "previous": "...",
    "page_size": 50
  },
  "results": [ ... ]
}
```

### 4.2 `proxy` (Go)

- Query: `?page=N&limit=M` (cap 50).
- Respuesta:

```json
{
  "metadata": {
    "page": 1,
    "total_pages": 7,
    "total_results": 142
  },
  "results": [ ... ]
}
```

### 4.3 Mapeo en `web`

`web` tiene helpers tipados separados (`@/lib/api/api.ts` para core, `@/lib/api/proxyApi.ts` para proxy). No se intenta unificar shapes — se asume cliente con conocimiento del backend al que llama.

## 5. Request ID y correlación

- Middleware en `core` y `proxy` lee `X-Request-Id` del request. Si falta, genera UUIDv4.
- Un ID de entrada sólo es válido si tiene 1–128 caracteres y cumple
  `[A-Za-z0-9][A-Za-z0-9._:-]*`; cualquier valor inválido se reemplaza
  antes de registrarlo o propagarlo.
- El ID se setea en `gin.Context` (proxy) y `request.request_id` (core) y se emite en el header de respuesta.
- El BFF de `web` (`/api/proxy/*`, [`web/src/routes/api/proxy/$.ts`](../../web/src/routes/api/proxy/$.ts)) y los helpers SSR ([`web/src/lib/api/queries/server.ts`](../../web/src/lib/api/queries/server.ts), [`web/src/server/proxy.ts`](../../web/src/server/proxy.ts)) comparten un único ID por navegación lógica entre los fetches paralelos a `core` y `proxy`.
- Cada línea de log estructurado incluye `request_id` cuando esté disponible.

## 6. Versionado

Estado actual y aceptado:

- `core`: bajo `/api/...`, sin segmento `/v1`.
- `proxy`: bajo `/v1/proxy/...`.

Cualquier cambio incompatible en `proxy` requiere `/v2/proxy/...` y un período de overlap. `core` no introduce `/v1/` mientras no haya un consumidor externo distinto a `web`.

## 7. Env vars (matriz de propiedad)

Server-only significa que la variable **nunca** debe aparecer en bundles de cliente. En `web` (TanStack Start) no inyectes secretos en `window.__ENV__`; evita cualquier prefijo público (`NEXT_PUBLIC_*`) para datos sensibles. Las URLs públicas de API pueden seguir usando `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_PROXY_API_URL` en `.env` o el script de runtime inyectado por el servidor.

| Variable                 | Servicio  | Visibilidad   | Notas |
|--------------------------|-----------|---------------|-------|
| `SECRET_KEY`             | core      | server-only   | Django. |
| `DEBUG`                  | core      | server-only   | |
| `ALLOWED_HOSTS`          | core      | server-only   | |
| `DATABASE_URL`           | core      | server-only   | Cae a SQLite si falta. |
| `REDIS_URL`              | core, proxy | server-only | El launcher inyecta uno temporal en local. |
| `CORS_ALLOWED_ORIGINS`   | core      | server-only   | |
| `CSRF_TRUSTED_ORIGINS`   | core      | server-only   | |
| `PROXY_API_BASE_URL`     | core      | server-only   | URL del proxy desde core. |
| `PROXY_API_KEY`          | core, web | **server-only** | Misma cadena que `proxy:API_KEY`. **No** definir `NEXT_PUBLIC_PROXY_API_KEY`. |
| `PROXY_API_URL`          | web       | server-only   | Override SSR del proxy URL. |
| `NEXT_PUBLIC_PROXY_API_URL` | web    | público       | Sólo URL pública, nunca clave. |
| `API_URL`                | web       | server-only   | Override SSR de la URL de core. |
| `NEXT_PUBLIC_API_URL`    | web       | público       | URL pública de core para fetches del cliente. |
| `PORT`                   | proxy     | server-only   | |
| `CORS_ALLOW_ORIGINS`     | proxy     | server-only   | |
| `RATE_LIMIT_PER_MINUTE`  | proxy     | server-only   | |
| `API_KEY`                | proxy     | server-only   | Misma cadena que `core:PROXY_API_KEY` y `web:PROXY_API_KEY`. |
| `TMDB_API_KEY`           | proxy     | server-only   | Sólo en proxy. |
| `IGDB_CLIENT_ID`         | proxy     | server-only   | |
| `IGDB_CLIENT_SECRET`     | proxy     | server-only   | |
| `SPOTIFY_CLIENT_ID`      | proxy     | server-only   | |
| `SPOTIFY_CLIENT_SECRET`  | proxy     | server-only   | |

Reglas duras:

- Las claves de proveedor (TMDB/IGDB/Spotify) viven **sólo** en `proxy`.
- La proxy API key es la **misma** cadena en los tres lugares; no se rota por servicio.
- `web` falla al arrancar SSR si `PROXY_API_KEY` está vacío en producción.
- `proxy` se niega a arrancar si `API_KEY` está vacío (config + middleware enforce).

## 8. Cuándo actualizar este documento

- Antes de mergear cualquier cambio que añada/quita/renombre un header cross-layer.
- Antes de cambiar la forma del sobre de error.
- Cuando se agregue una nueva env var compartida entre dos servicios.
- Cuando se cambie el contrato de paginación de `proxy` o `core`.
