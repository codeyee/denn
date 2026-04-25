# Sprint 15
# Leaderboards 1.0

## Objetivo
Crear la primera gran superficie de descubrimiento agregada de Denn.
Los leaderboards deben transformar ratings individuales en loops
públicos de exploración por calidad, amor y popularidad.

## Entregable principal
- Leaderboards públicos por tipo de medio.
- Tres familias:
  - `top rated`
  - `most loved`
  - `most popular`
- Ranking bayesiano o ponderado con umbrales mínimos de votos.
- Páginas navegables en `web`.
- Estrategia de recomputación/cache razonable.

## Skills guía
- `brainstorming`
- `django-expert`
- `python-performance-optimization`
- `api-design-principles`
- `clean-code`

## Alcance
- Lógica de ranking y umbrales en `core`.
- Endpoints públicos por tipo y familia.
- UI de leaderboards en `web`.
- Caching o materialización si es necesaria.
- Documentación de fórmulas y restricciones MVP.

## No objetivos
- No filtros avanzados por año, década, género o país.
- No leaderboards sociales por red de amigos.
- No rankings personalizados por usuario.
- No badges o gamificación adicional.

## Dependencias
- Requiere `Sprint 11` para semántica correcta de ratings/favorites.
- Requiere `Sprint 13` para navegación pública consolidada.
- Se beneficia de `Sprint 14` al conectar con perfiles públicos.

## Contexto funcional y técnico

### Estado actual

El producto todavía no tiene un loop público agregativo. Search sirve
para encontrar, pero no para descubrir. Sin rankings públicos, Denn se
pierde una de las superficies más obvias del nicho.

### Modelo objetivo

MVP:

- leaderboards globales por tipo de medio;
- sin filtros avanzados;
- score ponderado para `top rated`;
- señal de `favorite` y/o ratios adecuados para `most loved`;
- señal de volumen/interacción básica para `most popular`.

La matemática no debe ser arbitraria. Tiene que quedar documentada,
testeada y razonablemente estable.

### Decisiones técnicas a cerrar dentro del sprint

- fórmula exacta por familia;
- umbral mínimo de votos por tipo;
- si se calcula on-demand o con materialización periódica;
- tie-breakers;
- si `SEASON` entra en las tres familias o sólo en algunas.

## Backlog por lotes

### Lote 15A
- Diseñar fórmulas y thresholds.
- Escribir tests de ranking.

### Lote 15B
- Implementar endpoints y caché/materialización.

### Lote 15C
- UI pública de leaderboards e integración con navegación.

## Secuencia sugerida de PRs

### PR-15A Fórmulas y contratos
- Definir ranking bayesiano.
- Definir `most loved`.
- Definir `most popular`.
- Tests matemáticos.

### PR-15B Backend y performance
- Endpoints públicos.
- Estrategia de cache/materialización.
- Instrumentación básica.

### PR-15C Frontend
- Páginas de leaderboards.
- Navegación por tipo/familia.
- Estados vacíos y aclaraciones de ranking.

## Tareas

### T1. Diseñar la matemática
- Elegir fórmulas.
- Elegir thresholds.
- Documentar tradeoffs.

### T2. Implementar backend
- Querysets o tablas materializadas.
- Endpoints públicos.
- Validar costos de cómputo.

### T3. Implementar frontend
- Vistas por tipo y familia.
- UX de navegación simple.
- Explicar de forma ligera que el ranking es ponderado.

### T4. Validar integridad del ranking
- Evitar obras con una sola nota arriba del todo.
- Comprobar que ratings inactivos no entran.
- Revisar resultados manualmente.

## Checklist de implementación

### Lote 15A
- Fórmulas decididas.
- Thresholds por tipo fijados.
- Tests escritos.

### Lote 15B
- Endpoints públicos listos.
- Cache/materialización decidida.

### Lote 15C
- UI pública lista.
- Navegación enlazada desde catálogo.

## Checklist de validación
- `make validate-core`
- `make validate-web`
- Revisar manualmente top 20 por tipo y familia.
- Verificar que obras con muy pocos votos no lideran el ranking.
- Verificar que favorites impactan sólo donde corresponde.

## Riesgos
- Fórmulas débiles o poco intuitivas.
- Coste alto de cómputo si se hace todo on-demand.
- Confusión entre `top rated` y `most loved`.
- Datos pobres en ciertos tipos al inicio.

## Criterios de aceptación
- Existen leaderboards públicos por tipo de medio.
- Hay tres familias funcionales.
- El ranking usa ponderación y umbrales.
- La UI es navegable y comprensible.

## Interdependencias
- Requiere tracking/rating correcto de `Sprint 11`.
- Se integra naturalmente con `Sprint 13` y `Sprint 14`.
- Debe quedar endurecido por `Sprint 16` antes del lanzamiento público.

## Refactors recomendados
- Aislar fórmulas de ranking en módulos testeables.
- Evitar incrustar lógica matemática en views/serializers.
- Considerar capa de materialización si los querysets se vuelven caros.

## Follow-ups (NO se hacen en este sprint)
- Filtros avanzados.
- Ranking por década/género/país.
- Ranking social por amigos o gente seguida.
- Personalización por usuario.
