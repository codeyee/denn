# Sprint 10
# Rehidratación dinámica de metadatos por edad del contenido

> **Nota sobre el nombre.** "Rehidratación" aquí se refiere al refresh periódico
> de nuestros `Detail` locales (`MovieDetail`, `TvShowDetail`, `SeasonDetail`,
> `AlbumDetail`, `GameDetail`, `BookDetail`) contra las APIs externas (TMDB,
> IGDB, Spotify, OpenLibrary) vía el `proxy`. No tiene relación con la
> **hidratación del estado del cliente** (cookies → Zustand), que se trata en
> [`sprint-09-client-rehydration-and-session-continuity.md`](./sprint-09-client-rehydration-and-session-continuity.md).

## Objetivo
Reemplazar el TTL estático por `content_type` que entregó Sprint 07 por una **política de rehidratación dinámica basada en la edad del item**: los items recién estrenados se refrescan con alta frecuencia (sus ratings, reviews, disponibilidad de streaming y metadata de elenco cambian constantemente), mientras que los items viejos se refrescan muy de vez en cuando (su metadata es estable). El TTL deja de ser un número fijo y pasa a ser una función de `(content_type, release_date, status)`.

La ganancia concreta: un blockbuster recién estrenado refleja su rating actualizado al día siguiente en lugar de quedarse con el de preview por 30 días; y una película de los 80 deja de gastar quota del proxy cada mes para "descubrir" que nada cambió.

## Entregable principal
- Función pura `compute_refresh_policy(content_item, detail) -> RefreshPolicy` con `ttl`, `age_band`, `reason` — única fuente de verdad para la decisión.
- Política configurable por tipo en `settings.CONTENT_REHYDRATION_POLICY` (reemplaza el dict plano `CONTENT_REHYDRATION_TTL`).
- `detail_is_fresh()` y `_select_stale_items()` usan la nueva política.
- El comando `rehydrate_content_details` selecciona por TTL dinámico vía SQL (`Case/When`) y loggea métricas por banda de edad.
- Política formalizada en `docs/architecture/content-rehydration-policy.md` con las bandas, justificación y cómo ajustar.
- Backfill controlado que normalice el primer `last_refreshed_at` de items preexistentes bajo la nueva política.
- Política de elegibilidad para metadata de usuario: search, homepage y
  previews no deben devolver items con `release_date` futura más allá de
  un margen de 1 día ni items sin `release_date`, salvo que el flujo
  declare explícitamente que acepta próximos estrenos.
- Normalización de temporadas inválidas: no devolver temporadas con 0
  episodios, con un único episodio sin `release_date`, con episodios sólo
  futuros, o temporadas completas en el futuro.
- Cache de búsqueda normalizada por query en minúscula para evitar
  duplicar entradas equivalentes.

## Skills guía
- `django-expert`
- `python-performance-optimization`
- `api-design-principles`
- `clean-code`
- `changelog-generator` (para comunicar el cambio de política)

## Alcance
- `core/core/settings/base.py` — migrar `CONTENT_REHYDRATION_TTL` → `CONTENT_REHYDRATION_POLICY`.
- `core/content/services/local_content_store/__init__.py` — `_ttl_for` → `compute_refresh_policy`, `detail_is_fresh` adaptado.
- `core/content/services/local_content_store/refresh_policy.py` (nuevo) — función pura, ladder de bandas, evaluador SQL (`Case/When`).
- `core/content/management/commands/rehydrate_content_details.py` — `_select_stale_items` usa queryset dinámico; logs por banda.
- `core/content/tests/services/test_refresh_policy.py` (nuevo) — unit tests exhaustivos de la política.
- `core/content/tests/commands/test_rehydrate_content_details.py` — actualizar fixtures para cubrir TTL dinámico.
- `docs/architecture/content-rehydration-policy.md` (nuevo) — documento de política.
- `docs/runbooks/rehydrate-content-details.md` (nuevo o extendido) — cómo se opera el job.
- `proxy` providers/mappers y BFF reads que alimentan search/homepage —
  aplicar el mismo filtro de elegibilidad sin mover credenciales ni
  ownership fuera del `proxy`.

## No objetivos
- **No** convertir esto en un sistema de webhooks/push desde proveedores. Eso queda como follow-up (solo Spotify lo soporta razonablemente).
- **No** introducir Celery/RQ. El comando sigue corriéndose vía cron u orquestador externo.
- **No** agregar versionado histórico de `Detail` (django-simple-history). Queda como follow-up del Sprint 07.
- **No** cambiar la arquitectura de ownership: `core` sigue siendo el único que escribe en DB, `proxy` sigue stateless.
- **No** tocar el TTL de Redis en el `proxy`: ese es un cache HTTP de corto plazo, distinto al de DB local.
- **No** retirar el parámetro `--ttl-override` del comando; sigue siendo útil para backfills ad hoc.
- **No** ocultar futuros lanzamientos en flujos que sí sean
  explícitamente de upcoming/pre-release si se crean más adelante. La
  restricción aplica a resultados generales del MVP.

## Dependencias
- **Requiere Sprint 07** (Lotes 7A–7D). Específicamente: tablas `*Detail` con `release_date` y `last_refreshed_at`, comando `rehydrate_content_details`, `ensure_content_detail`.
- **Coordina con Sprint 05** (proxy reliability): subir la frecuencia de rehidratación para items nuevos implica más hits al proxy, lo cual presiona el rate limiting y retry policy. Este sprint asume que Sprint 5B ya estabilizó esas políticas.
- **Coordina con Sprint 06 (Lote 6C)**: las métricas por banda deben emitirse en el formato estructurado acordado para observabilidad (correlation IDs, logs JSON).
- **Coordina con Sprint 08 (performance)**: el comando de rehidratación con paralelismo es uno de los consumidores medidos. El `max_workers` óptimo de Sprint 8 se usa acá.

## Contexto técnico

### Estado actual (Sprint 07, estático)

```python
CONTENT_REHYDRATION_TTL = {
    "BOOK": timedelta(days=90),
    "MOVIE": timedelta(days=30),
    "GAME": timedelta(days=30),
    "ALBUM": timedelta(days=30),
    "TV_SHOW": timedelta(days=7),
    "SEASON": timedelta(days=7),
}
```

El comando selecciona `items WHERE last_refreshed_at < now - TTL[content_type]`. El problema:

- **Un estreno** (`Dune: Part Two`, marzo 2024): sus ratings de crítica, proveedores de streaming y listado de premios cambian **semanalmente** los primeros 3 meses. Con TTL=30d, nuestra DB miente por casi un mes después de cada cambio upstream.
- **Un clásico** (`Memento`, 2000): su metadata no cambia en años. Rehidratar cada 30 días es **gastar quota del proxy** para no descubrir nada.
- **Una serie en emisión** (`Shogun S2`): nuevos episodios aparecen cada semana. TTL=7d funciona pero no detecta el caso "acaba de salir un episodio que rompió récords de rating".
- **Un libro de los 90**: cambios son casi cero. `BOOK=90d` ya es generoso pero no refleja que algunos libros recién publicados (`Words of Radiance`) tienen reviews oscilando en sus primeras semanas.

### Política dinámica propuesta

Función única:

```python
def compute_refresh_policy(
    content_item: ContentItem,
    detail: Optional[DetailModel],
) -> RefreshPolicy:
    """Return (ttl, age_band, reason) for this item."""
```

Devuelve un dataclass con:
- `ttl: timedelta` — el tiempo de vida del `Detail` desde su último refresh.
- `age_band: str` — etiqueta descriptiva (`pre_release`, `hot`, `recent`, `first_year`, `stable`, `classic`, `unknown`).
- `reason: str` — por qué se eligió esa banda (para logging).

### Política base (ladder de edad)

Para cualquier tipo, si hay `release_date`:

| Condición | Banda | TTL | Justificación |
|---|---|---|---|
| `release_date > today` (futuro) | `pre_release` | 1 día | Fecha, trailer, cast y póster cambian sin aviso |
| `age < 30 días` | `hot` | 2 días | Reviews, ratings y proveedores todavía moviéndose |
| `age < 180 días` | `recent` | 7 días | La mayoría de cambios ya ocurrieron, pero aún hay ajustes |
| `age < 365 días` | `first_year` | 14 días | Estable pero nuevos premios y plataformas aparecen |
| `age < 3 años` | `stable` | 30 días | Cambios raros |
| `age < 10 años` | `aged` | 90 días | Prácticamente estático |
| `age >= 10 años` | `classic` | 180 días | Solo cambia si el proveedor corrige datos |
| `release_date` missing | `unknown` | 30 días | Conservador: tratar como caso medio |

### Overrides por tipo

Cada tipo puede sobreescribir bandas individuales si su dinámica difiere:

- **TV_SHOW/SEASON con `status ∈ {Returning Series, In Production}`**: usar la banda `hot` (2 días) independiente de la edad. Una serie que volvió después de 10 años sigue publicando episodios esta semana.
- **TV_SHOW/SEASON con `status = Ended`**: aplicar la tabla base sin modificación (se comportan como movies una vez terminadas).
- **BOOK**: todos los TTLs se multiplican por 2 (los libros cambian menos). `hot` = 4d, `recent` = 14d, etc. `classic` = 365d.
- **GAME**: sin override — las bandas base funcionan (reviews, patches, DLCs y disponibilidad cambian parecido a películas).
- **ALBUM**: `classic` = 365d (música clásica casi nunca cambia). Resto igual.
- **MOVIE**: base sin modificación.

### Configuración

```python
# settings.py
CONTENT_REHYDRATION_POLICY = {
    "BANDS": [
        # Evaluated in order; first match wins.
        # `age_days` is (today - release_date).days, negative for future.
        {"name": "pre_release", "when": "age_days < 0",      "ttl_days": 1},
        {"name": "hot",         "when": "age_days < 30",     "ttl_days": 2},
        {"name": "recent",      "when": "age_days < 180",    "ttl_days": 7},
        {"name": "first_year",  "when": "age_days < 365",    "ttl_days": 14},
        {"name": "stable",      "when": "age_days < 1095",   "ttl_days": 30},
        {"name": "aged",        "when": "age_days < 3650",   "ttl_days": 90},
        {"name": "classic",     "when": "age_days >= 3650",  "ttl_days": 180},
    ],
    "UNKNOWN_TTL_DAYS": 30,
    "TYPE_OVERRIDES": {
        "BOOK":  {"multiplier": 2.0, "max_classic_days": 365},
        "ALBUM": {"max_classic_days": 365},
        "TV_SHOW": {"returning_band": "hot"},
        "SEASON":  {"returning_band": "hot"},
    },
}
```

Formato declarativo → fácil de ajustar sin redeploy si se externaliza a env vars o a DB.

### Evaluación SQL (para el comando)

El comando `rehydrate_content_details` debe seleccionar `WHERE last_refreshed_at + ttl_by_band(release_date) < NOW()`. Eso en SQL se resuelve con `Case/When`:

```python
from django.db.models import Case, When, F, DateTimeField, ExpressionWrapper
from django.db.models.functions import Now

ttl_expr = Case(
    When(
        release_date__isnull=True,
        then=timedelta(days=UNKNOWN_TTL_DAYS),
    ),
    When(release_date__gt=Now(), then=timedelta(days=1)),
    When(release_date__gt=Now() - timedelta(days=30),  then=timedelta(days=2)),
    When(release_date__gt=Now() - timedelta(days=180), then=timedelta(days=7)),
    # ... etc
    default=timedelta(days=180),
    output_field=DurationField(),
)

refresh_due_at = ExpressionWrapper(
    F('last_refreshed_at') + ttl_expr,
    output_field=DateTimeField(),
)

stale = (
    MovieDetail.objects
    .annotate(refresh_due_at=refresh_due_at)
    .filter(refresh_due_at__lt=Now())
    .order_by('refresh_due_at')
)
```

Esto mantiene la selección en la DB (no hace falta cargar todos los items en Python). Django 4.x soporta esto nativamente en PostgreSQL.

### Por qué no una columna `next_refresh_at`

Alternativa: almacenar `next_refresh_at` como columna en cada `Detail` y actualizarla en cada `ensure_content_detail` (escritura) → query simple `WHERE next_refresh_at < NOW()`.

**Pros:** query trivial, índice simple, sin Case/When.
**Contras:**
- Si se cambia la política, hay que backfillear todas las filas (migración masiva).
- El cálculo de la política vive en dos lugares (al escribir para poblar la columna, al leer para ajustarla si `release_date` cambió).
- Una fila `Detail` para la cual `release_date` se corrige upstream tendría un `next_refresh_at` "viejo" hasta la próxima rehidratación.

**Decisión:** computar en SQL con `Case/When`. Si en producción el `EXPLAIN ANALYZE` muestra que es costoso en tablas grandes, se evalúa migrar a columna.

### Observabilidad

Cada rehidratación emite evento estructurado:

```json
{
  "event": "rehydrate",
  "content_type": "MOVIE",
  "content_item_id": 1455,
  "age_band": "hot",
  "age_days": 12,
  "ttl_days": 2,
  "status": "refreshed",
  "latency_ms": 287
}
```

El comando emite al final un resumen por banda:

```json
{
  "event": "rehydrate_summary",
  "content_type": "MOVIE",
  "by_band": {
    "pre_release": {"total": 2, "refreshed": 2, "errors": 0},
    "hot":         {"total": 35, "refreshed": 33, "errors": 2},
    "recent":      {"total": 18, "refreshed": 18, "errors": 0},
    ...
  },
  "total_latency_ms": 12500
}
```

Eso permite detectar desviaciones: si la banda `hot` tiene error rate > 10% consistente, algo está mal con el endpoint de películas recientes del proxy.

## Backlog por lotes

### Lote 10A
**Nombre:** Política pura y tests
**Resultado:** existe `compute_refresh_policy()` y su versión SQL. Unit tests cubren todas las bandas, overrides de tipo, missing `release_date`, TV shows en estado `Returning Series`.

### Lote 10B
**Nombre:** Integración con read/ingest
**Resultado:** `detail_is_fresh()` usa la nueva política. `ensure_content_detail()` no necesita cambios funcionales — sigue delegando a `detail_is_fresh`. Tests de read-path confirman que items en banda `hot` se consideran stale tras 2 días.

### Lote 10C
**Nombre:** Selección dinámica en el comando
**Resultado:** `_select_stale_items()` usa la queryset con `Case/When`. El comando itera solo items legítimamente stale, con logging por banda.

### Lote 10D
**Nombre:** Backfill y migración
**Resultado:** management command `normalize_rehydration_timestamps` que actualiza `last_refreshed_at` de filas cuyo `last_refreshed_at` quedaría inmediatamente stale en la nueva política (evitar tormenta de refreshes el primer día).

### Lote 10E
**Nombre:** Observabilidad y política documentada
**Resultado:** evento por item + resumen por banda + dashboard mental documentado. `docs/architecture/content-rehydration-policy.md` explica bandas, cuándo ajustarlas, cómo impacta el proxy.

### Lote 10F
**Nombre:** Elegibilidad de metadata para superficies de usuario
**Resultado:** search/homepage/previews filtran resultados futuros o sin
fecha según la política MVP, las temporadas inválidas quedan fuera del
detalle, y las búsquedas comparten cache por query normalizada.

## Secuencia sugerida de PRs

### PR-10A Refresh policy pure function
- Crear `core/content/services/local_content_store/refresh_policy.py`:
  - `@dataclass class RefreshPolicy: ttl, age_band, reason`.
  - `def compute_refresh_policy(content_item, detail) -> RefreshPolicy`.
  - `def stale_condition_sql(content_type) -> Case` (mismas bandas, versión SQL).
- `settings.CONTENT_REHYDRATION_POLICY` nueva, manteniendo compatibility con `CONTENT_REHYDRATION_TTL` durante una versión.
- Unit tests exhaustivos:
  - cada banda con `release_date` en el borde y dentro.
  - `release_date` en el futuro (`pre_release`).
  - `release_date` missing (`unknown` + fallback TTL).
  - TV_SHOW con `status="Returning Series"` → override a `hot`.
  - TV_SHOW con `status="Ended"` → tabla base.
  - BOOK con override de multiplier.

### PR-10B Read-path integration
- `detail_is_fresh()` en `local_content_store/__init__.py` usa `compute_refresh_policy().ttl`.
- Mantener `_ttl_for()` como deprecated wrapper que loggea warning (para detectar call sites perdidos).
- Test de integración: un `MovieDetail` con `release_date=today` y `last_refreshed_at=2d ago` ahora es **stale** (hot = 2d), antes era fresh (30d).
- Migrar `ensure_content_detail` si depende de `_ttl_for` directo (no debería).

### PR-10C Command + dynamic selection
- `_select_stale_items()` en `rehydrate_content_details.py` pasa a usar `refresh_policy.stale_condition_sql()`.
- Por cada item seleccionado, loggear evento con banda antes del refresh (para poder comparar total por banda vs refreshed por banda — detecta errores de política).
- Resumen final `{"event": "rehydrate_summary", "by_band": {...}}`.
- Actualizar tests del comando: fixtures con mezcla de edades, assert que `--limit=N` respeta orden por `refresh_due_at`.

### PR-10D Normalization backfill
- Nuevo comando `normalize_rehydration_timestamps --content-type ALL --dry-run`:
  - Itera todos los `Detail` rows.
  - Para cada uno, calcula la política con el `release_date` actual.
  - Si `last_refreshed_at + ttl < now` (i.e. sería inmediatamente stale), **no** actualiza (dejarlo stale para que el próximo run del job lo levante).
  - Si ya es fresh bajo la nueva política, no hace nada.
  - Principal propósito: emitir un reporte por banda del estado post-switch ("cuántos items están en `hot`, cuántos en `classic`, etc.") para poder dimensionar correctamente el siguiente run del job.
- Documentar ejecución en `docs/runbooks/rehydrate-content-details.md`.

### PR-10E Policy doc and observability hooks
- `docs/architecture/content-rehydration-policy.md` con:
  - tabla de bandas + justificación;
  - overrides por tipo + justificación;
  - ejemplos concretos (Dune vs Memento vs Shogun);
  - cómo ajustar la política (env vars? redeploy? DB?);
  - impacto estimado en el proxy (multiplicar nº items × frecuencia).
- `docs/runbooks/rehydrate-content-details.md` (nuevo o extendido):
  - cómo correr el job;
  - qué `--limit` y `--workers` razonables;
  - cómo leer el resumen por banda;
  - qué métricas vigilar (error rate por banda, latencia p95).
- Si Sprint 6C está entregado, emitir los eventos JSON en formato compatible.

### PR-10F Metadata eligibility and search cache normalization
- Aplicar el filtro MVP de `release_date` en search/homepage/previews:
  ocultar items futuros más allá de 1 día de margen y items sin fecha en
  resultados generales.
- Filtrar temporadas inválidas en content detail según la política del
  sprint.
- Normalizar cache keys de búsqueda a minúscula, preservando el texto
  original sólo para presentación/logs.
- Tests de proxy/core/BFF donde corresponda para confirmar que el filtro
  no rompe flujos futuros explícitos cuando existan.

## Tareas

### T1. Definir la política base y formalizarla
- Subtareas:
  - validar con negocio/producto si las bandas propuestas (`pre_release/hot/recent/first_year/stable/aged/classic`) son razonables;
  - ajustar los TTLs según tolerancia real a staleness por tipo;
  - documentar cada banda con un caso concreto del catálogo (Memento → `classic`, Dune Part Two → `hot`);
  - escribir `docs/architecture/content-rehydration-policy.md`.
- Recomendación:
  - empezar con las bandas propuestas, ajustar en PR-10E basándose en el reporte por banda del backfill. La política es un parámetro del sistema, no una constante de negocio.

### T2. Implementar `compute_refresh_policy` como función pura
- Subtareas:
  - definir `@dataclass(frozen=True) RefreshPolicy(ttl, age_band, reason)`;
  - función sin efectos secundarios: toma item + detail, devuelve policy;
  - ladder de bandas iterado en orden (first match wins);
  - overrides por tipo aplicados después del ladder base;
  - fallback `unknown` con TTL de seguridad configurable.
- Recomendación:
  - `compute_refresh_policy` debe poder evaluarse sin tocar DB (salvo por el detail ya cargado). Tests parametrizados cubren TODAS las bandas + overrides.

### T3. Versión SQL del ladder
- Subtareas:
  - `stale_condition_queryset(detail_model)` que anota `refresh_due_at` con `Case/When` sobre `release_date`;
  - tests con fixtures que cubren todas las bandas insertando rows con `release_date` controlado;
  - benchmark: ejecutar con 10K filas y medir tiempo; si >500ms, considerar índice compuesto `(release_date, last_refreshed_at)`.
- Recomendación:
  - mantener Python y SQL sincronizados generándolos de un dict central (`BANDS`), no hardcodeando dos listas de bandas.

### T4. Integrar en read-path
- Subtareas:
  - `detail_is_fresh(content_item)` lee la policy y compara contra el `Detail.last_refreshed_at`;
  - `ensure_content_detail(content_item)` sigue llamando a `detail_is_fresh`;
  - test de orquestación: un item en banda `hot` con `last_refreshed_at=3d ago` fuerza fetch; en banda `classic` con mismo timestamp no fuerza nada.
- Recomendación:
  - el read-path es el camino crítico. Si la policy se calcula por cada read, que sea barata (<1ms). Considerar `lru_cache` si el policy se vuelve costosa.

### T5. Comando con selección dinámica y logging
- Subtareas:
  - `_select_stale_items(content_type)` usa la queryset anotada;
  - `order_by('refresh_due_at')` para refrescar los **más atrasados** primero;
  - por cada item, emitir evento `{event, content_item_id, age_band, age_days, ttl_days}` antes del refresh;
  - resumen final con totales por banda;
  - respetar `--limit` **por content_type**, no global, para que un tipo con muchos stale no monopolice el run.
- Recomendación:
  - la salida JSON-por-línea debe estar siempre activa. El human-readable output solo bajo `--verbosity=2`.

### T6. Backfill controlado
- Subtareas:
  - `normalize_rehydration_timestamps --dry-run` reporta por banda sin escribir;
  - si queremos evitar una tormenta el primer run post-cambio, ofrecer `--stagger-hours=H` que distribuye los `last_refreshed_at` aleatoriamente en una ventana de H horas hacia atrás;
  - documentar el plan operativo (¿se corre una vez tras el deploy? ¿nunca?).
- Recomendación:
  - el backfill es opcional. Sin él, el primer run del job descubrirá mucho trabajo y puede presionar al proxy. Usar `--limit` y correrlo en ventanas cortas los primeros días.

### T7. Observabilidad y dashboard mental
- Subtareas:
  - formato JSON estándar (compatible con Sprint 6C si está entregado);
  - documentar las métricas útiles en `docs/runbooks/rehydrate-content-details.md`:
    - error rate por banda (alerta si `hot` > 10%);
    - latencia p95 del job por tipo;
    - "edad del detalle más viejo" por tipo (invariante: no debería exceder 2× TTL de su banda);
  - dashboard mental: un humano debe poder leer el output del comando y saber si todo está OK;
  - opcional: comando auxiliar `report_rehydration_status` que resume el estado de la DB sin hacer refresh.

### T8. Política configurable sin redeploy (follow-up parcial)
- Subtareas:
  - soportar override de las bandas vía env var JSON (`CONTENT_REHYDRATION_POLICY_JSON`);
  - deserialización defensiva: si el JSON es inválido, caer a la política default y loggear error;
  - test que valida que `settings.CONTENT_REHYDRATION_POLICY` tiene shape válido al boot.
- Recomendación:
  - esto es un nice-to-have. La política debería cambiar pocas veces por año. Si se vuelve un punto de flexibilidad real, mover a un modelo `RehydrationPolicy` en DB es el siguiente paso.

## Checklist de implementación

### Lote 10A
- [ ] `refresh_policy.py` define `RefreshPolicy` dataclass y `compute_refresh_policy()`.
- [ ] `settings.CONTENT_REHYDRATION_POLICY` declarativo, replazable por env var.
- [ ] `CONTENT_REHYDRATION_TTL` marcado deprecated; existe wrapper que lee `POLICY` pero mantiene API vieja durante una versión.
- [ ] Tests parametrizados cubren 7 bandas × 6 tipos × (con/sin `release_date`) × (con/sin overrides).
- [ ] Caso TV_SHOW `Returning Series` forzado a banda `hot` tiene test propio.

### Lote 10B
- [ ] `detail_is_fresh()` usa `compute_refresh_policy().ttl` en lugar de `_ttl_for(content_type)`.
- [ ] `_ttl_for` sigue existiendo pero loggea `DeprecationWarning`.
- [ ] Test de integración: item en banda `hot` con 3 días desde último refresh es stale; en banda `classic` no.

### Lote 10C
- [ ] `_select_stale_items()` en el comando usa `stale_condition_queryset()` con `Case/When`.
- [ ] El queryset ordena por `refresh_due_at` ascendente (más atrasado primero).
- [ ] Cada refresh emite evento con `age_band`, `age_days`, `ttl_days`.
- [ ] Resumen final agrupa por banda.
- [ ] Tests del comando cubren al menos 3 bandas distintas simultáneamente.

### Lote 10D
- [ ] Comando `normalize_rehydration_timestamps` existe con `--dry-run` y `--stagger-hours`.
- [ ] Dry-run emite reporte por banda sin escribir.
- [ ] Documentado en `docs/runbooks/rehydrate-content-details.md`.

### Lote 10E
- [ ] `docs/architecture/content-rehydration-policy.md` existe y cubre bandas, overrides, ejemplos, impacto.
- [ ] `docs/runbooks/rehydrate-content-details.md` extendido con las métricas nuevas.
- [ ] `ADR` o addendum al existente registra el cambio de política estática → dinámica.
- [ ] `CONTENT_REHYDRATION_TTL` removido de `settings/base.py` (deprecación cerrada).

### Lote 10F
- [ ] Search/homepage/previews aplican el filtro de fecha MVP.
- [ ] Temporadas inválidas quedan fuera del detalle.
- [ ] Cache de búsqueda usa query normalizada en minúscula.
- [ ] Tests cubren margen de 1 día para timezones.

## Checklist de validación
- [ ] Correr `rehydrate_content_details --content-type ALL --dry-run`: el output reporta distintas bandas para items del mismo tipo.
- [ ] Insertar fixture de un `MovieDetail` con `release_date=hoy - 10 días` y `last_refreshed_at=hoy - 3 días` → es stale (banda `hot`, TTL 2d).
- [ ] Insertar fixture con `release_date=hoy - 15 años` y `last_refreshed_at=hoy - 90 días` → es fresh (banda `classic`, TTL 180d).
- [ ] Insertar fixture de TV_SHOW con `status="Returning Series"` y `release_date=hoy - 5 años` → es stale en 2 días aunque la banda base diría 30d.
- [ ] Insertar fixture sin `release_date` → fallback a `UNKNOWN_TTL_DAYS`.
- [ ] El número de items stale reportado por `--dry-run` es >= al del TTL estático anterior (esperable porque items nuevos ahora se refrescan más seguido) y <= al peor caso (todos stale).
- [ ] `manage.py test content.tests.services.test_refresh_policy` pasa.
- [ ] `manage.py test content.tests.commands.test_rehydrate_content_details` pasa.
- [ ] Tests de season filtering y release-date eligibility pasan.
- [ ] Búsquedas equivalentes con distinta capitalización reutilizan la
      misma entrada de cache.
- [ ] El comando corrido contra la DB de staging no excede el rate limit del proxy (logs sin errores de throttling).
- [ ] `EXPLAIN ANALYZE` de la queryset anotada sobre la tabla más grande (`MovieDetail` con ~5K filas) se ejecuta en <200ms.

## Riesgos
- **Tormenta inicial tras el switch**: items que antes eran fresh con TTL=30d ahora son stale con TTL=2d. El primer run post-deploy puede intentar refrescar miles de items. Mitigación: Lote 10D + `--limit` por content_type + `--stagger-hours` al backfill.
- **Rate limit del proxy**: más items en banda `hot` significa más hits por día. Mitigación: monitorear error rate y latencia p95 en el Sprint 5B decidió la política; coordinar `max_workers`.
- **Política demasiado agresiva en `pre_release`**: TTL=1d para items con `release_date` futura puede significar refresh diario de items que no tienen payload completo aún. Mitigación: validar con negocio cuántos items "pre-release" tenemos típicamente; si son pocos, costo bajo; si son muchos (ej. catálogo completo de lanzamientos anunciados), subir a 3–5d.
- **`release_date` incorrecta upstream**: TMDB puede tener fechas erróneas (estreno limitado vs wide release). La política se basa en esa fecha. Mitigación: aceptar el ruido; el peor caso es un item levemente sub/sobre-refrescado.
- **TV show overrides incompletos**: si `status` upstream cambia a un valor no listado (ej. "On Hiatus", "Cancelled"), el código cae al default. Mitigación: enum explícito de status conocidos, else warning + default a tabla base.
- **Costo SQL del `Case/When`**: en PostgreSQL con índice en `release_date`, el filtrado compuesto es razonable. Si en producción `EXPLAIN ANALYZE` muestra seq scan costoso, agregar índice compuesto o migrar a columna `next_refresh_at`.
- **Test coverage fragile**: si los TTLs de bandas se cambian vía env var, los tests hardcodeados a 2d/7d/etc. rompen. Mitigación: tests parametrizan con el valor leído de settings, no con constantes.
- **Divergencia Python/SQL**: si se actualiza la política en un solo lugar, la otra mentirá. Mitigación: ambos leen del mismo `BANDS` dict.
- **Items preservados artificialmente frescos**: si alguien ejecuta `ensure_content_detail(..., force=True)` de todos los items cada hora (ej. un botón de "refrescar catálogo"), la política dinámica se anula. Mitigación: `force=True` sólo en path explícito (admin, debug), nunca en read-path normal.

## Criterios de aceptación
- Un item estrenado hace 10 días se rehidrata cada 2 días.
- Un item estrenado hace 5 años se rehidrata cada 90 días (banda `aged`).
- Un item con `release_date` en el futuro se rehidrata cada día.
- Una serie `Returning Series` se rehidrata cada 2 días independiente de su fecha de estreno.
- El comando `rehydrate_content_details` selecciona exclusivamente items cuyo TTL dinámico ya expiró.
- El resumen del comando reporta totales por banda, permitiendo observar la salud del sistema.
- La política está documentada en un solo lugar (`docs/architecture/content-rehydration-policy.md`) y es ajustable sin reescritura.
- Ningún item con política `force=True` del read-path normal — esa bandera queda para admin/debug.
- Search/homepage/previews no exponen resultados generales sin fecha o
  con fecha futura fuera del margen MVP.
- Temporadas vacías o artificiales no aparecen en content detail.

## Interdependencias
- **Sprint 05 (proxy reliability)**: el rate limiter y retry policy del proxy deben tolerar el volumen de la banda `hot`. Coordinar antes de deploy.
- **Sprint 06 (Lote 6C, observability)**: los eventos JSON de rehidratación deben seguir el formato estructurado acordado para poder integrarse con el resto de la telemetría.
- **Sprint 07 (Lote 7D)**: entregó el comando base. Este sprint lo evoluciona.
- **Sprint 08 (performance)**: el `max_workers` calibrado del ThreadPoolExecutor se usa en este sprint.
- **Sprint 09 (client session hydration)**: independiente. Solo comparten la palabra "hidratación".
- Habilita features futuras:
  - alertas automáticas por banda (ej. "error rate de `hot` > 10%");
  - scheduling inteligente (correr `hot` cada 2d desde cron, `classic` semanal);
  - UI admin para inspeccionar política y forzar refresh de items específicos.

## Refactors recomendados
- Consolidar la evaluación Python + SQL en una sola fuente (`BANDS` dict) para evitar drift.
- Mover `_select_stale_items` del comando a `refresh_policy.py` como `stale_items_for(content_type)` — el comando queda solo orquestando.
- Tratar `CONTENT_REHYDRATION_POLICY` como un contrato público del proyecto (documentado, con validación de shape al boot).
- Aislar el concepto de "status" de TV show en un enum (`TvShowStatus`) para que la regla de `Returning Series → hot` sea declarativa, no string-matching.

## Follow-ups (NO se hacen en este sprint)
- **Política en DB editable vía admin**: cuando haya necesidad real de ajustar bandas sin redeploy.
- **Webhooks desde proveedores**: Spotify soporta webhooks para cambios en albums. Eliminaría la necesidad de TTL agresivo para música. TMDB/IGDB no soportan webhooks públicos; seguirán dependiendo de TTL.
- **Policy por usuario / por lista**: si el usuario marca un item como "importante" (ej. en su watch list), rehidratar más seguido. Requiere decisión de negocio.
- **Rehidratación proactiva de items en listas del usuario**: priorizar refresh de items que están en `UserList` activas (alguien los va a ver hoy) vs items huérfanos (nadie los mira hace meses). Queueing más complejo.
- **Política combinada con `source_api`**: si un proveedor (ej. OpenLibrary) es notoriamente estable, multiplicar TTL. Si otro es ruidoso (ej. TMDB para proveedores de streaming), bajar. Requiere evidencia de métricas de churn.
- **Emergency full refresh**: si detectamos que un proveedor hizo un cambio masivo (ej. TMDB corrige todos los posters), comando `force_rehydrate_all --content-type=MOVIE` que ignora política. Hoy ya existe vía `--ttl-override=0`, documentar.
- **Expiración de items huérfanos**: un `Detail` con `last_refreshed_at` muy viejo (> 2× classic TTL) que falla consistentemente al refresh podría marcarse como "orphaned" y oculto de búsquedas hasta que vuelva a aparecer upstream.
