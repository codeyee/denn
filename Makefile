.PHONY: gen-spec build run test

gen-spec:
	swag init \
		--generalInfo cmd/api/main.go \
		--dir ./ \
		--output docs/ \
		--outputTypes yaml \
		--parseInternal
	mv docs/swagger.yaml docs/openapi.yaml
	@echo "✓ docs/openapi.yaml updated"

build:
	go build -o denn-proxy ./cmd/api

run:
	go run ./cmd/api

test:
	go test ./...
