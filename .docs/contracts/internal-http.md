# Contrato HTTP interno `web` ↔ `core` ↔ `proxy`

Fuente única de verdad para headers, env vars, paginación y forma de errores entre los tres servicios del workspace.

> Las decisiones que justifican este contrato viven en
> [`docs/adr/0001-external-metadata-integration.md`](../adr/0001-external-metadata-integration.md).

## 1. Topología canónica

```
web (browser)   → web BFF (/api/proxy/*)  → proxy (/v1/proxy/*)
web (browser)   → web BFF (/api/core/*)   → core (/api/*)
web (browser)   → web BFF (/api/auth/*)   → core auth (/api/auth/*)
web (server)    → proxy   (/v1/proxy/*)
web (server)    → core    (/api/content/resolve-ids/)
core            → proxy   (/v1/proxy/*)   [enriquecimiento de ContentItem]
```

### 1.1 Duración estimada de videojuegos

El detalle normalizado de un juego puede incluir `duration`, sin exponer el
payload crudo de IGDB:

```json
{
  "source": "igdb",
  "status": "matched",
  "main_story_seconds": 36000,
  "main_extra_seconds": 54000,
  "completionist_seconds": 90000,
  "source_updated_at": "2026-07-01T00:00:00Z",
  "sample_count": 24
}
```

Todos los valores de duración son opcionales. `status` puede ser `matched`,
`no_data`, `stale` o `error`. La ausencia o el error de `duration` no convierte
el detalle del juego en un error de la respuesta. Las credenciales de IGDB
siguen siendo exclusivas de `proxy`.

`core` no expone endpoints `/api/proxy/...`. `web` no expone metadata externa fuera de `/api/proxy/*`.

## 2. Headers

### 2.1 Request

| Header            | Quién lo envía     | Quién lo lee | Obligatoriedad | Notas |
|-------------------|--------------------|--------------|----------------|-------|
| `Authorization: Bearer <jwt>` | `web` server-only | `core` | Requerido en endpoints autenticados de `core` | El BFF/SSR lo obtiene de cookies `HttpOnly`; nunca lo construuye JavaScript del navegador. |
| `X-CSRF-Token` | navegador | `web` BFF | Requerido en POST/PUT/PATCH/DELETE | Debe coincidir con la cookie no-HttpOnly `csrf-token`; además se validan origen y `Sec-Fetch-Site`. |
| `X-Api-Key`       | `web` (server-only), `core` | `proxy`; `core` en contratos confiables de catálogo | Requerido en `/v1/proxy/*` excepto `/health`; autentica `web` ante el resolver bulk y la identidad opaca de visitante del detalle público | API key compartida del proxy. **Nunca viaja al navegador.** |
| `X-Api-Consumer`  | `web` (server-only), `core` | `proxy`; `core` en contratos confiables de catálogo | Requerido por convención interna | Valor acotado `web` o `core`; permite separar tráfico interno sin identidad de usuario. Los contratos de catálogo sólo aceptan el consumidor `web`. |
| `X-Catalog-Visitor` | `web` (server-only) | `core` | Requerido para detalle público servido por `web` sin JWT | Fingerprint HMAC opaco de 64 caracteres derivado de una cookie `HttpOnly` firmada. Sólo se acepta junto con la credencial confiable de `web`; nunca contiene ni expone la IP. |
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

### 2.3 Browser same-origin boundary

El navegador no llama a `core` directamente. Lecturas y mutaciones usan
`/api/core/*`; login, registro, refresh y logout usan rutas fijas
`/api/auth/*`. El BFF añade el JWT server-side, rota refresh de forma
single-flight y nunca devuelve access/refresh en JSON. Las cookies
`auth-token` y `refresh-token` son `HttpOnly`, `Secure` en producción,
`SameSite=Lax`, `Path=/` y host-only salvo que `AUTH_COOKIE_DOMAIN`
configure explícitamente otro alcance.

La cookie `csrf-token` sí es legible por el navegador y sólo se usa para
doble envío. No es una credencial de sesión.

Las lecturas públicas `GET /api/core/content/<id>/` se reenvían sin JWT
si no existe sesión. El BFF asigna una cookie opaca `HttpOnly` firmada y
envía su fingerprint como `X-Catalog-Visitor` dentro del request
autenticado `web -> core`; el navegador no controla ni observa esos
headers internos. Cualquier mutación de listas, ratings o contenido
sigue el camino autenticado. Homepage/search/browse resuelven ids estables
server-side; ni `X-Api-Key` ni la URL interna de `core` aparecen en
requests del navegador.

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

Authenticated system lists use the standard Core list endpoints at
`/api/content/lists/<id>/` and `/api/content/lists/<id>/items/`. Dynamic
collection metadata/settings remain Core-only helpers for visibility and the
legacy `/collections/<key>` redirect resolves to that canonical list route;
they do not call `proxy` or expose provider credentials.

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

### 4.4 Browse público

`GET /v1/proxy/browse` es el agregado público por familia. Recibe
`type=movies|tv-shows|games|albums|books`, `sort=popular|recent`, `page=1..100`
y un `q` opcional de hasta 80 caracteres. El tamaño de página es fijo en 24.
Cuando existe `q`, el modo de respuesta es `search` y la consulta se ordena
por relevancia; la política de contenido adulto siempre es `exclude`.

La respuesta tiene `{ type, mode, status, results, metadata, error }`, donde
`status` es `complete`, `empty` o `degraded` y `error` sólo contiene códigos
estables (`PROVIDER_TIMEOUT`, `PROVIDER_RATE_LIMIT`, `PROVIDER_AUTH_FAILED`,
`PROVIDER_UNAVAILABLE` o `BROWSE_UNAVAILABLE`). Las tarjetas reciben sus ids
internos mediante el resolver bulk server-side; Browse elimina resultados que
no puedan navegar a `/content/<id>`.

Las claves del agregado incluyen familia, modo, hash de consulta, página, país
y versión de política. El endpoint usa caché fresh/stale, stale-while-revalidate
y single-flight; mantiene `X-Request-Id`, `X-Cache`, rate limiting y el sobre
de error canónico.

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

Server-only significa que la variable **nunca** debe aparecer en bundles
de cliente. En `web` (TanStack Start) no inyectes secretos ni la URL
interna de `core` en `window.__ENV__`; el navegador usa rutas BFF
same-origin.

| Variable                 | Servicio  | Visibilidad   | Notas |
|--------------------------|-----------|---------------|-------|
| `SECRET_KEY`             | core      | server-only   | Django. |
| `DEBUG`                  | core      | server-only   | |
| `DISABLE_RATE_LIMITS`    | core, web | server-only   | Sólo `true` en Compose local; por defecto `false`. |
| `ALLOWED_HOSTS`          | core      | server-only   | |
| `DATABASE_URL`           | core      | server-only   | Cae a SQLite si falta. |
| `REDIS_URL`              | core, proxy | server-only | Compose inyecta `redis://redis:6379/1` en local. |
| `CORS_ALLOWED_ORIGINS`   | core      | server-only   | |
| `CSRF_TRUSTED_ORIGINS`   | core      | server-only   | |
| `AUTH_COOKIE_SECURE`     | core, web | server-only   | `True`/`true` en HTTPS; sólo fixtures HTTP lo desactivan. |
| `AUTH_COOKIE_DOMAIN`     | core, web | server-only   | Omitir para cookies host-only; configurar sólo con alcance revisado. |
| `PROXY_API_BASE_URL`     | core      | server-only   | URL del proxy desde core. |
| `PROXY_API_KEY`          | core, web | **server-only** | Misma cadena que `proxy:API_KEY`. **No** definir `NEXT_PUBLIC_PROXY_API_KEY`. |
| `PROXY_API_URL`          | web       | server-only   | Override SSR del proxy URL. |
| `NEXT_PUBLIC_PROXY_API_URL` | web    | público       | Sólo URL pública, nunca clave. |
| `API_URL`                | web       | server-only   | Override SSR de la URL de core. |
| `NEXT_PUBLIC_API_URL`    | web       | server-only legacy | Fallback temporal de despliegues anteriores; nunca se copia a `window.__ENV__`. Migrar a `API_URL`. |
| `BUILD_SHA`              | web       | server-only   | SHA completo inyectado en la imagen; `/api/version` lo expone sin caché para coordinar releases. |
| `PORT`                   | proxy     | server-only   | |
| `CORS_ALLOW_ORIGINS`     | proxy     | server-only   | |
| `RATE_LIMIT_PER_MINUTE`  | proxy     | server-only   | `0` sólo en Compose local; por defecto `300`. |
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

## 9. Resolución masiva de identidad de contenido

`POST /api/content/resolve-ids/` es el contrato confiable para que `web`
convierta resultados de discovery en ids internos antes de renderizar
enlaces.

- Acepta como máximo 200 elementos únicos por
  `(content_type, external_id, source)`.
- Autoriza un JWT de usuario válido o la combinación server-only
  `X-Api-Key: <PROXY_API_KEY>` + `X-Api-Consumer: web`.
- Un navegador anónimo sin esa credencial recibe `401`; el BFF público
  no reenvía este `POST`.
- Aplica límites burst y sustained específicos al usuario o consumidor
  de servicio; los usuarios conservan el máximo histórico de 1,000/día.
- Sólo acepta identidad. Ignora campos adicionales y nunca persiste
  metadata de proveedor suministrada por el navegador.
- La operación es idempotente, conserva el orden de entrada y devuelve
  el id estable de `ContentItem` para cada triple.
- Un detalle nuevo se materializa después por el camino confiable
  `core` -> `proxy`; el endpoint bulk no duplica el fetch de discovery.
- Hover, focus y navegación nunca deben llamar
  `POST /api/content/get-or-create/`; esas interacciones son lecturas
  puras contra el id ya resuelto.

## 9.1 Detalle público id-first

`GET /api/content/<id>/` permite lectura anónima y autenticada.

- Conserva el camino local-first y la hidratación confiable
  `core -> proxy`.
- Una respuesta anónima incluye metadata y agregados, pero
  `current_user_rating` es siempre `null`.
- Una respuesta autenticada puede incluir sólo el rating del usuario
  actual.
- Usuarios autenticados conservan su bucket de 1,000 lecturas/día.
- Visitantes servidos por `web` conservan el límite anónimo de 100/día,
  pero cada cookie firmada usa un bucket separado. Core sólo confía en
  el fingerprint si también valida `X-Api-Key` y
  `X-Api-Consumer: web`.
- Tráfico anónimo que llega directamente a `core` ignora cualquier
  `X-Catalog-Visitor` no autenticado y usa el bucket por IP.
- No abre endpoints de listas, ratings o búsqueda de usuarios.

## 10. Presupuestos y caché de agregados de discovery

- El cliente HTTP de proveedor en `proxy` usa timeout de 3 s, como
  máximo dos reintentos acotados, backoff entre 100 y 500 ms, presupuesto
  total de 2.5 s y circuit breaker por proveedor.
- Multi-search tiene presupuesto agregado de 1.5 s y 900 ms por bucket.
- Homepage tiene presupuesto agregado de 2.5 s y 1.1 s por bucket.
- Las claves de caché de agregados incluyen todos los inputs que cambian
  la respuesta (`query`, tipos, página, límite, país), la versión
  `future-24h` y la política adulta explícita (`adult-exclude` o
  `adult-include`). Homepage siempre usa exclusión; sólo la búsqueda
  directa puede solicitar inclusión.
- `GET /v1/proxy/search` acepta `adult=exclude|include`, usa `exclude`
  por defecto, rechaza otros valores con `400` y devuelve
  `X-Content-Policy`. La inclusión sólo cambia los buckets de TMDB,
  porque IGDB, Spotify y OpenLibrary no exponen una clasificación
  equivalente y confiable.
- Un fallo de Redis degrada a ejecución sin caché; no abre el proxy ni
  convierte un fallo de infraestructura de caché en un `5xx` obligatorio.

## 11. Perfil público, tracking y listas públicas

Lecturas anónimas admitidas por el BFF de Core:

- `GET|HEAD /api/profiles/<username>/`
- `GET|HEAD /api/profiles/<username>/(progress|completed|ratings|lists)/`
- `GET|HEAD /api/content/<id>/`
- `GET|HEAD /api/content/ratings/` con `content_item_id` o el par
  `source_api` + `external_id`
- `GET|HEAD /api/content/ratings/<id>/`
- `GET|HEAD /api/content/lists/<id>/`

El predicado falla cerrado para cualquier otro método o patrón. Una
cookie caducada puede provocar un intento de refresh, pero si no se
restaura la sesión la lectura pública continúa anónima. Mutaciones y
rutas Core no incluidas arriba requieren sesión. Las lecturas públicas
de ratings serializan sólo `id` y `username` del autor; email, nombre y
apellido no forman parte del contrato público.

En entornos con throttling, el detalle público aplica 60 solicitudes por
minuto por visitante anónimo firmado y 120 solicitudes por minuto por usuario
autenticado. Compose local desactiva este throttle para permitir pruebas
paralelas.

Writes autenticados:

- `PATCH /api/profiles/me/`
- `PUT|DELETE /api/content/tracking/<content_id>/`
- `PATCH /api/content/tracking/<content_id>/favorite/`

`PATCH /api/profiles/me/` acepta `banner_content_id` como un favorito
completado activo del usuario y `banner_image_id` como una imagen persistida
del mismo contenido; ambos pueden enviarse como `null` para volver al banner
aleatorio. Core rechaza referencias que no cumplan esa relación.

Los endpoints de pestaña de perfil usan `page_size=24` por defecto y
máximo 48. El overview limita sus colecciones internas y nunca consulta
proveedores. El throttle público es 120 solicitudes/minuto por IP en entornos
con throttling.
`progress` acepta filtros acumulables `type` y `status` separados por comas.
El orden usa `sort=updated|completed|title|score` y `order=asc|desc`; ambos
son independientes de la presentación `view`, que sólo vive en la URL web.

Errores de dominio adicionales:

- `FAVORITE_LIMIT_REACHED` (`409`) cuando ya existen cinco favoritos
  preservados del tipo canónico.
- Los errores recuperables de temporada sin padre local indican que debe
  ejecutarse el backfill; la escritura no llama a `proxy`.

Las listas privadas y las inexistentes devuelven 404 al consumidor
anónimo. El serializer público puede exponer usernames de owner y
colaboradores, pero nunca emails ni membresías privadas. El detalle de
contenido separa caché por `viewerId` o `anonymous` para que
`current_user_rating` y tracking no crucen sesiones.
