# Sprint 10 Follow-up
# Rehidratación dinámica de metadatos por edad del contenido

## Estado

- **Parcialmente cerrado.**
- La política dinámica ya está implementada en `core`.
- La selección SQL del comando y la normalización de cache/filtros MVP
  ya están implementadas en `proxy`.
- Este documento queda sólo para el trabajo pendiente de rollout,
  documentación operativa fina y cierre de brechas conocidas.
- La política de freshness queda definida como **release-date-only**:
  no se seguirá derivando frecuencia desde `status` de proveedores
  externos.
- Antes de `Sprint 11`, el sistema debe dejar encaminada la eliminación
  de `status` proveedor-dependiente de los modelos persistidos en
  `core`, para consolidar un modelo de datos propio y no acoplado a
  semánticas externas.

## Ya implementado

### 10A. Política dinámica en `core` — DONE

- [x] `CONTENT_REHYDRATION_TTL` fue reemplazado por
      `CONTENT_REHYDRATION_POLICY`.
- [x] Existe `compute_refresh_policy(...)` como fuente de verdad en
      `core/content/services/local_content_store/refresh_policy.py`.
- [x] `detail_is_fresh()` ya usa la política dinámica.
- [x] `rehydrate_content_details` ya selecciona stale rows por
      `refresh_due_at` calculado en SQL y resume por banda.

### 10B. Herramientas de rollout en `core` — DONE

- [x] Existe `normalize_rehydration_timestamps` para reportar o
      escalonar rollout.

### 10C. Normalización y elegibilidad MVP en `proxy` — DONE

- [x] Search/homepage/previews filtran resultados sin fecha o demasiado
      futuros.
- [x] Las búsquedas normalizan su cache key en minúscula.

### 10D. Endurecimiento de seasons en `proxy` — DONE

- [x] Las temporadas inválidas o futuras dejan de aparecer en
      superficies generales y en season detail cuando corresponde.

## Brecha conocida

- La disponibilidad por país (`platforms`) ya se persiste separada por
  `country_code`, pero su freshness sigue dependiendo del `Detail`
  global del contenido. Eso deja un hueco: un item puede estar “fresh”
  para campos globales y aun así no tener plataformas frescas para el
  país solicitado.
- La fuga de contenido futuro reproducida en `Popular Movies` quedó
  cerrada en Fase 1: servicios de search/trending aplican la regla común
  antes del agregado y las claves de homepage/search están versionadas
  con `future-24h`.

## Pendiente

### 10E. Cierre documental y operativo

- [ ] Extender `.docs/runbooks/rehydrate-content.md` con:
  - uso de `normalize_rehydration_timestamps`;
  - lectura de `by_band`;
  - estrategia de rollout con `--limit` y ventanas cortas;
  - señales a vigilar tras el switch.
- [ ] Decidir si el cambio de política merece ADR propio o si basta con
  la arquitectura actual más history.
- [ ] Actualizar `.docs/perf/baseline.md` cuando haya mediciones reales
  del nuevo comportamiento.

### 10F. Rollout y validación de producción

- [ ] Ejecutar `normalize_rehydration_timestamps --dry-run` sobre un
  entorno con volumen representativo.
- [ ] Decidir si hace falta correr `--apply --stagger-hours=<N>` antes
  del primer cron pleno.
- [ ] Validar que el primer rollout no dispara throttling del `proxy`.
- [ ] Medir o inspeccionar el costo real de la query anotada en un
  entorno representativo (`EXPLAIN ANALYZE` o equivalente).

### 10G. Freshness de disponibilidad por país

- [ ] Mantener `release_date` como única señal para freshness del detail
  base de contenido.
- [ ] Diseñar freshness independiente para `platforms` por
  `(content_item, country_code)`.
- [ ] Evitar que un país “fresh” tape la ausencia o staleness de otro
  país.
- [ ] Definir si basta con metadata de refresh por país o si conviene
  separar disponibilidad en una tabla/snapshot con lifecycle propio.

### 10H. Cierre real del filtro de futuros en homepage

- [x] Reproducir el caso con inspección directa de payloads de
  `proxy /homepage` y distinguir si el leak viene del fetch trending,
  de la fase de enrichment, del cache agregado del homepage, o de un
  proceso/binario desalineado.
- [x] Añadir tests específicos del bucket `Popular Movies` para un item
  con `release_date` varios meses en el futuro y verificar que no
  aparezca en el payload final.
- [x] Revisar la semántica exacta del grace window (hoy 1 día en código)
  y dejarla documentada para evitar ambigüedad entre producto, docs y
  tests.
- [x] Confirmar que el mismo criterio se aplica de forma consistente en
  search, homepage, previews y cualquier superficie agregada derivada de
  esos endpoints.

### 10I. Desacoplar `core` de `status` de proveedores

- [ ] Definir `status` externo como dato transitorio de integración, no
  como parte del modelo persistido objetivo de Denn.
- [ ] Remover la dependencia de `status` externo de la policy de
  rehidratación y dejar `release_date` como única señal de freshness del
  detail base.
- [ ] Planear la eliminación de campos `status` persistidos en tablas de
  detail y de su reconstrucción en `source_data` local cuando no aporten
  valor real al modelo propio.
- [ ] Revisar contratos, mappers, reconstructores y tests para que el
  dominio de Denn no herede semánticas de estado de TMDB u otros
  proveedores.
- [ ] Si producto necesita estados editoriales en el futuro, definirlos
  como vocabulario propio de Denn y no como mirror del proveedor.

## Criterios de cierre del follow-up

- La operación del rollout queda documentada en runbook.
- Existe validación real de costo/volumen del comando en un entorno con
  datos representativos.
- Existe una decisión explícita sobre freshness independiente para
  disponibilidad por país.
- El filtro de futuros queda verificado de extremo a extremo en
  homepage, sin fugas reproducibles en buckets generales.
- Existe un plan de eliminación de `status` proveedor-dependiente antes
  de iniciar `Sprint 11`.
