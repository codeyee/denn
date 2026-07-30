# Sprint 13
# Public Catalog 1.0

## Estado parcial (2026-07-24)

Fundación ya disponible:

- Home, Search y Content Detail id-first funcionan sin login.
- Las páginas de listas públicas admiten lectura anónima a través del
  BFF estricto y las tarjetas de perfil navegan sin terminar en login.
- Home autenticado añade listas personales sin cambiar de producto.
- `/` es la única entrada pública; la identidad visual de la antigua
  landing se reutiliza en login y registro.
- Add-to-List y Rating exigen login al actuar y conservan `next`.
- Los ids de discovery se resuelven por una llamada confiable
  server-to-server; el navegador no recibe claves ni URLs internas.
- Metadata/canonical básica existe para Home, Search, Login, Register y
  Detail.

Pendiente para cerrar este sprint:

- browse público por tipo;
- reviews públicas sanitizadas, distribución de ratings y listas
  públicas relacionadas;
- sitemap, gallery lightbox y hardening/rebaseline de tráfico anónimo.

## Objetivo
Abrir Denn al mundo como catálogo multi-media público. Este sprint quita
el carácter de app cerrada detrás de login y crea la primera superficie
anónima real: búsqueda pública de obras, browse por tipo de medio y
content pages públicas con capa social mínima.

## Entregable principal
- Búsqueda pública de obras sin login.
- Browse público por tipo de medio.
- Fichas públicas de contenido.
- Metadata SEO y comportamiento canónico de rutas.
- Metadata dinámica por página y gallery lightbox en fichas públicas.
- En cada content page pública:
  - score promedio;
  - cantidad de ratings;
  - distribución de notas;
  - reviews recientes;
  - listas públicas que contienen la obra.

## Skills guía
- `brainstorming`
- `vercel-react-best-practices`
- `api-design-principles`
- `clean-code`
- `security-review`

## Alcance
- `web/src/routes/search.tsx`, futuras rutas públicas bajo
  `web/src/routes/`, browse público y rutas de contenido.
- Eliminación de auth-gating en superficies seleccionadas.
- Metadata, sitemap y canonical URLs.
- Galería de imágenes en fichas con expansión modal accesible.
- Endpoints públicos de agregados, reviews recientes y listas públicas
  por obra en `core`.
- Ajustes de cache y lectura anónima en `proxy`/`web`.
- Documentación de navegación y SEO.

## No objetivos
- No búsqueda pública de usuarios ni listas.
- No directorios públicos de usuarios/listas.
- No likes, comentarios ni follow graph.
- No filtros avanzados en browse o leaderboards.

## Dependencias
- Requiere `Sprint 11` para semántica correcta de ratings.
- Requiere `Sprint 12` para tener listas públicas bien definidas.
- Construye sobre la fundación ya implementada de SSR/query y auth en
  TanStack Start.
- Coordina con `Sprint 10` por tráfico anónimo y freshness de metadata.

## Contexto funcional y técnico

### Estado de partida

Antes de la fundación del 2026-07-24 las rutas importantes estaban
protegidas y el producto casi no tenía superficie pública más allá del
landing. Ese bloqueo ya fue retirado para Home, Search y Content Detail.

### Modelo objetivo

El MVP público debe permitir que un usuario anónimo:

- busque obras;
- explore por tipo de medio;
- abra una ficha pública indexable;
- vea agregados y reviews recientes;
- descubra listas públicas relacionadas.

La búsqueda pública global sigue siendo solo de `obras`.
Usuarios y listas se descubren por enlaces y superficies internas, no
por un hub dedicado.

### Decisiones técnicas a cerrar dentro del sprint

- si `web` compone ciertos agregados desde múltiples endpoints o si
  `core` debe exponer un endpoint público de content page consolidada;
- estrategia de cache para alto tráfico anónimo;
- cómo resolver metadata SEO sin duplicar fetches costosos;
- qué browse taxonomy tiene sentido por tipo sin inflar demasiado el
  scope.

## Backlog por lotes

### Lote 13A
- Contrato público de content page.
- Endpoints públicos y serializers seguros.

### Lote 13B
- Quitar auth-gating de rutas públicas.
- Búsqueda pública de obras.
- Browse por tipo.

### Lote 13C
- SEO, metadata, sitemap y cache.
- Hardening de tráfico anónimo.

## Secuencia sugerida de PRs

### PR-13A Endpoints públicos de catálogo
- Agregados por obra.
- Reviews recientes públicas.
- Listas públicas por obra.

### PR-13B Rutas públicas en `web`
- Search público.
- Browse por tipo.
- Content page pública.
- Gallery lightbox en content page.

### PR-13C SEO y performance
- Metadata route-level.
- Sitemap.
- Estrategia de cache y observabilidad.

## Tareas

### T1. Diseñar contrato de content page pública
- Definir payload mínimo.
- Asegurar que ratings inactivos no cuentan.
- Formalizar reviews con spoiler colapsado.

### T2. Exponer búsqueda y browse públicos
- Search solo de obras.
- Browse por tipo de medio.
- Estados vacíos y degradación limpia.

### T3. Hacer públicas las fichas
- SSR estable.
- Sin `ProtectedRoute`.
- Con metadata indexable.
- Gallery clickeable con modal, foco accesible y cierre por teclado.

### T4. Asegurar performance y cache
- Revisar query count.
- Revisar presión en `proxy`.
- Ajustar cache TTLs.

### T5. Documentar navegación pública
- Contratos.
- SEO.
- Restricciones MVP.

## Checklist de implementación

### Lote 13A
- [x] Detalle id-first público con serializer anónimo seguro.
- [x] Resolver bulk protegido para usuario o consumidor `web`.
- [ ] Agregados/reviews/listas públicas consolidados.

### Lote 13B
- [x] Search sin login funciona.
- [x] Browse por tipo funciona para películas, series, juegos, música y
  libros con popular/recent, búsqueda por familia, estados degradados e ids
  internos estables.
- [x] Content page pública funciona.
- [ ] Gallery lightbox funciona sin romper layout móvil.

### Lote 13C
- [ ] Sitemap publicado.
- [x] Metadata/canonical básica de rutas públicas.
- [x] Browse público SSR con canonical por familia, `noindex,follow` para
  búsqueda interna y navegación desde Home/Navbar/Footer.
- [x] Baseline local de Home/Search/Detail anónimos registrado.
- [ ] Cache/tráfico anónimo real rebaselined después del deploy.

## Checklist de validación
- `make validate-core`
- `make validate-web`
- Medir carga anónima básica en rutas públicas.
- Probar manualmente:
  - abrir `/content/<id>` sin login;
  - abrir y cerrar una imagen de gallery en desktop y móvil;
  - buscar una obra sin login;
  - navegar browse por tipo;
  - comprobar spoiler colapsado en reviews.

## Riesgos
- Reintroducir doble fetch SSR/CSR.
- Abrir rutas públicas con serializers pensados para usuarios logueados.
- Sobrecargar `proxy` con tráfico anónimo sin cache suficiente.
- Metadata SEO incoherente con canonical URLs.

## Criterios de aceptación
- Existe catálogo público usable sin login.
- Las fichas públicas muestran agregados y listas públicas.
- Search público devuelve solo obras.
- Browse por tipo existe y es navegable. Temporadas quedan explícitamente como
  follow-up: no forman parte del criterio de cierre de Issue #62.
- El contenido público es indexable y compartible.
- Las galerías se pueden inspeccionar sin abandonar la ficha.

## Interdependencias
- Precede a `Sprint 14` y `Sprint 15`.
- Se apoya en listas públicas de `Sprint 12`.
- Depende de tracking correcto de `Sprint 11`.

## Refactors recomendados
- Crear componentes diferenciados para superficie pública vs privada.
- Evitar usar `ProtectedRoute` como condición accidental en páginas
  mixtas.
- Consolidar fetches de content page si hoy están demasiado fragmentados.

## Follow-ups (NO se hacen en este sprint)
- Search público de usuarios o listas.
- Directorio de perfiles.
- Directorio de listas.
- Filtros avanzados por año/género/país.
