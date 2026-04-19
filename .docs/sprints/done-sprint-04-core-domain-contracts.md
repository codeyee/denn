# Sprint 04
# Core: Dominio, Contratos y Performance de Serialización

## Objetivo
Endurecer el `core` como BFF de dominio: contratos predecibles, invariantes claras, menos side effects sorpresivos y menor costo de serialización/consulta.

Nota operativa:
- Este sprint concentra la remediación principal del endpoint `/content/lists/` cuando el problema sea latencia, N+1, serialización costosa, `source_data` excesivo o uso indiscriminado de `page_size=0`.

## Entregable principal
- Contratos de `core` coherentes y documentados.
- `bulk_check` sin side effects persistentes o claramente dividido en endpoint separado.
- Invariantes críticas llevadas a DB o alineadas explícitamente con negocio.
- Reducción del costo de cálculo/serialización en listas con ratings.

## Skills guía
- `django-expert`
- `python-performance-optimization`
- `python-project-structure`
- `api-design-principles`
- `security-review`

## Alcance
- `core/content/views/*.py`
- `core/content/serializers/*.py`
- `core/content/models/*.py`
- `core/core/exceptions.py`
- `core/core/pagination.py`

## No objetivos
- No convertir `core` en gateway multimedia total.
- No rehacer auth completa en este sprint.

## Dependencias
- Requiere `Sprint 01`.
- Puede ejecutarse en paralelo con `Sprint 05`, pero hay que coordinar contratos con `proxy`.

## Backlog por lotes

### Lote 4A
**Nombre:** Contratos y semántica HTTP  
**Resultado:** endpoints más predecibles y sin side effects sorpresivos

### Lote 4B
**Nombre:** Invariantes de dominio  
**Resultado:** reglas de listas/membership/duplicados coherentes entre código y DB

### Lote 4C
**Nombre:** Performance de serialización y queries  
**Resultado:** menor costo en endpoints de listas con ratings y `source_data`

### Lote 4D
**Nombre:** Manejo de errores y estructura del módulo  
**Resultado:** errores útiles y menor lógica de negocio en serializers/viewsets

## Secuencia sugerida de PRs

### PR-4A Contract cleanup
- Separar `check` de `ensure/create`.
- Mover inputs a body validado donde aplique.

### PR-4B Domain invariants
- Definir política de duplicados.
- Alinear memberships y conteos.

### PR-4C Query and serialization optimization
- Reducir query count.
- Revisar `page_size=0` y `source_data`.

### PR-4D Error handling and service extraction
- Estructurar errores.
- Extraer 2-3 servicios de dominio.

## Tareas

### T1. Corregir contratos frágiles
- Subtareas:
  - dividir “check” y “ensure/create” en endpoints distintos;
  - mover entradas de `get_or_create` a body validado;
  - revisar semantics HTTP y códigos de respuesta.
- Recomendación de diseño:
  - `GET` o `POST /bulk-check` no debe mutar la base si el nombre del caso de uso es “check”.
  - Si hace falta crear canónicos locales, usar una operación distinta y explícita.

### T2. Llevar invariantes a modelo/DB
- Subtareas:
  - decidir política de duplicados por lista;
  - alinear serializer, modelo, constraint y documentación;
  - revisar consistencia de membership/owner en personal vs shared lists.
- Recomendación de código:
  - No dejar invariantes de negocio importantes sólo en serializer.

### T3. Reducir costo de listas con ratings
- Subtareas:
  - medir y reducir explícitamente la latencia de `/content/lists/` en los casos usados por `home`, `ListDetailPage` y `bulk-check`;
  - revisar el caso de `109` queries para 100 items;
  - mover `list_rating` y `member_rating_count` a annotations o prefetch consistente;
  - eliminar caminos fallback que disparen queries por item.
- Recomendación de performance:
  - priorizar trabajo en queryset antes que lógica repetida en serializer.

### T4. Revisar paginación y fetch de `source_data`
- Subtareas:
  - acotar o esconder `page_size=0` del flujo general;
  - revisar cuándo realmente se necesita `source_data` completo;
  - definir una respuesta más liviana para listados/resúmenes cuando el cliente no necesite detalle completo de items;
  - permitir respuestas más compactas por defecto.
- Recomendación de diseño:
  - las respuestas del BFF deben optimizar el caso normal, no el caso extremo.

### T5. Normalizar manejo de errores
- Subtareas:
  - dejar errores estructurados y estables;
  - preservar información de validación por campo;
  - alinear errores entre auth, content y acciones especiales.
- Recomendación:
  - `custom_exception_handler` no debería degradar errores DRF a un string genérico si el cliente necesita actuar por campo.

### T6. Introducir capa de servicio donde haya lógica de negocio evidente
- Subtareas:
  - identificar 2-3 flujos críticos:
    - membership/list ownership,
    - `bulk_check`/ensure item,
    - composition de ratings.
  - extraerlos fuera de viewsets/serializers.
- Recomendación de estructura:
- seguir un patrón claro de servicios de dominio, sin sobre-ingeniería.

## Checklist de implementación

### Lote 4A
- [x] `bulk_check` ya no muta la base o quedó separado explícitamente.
- [x] `get_or_create` usa inputs validados de forma coherente.
- [x] La semántica HTTP deja de sorprender al cliente.

### Lote 4B
- [x] La política de duplicados está decidida y codificada.
- [x] Owner/members/stats devuelven conteos consistentes.
- [x] Las reglas viven en modelo/DB cuando corresponde.

### Lote 4C
- [x] Se revisó el caso de `109` queries.
- [x] La latencia de `/content/lists/` queda medida antes/después en al menos un caso real de homepage y uno de detalle.
- [x] Los cálculos de ratings usan annotations/prefetch consistente donde aplique.
- [x] `page_size=0` eliminado; reemplazado por `unpaginated=true` explícito.
- [x] `source_data` no se fetch-ea por defecto cuando no aporta valor.

### Lote 4D
- [x] Los errores preservan estructura útil para el cliente.
- [x] Hay al menos 2-3 servicios de dominio extraídos desde HTTP layer.
- [x] La lógica de negocio en serializers/viewsets se redujo.

## Checklist de validación
- [x] `manage.py test` sigue pasando.
- [x] Los contratos consumidos por `web` se revalidaron.
- [x] La documentación del `core` se alinea con su rol real.
- [x] El cambio no reintroduce N+1.

## Riesgos
- Cambiar contratos consumidos por el frontend sin versionar o coordinar.
- Hacer demasiado refactor estructural en un solo PR.

## Criterios de aceptación
- `bulk_check` deja de escribir o se divide formalmente.
- La política de duplicados queda implementada y no sólo “sugerida”.
- Se reduce el costo de queries en el caso de listas con ratings.
- `/content/lists/` deja de ser un cuello de botella evidente para las vistas más visitadas.
- Los errores devueltos por `core` son más estables y útiles.

## Interdependencias
- Impacta `Sprint 03` y `Sprint 06`.
- Prepara directamente `Sprint 4.5` para el rediseño funcional full-stack de listas.
- Conviene coordinar con `Sprint 05` si cambian headers/shape de `source_data`.

## Refactors recomendados
- Querysets primero, serializers después.
- Servicios de dominio pequeños y explícitos.
- Mantener módulos de `content` cohesionados por capacidad, no por accidente histórico.
