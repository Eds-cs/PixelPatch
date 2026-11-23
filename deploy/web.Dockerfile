# deploy/web.Dockerfile — builds the website and serves it with Caddy.
# Caddy also gets the HTTPS certificate and forwards /api, /socket.io and
# /uploads to the API container (see deploy/Caddyfile).

# 1. Build the static website (Expo export).
# Node 24 ships npm 11, which matches the lockfile (npm 10 rejects it).
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# EXPO_PUBLIC_* values are compiled into the website, so they are passed in at
# build time. Never put secrets here: anyone can read them in the browser.
ARG EXPO_PUBLIC_API_URL
ARG EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=""
ARG EXPO_PUBLIC_GOOGLE_MAPS_EMBED_KEY=""
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL \
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=$EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID \
    EXPO_PUBLIC_GOOGLE_MAPS_EMBED_KEY=$EXPO_PUBLIC_GOOGLE_MAPS_EMBED_KEY
RUN npx expo export --platform web --output-dir dist

# 2. Serve it.
FROM caddy:2-alpine
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
