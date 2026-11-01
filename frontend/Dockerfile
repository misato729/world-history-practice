FROM node:24-alpine AS base
RUN apk add --no-cache openssl postgresql16-client git
WORKDIR /workspace/frontend
ENV NODE_OPTIONS=--max-old-space-size=768 \
    RAYON_NUM_THREADS=2 UV_THREADPOOL_SIZE=2 GOMAXPROCS=2
COPY frontend/package*.json ./
COPY config/ /workspace/config/
COPY content/ /workspace/content/
COPY scripts/ /workspace/scripts/
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY frontend/ ./
RUN node scripts/patch-node-forge.mjs && npx nuxt prepare && node scripts/ensure-dependencies.mjs --record
EXPOSE 3000
ENTRYPOINT ["sh", "scripts/container-entrypoint.sh"]

FROM base AS development
# Question data is migrated explicitly from the preserved source database.
CMD ["sh", "-c", "npm run db:migrate && npm run dev -- --host 0.0.0.0 --port 3000"]

FROM base AS build
ENV NITRO_PRESET=node-server
RUN npm run build

FROM base AS production-dependencies
RUN npm prune --omit=dev --ignore-scripts --no-audit --no-fund \
    && node scripts/ensure-dependencies.mjs --record \
    && node scripts/patch-node-forge.mjs --check

FROM node:24-alpine AS production
RUN apk add --no-cache openssl postgresql16-client
WORKDIR /workspace/frontend
COPY --from=production-dependencies /workspace/frontend/package*.json ./
COPY --from=production-dependencies /workspace/frontend/node_modules ./node_modules
COPY --from=production-dependencies /workspace/frontend/server ./server
COPY --from=production-dependencies /workspace/frontend/shared ./shared
COPY --from=production-dependencies /workspace/config /workspace/config
COPY --from=production-dependencies /workspace/content /workspace/content
COPY --from=production-dependencies /workspace/frontend/scripts/container-entrypoint.sh ./scripts/
COPY --from=production-dependencies /workspace/frontend/scripts/ensure-dependencies.mjs ./scripts/
COPY --from=production-dependencies /workspace/frontend/scripts/patch-node-forge.mjs ./scripts/
COPY --from=production-dependencies /workspace/frontend/patches ./patches
COPY --from=build /workspace/frontend/.output ./.output
ENV NODE_ENV=production APP_ENV=production NITRO_HOST=0.0.0.0 NITRO_PORT=3000 NODE_OPTIONS=--max-old-space-size=512
EXPOSE 3000
USER node
ENTRYPOINT ["sh", "scripts/container-entrypoint.sh"]
# Fly's release command applies migrations before replacing the running machine.
CMD ["node", ".output/server/index.mjs"]
