# syntax=docker/dockerfile:1

# Docker Compose and CI build this target from the local checkout.
FROM node:24-alpine AS development
RUN apk add --no-cache postgresql16-client
WORKDIR /workspace/frontend
ENV NUXT_TELEMETRY_DISABLED=1

COPY frontend/package.json frontend/package-lock.json frontend/.npmrc ./
RUN npm ci --ignore-scripts --no-audit --no-fund

COPY config/ /workspace/config/
COPY content/ /workspace/content/
COPY frontend/ ./

RUN node scripts/patch-node-forge.mjs \
    && npx nuxt prepare \
    && node scripts/ensure-dependencies.mjs --record

EXPOSE 3000
ENTRYPOINT ["sh", "scripts/container-entrypoint.sh"]
CMD ["sh", "-c", "npm run db:migrate && exec npm run dev -- --host 0.0.0.0 --port 3000"]

# Fetch the public repository independently of the web UI's build context.
# Update SOURCE_REF when deploying a newer application commit.
FROM scratch AS source
ARG SOURCE_REF=bf0cc34fd2dce2c8149975e28035e8a9b68d3a7b
ADD https://github.com/misato729/japanese-history-practice.git#${SOURCE_REF} /source/

FROM node:24-alpine AS build
WORKDIR /workspace/frontend
ENV NUXT_TELEMETRY_DISABLED=1

COPY --from=source /source/frontend/package.json /source/frontend/package-lock.json /source/frontend/.npmrc ./
RUN npm ci --ignore-scripts --no-audit --no-fund

COPY --from=source /source/config/ /workspace/config/
COPY --from=source /source/content/ /workspace/content/
COPY --from=source /source/frontend/ ./

RUN node scripts/patch-node-forge.mjs && npx nuxt prepare
RUN NITRO_PRESET=node-server npm run build
RUN npm prune --omit=dev --ignore-scripts --no-audit --no-fund \
    && node scripts/patch-node-forge.mjs --check

FROM node:24-alpine AS production
# Retain the PostgreSQL tools used by the existing restore-drill operation.
RUN apk add --no-cache postgresql16-client
WORKDIR /workspace/frontend

ENV NODE_ENV=production \
    APP_ENV=production \
    NITRO_HOST=0.0.0.0 \
    NITRO_PORT=3000

COPY --from=build --chown=node:node /workspace/frontend/.output ./.output
COPY --from=build --chown=node:node /workspace/frontend/package.json /workspace/frontend/package-lock.json ./
COPY --from=build --chown=node:node /workspace/frontend/node_modules ./node_modules
COPY --from=build --chown=node:node /workspace/frontend/server ./server
COPY --from=build --chown=node:node /workspace/frontend/shared ./shared
COPY --from=build --chown=node:node /workspace/config /workspace/config
COPY --from=build --chown=node:node /workspace/content /workspace/content

USER node
EXPOSE 3000

# Run migrations once per deployment via fly.toml's release_command.
CMD ["node", ".output/server/index.mjs"]