# Sprint 06
# Integración, Observabilidad y Simplificación Arquitectónica

## Objetivo
Cerrar la remediación con una decisión arquitectónica explícita sobre la integración `web/core/proxy`, más instrumentación suficiente para medir el sistema real y sostener su evolución.

## Entregable principal
- Decisión de arquitectura documentada sobre la ruta de consumo de metadata externa.
- Contratos internos versionados o, al menos, normalizados.
- Observabilidad mínima transversal.
- Limpieza final de documentación para que deje de contradecir al código.

## Skills guía
- `api-design-principles`
- `security-review`
- `python-project-structure`
- `clean-code`

## Alcance
- integración entre `web`, `core` y `proxy`
- documentación transversal
- headers, env vars y contratos internos
- logging/métricas mínimas

## No objetivos
- No reescribir las tres apps.
- No convertir esto en un proyecto de plataforma total.

## Dependencias
- Recomendado después de `Sprint 02` a `Sprint 05`.

## Backlog por lotes

### Lote 6A
**Nombre:** Decisión de arquitectura de integración  
**Resultado:** una ruta explícita para consumo de metadata externa

### Lote 6B
**Nombre:** Contratos internos y seguridad de integración  
**Resultado:** headers, env vars y shapes documentados y endurecidos

### Lote 6C
**Nombre:** Observabilidad mínima transversal  
**Resultado:** request IDs, logs estructurados y métricas operativas mínimas

### Lote 6D
**Nombre:** Limpieza final de documentación  
**Resultado:** docs alineadas al sistema real

## Secuencia sugerida de PRs

### PR-6A Integration ADR
- Decidir `web -> proxy`, `web -> core`, o híbrido controlado.
- Documentar tradeoffs y criterio final.

### PR-6B Internal contract hardening
- Normalizar errores, headers y env vars.
- Revisar fallbacks inseguros.

### PR-6C Observability baseline
- Correlation IDs.
- Logs estructurados.
- Métricas mínimas.

### PR-6D Documentation alignment
- Actualizar README y docs funcionales/arquitectónicas.

## Tareas

### T1. Elegir una arquitectura objetivo para metadata externa
- Opciones a resolver:
  - `web -> proxy` directo y `core` sólo persiste;
  - `web -> core` y `core` centraliza composición con `proxy`;
  - híbrido controlado, pero con contratos explícitos y justificación real.
- Subtareas:
  - comparar latencia, seguridad, caché, complejidad de clientes y evolución.
  - tomar una decisión documentada.

### T2. Normalizar contratos internos
- Subtareas:
  - versionar o fijar shape de respuestas críticas;
  - documentar headers y env vars válidas;
  - revisar naming, errores y paginación entre capas.
- Recomendación:
  - los contratos internos deben ser tratados como APIs reales, no como detalles informales.

### T3. Introducir observabilidad mínima
- Subtareas:
  - correlation/request IDs;
  - logs estructurados en `core` y `proxy`;
  - métricas mínimas:
    - latencia por endpoint,
    - tiempo de fan-out,
    - cache hit/miss,
    - tamaño de payloads.
- Recomendación:
  - empezar pequeño y útil. No hace falta un stack de observabilidad completo si nadie lo operará.

### T4. Endurecer seguridad de integración
- Subtareas:
  - eliminar fallbacks inseguros como secretos en `NEXT_PUBLIC_*`;
  - revisar auth del frontend persistido en cliente;
  - definir y ejecutar la migración desde tokens accesibles por JavaScript a cookies seguras server-readable como objetivo de seguridad;
  - decidir si la sesión web final usará cookies `HttpOnly` emitidas por backend/BFF, con refresh controlado server-side y menor dependencia de `localStorage`;
  - documentar qué secretos son server-only.

### T6. Hardening de sesión web
- Subtareas:
  - inventariar dónde siguen viviendo tokens de auth en cliente y qué flujos dependen de ellos;
  - mover login/register/logout/refresh a una estrategia donde el navegador no necesite leer el token de sesión normal;
  - revisar impacto en CSRF, rotación de refresh token, logout global y render server-first;
  - dejar una estrategia de transición incremental para no romper `home`, `search` y rutas protegidas existentes.
- Recomendación:
  - el estado objetivo debería ser cookie-based auth con cookies `HttpOnly`/`Secure`/`SameSite` adecuadas y un BFF o backend capaz de resolver sesión sin exponer JWTs a JavaScript.

### T5. Limpiar documentación
- Subtareas:
- corregir `README` de `core` para reflejar que no es el gateway principal;
  - documentar la topología real del workspace;
  - alinear docs de frontend con rutas y flows actuales.

## Checklist de implementación

### Lote 6A
- [x] Existe una decisión escrita y explícita sobre la ruta de metadata externa.
- [x] Se documentaron tradeoffs de latencia, seguridad, caché y evolución.

### Lote 6B
- [x] Los secretos no tienen fallbacks públicos.
- [x] Headers y env vars válidas están definidos por capa.
- [x] Los contratos críticos están normalizados.
- [x] Existe una decisión explícita sobre la estrategia final de auth web basada en cookies seguras.

### Lote 6C
- [x] Cada request puede correlacionarse entre capas donde aplique.
- [x] Existen logs útiles de latencia/error.
- [x] Hay métricas mínimas de cache hit/miss y endpoints críticos.

### Lote 6D
- [x] El README raíz refleja el rol real del servicio.
- [x] La documentación transversal no contradice al código.
- [x] La topología del workspace quedó clara para nuevos contribuidores.

## Checklist de validación
- [x] La decisión de integración fue revisada por frontend y backend.
- [x] Las apps pueden operar con la configuración documentada.
- [x] La observabilidad mínima produce señales útiles, no ruido vacío.
- [x] La documentación final quedó coherente entre `web`, `core`, `proxy` y `docs/`.

## Riesgos
- Posponer indefinidamente la decisión de integración y seguir acumulando duplicación.
- Instrumentar demasiado sin usar la telemetría.

## Criterios de aceptación
- Hay una decisión explícita sobre la ruta de consumo de metadata.
- Los contratos internos críticos están documentados y alineados.
- Existen logs/métricas mínimas para observar latencia y caché.
- Existe una decisión y plan de migración para abandonar auth web dependiente de tokens legibles por JavaScript.
- La documentación deja de contradecir al código en puntos importantes.

## Interdependencias
- Consolida los resultados de todos los sprints anteriores.
- Si este sprint se omite, la deuda de integración seguirá reapareciendo.

## Refactors recomendados
- Menos duplicación de clientes HTTP.
- Menos contratos implícitos.
- Menos documentación aspiracional y más documentación de comportamiento real.
