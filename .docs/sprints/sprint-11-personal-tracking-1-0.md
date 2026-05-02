# Sprint 11
# Personal Tracking 1.0

## Objetivo
Convertir Denn en un tracker personal real. El sistema debe dejar de
depender de `ListItem.Status` como pseudo-tracking y pasar a un modelo
first-class por `usuario + obra`, con una máquina de estados clara y
reglas consistentes para ratings, reviews y backlog.

Este sprint es la nueva fuente de verdad del producto. Si se resuelve
mal, perfiles, content pages públicas y leaderboards nacerán con lógica
incorrecta.

## Entregable principal
- Modelo de tracking personal first-class en `core`.
- Estados MVP: `backlog`, `in_progress`, `completed`, `on_hold`,
  `dropped`.
- `backlog` del sistema por usuario, separado de listas editoriales.
- Ratings ligados a `completed`.
- Ratings/reviews inactivos cuando la obra sale de `completed`.
- Auto-complete al puntuar desde una ficha.
- Prompt "rate this item" sólo al pasar a `completed` si el usuario no
  tiene rating activo para esa obra.
- Lectura consolidada del rating del usuario actual junto al estado de
  tracking/detalle para evitar fetches redundantes en content detail.
- Reutilización del mismo modal/control de rating en fichas y listas,
  con precisión decimal definida por producto.
- `favorite` reemplaza la idea de una "11va estrella": es un marcador
  separado del score y puede tener cuota por usuario si producto lo
  decide.
- Migración conservadora desde ratings existentes y `COMPLETED` actual.
- UI inicial de tracking en `web` para fichas y acciones rápidas.

## Skills guía
- `brainstorming`
- `django-expert`
- `clean-code`
- `api-design-principles`
- `security-review`

## Alcance
- `core/content/models/` — nuevo modelo de tracking y ajustes de rating.
- `core/content/serializers/` — payloads de tracking, estados y reglas.
- `core/content/views/` / servicios — escritura de estados, activación
  de ratings, agregados que ignoran ratings inactivos.
- `core/content/tests/` — unit, API y migración.
- `web/src/routes/content/$id.tsx`,
  `web/src/components/pages/ContentDetailPage/` y componentes
  relacionados — CTA de tracking, backlog y rating ligado a completion.
- Componentes de listas que permitan puntuar desde un item — usar el
  mismo flujo/control que la ficha, sin perder precisión decimal.
- `web/src/lib/api/queries/`, `web/src/lib/api/mutations/` o hooks de
  feature — reads/mutations de tracking.
- `web/src/routes/profile.tsx`,
  `web/src/routes/lists/$id.tsx` y páginas relacionadas — adaptación
  mínima para no asumir que el tracking vive en `ListItem.Status`.
- Migraciones de datos y plan de release.
- Documentación en `.docs/architecture/` y `.docs/features/`.

## No objetivos
- No introducir follow graph, activity feed, likes o comentarios.
- No implementar historial de revisiones de reviews.
- No modelar tracking por episodio.
- No hacer importadores desde plataformas externas.
- No resolver todavía recap/stats avanzadas.

## Dependencias
- Construye sobre la fundación ya implementada de TanStack Query +
  SSR prefetch en `web`.
- Construye sobre la continuidad de sesión ya implementada en rutas
  protegidas.
- Coordina con `Sprint 10`: si el detalle de contenido se refresca, los
  agregados no deben recalcularse de forma incorrecta bajo la nueva
  semántica.
- Requiere que el cierre de `Sprint 10` o un `Sprint 10.5` deje
  resuelto el rumbo de eliminación de `status` proveedor-dependiente en
  `core`, para que tracking y futuras features de producto no nazcan
  atadas a semánticas externas.
- Precede a `Sprint 12`, `Sprint 13`, `Sprint 14` y `Sprint 15`.

## Contexto funcional y técnico

### Estado actual

Hoy el producto usa dos mecanismos incompletos:

- `ListItem.Status` con sólo `PENDING` y `COMPLETED`.
- `Rating` como entidad separada, pero sin una relación fuerte con un
  estado canónico de tracking.

Eso produce varias incoherencias:

- una obra puede estar puntuada sin haber sido "completada" dentro de un
  modelo consistente;
- el backlog real del usuario no existe como concepto del sistema;
- las listas hacen de tracking, editor y colaboración al mismo tiempo;
- no hay forma limpia de desactivar score/review cuando el usuario vuelve
  una obra a `in_progress` o `dropped`.

### Modelo objetivo

El sprint debe introducir una entidad personal de tracking que sea la
fuente de verdad del vínculo entre usuario y obra.

Reglas validadas del MVP:

- cualquier estado puede pasar a cualquier otro;
- `rating` activo sólo existe en `completed`;
- puntuar desde ficha auto-completa;
- marcar como `completed` abre el prompt de rating únicamente cuando no
  existe rating activo;
- al salir de `completed`, `score`, `favorite` y `review` se conservan,
  pero quedan inactivos;
- `favorite` es separado del score;
- `backlog` es lista del sistema y quick-save principal.

### Decisiones técnicas a cerrar dentro del sprint

- si `review` e inactividad viven en `Rating` o si hace falta separar
  un `UserWorkState` y mantener `Rating` como payload anexo;
- si la precisión final de rating del MVP pasa a 0.1 según
  `.docs/ideas/ratings-rework.md` o se mantiene el step actual durante
  este sprint;
- si `favorite` tiene una cuota explícita por usuario en el MVP o queda
  como boolean ilimitado hasta leaderboards;
- si el backlog del sistema se modela con la misma infraestructura de
  listas o con una tabla dedicada con una fachada común;
- cómo resolver que una `SEASON` en lista apunte al tracking de la
  `TV_SHOW` sin multiplicar consultas ni generar ambigüedad;
- estrategia de backfill: migración síncrona, comando posterior o modo
  híbrido.

## Backlog por lotes

### Lote 11A
- Diseñar modelo de tracking y migración conservadora.
- Definir semántica de rating activo vs inactivo.
- Escribir tests unitarios de reglas de transición.

### Lote 11B
- Exponer API de lectura y escritura de tracking.
- Integrar writes de rating con auto-complete.
- Ajustar agregados para que ignoren ratings inactivos.

### Lote 11C
- Añadir UI de tracking en fichas.
- Añadir backlog quick-save.
- Actualizar flujo de rating y review bajo completion.

### Lote 11D
- Adaptar lecturas colaterales en perfil y listas.
- Completar migración/backfill.
- Documentar la arquitectura del nuevo modelo.

## Secuencia sugerida de PRs

### PR-11A Modelo y migración
- Nuevo modelo de tracking.
- Migración DB inicial.
- Seed conservador desde ratings y `COMPLETED`.
- Tests de transición e invariantes.

### PR-11B API y reglas de negocio
- Endpoints o acciones de tracking.
- Activación/inactivación de ratings.
- Ajuste de serializers y permisos.
- Payload de detalle/tracking incluye el rating activo del usuario
  actual cuando está autenticado.

### PR-11C UI de ficha y backlog
- Controles de estado.
- Botón de backlog.
- Rating acoplado a `completed`.
- Modal/control de rating compartido por ficha y listas, con prompt
  condicionado a "no rated".

### PR-11D Integración y documentación
- Ajustes en perfil/listas donde aplique.
- Instrumentación básica.
- Docs de arquitectura y contrato funcional.

## Tareas

### T1. Definir el contrato del tracking
- Elegir nombres finales del modelo y estados.
- Formalizar invariantes del estado.
- Documentar transición desde el modelo anterior.

### T2. Implementar persistencia y reglas
- Crear modelos/migraciones.
- Implementar servicios de transición de estado.
- Mantener consistencia entre tracking y rating.

### T3. Ajustar agregados y lecturas
- Excluir ratings inactivos de score medio, distribución y futuros
  leaderboards.
- Verificar impacto en queries.

### T4. Implementar UX de tracking en `web`
- CTA de backlog.
- Selector de estado.
- Rating que complete automáticamente.
- Prompt al completar sólo si no hay rating activo.
- Misma precisión y mismo componente de rating en list views y detail.

### T5. Migración segura
- Backfill conservador.
- Validación de datos migrados.
- Estrategia de rollback.

### T6. Documentación
- Actualizar docs de arquitectura.
- Registrar el cambio funcional en `features/implemented.md` cuando se
  mergee.

## Checklist de implementación

### Lote 11A
- Modelo creado.
- Estados definidos.
- Migración inicial escrita.
- Tests de transición presentes.

### Lote 11B
- Endpoints/mutations listos.
- Rating activo/inactivo consistente.
- Agregados corregidos.

### Lote 11C
- Ficha muestra estado actual.
- Backlog funciona como quick-save.
- Rating desde ficha auto-completa.
- Completar una obra ya puntuada no vuelve a mostrar el prompt.
- Las listas no fuerzan ratings de puntos completos si el producto adopta
  precisión decimal.

### Lote 11D
- Perfil y listas no dependen de la semántica vieja.
- Docs actualizadas.
- Plan de release escrito.

## Checklist de validación
- `make validate-core`
- `make validate-web`
- Tests de migración y regresión sobre ratings existentes.
- Prueba manual:
  - marcar obra como `completed`, puntuar y reseñar;
  - marcar como `completed` una obra ya puntuada y comprobar que no se
    abre el prompt;
  - pasarla a `in_progress` y comprobar que score/review quedan
    inactivos;
  - volver a `completed` y comprobar reactivación;
  - usar backlog del sistema desde ficha.

## Riesgos
- Duplicar fuente de verdad si `ListItem.Status` sigue tratando de
  comportarse como tracking.
- N+1 en perfil/listas si tracking se consulta por item sin preload.
- Migración incompleta si ratings históricos no se siembran bien.
- Ambigüedad entre `SEASON` y `TV_SHOW` si el mapping no se formaliza.

## Criterios de aceptación
- El usuario puede tener un estado personal canónico por obra.
- El backlog del sistema existe y es usable desde la ficha.
- No hay ratings activos fuera de `completed`.
- El paso `completed -> no completed` conserva pero inactiva score,
  review y favorite.
- Los datos previos se migran sin pérdida.

## Interdependencias
- Bloquea `Sprint 14` y `Sprint 15`.
- Condiciona la semántica de `Sprint 12` para estados personales dentro
  de listas colaborativas.
- Alimenta los agregados públicos de `Sprint 13`.

## Refactors recomendados
- Extraer lógica de transición de tracking a un servicio dedicado.
- Evitar que serializers o views contengan lógica de estado.
- Revisar si `ListItem.Status` debe reducirse a estado editorial o
  desaparecer a futuro.

## Follow-ups (NO se hacen en este sprint)
- Historial de cambios de review.
- Tracking avanzado por temporada/episodio.
- Rewatch/replay/reread counts.
- Stats derivadas del nuevo tracking.
