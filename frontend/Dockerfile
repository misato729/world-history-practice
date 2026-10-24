FROM node:24-alpine AS base
RUN apk add --no-cache postgresql16-client
WORKDIR /workspace/frontend
COPY frontend/package*.json ./
COPY config/ /workspace/config/
COPY content/ /workspace/content/
RUN npm ci --ignore-scripts
COPY frontend/ ./
RUN node scripts/patch-node-forge.mjs && npx nuxt prepare && node scripts/ensure-dependencies.mjs --record
EXPOSE 3000
ENTRYPOINT ["sh", "scripts/container-entrypoint.sh"]

FROM base AS development
CMD ["sh", "-c", "npm run db:migrate && npm run db:seed && npm run dev -- --host 0.0.0.0 --port 3000"]

FROM base AS build
RUN npm run build

FROM base AS production
COPY --from=build /workspace/frontend/.output ./.output
ENV NODE_ENV=production
CMD ["sh", "-c", "npm run db:migrate && node .output/server/index.mjs"]
