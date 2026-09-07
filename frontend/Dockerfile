# Build context MUST be the repo root (docker-compose.yml sets this) — see
# backend/Dockerfile for why (same file:../schema dependency).
FROM node:20-alpine AS build
WORKDIR /repo
# See backend/Dockerfile for why (TLS-intercepting proxy/AV on the host +
# Docker Desktop's network relay, and why this isn't a bracket-glob COPY)
# — same opt-in, no-op-by-default fix.
RUN mkdir -p /extra-ca && touch /extra-ca/extra-ca.crt
COPY docker/ /extra-ca-src/
RUN if [ -f /extra-ca-src/extra-ca.crt ]; then cp /extra-ca-src/extra-ca.crt /extra-ca/extra-ca.crt; fi
ENV NODE_EXTRA_CA_CERTS=/extra-ca/extra-ca.crt
COPY schema ./schema
COPY frontend ./frontend
RUN for i in 1 2 3; do \
      rm -rf schema/node_modules; \
      npm --prefix schema install --no-audit --no-fund && test -f schema/node_modules/.bin/tsc && break; \
      echo "schema npm install attempt $i failed, retrying..."; sleep 5; \
    done && npm --prefix schema run build
RUN for i in 1 2 3; do \
      rm -rf frontend/node_modules; \
      npm --prefix frontend install --no-audit --no-fund && test -d frontend/node_modules/vite && break; \
      echo "frontend npm install attempt $i failed, retrying..."; sleep 5; \
    done

# Vite inlines VITE_* env vars at BUILD time, not at container start — the
# value baked in here is what the browser (running on the host, outside
# the Docker network) needs to reach the backend, i.e. its host-published
# port, not a Docker-internal service name like "http://backend:3000".
ARG VITE_BACKEND_URL=http://localhost:3000
WORKDIR /repo/frontend
RUN printf 'VITE_BACKEND_URL=%s\n' "$VITE_BACKEND_URL" > .env
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /repo/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
