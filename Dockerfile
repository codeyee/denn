# ── Stage 1: Build ────────────────────────────────────────────
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Cache dependencies (layer invalidated only when go.mod/go.sum change)
COPY go.mod go.sum ./
RUN go mod download && go mod verify

# Copy source and build static binaries
COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-s -w" \
    -o /denn-proxy \
    ./cmd/api

RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-s -w" \
    -o /healthcheck \
    ./cmd/healthcheck

# ── Stage 2: Runtime ─────────────────────────────────────────
FROM gcr.io/distroless/static-debian12

# OCI metadata labels
LABEL org.opencontainers.image.title="denn-proxy" \
      org.opencontainers.image.description="REST API proxy aggregating TMDB, IGDB, Spotify, and OpenLibrary" \
      org.opencontainers.image.source="https://github.com/codeyee/denn-proxy"

COPY --from=builder /denn-proxy /denn-proxy
COPY --from=builder /healthcheck /healthcheck

EXPOSE 8080

USER nonroot:nonroot

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD ["/healthcheck"]

ENTRYPOINT ["/denn-proxy"]
