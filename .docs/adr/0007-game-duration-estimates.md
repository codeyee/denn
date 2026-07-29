# ADR 0007: Tiempos estimados de finalización de videojuegos

- Estado: aceptado para el MVP
- Fecha: 2026-07-29
- Issue: [#79](https://github.com/codeyee/denn/issues/79)

## Contexto

Denn necesita mostrar una estimación de cuánto tarda completar un juego. IGDB
ofrece tres métricas oficiales de Game Time To Beat (`hastily`, `normally` y
`completely`) y Denn ya usa el ID IGDB como identidad canónica del videojuego.

HowLongToBeat no se integra mediante scraping ni endpoints privados. Los
wrappers comunitarios no otorgan derechos sobre sus datos y la integración
queda condicionada a una API oficial o licencia escrita que permita almacenar
y redistribuir valores normalizados.

## Decisión

El MVP usa IGDB como fuente única. `proxy` solicita los campos de tiempo junto
con el detalle del juego y los convierte a un contrato Denn-owned. Core persiste
un `GameDurationEstimate` por juego y proveedor, con valores en segundos,
estado, fecha de sincronización, fecha de actualización de la fuente y número
de muestras.

La duración es enriquecimiento no bloqueante: la lectura del juego continúa
aunque IGDB no tenga datos o la consulta falle. El cliente HTTP de `proxy`
aplica hasta dos reintentos con backoff, `Retry-After` y un presupuesto total
acotado; Core conserva hasta tres fallos consecutivos de sincronización en
`retry_count` junto con `last_error_code`. La lectura local reconstruye el
contrato y permite servir datos stale mientras el flujo existente refresca el
detalle.

## Consecuencias

- El matching del MVP es exacto por ID IGDB; no hay asociación fuzzy ni
  herencia automática entre juegos, remakes, remasters, DLC o episodios.
- La UI inicial aparece solo en el detalle y cubre datos completos, parciales,
  ausentes, desactualizados y con error.
- Las futuras fuentes requieren una identidad separada, revisión de términos y
  un flujo de matching con confianza y evidencia.
- Los índices y estados dejan preparada una futura sincronización selectiva y
  filtros por duración sin ampliar el alcance del MVP.
