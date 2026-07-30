# Sprint 12
# Lists 2.0

## Estado parcial (2026-07-29)

Ya aterrizaron visibilidad `PUBLIC | PRIVATE` independiente de
`PERSONAL | SHARED`, cambio de visibilidad sólo por owner, serializer
público sin email, lectura anónima de listas públicas, 404 indistinguible
para listas privadas y el módulo de listas owner/member del perfil
público.

Este sprint sigue abierto. El issue #61 cerró owner persistido, roles
`owner/editor/viewer`, la policy de permisos, roles de invitación y la
privacidad pública. Aún faltan estado por miembro, Add-to-List
checkbox-first y el selector aleatorio de pendientes. No reinterpretar
este lote como cierre de Lists 2.0.

## Objetivo
Separar de forma definitiva lo que una lista "es" de cómo una obra se
trackea personalmente. Este sprint convierte el sistema de listas en una
capacidad editorial y colaborativa completa, con visibilidad pública o
privada, roles explícitos y estado por miembro en listas compartidas.

## Entregable principal
- Visibilidad separada de colaboración.
- Roles `owner`, `editor`, `viewer`.
- El `owner` existe también como miembro explícito en listas personales
  y colaborativas, con migración de datos para listas existentes.
- Soporte formal para listas personales y colaborativas, públicas o
  privadas.
- Estado por miembro dentro de listas colaborativas.
- Add-to-List usa membresía tipo checkbox: seleccionar añade, desmarcar
  elimina, no cierra el modal y muestra metadata mínima de la lista.
- Selector aleatorio de item `pending` como mejora menor una vez cerrada
  la semántica de estado por miembro.
- Páginas públicas de listas públicas.
- Matriz de permisos clara y testeada.

## Skills guía
- `brainstorming`
- `django-expert`
- `api-design-principles`
- `clean-code`
- `security-review`

## Alcance
- `core/content/models/user_list.py` y modelos relacionados.
- Membresía, roles, permisos e invitaciones.
- Endpoints de lectura pública de listas.
- Endpoints y reglas de escritura para settings, colaboración y orden.
- Persistencia de estado por miembro en items colaborativos.
- `web/src/routes/lists/$id.tsx`,
  `web/src/components/pages/ListDetailPage/` y settings de lista.
- UX de miembros, roles, visibilidad e invitaciones.
- UX de Add-to-List sobre el nuevo contrato de membresía, incluyendo
  metadata de listas y estados seleccionados.
- Acción "pick pending" para destacar aleatoriamente un item pendiente
  de una lista, si no compromete la entrega principal.
- Render anónimo de listas públicas.
- Documentación de permisos y rollout.

## No objetivos
- No implementar comentarios, likes ni social reactions sobre listas.
- No crear directorio público de listas.
- No permitir configuración compleja de permisos por acción más allá de
  `owner/editor/viewer`.
- No tocar el backlog del sistema más allá de excluirlo de la UX normal
  de listas.
- No implementar agrupamiento arbitrario en N niveles; sólo mantener
  agrupamientos simples y comprensibles.

## Dependencias
- Requiere `Sprint 11` para separar tracking personal de listas.
- Construye sobre la fundación ya implementada de SSR/query en `web` y
  continuidad de sesión estable.
- Precede a `Sprint 13` y `Sprint 14`, que necesitan listas públicas
  coherentes.

## Contexto funcional y técnico

### Estado actual

Hoy Denn ya tiene una base sólida de listas compartidas, pero le faltan
dos separaciones fundamentales:

- `visibilidad` vs `modo de colaboración`;
- `estado personal` vs `estado editorial de la lista`.

Además, la semántica pública es insuficiente: el producto tiene listas
compartidas, pero todavía no una noción fuerte de listas públicas como
objetos visibles dentro del ecosistema.

### Modelo objetivo

Las listas deben soportar:

- personal + pública;
- personal + privada;
- colaborativa + pública;
- colaborativa + privada.

En listas colaborativas:

- el `owner` controla el objeto y su configuración;
- el `owner` también aparece como miembro persistido, no como miembro
  sintetizado sólo por serializer;
- el `editor` puede colaborar sobre contenido y orden según la política
  final;
- el `viewer` puede ver y, como mínimo, seguir usando su estado personal
  donde corresponda.

### Decisiones técnicas a cerrar dentro del sprint

- si el estado por miembro en listas colaborativas usa una tabla propia
  o una proyección del tracking personal;
- si viewers pueden marcar su estado dentro del contexto de la lista sin
  convertirse en editores;
- cómo conviven invitaciones actuales con roles nuevos;
- cómo hacer públicas ciertas listas sin exponer data privada de
  membresía innecesaria.

## Backlog por lotes

### Lote 12A
- Modelo de visibilidad y roles.
- Owner como miembro explícito para listas personales y compartidas.
- Matriz de permisos y tests.

### Lote 12B
- APIs de settings, membresía e invitaciones.
- Persistencia de estado por miembro.

### Lote 12C
- UI de settings, roles e invitaciones.
- Add-to-List checkbox-first sobre listas personales/compartidas.
- Render de listas públicas.

### Lote 12D
- Ajustes de orden canónico, rollout y documentación.

## Secuencia sugerida de PRs

### PR-12A Permisos y roles
- Nuevos campos o tablas.
- Migración que crea membresía owner para listas existentes, incluidas
  personales.
- Permisos owner/editor/viewer.
- Tests API/serializer.

### PR-12B Estado por miembro
- Modelo de item colaborativo por miembro.
- Lectura/escritura desde `core`.
- Integración con tracking personal.

### PR-12C Settings y UX de lista
- Visibilidad.
- Gestión de miembros.
- Página pública anónima.
- Add-to-List no cierra al añadir, permite desmarcar para eliminar y
  muestra metadata útil de cada lista.
- Acción opcional de selección aleatoria de item `pending`.

### PR-12D Integración y limpieza
- Ajustes de invitaciones existentes.
- Docs de permisos.
- Validación de edge cases.

## Tareas

### T1. Formalizar matriz de permisos
- Definir qué puede hacer cada rol.
- Definir quién invita y quién cambia visibilidad.
- Definir quién puede reordenar canónicamente.

### T2. Ajustar modelo de datos
- Separar visibilidad de colaboración.
- Añadir roles y sus constraints.
- Persistir owner como miembro real en todo tipo de lista.
- Modelar estado por miembro.

### T3. Exponer APIs correctas
- Lecturas públicas y privadas.
- Writes protegidos por rol.
- Respuestas anónimas seguras.

### T4. Actualizar UI
- Pantalla de settings.
- Gestión de miembros e invitaciones.
- Vista pública de lista.
- Modal Add-to-List con selección reversible tipo checkbox.
- Selector aleatorio de item pendiente si entra dentro del lote sin
  agrandar permisos ni tracking.

### T5. Documentación
- Permisos.
- Nuevos invariantes.
- Notas de migración para listas compartidas actuales.

## Checklist de implementación

### Lote 12A
- Roles existen en DB y API.
- Toda lista tiene owner en su colección de miembros.
- Tests de permiso cubren owner/editor/viewer.

### Lote 12B
- Estado por miembro persistido.
- Integración con tracking personal documentada.

### Lote 12C
- Lista pública funciona sin login.
- Settings de visibilidad/roles funcionan.
- Add-to-List permite añadir/quitar sin cerrar el modal.
- La metadata de listas aparece en Add-to-List.

### Lote 12D
- Invitaciones no quedan rotas.
- Docs publicadas.

## Checklist de validación
- `make validate-core`
- `make validate-web`
- Pruebas manuales:
  - crear lista personal pública;
  - crear lista colaborativa privada;
  - crear lista colaborativa pública;
  - verificar que el owner aparece como miembro real;
  - añadir y quitar un item desde Add-to-List sin cerrar el modal;
  - verificar permisos de viewer vs editor;
  - verificar que backlog del sistema no aparece como lista editable
    normal.

## Riesgos
- Filtrar accidentalmente data de miembros en listas públicas.
- Mezclar de nuevo estado personal con estado contextual de lista.
- Generar una matriz de permisos demasiado compleja para el MVP.
- Romper listas compartidas existentes durante la migración.

## Criterios de aceptación
- Una lista puede ser pública o privada, independientemente de si es
  personal o colaborativa.
- Existen roles explícitos y respetados.
- Las listas públicas son legibles sin login.
- El estado por miembro en listas colaborativas funciona sin alterar la
  fuente de verdad del tracking personal.

## Interdependencias
- Alimenta módulos de listas públicas en `Sprint 13` y `Sprint 14`.
- Reusa el tracking de `Sprint 11`.

## Refactors recomendados
- Extraer policy checks de listas a utilidades o servicios dedicados.
- Reducir lógica de permisos en views.
- Separar claramente payload público y payload privado de lista.

## Follow-ups (NO se hacen en este sprint)
- Comentarios en listas.
- Likes o favoritos de listas.
- Directorio público de listas.
- Permisos ultra-granulares por acción.
