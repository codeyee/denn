# Sprint 05
# Proxy: Fiabilidad, Tests y Performance de Agregación

## Objetivo
Convertir `proxy` en una pieza confiable para evolución continua: tests limpios, límites claros de retries, agregación más predecible y caching más útil para los casos costosos.

## Entregable principal
- `go test ./...` limpio o completamente particionado entre offline/online.
- Política de retries y fallbacks revisada.
- `/homepage` y `/search` con estrategia explícita de costo, caché y degradación.
- Contratos de provider estables para `web` y `core`.

## Skills guía
- `clean-code`
- `systematic-debugging`
- `api-design-principles`
- `docker-expert`

## Alcance
- `proxy/internal/services/*`
- `proxy/internal/providers/*`
- `proxy/internal/handlers/homepage/handler.go`
- `proxy/internal/handlers/multisearch/handler.go`
- `proxy/internal/clients/httpclient.go`
- `proxy/internal/clients/cache*.go`

## No objetivos
- No mover lógica de dominio de usuario al `proxy`.
- No introducir observabilidad completa en este sprint.

## Dependencias
- Requiere `Sprint 01`.
- Debe coordinarse con `Sprint 04` si cambian contratos consumidos por `core`.

## Backlog por lotes

### Lote 5A
**Nombre:** Suite confiable del gateway  
**Resultado:** tests del `proxy` limpios, deterministas y segmentados

### Lote 5B
**Nombre:** Resiliencia y retries  
**Resultado:** política de retries/fallbacks afinada por tipo de error

### Lote 5C
**Nombre:** Optimización de endpoints agregados  
**Resultado:** `/homepage` y `/search` con estrategia explícita de costo y payload

### Lote 5D
**Nombre:** Caching y degradación  
**Resultado:** comportamiento claro con y sin Redis

## Secuencia sugerida de PRs

### PR-5A Test cleanup
- Corregir `games` y `spotify`.
- Separar tests unitarios de tests dependientes de autenticación/proveedor.

### PR-5B Retry and fallback policy
- Revisar `BaseClient`.
- Afinar clasificación de errores y backoff.

### PR-5C Aggregate endpoint optimization
- Revisar payload/caché de `/homepage`.
- Revisar shape y límites de `/search`.

### PR-5D Cache behavior hardening
- Documentar y endurecer degradación sin Redis.

## Tareas

### T1. Limpiar y separar la suite de tests
- Subtareas:
  - identificar tests que hoy dependen indirectamente de token/auth real;
  - unificar mocks HTTP por provider;
  - separar tests puros de mapping frente a tests de autenticación/provider client.
- Recomendación:
  - un test de service no debería fallar por no haber mockeado el token provider salvo que eso sea precisamente lo que está probando.

### T2. Revisar retries y latencia compuesta
- Subtareas:
  - clasificar tipos de error reintentables;
  - revisar `maxRetries`, backoff y jitter por provider;
  - evitar colas largas en endpoints agregados.
- Recomendación de diseño:
  - `429`, `5xx`, parse failures y errores de autenticación no deben compartir exactamente la misma política.

### T3. Optimizar `/homepage`
- Subtareas:
  - decidir si home necesita detalle completo por item o una versión “preview” más barata;
  - cachear la respuesta agregada;
  - medir fan-out por provider y tiempo de enriquecimiento.
- Recomendación:
  - homepage debe priorizar latencia y estabilidad, no completitud máxima del payload.

### T4. Revisar `search` agregada
- Subtareas:
  - validar payload por tipo y shape de errores parciales;
  - revisar si todos los tipos deben consultarse siempre;
  - evaluar límites y timeouts diferenciados por proveedor.

### T5. Endurecer caché y degradación
- Subtareas:
  - documentar TTLs por provider;
  - revisar si faltan respuestas agregadas cacheables;
  - definir qué pasa cuando Redis no está disponible.
- Recomendación:
- el modo `NoOpCache` no debe dejar invisible el riesgo operativo.

## Checklist de implementación

### Lote 5A
- [x] `go test ./...` ya no falla por mocks o autenticación implícita.
- [x] Los tests están clasificados por nivel.
- [x] Las transformaciones puras se testean sin depender de token flow.

### Lote 5B
- [x] La política de retries distingue 429, 5xx, auth y parse failures.
- [x] No hay retries indiscriminados donde sólo aumentan latencia.
- [x] Los fallbacks están explícitos por endpoint.

### Lote 5C
- [x] `/homepage` tiene una estrategia clara de detalle vs preview.
- [x] `/search` tiene límites y shape consistentes.
- [x] El payload agregado está revisado y justificado.

### Lote 5D
- [x] Los TTLs críticos están documentados.
- [x] El comportamiento sin Redis está definido y observable.
- [x] Rate limiting y caché no quedan invisiblemente fail-open sin registro.

## Checklist de validación
- [x] `go test ./...` corre limpio en local/CI.
- [x] `core` y `web` siguen consumiendo el `proxy` sin regresiones de shape.
- [x] Se verificó el comportamiento de `/homepage` y `/search`.
- [x] Los cambios de latencia/payload están comparados antes/después.

## Riesgos
- Afinar demasiado el proxy sin decidir la arquitectura objetivo con `core`.
- Optimizar payloads y romper consumidores por shape implícito.

## Criterios de aceptación
- Suite de tests utilizable y limpia.
- Política de retries documentada y más precisa.
- `/homepage` con mejor estrategia de caché o payload.
- Contratos de agregación documentados y estables.

## Interdependencias
- Toca directamente la latencia de `Sprint 02`, `Sprint 03` y `Sprint 04`.
- Prepara decisiones de `Sprint 06`.

## Refactors recomendados
- Servicios por provider con responsabilidades nítidas.
- Evitar mezclar autenticación del proveedor con mapping de dominio en la misma unidad de test.
- Mantener handlers agregados delgados; la complejidad debe vivir en servicios medibles.
