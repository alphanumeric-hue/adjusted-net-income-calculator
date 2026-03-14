# ============================================================
# Stage 1: Source — install npm packages with all source code
# ============================================================
FROM node:20-alpine AS source
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .

# ============================================================
# Stage 2: Test — run the full test suite
# Tests must pass before the build stage can proceed.
# ============================================================
FROM source AS test
RUN npm test

# ============================================================
# Stage 3: Build — compile the production bundle
# Copies a marker file from the test stage to enforce that
# tests passed before the bundle is produced.
# ============================================================
FROM source AS build
COPY --from=test /app/package.json /tmp/.tests-passed
RUN npm run build

# ============================================================
# Stage 4: Runtime — minimal nginx production image
# Contains only the compiled static assets and nginx config.
# ============================================================
FROM nginx:alpine
LABEL org.opencontainers.image.source="https://github.com/alphanumeric-hue/adjusted-net-income-calculator"
LABEL org.opencontainers.image.description="UK Adjusted Net Income Calculator — Frontend"
LABEL org.opencontainers.image.licenses="MIT"
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
