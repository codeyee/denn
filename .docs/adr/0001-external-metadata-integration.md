# 0001. Integración de metadata externa (`web` / `core` / `proxy`)

- Estado: Accepted
- Fecha: 2026-04-18
- Supersede diagnóstico histórico ahora absorbido por:
  [`../architecture/current-state.md`](../architecture/current-state.md),
  [`../technical-debt.md`](../technical-debt.md) y
  [`../history/implementation-history.md`](../history/implementation-history.md)
- Refinado el 2026-07-24 por
  [`0004-public-catalog-auth-boundary.md`](./0004-public-catalog-auth-boundary.md):
  discovery público sigue en `web -> proxy`, mientras el detalle
  id-first persistido se lee públicamente por `web BFF -> core`.

## Contexto

El workspace tiene tres servicios independientes:

- `web` — TanStack Start (Vite + Nitro). Sirve UI, hace SSR y expone el BFF en [`web/src/routes/api/proxy/$.ts`](../../web/src/routes/api/proxy/$.ts).
- `core` — Django/DRF. Dueño del dominio (auth, lists, content_items, ratings, invitations).
- `proxy` — Go/Gin. Gateway hacia metadata externa (TMDB, IGDB, Spotify, OpenLibrary). Tiene caché Redis y rate-limiting.

Hoy las flechas de integración existentes son:

```
Browser → web → core               (auth, lists, content)
Browser → web → /api/proxy → proxy (metadata desde el navegador, vía BFF)
web (SSR: loaders y server functions) → proxy                  (homepage, search, prefetch)
core → proxy                       (enriquecimiento de ContentItem.source_data vía ProxyAPIClient)
```

Evidencia en código:

- `web → core`: [`web/src/lib/api/api.ts`](../../web/src/lib/api/api.ts), [`web/src/stores/auth-store.ts`](../../web/src/stores/auth-store.ts).
- `web → proxy` (BFF, cliente y SSR): [`web/src/routes/api/proxy/$.ts`](../../web/src/routes/api/proxy/$.ts), [`web/src/lib/api/proxyApi.ts`](../../web/src/lib/api/proxyApi.ts), [`web/src/lib/api/queries/server.ts`](../../web/src/lib/api/queries/server.ts).
- `core → proxy`: [`core/content/services/proxy_client.py`](../../core/content/services/proxy_client.py), [`core/content/utils.py`](../../core/content/utils.py), [`core/content/serializers/content_item.py`](../../core/content/serializers/content_item.py).
- Superficie del `proxy`: [`proxy/cmd/api/main.go`](../../proxy/cmd/api/main.go), [`proxy/internal/middleware/auth.go`](../../proxy/internal/middleware/auth.go).

El problema a resolver era estructural: la topología nunca fue una decisión, fue una acumulación. La documentación histórica llegó a describir a `core` como un "centralized API gateway", lo cual no se sostiene. Y existen dos clientes lógicos contra `proxy` (uno desde `web`, otro desde `core`) sin un contrato común.

## Decisión

**Se formaliza el modelo híbrido con contratos explícitos**, así:

1. `web → proxy` es la ruta canónica para **discovery de metadata
   externa lectura-pública** (búsqueda y homepage).
   - Desde el navegador: siempre vía la ruta BFF [`/api/proxy/*`](../../web/src/routes/api/proxy/$.ts) (la API key del proxy nunca se expone al cliente).
   - Desde server loaders / server functions: directo a `proxy`, con la API key inyectada server-side.
2. `core → proxy` se mantiene **sólo para enriquecimiento de entidades persistidas** (poblar `ContentItem.source_data`, `browse_metadata`). No para servir respuestas de búsqueda al frontend.
3. `web → core` se reserva para **dominio del usuario**: auth, lists, items, ratings, invitations.
4. `core` **no expone** rutas de metadata externa al frontend (no `/api/proxy/...` en Django). Si el frontend necesita datos enriquecidos por dominio (e.g. una list-item con su `source_data`), `core` los compone server-side.

El refinamiento de ADR 0004 hace público el detalle id-first persistido
de `core`; no convierte a Django en gateway genérico ni permite
búsquedas de proveedor a través de `core`.

Las dos flechas con `proxy` (`web → proxy` y `core → proxy`) son legítimas y distintas: una es para servir, la otra para persistir. Ambas comparten el mismo contrato HTTP y la misma API key, pero con responsabilidades separadas.

## Alternativas consideradas

### Opción A — `web → proxy` directo, `core` sólo persiste

- Pros:
  - Una sola flecha hacia `proxy` (más simple).
  - Latencia mínima para metadata pública (sin salto por Django).
  - `core` libre de toda lógica de proveedores externos.
- Contras:
  - `core` necesita igualmente datos del proxy para `source_data` y `browse_metadata` (ver [`core/content/utils.py`](../../core/content/utils.py)). Eliminar esa flecha implica que `web` haga dos requests (`core` para dominio, `proxy` para metadata) y los componga client-side, perdiendo cacheabilidad server-side.
  - Endpoints como `lists/{id}/items?include=source_data` (un caso real hoy) tendrían que reconstruirse en el cliente.

### Opción B — `web → core` y `core` centraliza todo

- Pros:
  - Un solo backend para el frontend (más simple para el cliente).
  - Centraliza auth, autorización por list, y composición.
- Contras:
  - Latencia: cada búsqueda y request de homepage paga el salto por Django. La caché Redis del proxy se vuelve menos útil porque las respuestas son server-rendered por core.
  - Django no es bueno para fan-out concurrente (lo que el `proxy` hace en Go con goroutines por proveedor).
  - `core` se convierte en un cuello de botella de proveedores externos: cualquier outage de TMDB tira `core`.
  - Anula la razón de existir del `proxy`.

### Opción C — Híbrido formalizado (la elegida)

- Pros:
  - Cada servicio mantiene su responsabilidad natural.
  - La caché Redis del `proxy` sirve a ambos consumidores.
  - El frontend no paga latencia extra para búsquedas.
  - `core` puede componer datos enriquecidos cuando los necesita (no se prohíbe).
- Contras:
  - Dos consumidores significan dos caminos donde la API key debe estar correcta.
  - Hay que documentar la división — esto se hace en este ADR y en `docs/contracts/internal-http.md`.

## Consecuencias

### Código

- `web` deja de aceptar el fallback inseguro `NEXT_PUBLIC_PROXY_API_KEY` en cualquier path server-side ([`web/src/routes/api/proxy/$.ts`](../../web/src/routes/api/proxy/$.ts), [`web/src/lib/api/queries/server.ts`](../../web/src/lib/api/queries/server.ts)). Tratado en PR-6B.
- `proxy` falla cerrado cuando `API_KEY` está vacío en producción ([`proxy/internal/middleware/auth.go`](../../proxy/internal/middleware/auth.go)). Tratado en PR-6B.
- `core` no añade rutas `/api/proxy/...`. La superficie HTTP de `core` queda en `/api/auth/*`, `/api/content/*`, `/api/cache/*`.
- El versionado de URLs queda asimétrico y declarado: `core` en `/api`, `proxy` en `/v1/proxy`. No se introduce `/v1/` en `core` en esta decisión.

### Operación

- Dos servicios deben tener `PROXY_API_KEY` configurado (`web` y `core`); el `proxy` debe tener `API_KEY`. Los tres son la misma cadena.
- Métricas de cache hit/miss del `proxy` reflejan tráfico combinado de `web` y `core` — al instrumentar (PR-6C) se debe etiquetar por `consumer` (header `X-Api-Consumer: web|core`) si se quiere distinguir.
- Cualquier nueva categoría de metadata externa entra primero al `proxy`, no a `core`.

### Documentación

- [`README.md`](../../README.md#core-service) consolida la descripción vigente de `core` para no afirmar que es el gateway.
- Se crea [`docs/contracts/internal-http.md`](../contracts/internal-http.md) en PR-6B con el contrato canónico de headers, env vars y errores.
- Este ADR se enlaza desde el índice central [`../README.md`](../README.md) y desde `docs/workspace-operating-model.md`.

### Deuda explícita

- La duplicación de cliente HTTP entre `web/src/lib/api/proxyApi.ts` y `core/content/services/proxy_client.py` no se resuelve aquí. Generar tipos compartidos desde `proxy/docs/openapi.yaml` queda como trabajo futuro.
- El header `X-Api-Consumer` para diferenciar tráfico es opcional y entra sólo si la observabilidad lo requiere.

## Referencias

- Historia de implementación: [`../history/implementation-history.md`](../history/implementation-history.md).
- Topología del workspace: [`docs/workspace-operating-model.md`](../workspace-operating-model.md).
- ADR de auth complementario: [`0002-web-auth-cookies.md`](./0002-web-auth-cookies.md).
