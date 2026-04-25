# Sprint 16
# Public Safety And MVP Launch Hardening

## Objetivo
Cerrar el MVP público con la mínima capa de seguridad operativa,
moderación y hardening necesaria para poder abrir Denn con confianza.

Este sprint no añade glamour de producto. Añade capacidad real de
lanzamiento.

## Entregable principal
- Reportes de `reviews` públicas.
- Reportes de `listas` públicas.
- Flujo mínimo de triage operativo.
- Hardening de rutas públicas anónimas.
- Revisión final de cache/SEO/tráfico.
- QA final de diseño: tipografía, color, títulos dinámicos y responsive
  en rutas públicas y flujos principales autenticados.
- Checklist de lanzamiento y rollback.

## Skills guía
- `brainstorming`
- `security-review`
- `error-handling-patterns`
- `clean-code`
- `api-design-principles`

## Alcance
- Modelos/endpoints de reportes en `core`.
- Acciones de reporte en `web`.
- Triage básico vía admin o flujo operador mínimo.
- Rate protection / ajustes de cache si hace falta.
- Observabilidad y checklist de release.
- Validación final de sitemaps, metadata y rutas públicas.
- Revisión transversal de `font-sans` para textos no titulares,
  consistencia de colores y layout responsive.

## No objetivos
- No construir un sistema complejo de trust & safety.
- No moderación automatizada avanzada.
- No reportes de perfiles en esta fase.
- No appeal flows ni gestión compleja de sanciones.

## Dependencias
- Requiere que las superficies públicas de `Sprint 13`, `Sprint 14` y
  `Sprint 15` existan.
- Coordina con los sprints de infraestructura/performance ya abiertos.

## Contexto funcional y técnico

### Estado actual

La versión actual del producto aún no enfrenta tráfico anónimo amplio ni
superficies públicas ricas. Una vez se abra eso, aparecen problemas que
no se pueden improvisar:

- spam;
- abuso básico;
- tráfico inesperado;
- rutas públicas lentas o mal cacheadas;
- bugs de SEO o enlaces rotos.

### Modelo objetivo

Antes de launch:

- cualquier usuario puede reportar reviews y listas públicas;
- existe una forma clara de que el equipo vea y procese esos reportes;
- las rutas públicas críticas tienen caché razonable y observabilidad;
- existe plan de rollout y rollback.

### Decisiones técnicas a cerrar dentro del sprint

- taxonomy mínima de motivos de reporte;
- si el triage vive íntegramente en Django admin o requiere una mini UI;
- si ciertas rutas necesitan rate limiting específico;
- si el launch es soft-launch o apertura total.

## Backlog por lotes

### Lote 16A
- Sistema de reportes.
- Admin/triage básico.

### Lote 16B
- Hardening de tráfico público.
- Revisión de cache y observabilidad.

### Lote 16C
- Launch checklist.
- Rollback plan.
- QA final transversal.
- Correcciones finales de diseño y responsive.

## Secuencia sugerida de PRs

### PR-16A Reportes
- Modelo de report.
- Endpoints.
- UI de reportar review/lista.

### PR-16B Hardening
- Ajustes de cache.
- Revisiones de rutas públicas.
- Señales/alertas mínimas.

### PR-16C Launch ops
- Checklist.
- Docs operativas.
- Rollout flags si son necesarias.
- Pass final de UI: tipografía, colores, responsive y títulos
  dinámicos.

## Tareas

### T1. Diseñar sistema mínimo de reportes
- Tipos reportables.
- Razones mínimas.
- Payload y estado del reporte.

### T2. Implementar triage
- Flujo operador.
- Visibilidad en admin.
- Acciones mínimas de resolución.

### T3. Revisar protección operativa
- Cache pública.
- Rate protection si aplica.
- Observabilidad de salud.

### T4. Cerrar salida a producción
- Checklist funcional.
- Checklist técnico.
- Rollback.
- QA visual de rutas principales en móvil y desktop.
- Verificar que títulos dinámicos y metadata no regresan a defaults
  genéricos.

## Checklist de implementación

### Lote 16A
- Reportes de review/lista existen.
- Triage básico existe.

### Lote 16B
- Rutas públicas críticas revisadas.
- Cache y observabilidad mínimas listas.

### Lote 16C
- Checklist de launch escrito.
- Plan de rollback escrito.
- Pass visual/responsive completado para rutas críticas.

## Checklist de validación
- `make validate-core`
- `make validate-web`
- QA manual de rutas públicas críticas.
- QA manual de flujos principales autenticados en móvil y desktop.
- Probar reportar review y lista.
- Simular tráfico básico anónimo y revisar logs.

## Riesgos
- Subestimar abuso básico en launch.
- Abrir rutas públicas sin suficiente cache.
- No tener visibilidad operativa para detectar regresiones.
- Reportes sin flujo real de resolución.

## Criterios de aceptación
- Existe capacidad mínima de reporte sobre reviews y listas públicas.
- El equipo puede procesar esos reportes operativamente.
- Las rutas públicas críticas están endurecidas para launch.
- Existe un checklist y rollback plan concreto.
- La UI crítica mantiene tipografía, color, metadata y responsive
  coherentes antes de launch.

## Interdependencias
- Cierra el arco MVP iniciado por `Sprint 11`.
- Depende de todas las superficies públicas previas.

## Refactors recomendados
- Centralizar patrones de error para endpoints públicos.
- Revisar envelopes de respuesta donde convenga.
- Aislar infraestructura de reporte de lógica de presentación.

## Follow-ups (NO se hacen en este sprint)
- Reportes de perfil.
- Moderación automática.
- Sistemas complejos de reputation/trust.
- Appeals o workflows avanzados.
