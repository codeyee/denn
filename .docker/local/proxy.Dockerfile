FROM golang:1.27-alpine@sha256:b8c9b82affbbb82a020bbcf998dad2ba9516944ac7e883524642a481a9505e9c

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download && go mod verify

CMD ["go", "run", "./cmd/api"]
