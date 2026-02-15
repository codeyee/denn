# Plan Maestro: Refactorización y Seguridad

Este documento consolida los hallazgos de la revisión de API y Seguridad, definiendo las acciones concretas para mejorar la robustez, mantenibilidad y seguridad de `denn-proxy`.

---

## 🏗️ Fase 0: Red de Seguridad (Testing)

Antes de realizar cambios estructurales, debemos asegurar que la funcionalidad actual está cubierta por tests básicos.

- [x] **Test de Integración de Handlers**:
  - Crear `internal/handlers/movies_test.go`.
  - Implementar un test con `httptest` para verificar endpoints críticos (`/movies/search`, `/movies/:id`).
  - Objetivo: Verificar que los cambios futuros no rompan contratos existentes.

---

## 🧹 Fase 1: Limpieza y Refactorización (API Design & Clean Code)

Simplificación de la API y adopción de mejores prácticas.

### 1.1 Eliminar `images_size` (Deprecación)
El parámetro `images_size` no se utiliza realmente y añade ruido.
- [x] Eliminar `parseImagesSize` de `internal/handlers/utils.go`.
- [x] Actualizar todos los `handlers` para eliminar la llamada.
- [x] Actualizar modelos (`ToResponse`) para usar la constante `10` internamente.

### 1.2 Mover `country` a Header (`X-User-Country`)
La información contextual del usuario debe ir en headers, no en query params.
- [x] Crear helper `getCountryFromHeader(c *gin.Context) string` en `utils.go`.
  - Lógica: Leer header `X-User-Country`. Si vacío, default a `"US"`.
- [x] Refactorizar todos los handlers para usar este helper.

### 1.3 Estandarizar `expand=seasons`
Simplificar la lógica de TV Shows.
- [x] En `internal/services/tmdb/service.go`, eliminar parámetro `expandSeasons`. Siempre será `true`.
- [x] Refactorizar `GetTVShowComplete` para realizar siempre el fetch completo de temporadas.
- [x] **Mejora Go Pro**: Reemplazar `sync.WaitGroup` por `errgroup` para mejor manejo de errores y cancelación de contexto.

### 1.4 Estandarización de Paginación y Límites
Consistencia en todos los endpoints de lista (`/search`, `/trending`, `/bulk`).
- [x] Implementar parámetros estándar:
  - `page`: default 1.
  - `limit`: default 20, max 50.
- [x] Aplicar en handlers de Movies, TV, Games, Albums y Books.
- [x] Ajustar lógica de servicios para respetar el `limit` (recortar slices si es necesario, ya que algunas APIs externas tienen paginación fija).

### 1.5 Versionado de API
Evitar romper clientes futuros.
- [x] Mover rutas de `/proxy/*` a `/proxy/v1/*` en `cmd/api/main.go`.

---

## 🛡️ Fase 2: Seguridad Robusta

Proteger la API contra abusos y accesos no autorizados.

### 2.1 Middleware de Autenticación
- [ ] Implementar verificación de `X-Api-Key` o Bearer Token.
- [ ] Configurable vía variable de entorno `API_KEY`.

### 2.2 Rate Limiting (Redis)
Protección contra DoS y abuso de cuotas.
- [ ] Implementar middleware usando Redis.
- [ ] Límite sugerido: 60 req/min por IP.
- [ ] Fallback a memoria si Redis no está disponible.
- [ ] Headers de respuesta: `X-RateLimit-Limit`, `X-RateLimit-Remaining`.

### 2.3 CORS (Cross-Origin Resource Sharing)
Seguridad para navegadores.
- [ ] Configurar `github.com/gin-contrib/cors`.
- [ ] `AllowOrigins` configurable desde `.env`.
- [ ] Permitir solo métodos y headers necesarios (`GET`, `X-User-Country`, etc.).

---

## 🧩 Fase 3: Calidad y Resiliencia (Go Patterns)

Mejoras en la arquitectura interna.

### 3.1 Manejo de Errores Robusto
- [ ] Crear tipos de error centinela (`ErrProviderAuth`, `ErrRateLimit`, `ErrNotFound`).
- [ ] Mejorar `unmarshalResponse` en servicios para mapear status codes externos a errores internos tipados.
- [ ] Implementar middleware de logging de errores centralizado (no exponer stack traces al usuario).

### 3.2 Documentación
- [ ] Generar Swagger/OpenAPI spec (opcional, pero recomendado para el futuro).

---

## Orden de Ejecución

1.  **Fase 0**: Testing (Asegurar terreno).
2.  **Fase 1**: Refactorización (Limpiar la casa).
3.  **Fase 2**: Seguridad (Poner cerraduras).
4.  **Fase 3**: Calidad (Mejoras internas).
