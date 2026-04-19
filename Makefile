.PHONY: gen-spec build run test test-integration

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

# test-integration runs tests guarded by `//go:build integration`.
# Use this for any test that hits a real upstream provider or Redis instance.
# CI defaults to `make test` (unit only); run `make test-integration` manually
# when you want to exercise the integration-tagged suite.
test-integration:
	go test -tags=integration -count=1 ./...
