# Sprint 3.5
# Frontend List Detail: Cierre, Hardening y Validación Real

## Objetivo
Cerrar correctamente lo que `Sprint 03` dejó incompleto en la pantalla de detalle de lista, con foco en:
- eliminar cargas completas implícitas fuera de contexto;
- terminar la separación real entre `viewer` y `reorder`;
- bajar complejidad del contenedor principal;
- validar con evidencia que la pantalla aguanta listas grandes sin regresiones funcionales.

Este sprint no intenta resolver todavía el rediseño integral de exploración de listas. Su misión es dejar una base frontend estable y honesta antes del salto a `Sprint 4.5`.

## Entregable principal
- `ListDetailPage` con semántica explícita de carga y render.
- Flujo normal paginado sin dependencia accidental de `fullItems`.
- Modo reorder aislado y predecible.
- Validación funcional y técnica documentada sobre listas largas.

## Skills guía
- `brainstorming`
- `vercel-react-best-practices`
- `systematic-debugging`
- `clean-code`

## Alcance
- `web/app/_components/pages/ListDetailPage/*`
- `web/app/_components/common/lists/*`
- `web/app/_components/common/cards/*` usados por listas
- `web/lib/types/listView.ts`
- `web/lib/api/actions/listItem.ts` si hace falta ajustar contratos frontend actuales
- documentación asociada en `docs/sprints/*`

## No objetivos
- No introducir todavía el query model completo de filtros/sort/grouping del backend.
- No convertir esta fase en el rediseño total definido para `Sprint 4.5`.
- No persistir vistas guardadas en servidor.
- No rehacer por completo la UI visual del módulo.

## Dependencias
- Parte de la base ya entregada en `Sprint 03`.
- Debe mantenerse compatible con las decisiones de `Sprint 04`.
- Debe preparar una transición limpia hacia `Sprint 4.5`.

## Problemas actuales a resolver

### 1. Carga completa todavía implícita
Hoy la pantalla sigue promoviendo `fullItems` cuando hay `groupBy` o cualquier `sortBy/sortOrder` distinto del default. Eso rompe la idea de que la carga completa exista sólo en contextos explícitos y vuelve a meter presión de CPU y memoria sobre listas grandes.

### 2. Pipeline de exploración aún demasiado acoplado
Aunque `useListGrouping()` mejoró, la pantalla todavía mezcla:
- carga paginada;
- carga completa;
- búsqueda local;
- agrupación;
- sorting;
- reorder;
- render de lista y galería.

Eso deja a `ListDetailPage/index.tsx` como coordinador excesivo y hace difícil razonar sobre cuándo una vista usa página visible vs dataset completo.

### 3. Rendimiento no validado de forma seria
`build` y `lint` pasan, pero no existe una validación funcional mínima que pruebe:
- paginación normal;
- reorder sobre lista larga;
- gallery mode;
- consistencia de stats, borrado, rating y agrupación.

### 4. UX actual de grouping/sorting sigue siendo transitoria
El rediseño total va en `Sprint 4.5`, pero mientras tanto esta capa intermedia debe dejar de comportarse de forma sorprendente. Si una capacidad no puede ser correcta y barata hoy, debe reducirse o restringirse claramente en lugar de seguir funcionando “a medias”.

## Principio rector
En `Sprint 3.5` se prioriza una pantalla estable, limitada y clara sobre una pantalla flexible pero inconsistente. Lo que no pueda resolverse bien sólo desde frontend debe degradarse explícitamente y pasar a `Sprint 4.5`.

## Backlog por lotes

### Lote 3.5A
**Nombre:** Semántica de carga explícita  
**Resultado:** `viewer` paginado no dispara `fullItems` fuera de contextos permitidos

### Lote 3.5B
**Nombre:** Coordinación y reducción de complejidad  
**Resultado:** la pantalla principal delega responsabilidades a coordinadores claros

### Lote 3.5C
**Nombre:** Hardening de UX transicional  
**Resultado:** grouping/sorting/search no se sienten rotos ni ambiguos aunque aún no exista el rediseño 4.5

### Lote 3.5D
**Nombre:** Validación real  
**Resultado:** el sprint queda cerrado con evidencia funcional y técnica

## Secuencia sugerida de PRs

### PR-3.5A Loading semantics hardening
- Quitar cualquier `ensureFullItems()` automático fuera de contexto explícito.
- Documentar qué acciones sí pueden promover `fullItems`.
- Restringir o degradar capacidades que hoy dependen de dataset completo.

### PR-3.5B Page decomposition
- Extraer coordinadores para:
  - data mode;
  - viewer state;
  - reorder state;
  - render composition.
- Reducir `ListDetailPage/index.tsx` a una capa de orquestación corta.

### PR-3.5C Transitional UX guardrails
- Ajustar búsqueda, grouping y sorting para que no induzcan estados inconsistentes.
- Mantener visible y comprensible la paginación cuando aplique.
- Deshabilitar o simplificar interacciones dudosas hasta que exista `Sprint 4.5`.

### PR-3.5D Validation pass
- Probar manualmente escenarios críticos.
- Dejar checklist y evidencia en la doc del sprint.

## Tareas

### T1. Definir una matriz explícita de modos de datos
- Subtareas:
  - identificar qué estado usa `pageItems`;
  - identificar qué estado usa `fullItems`;
  - documentar qué interacción puede promover una carga completa;
  - impedir promociones automáticas por efectos secundarios ambiguos.
- Recomendación:
  - pensar el módulo como dos familias de flujo:
    - `Browse paginado`;
    - `Edit/Reorder con dataset completo`.

### T2. Replantear capacidades transicionales que hoy dependen de `fullItems`
- Subtareas:
  - decidir si `grouping` temporalmente:
    - se restringe,
    - se limita a página visible,
    - o se mantiene sólo con aviso/contexto explícito;
  - decidir si `sorting` local fuera de `list_order` sigue activo o se acota;
  - dejar la semántica escrita para evitar “medio soporte”.
- Recomendación:
  - si una función sólo es correcta con backend query real, no conviene disfrazarla de feature terminada en frontend.

### T3. Separar coordinadores del contenedor principal
- Subtareas:
  - extraer el selector de estrategia de datos;
  - extraer el coordinador de toolbar/estado de exploración;
  - extraer el coordinador de render por modo;
  - reducir `ListDetailPage/index.tsx` a un punto de composición.
- Recomendación:
  - la pantalla principal no debería conocer detalles internos de cada modo de render.

### T4. Endurecer búsqueda local y navegación
- Subtareas:
  - confirmar que la búsqueda local funciona sobre el conjunto correcto;
  - evitar que la búsqueda navegue a items invisibles por una semántica inconsistente;
  - aclarar si la búsqueda opera sobre:
    - página actual;
    - dataset cargado;
    - dataset completo bajo demanda explícita.
- Recomendación:
  - la búsqueda debe ser útil y predecible, no mágica.

### T5. Revisar comportamiento de paginación y vistas agrupadas
- Subtareas:
  - asegurar que la paginación no desaparece por estados intermedios no controlados;
  - definir si la agrupación en este sprint:
    - mantiene paginación global visible, o
    - se reduce a una capacidad menor pero consistente;
  - eliminar acoplamientos entre grouping y render pesado.
- Recomendación:
  - en esta fase importa más la coherencia que la sofisticación.

### T6. Validación funcional de fin de sprint
- Subtareas:
  - probar lista normal larga;
  - probar reorder sobre lista larga;
  - probar gallery mode;
  - probar borrado, rating y stats;
  - verificar estados vacíos, loading y errores.
- Recomendación:
  - dejar evidencia concreta en la doc, no sólo una percepción general.

## Checklist de implementación

### Lote 3.5A
- [x] `viewer` normal no promueve `fullItems` por grouping/sorting implícitos.
- [x] Existe una matriz documentada de qué acciones pueden cargar el dataset completo.
- [x] Las rutas de datos de `Browse` y `Edit Order` quedan separadas y legibles.

### Lote 3.5B
- [x] `ListDetailPage/index.tsx` baja materialmente de tamaño y responsabilidad.
- [x] El módulo tiene coordinadores más pequeños y específicos.
- [x] Los hooks dejan de mezclar decisiones de carga, transformación y render.

### Lote 3.5C
- [x] La búsqueda local tiene semántica clara.
- [x] Grouping/sorting transicional no generan estados ambiguos o costosos.
- [x] La paginación se mantiene comprensible en todos los estados soportados.

### Lote 3.5D
- [x] Existe validación manual mínima documentada para listas largas.
- [x] `npm run lint` y `npm run build` en `web` siguen pasando.
- [x] No hay regresiones visibles en stats, borrado, rating y gallery mode.

## Checklist de validación
- [x] Lista larga en vista normal sin carga completa automática.
- [x] Entrada y salida de reorder sin inconsistencias de datos.
- [x] Search local encuentra y navega elementos de forma predecible.
- [x] Gallery mode mantiene comportamiento estable.
- [x] Paginación y controles visibles en todos los estados soportados.
- [x] Agrupación y sorting no producen sorpresas de rendimiento.
- [x] `npm run lint` en `web`.
- [x] `npm run build` en `web`.

## Riesgos
- Intentar “salvar” grouping/sorting completamente desde frontend y terminar reforzando una arquitectura temporal.
- Degradar demasiado la UX si se recortan capacidades sin buen criterio.
- Mover lógica entre hooks y componentes sin una semántica clara de datos.

## Criterios de aceptación
- La pantalla deja de hacer cargas completas implícitas fuera de contextos explícitos.
- El contenedor principal queda más pequeño y entendible.
- La UX transicional es limitada pero coherente.
- El cierre del sprint queda respaldado por validación real, no sólo por compilación.

## Relación con Sprint 4.5
- `Sprint 3.5` no reemplaza `Sprint 4.5`.
- `Sprint 3.5` limpia y endurece la implementación actual.
- `Sprint 4.5` hará el rediseño correcto de:
  - query model;
  - filtros;
  - sort multi-campo;
  - agrupación estable;
  - separación entre `Explore` y `Edit Order`.

La regla práctica es:
- si el problema puede resolverse sólo con disciplina frontend y mejor semántica, pertenece a `Sprint 3.5`;
- si requiere un contrato nuevo de datos o browse metadata real, pertenece a `Sprint 4.5`.

## Refactors recomendados
- Introducir un coordinador explícito de `data strategy`.
- Introducir un coordinador explícito de `view state`.
- Reducir el poder implícito de efectos automáticos que promueven `fullItems`.
- Mantener el módulo preparado para reemplazar la lógica transicional por el query model futuro.
