# server/Dockerfile — the PixelPatch API (Express + Socket.IO).
# Built and started by deploy/docker-compose.yml.
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

# Uploaded photos live here; docker-compose mounts a volume so they survive
# rebuilds and restarts.
RUN mkdir -p uploads/requests && chown -R node:node /app/uploads
USER node

EXPOSE 5000
CMD ["node", "server.js"]
