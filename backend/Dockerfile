# ============================================================
# Stage 1: Generate — produce sqlc code from SQL sources
# ============================================================
FROM sqlc/sqlc:1.27.0 AS sqlc

# ============================================================
# Stage 2: Source — resolve modules with all source code
# ============================================================
FROM golang:1.22-alpine AS source
WORKDIR /app
COPY . .
COPY --from=sqlc /workspace/sqlc /usr/local/bin/sqlc
RUN sqlc generate
RUN go mod tidy && go mod download

# ============================================================
# Stage 2: Test — run the full test suite
# Tests must pass before the build stage can proceed.
# ============================================================
FROM source AS test
RUN CGO_ENABLED=0 go test ./...

# ============================================================
# Stage 3: Build — compile the production binary
# Copies a marker file from the test stage to enforce that
# tests passed before the binary is produced.
# ============================================================
FROM source AS build
COPY --from=test /app/go.mod /tmp/.tests-passed
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o server ./cmd/server

# ============================================================
# Stage 4: Runtime — minimal distroless production image
# Contains only the compiled binary and migration SQL files.
# ============================================================
FROM gcr.io/distroless/static-debian12
LABEL org.opencontainers.image.source="https://github.com/alphanumeric-hue/adjusted-net-income-calculator"
LABEL org.opencontainers.image.description="UK Adjusted Net Income Calculator — API"
LABEL org.opencontainers.image.licenses="MIT"
COPY --from=build /app/server /server
COPY --from=build /app/internal/database/migrations /migrations
ENTRYPOINT ["/server"]
