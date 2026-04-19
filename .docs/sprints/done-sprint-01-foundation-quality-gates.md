# Sprint 01
# Fundaciones y Quality Gates

## Objetivo
Recuperar una base operativa confiable para que los siguientes sprints no se ejecuten “a ciegas”. Este sprint no busca mejorar UX de forma directa; busca reducir riesgo, estabilizar tooling y dejar métricas mínimas para validar el resto del roadmap.

## Entregable principal
- Workspace documentado como topología real de 3 repos.
- `web` con `lint` funcional.
- `proxy` con `go test ./...` limpio o, como mínimo, con fallos clasificados y tests online/offline separados.
- CI mínima por app con `lint/test/build` antes de construir imagen.
- Documento corto de “Definition of Done” transversal para `web`, `core` y `proxy`.

## Skills guía
- `clean-code`
- `systematic-debugging`
- `docker-expert`
- `security-review`

## Alcance
- `web`: ESLint/dependencias/config.
- `proxy`: suite de tests, separación de mocks y contratos.
- `core`: incorporación de tests a CI y saneamiento de expectativas mínimas.
- repos/workspace: clarificar si se seguirá con tres repos coordinados o se formalizará un workspace en un sprint futuro.

## No objetivos
- No rediseñar arquitectura de datos.
- No atacar performance fina del frontend todavía.
- No cambiar contratos de negocio.

## Dependencias
- Ninguna. Debe ejecutarse primero.

## Backlog por lotes

### Lote 1A
**Nombre:** Hygiene y definición operativa del workspace  
**Resultado:** topología explícita de repos y reglas mínimas de trabajo

### Lote 1B
**Nombre:** Recuperación de quality gates locales  
**Resultado:** `web` con lint funcional y `proxy` con tests clasificables/estables

### Lote 1C
**Nombre:** CI mínima por aplicación  
**Resultado:** pipelines que validan antes de construir imágenes

## Secuencia sugerida de PRs

### PR-1A Workspace y reglas base
- Documentar modelo operativo del workspace.
- Añadir definición de done transversal.
- Dejar claro dónde vive documentación compartida.

### PR-1B Frontend lint recovery
- Arreglar `npm run lint`.
- Validar que la configuración quede simple y reproducible.

### PR-1C Proxy test stabilization
- Separar tests offline/online.
- Corregir mocks y aserciones rotas.

### PR-1D CI mínima
- Agregar checks obligatorios a workflows.

## Tareas

### T1. Formalizar la topología del workspace
- Subtareas:
  - Documentar que la raíz no es un monorepo real.
  - Elegir nomenclatura oficial: `workspace contenedor` o `triple-repo`.
  - Definir dónde vive documentación transversal y cómo se versiona.
- Recomendación de diseño:
  - No fingir monorepo si no existe. Es mejor explicitar tres repos coordinados que mantener ambigüedad.

### T2. Recuperar `lint` en `web`
- Subtareas:
  - Identificar la incompatibilidad exacta detrás de `TypeError: expand is not a function`.
  - Fijar versiones o configuración rota en ESLint/Minimatch.
  - Dejar `npm run lint` reproducible en local y CI.
- Recomendación de código:
  - Mantener config simple y alineada con `eslint-config-next`.
  - Evitar capas innecesarias de config si no aportan valor.

### T3. Estabilizar tests del `proxy`
- Subtareas:
  - Separar fallos de lógica real vs mocks mal aislados.
  - Clasificar tests por tipo:
    - unitarios puros,
    - integración con mocks HTTP,
    - dependientes de proveedor/token real.
  - Corregir al menos los paquetes rotos:
    - `internal/services/games/service`
    - `internal/services/spotify/service`
    - `internal/services/spotify/mapper`
- Recomendación de código:
  - Los tests del gateway deben depender de `RoundTripper` controlado, no de side effects implícitos de autenticación.
  - Si un test valida transformación pura, no debe compartir path con autenticación/token.

### T4. Subir quality gates mínimas a CI
- Subtareas:
  - `web`: `npm run lint`, `npm run build`
  - `core`: `manage.py test`
  - `proxy`: `go test ./...`
  - Hacer que el build/push de imagen dependa de esos checks.
- Recomendación operativa:
  - Mantener los pipelines pequeños. Mejor tres jobs simples confiables que una mega pipeline difícil de sostener.

### T5. Definir estándares transversales de Done
- Subtareas:
  - Convención de errores reproducibles.
  - Convención de tests nuevos por cambio.
  - Convención de cambios de contrato entre apps.
- Recomendación:
  - Todo cambio que toque integración `web/core/proxy` debe incluir evidencia de compatibilidad.

## Checklist de implementación

### Lote 1A
- [x] Existe una definición explícita de la topología real del workspace.
- [x] Queda definida la política de documentación transversal.
- [x] Queda documentado qué comandos mínimos validan cada app.

### Lote 1B
- [x] `web` corre `npm run lint`.
- [x] La causa del fallo de ESLint queda identificada y eliminada.
- [x] `proxy` tiene una suite offline-safe y determinista en `go test ./...`.
- [x] Los fallos del `proxy` ya no dependen de autenticación implícita de proveedor.

### Lote 1C
- [x] `web` ejecuta lint y build en CI.
- [x] `core` ejecuta tests en CI.
- [x] `proxy` ejecuta tests en CI.
- [x] El push de imagen depende del éxito de esos checks.

## Checklist de validación
- [x] `git` diffs por repo son legibles y con alcance acotado.
- [x] Los checks corren sin pasos manuales ocultos.
- [x] La documentación no sigue llamando “monorepo” a algo que no lo es.

## Estado al cierre
- `web`: `npm run lint` queda funcional; se mantiene 1 warning no bloqueante de `@next/next/no-img-element`.
- `web`: `npm run build` queda estable usando `next build --webpack` y sin dependencia de Google Fonts en build-time.
- `core`: el comando reproducible de tests pasa a ser `./.venv/bin/python manage.py test` y queda incorporado a CI.
- `proxy`: la suite por defecto `go test ./...` queda determinista y offline-safe; los tests de servicios ya no mezclan autenticación de proveedor con payloads de datos.

## Riesgos
- Querer resolver en este sprint deuda de arquitectura más profunda.
- Meter cambios de código de negocio junto con fixing de tooling.

## Criterios de aceptación
- `web` puede correr `npm run lint`.
- `proxy` tiene una suite de tests usable y clasificada.
- CI por app falla si falla lint/test/build.
- Existe documentación breve y explícita del modelo operativo de repos.

## Interdependencias
- Desbloquea `Sprint 02`, `Sprint 03`, `Sprint 04` y `Sprint 05`.

## Refactors recomendados
- Reducir configuración accidental en `web`.
- Hacer que tests del `proxy` sean deterministas y centrados por capa.
- Evitar scripts “mágicos” no documentados en CI.
