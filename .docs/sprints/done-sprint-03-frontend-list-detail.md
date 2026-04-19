# Sprint 03
# Frontend List Detail y Rendering Pesado

## Objetivo
Atacar el hotspot más grave del frontend: la pantalla de detalle de lista. El foco es bajar costo de red, CPU y render, y simplificar su arquitectura interna para que siga siendo mantenible.

## Entregable principal
- `ListDetailPage` sin full-fetch por defecto.
- Estrategia de paginación/reorder explícita.
- Render virtualizado o equivalente para vistas grandes.
- Pipeline de grouping/sorting simplificado y medible.

## Skills guía
- `vercel-react-best-practices`
- `clean-code`
- `systematic-debugging`

## Alcance
- `web/app/_components/pages/ListDetailPage/*`
- `web/app/_components/common/lists/*`
- `web/app/_components/common/cards/*` relacionados con lists
- `web/app/_stores/lists-store.ts` si es necesario

## No objetivos
- No rehacer homepage/search.
- No rediseñar completamente el modelo visual de listas.
- No resolver toda la arquitectura de auth/global state.

## Dependencias
- Requiere `Sprint 01`.
- Se beneficia de `Sprint 04` si el backend ajusta `page_size=0` y contratos de reorder, pero puede arrancar antes.

## Backlog por lotes

### Lote 3A
**Nombre:** Estrategia de carga y modos de uso  
**Resultado:** la pantalla diferencia claramente vista normal y modo reorder

### Lote 3B
**Nombre:** Render y virtualización  
**Resultado:** listas grandes ya no degradan por render completo

### Lote 3C
**Nombre:** Simplificación interna del módulo  
**Resultado:** `ListDetailPage` y hooks asociados quedan más mantenibles

## Secuencia sugerida de PRs

### PR-3A Data loading model
- Quitar full-fetch automático.
- Introducir estrategia explícita para reorder.

### PR-3B Rendering optimization
- Virtualización o ventana de render.
- Aislar DnD al modo reorder.

### PR-3C Internal cleanup
- Reescribir pipeline `group/sort/page`.
- Reducir tamaño del contenedor principal.

## Tareas

### T1. Replantear la estrategia de carga
- Subtareas:
  - Quitar `loadAllItems()` automático.
  - Definir dos modos:
    - vista normal: paginada/incremental;
    - modo reorder: carga completa explícita.
  - Evitar loops secuenciales de páginas en background por defecto.
- Recomendación de refactor:
  - Hacer visible en código que “ver lista” y “reordenar lista” son flujos distintos.

### T2. Virtualizar o acotar render
- Subtareas:
  - Introducir virtualización para list/gallery mode o una estrategia equivalente de ventana.
  - Revisar si `DndContext` debe vivir sólo en reorder mode.
  - Asegurar que gallery/list no hagan `.map()` completos sobre colecciones grandes.
- Recomendación de código:
  - No montar infraestructura de drag-and-drop cuando el usuario no está reordenando.

### T3. Simplificar grouping/sorting/pagination
- Subtareas:
  - Reescribir `useListGrouping()` para evitar agrupar -> aplanar -> re-agrupar.
  - Elegir una semántica estable:
    - paginación global antes de agrupar, o
    - paginación por grupo.
  - Dejar esta decisión documentada.
- Recomendación de refactor:
  - El hook debe ser declarativo y tener una sola responsabilidad de transformación.

### T4. Separar el componente contenedor
- Subtareas:
  - Reducir tamaño de `ListDetailPage/index.tsx`.
  - Extraer coordinadores claros:
    - data loading,
    - interaction state,
    - render composition.
- Recomendación de código:
  - Evitar un componente coordinador de 400+ líneas con demasiados concerns.

### T5. Revisar overlays y hover costosos
- Subtareas:
  - Auditar `Card` hover y popovers sobre listas.
- Desactivar cálculos globales cuando el item no está activo.
  - Medir si esos efectos justifican su coste.

## Checklist de implementación

### Lote 3A
- [x] `useListData()` deja de disparar carga completa automática.
- [x] Existe una ruta clara para “modo normal” y otra para “modo reorder”.
- [x] La carga completa se hace sólo por interacción explícita.

### Lote 3B
- [x] List/gallery no hacen render completo de datasets grandes.
- [x] `DndContext` y sensores no viven montados fuera de reorder.
- [x] El rendimiento en listas grandes es comprobablemente mejor.

### Lote 3C
- [x] `useListGrouping()` ya no agrupa, aplana y reagrupa.
- [x] `ListDetailPage/index.tsx` baja de complejidad y responsabilidad.
- [x] La pantalla tiene coordinadores más pequeños y específicos.

## Checklist de validación
- [x] Se probó paginación normal.
- [x] Se probó reorder sobre lista larga.
- [x] Se probó gallery mode.
- [x] No se rompen stats, agrupación ni borrado/rating.
- [x] `npm run lint` y `npm run build` siguen pasando.

## Riesgos
- Perder UX de reorder si se simplifica demasiado.
- Introducir bugs visuales por virtualización mal coordinada con DnD.

## Criterios de aceptación
- La vista normal de lista no dispara carga completa de items por defecto.
- Reorder carga dataset completo sólo bajo interacción explícita.
- El pipeline de `group/sort/page` queda más simple y documentado.
- La pantalla soporta listas grandes sin degradación evidente.

## Interdependencias
- Depende parcialmente de decisiones de `Sprint 04` sobre backend y contratos.
- Alimenta directamente los beneficios esperados de `Sprint 06`.

## Refactors recomendados
- Separar flujo de “viewer” y flujo de “editor”.
- Reducir responsabilidades de `ListDetailPage/index.tsx`.
- Mantener hooks puros y específicos; menos hooks omniscientes.
