# syntax=docker/dockerfile:1

# Fetch the public repository without relying on the web UI's build context.
FROM scratch AS source
ARG SOURCE_REF=3a8681ec921c8b15348629265fbf03b1a1a68e5c
ADD https://github.com/misato729/world-history-practice.git#${SOURCE_REF} /source/

FROM node:24-alpine AS build

WORKDIR /workspace/frontend

ENV NUXT_TELEMETRY_DISABLED=1

# Install build dependencies from the committed lockfile.
# Run the project's postinstall steps after copying its source.
COPY --from=source /source/frontend/package.json /source/frontend/package-lock.json /source/frontend/.npmrc ./
RUN npm ci --ignore-scripts --no-audit --no-fund

# Preserve the repository's relative directory layout.
COPY --from=source /source/config/ /workspace/config/
COPY --from=source /source/content/ /workspace/content/
COPY --from=source /source/frontend/ ./

# Apply the existing dependency patch and prepare Nuxt.
RUN node scripts/patch-node-forge.mjs \
    && npx nuxt prepare

# Build a standalone Node.js server for Fly.io.
RUN NITRO_PRESET=node-server npm run build

# Retain production dependencies for the operations CLI.
RUN npm prune --omit=dev --ignore-scripts --no-audit --no-fund \
    && node scripts/patch-node-forge.mjs --check

FROM node:24-alpine AS production

WORKDIR /workspace/frontend

ENV NODE_ENV=production \
    APP_ENV=production \
    NITRO_HOST=0.0.0.0 \
    NITRO_PORT=3000

# Built application.
COPY --from=build --chown=node:node /workspace/frontend/.output ./.output

# Files required by db:migrate and the operations CLI.
COPY --from=build --chown=node:node /workspace/frontend/package.json /workspace/frontend/package-lock.json ./
COPY --from=build --chown=node:node /workspace/frontend/node_modules ./node_modules
COPY --from=build --chown=node:node /workspace/frontend/server ./server
COPY --from=build --chown=node:node /workspace/frontend/shared ./shared
COPY --from=build --chown=node:node /workspace/config /workspace/config
COPY --from=build --chown=node:node /workspace/content /workspace/content

USER node

EXPOSE 3000

# fly.toml runs migrations through release_command.
CMD ["node", ".output/server/index.mjs"]