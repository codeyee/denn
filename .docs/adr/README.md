# Architecture Decision Records (ADR)

Esta carpeta contiene las decisiones de arquitectura del workspace `denn` (`web`, `core`, `proxy`).

## Convención

- Formato: [MADR](https://adr.github.io/madr/) ligero.
- Numeración secuencial: `NNNN-titulo-en-kebab-case.md`.
- Cada ADR tiene estado: `Proposed`, `Accepted`, `Superseded by NNNN`, `Deprecated`.
- Los cambios estructurales en `web`/`core`/`proxy` deben referenciar el ADR correspondiente en su mensaje de commit.
- La plantilla está en [`_template.md`](./_template.md).

## Índice

| ADR | Título | Estado |
|-----|--------|--------|
| [0001](./0001-external-metadata-integration.md) | Integración de metadata externa (`web`/`core`/`proxy`) | Accepted |
| [0002](./0002-web-auth-cookies.md) | Sesión web sobre cookies `HttpOnly` | Accepted |
| [0003](./0003-migrate-web-from-nextjs-to-tanstack-start.md) | Migrar `web/` de Next.js App Router a TanStack Start | Accepted |

## Cuándo escribir un ADR

- Una decisión que cambia cómo se comunican dos servicios.
- Una decisión de seguridad con impacto cross-layer (auth, secretos, CORS).
- Una elección entre dos o más alternativas con tradeoffs reales.
- Cualquier decisión que un nuevo contribuidor debería poder leer en menos de 10 minutos.

## Cuándo NO escribir un ADR

- Refactors internos a un solo servicio.
- Elección de librería sin impacto cross-layer.
- Convenciones de código (eso va a `AGENTS.md` o reglas de lint).
