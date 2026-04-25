# Sprint 14
# Public Profiles 1.0

## Objetivo
Hacer visible el gusto de cada usuario mediante un perfil público real,
compartible e indexable. El perfil deja de ser una vista privada mínima
y pasa a ser una pieza central del producto.

## Entregable principal
- Ruta pública por `username`.
- `username` único y estable.
- Bio corta editable.
- Counters básicos por tipo de medio.
- Reviews recientes.
- Favoritos por tipo de medio.
- Módulo de listas públicas.
- Vista de todos los ratings del usuario, con filtros y ordenación.

## Skills guía
- `brainstorming`
- `django-expert`
- `vercel-react-best-practices`
- `clean-code`
- `security-review`

## Alcance
- Modelo/constraints de `username` en `core`.
- Endpoints públicos de perfil y ratings del usuario.
- Endpoints de edición de bio y settings públicos mínimos.
- Render público de perfil en `web`.
- Página o sección de ratings filtrables.
- Presentación de reviews recientes, favoritos por tipo y listas
  públicas.
- Migración/backfill de usernames si hace falta.
- Documentación de identidad pública.

## No objetivos
- No introducir `display_name` separado en este sprint.
- No implementar follow graph ni feed.
- No crear directorio público de usuarios.
- No añadir stats avanzadas más allá de counters básicos.

## Dependencias
- Requiere `Sprint 11` por rating/tracking correcto.
- Requiere `Sprint 12` para listas públicas.
- Se beneficia de `Sprint 13` para tener superficie pública coherente.

## Contexto funcional y técnico

### Estado actual

El backend ya expone más datos de perfil de los que el frontend utiliza,
pero el `/profile` actual es funcionalmente pobre. No sirve como
identidad pública ni como vitrina de gusto.

### Modelo objetivo

El perfil público MVP debe mostrar:

- identidad por `username`;
- bio corta;
- ratings y reviews recientes;
- favoritos por tipo;
- listas públicas;
- todos los ratings con filtros y ordenación;
- counters simples por tipo.

La privacidad del perfil como objeto no existe en MVP: el perfil es
público. Lo privado vive en listas privadas y en la ausencia de ciertas
futuras features.

### Decisiones técnicas a cerrar dentro del sprint

- si conviene una ruta `/{username}` o una ruta más explícita
  `/u/{username}` para evitar colisiones con otras páginas;
- cómo backfillear usernames de usuarios existentes si faltan
  constraints o normalización;
- qué filtros mínimos se exponen en el tab de ratings;
- si conviene endpoint de perfil compuesto o endpoints paginados por
  sección.

## Backlog por lotes

### Lote 14A
- `username` único y migración.
- Contrato público de perfil.

### Lote 14B
- Página pública de perfil.
- Sección de ratings filtrables.

### Lote 14C
- Bio y settings mínimas.
- Ajustes de performance y documentación.

## Secuencia sugerida de PRs

### PR-14A Identidad pública
- Constraint y validación de username.
- Endpoint público de perfil.
- Backfill de datos existentes.

### PR-14B UI de perfil
- Página por `username`.
- Ratings filtrables y ordenables.
- Módulos de reviews recientes, favoritos y listas públicas.

### PR-14C Edición y hardening
- Bio/settings.
- Optimización de queries.
- Docs y rollout.

## Tareas

### T1. Formalizar identidad pública
- Definir formato y reglas del username.
- Bloquear cambios en MVP.
- Diseñar estrategia para usuarios existentes.

### T2. Construir contrato público del perfil
- Secciones mínimas.
- Paginación o lazy loading para ratings.
- Payload seguro para anónimos.

### T3. Implementar UI
- Vista pública rica.
- Módulo de ratings.
- Estados vacíos y sin favoritos.

### T4. Permitir edición básica
- Bio.
- Posiblemente avatar si ya existe infraestructura, sin hacerlo
  requisito.

### T5. Optimizar y documentar
- Query count.
- Docs de identidad pública.

## Checklist de implementación

### Lote 14A
- Username único y estable.
- Endpoint público de perfil listo.

### Lote 14B
- Perfil renderiza sin login.
- Ratings filtrables funcionan.
- Favoritos y listas públicas visibles.

### Lote 14C
- Bio editable.
- Queries razonables.
- Docs actualizadas.

## Checklist de validación
- `make validate-core`
- `make validate-web`
- Probar manualmente:
  - abrir perfil público sin login;
  - filtrar y ordenar ratings;
  - verificar que listas privadas no aparecen;
  - verificar que ratings inactivos no aparecen como activos.

## Riesgos
- Username collisions o migración defectuosa.
- N+1 en la vista de ratings.
- Mezclar datos privados con payload público.
- Perfil lento si intenta cargar todo en una sola query sin paginación.

## Criterios de aceptación
- Cada usuario tiene un perfil público legible por `username`.
- El perfil muestra ratings, reviews recientes, favoritos por tipo y
  listas públicas.
- Existe una vista de todos los ratings con filtros y ordenación.
- No se exponen listas privadas ni ratings inactivos.

## Interdependencias
- Se apoya en `Sprint 11`, `Sprint 12` y `Sprint 13`.
- Precede a la percepción social completa del MVP y alimenta el valor
  de `Sprint 15`.

## Refactors recomendados
- Separar serializers públicos de perfil de serializers privados.
- Evitar componentes gigantes de perfil; dividir por bloques.
- Extraer helpers de filtros/ordenación de ratings.

## Follow-ups (NO se hacen en este sprint)
- Display name separado.
- Directorio público de usuarios.
- Follow/unfollow.
- Feed de actividad.
- Stats y recap avanzadas.
