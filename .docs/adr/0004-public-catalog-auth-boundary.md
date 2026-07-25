# 0004. Catálogo público y frontera de autenticación

- Estado: Accepted
- Fecha: 2026-07-24
- Enmienda: 2026-07-25

## Contexto

Denn tenía una landing pública, pero Home, Search y Content Detail se
comportaban como una aplicación cerrada: una sesión ausente o vencida
impedía explorar el catálogo. Eso contradecía el valor principal del
producto y hacía que enlaces compartidos a contenido dependieran del
estado de autenticación del visitante.

La exploración ya obtenía metadata pública desde `proxy`, pero las
tarjetas necesitan un id interno de Denn antes de enlazar a
`/content/<id>`. El resolver bulk de `core` crea de forma idempotente esa
identidad mínima. Abrir ese `POST` directamente a navegadores anónimos
habría convertido una lectura de catálogo en una superficie pública de
escritura.

## Decisión

1. `/`, `/search` y `/content/<id>` son superficies públicas. Home usa
   la misma experiencia de catálogo para visitantes y usuarios; una
   sesión autenticada añade las secciones personales.
2. `/` es la única entrada pública. La antigua landing deja de existir
   como ruta independiente y su galería de portadas se conserva como
   fondo decorativo del shell compartido por login y registro.
3. Añadir a lista, puntuar, reseñar y cualquier otra mutación personal
   siguen requiriendo autenticación. Al activarlas de forma anónima,
   `web` navega a `/login?next=<ruta actual>` y preserva ese destino
   también durante el salto a registro.
4. El navegador sólo lee discovery mediante `/api/proxy/*` y detalle
   mediante `/api/core/content/<id>/`. Nunca recibe `PROXY_API_KEY`,
   nunca llama a la URL interna de `core` y no puede usar el resolver
   bulk de forma anónima.
5. `web` resuelve los ids de homepage/search en el servidor. Llama a
   `POST /api/content/resolve-ids/` con la clave server-only ya
   compartida y `X-Api-Consumer: web`. `core` acepta ese consumidor
   confiable o un usuario autenticado, compara la clave en tiempo
   constante y aplica un throttle específico.
6. `GET /api/content/<id>/` permite lectura anónima. Para evitar que la
   IP de `web` concentre la cuota de todos los visitantes, el BFF crea
   una cookie opaca `HttpOnly` firmada y envía su fingerprint HMAC sólo
   dentro del request autenticado server-to-server. `core` aplica el
   límite por fingerprint validado o por IP para tráfico directo. El
   serializer devuelve metadata y agregados públicos, pero
   `current_user_rating` siempre es `null` si no hay usuario.
7. Las claves de TanStack Query de detalle incluyen el viewer
   (`anonymous` o id de usuario) para que una respuesta anónima nunca
   reemplace o reutilice estado personal autenticado.
8. Los helpers de prefetch SSR no ejecutan fetches internos durante una
   navegación cliente. En cliente, las queries usan exclusivamente los
   BFF same-origin.

## Alternativas consideradas

### Mantener la landing en `/` y crear `/browse`

Conservaba la ruta histórica, pero mantenía dos entradas principales y
hacía que el producto siguiera pareciendo una landing antes que un
catálogo. También dejaba sin resolver qué Home debía usar un usuario
autenticado.

### Redirigir visitantes de `/` a la landing

Preservaba el comportamiento anterior, pero repetía exactamente la
fricción que motivó el cambio.

### Abrir el resolver bulk a requests anónimos del navegador

Reducía una llamada server-to-server, pero exponía una escritura
idempotente de dominio al tráfico no confiable y permitía fabricar
triples arbitrarios fuera de resultados servidos por `proxy`.

### Resolver ids sólo al hacer click

Evitaba crear identidades para resultados no visitados, pero rompía
enlaces semánticos, hover prefetch, apertura en nueva pestaña y la ruta
id-first ya adoptada.

## Consecuencias

- La exploración y los enlaces compartidos sobreviven a una sesión
  ausente o expirada.
- Home no se bifurca en dos productos: autenticación enriquece la misma
  superficie con listas personales.
- La creación mínima de `ContentItem` sigue detrás de una frontera
  server-to-server autenticada y observable.
- Discovery paga una llamada bulk adicional a `core`; se reutiliza el
  request id, se limita a 100 identidades por payload y se aplica
  throttle.
- La lectura pública de detalle aumenta el tráfico anónimo de `core`;
  conserva la cuota histórica por visitante sin compartirla entre toda
  la instancia `web` y mantiene la política local-first existente.
- Login y registro conservan la identidad visual de la antigua landing
  sin mantener una segunda entrada pública ni añadir controles
  interactivos detrás de los formularios.

## Fuera de esta decisión

La fundación no completa todo Sprint 13. Siguen abiertos browse por
taxonomía, reviews públicas con serializer sanitizado, listas públicas
relacionadas, distribución de ratings, sitemap y gallery lightbox.

## Validación obligatoria

- Unit tests del matcher BFF, resolución bulk y separación de caches por
  viewer.
- Tests Django de detalle anónimo, rechazo del resolver desde navegador
  y aceptación del consumidor `web`.
- Playwright desktop/móvil para Home, Search, Content Detail, retorno de
  login, auth responsive, retiro de `/welcome`, rutas protegidas y
  ausencia de API keys o URLs internas de `core` en requests del
  navegador.
- Build de producción y medición anónima de Home, Search y Detail.

## Referencias

- [ADR 0001](./0001-external-metadata-integration.md)
- [ADR 0002](./0002-web-auth-cookies.md)
- [Contrato HTTP interno](../contracts/internal-http.md)
- [Sprint 13](../sprints/sprint-13-public-catalog-1-0.md)
