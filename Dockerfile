# ---- Build ----
FROM node:24-alpine AS build
RUN corepack enable
WORKDIR /src
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.base.json ./
COPY packages/core/package.json packages/core/
COPY packages/client/package.json packages/client/
COPY packages/server/package.json packages/server/
RUN pnpm install --frozen-lockfile
COPY packages ./packages
RUN pnpm build
# Dependencias de producción del servidor (incluye @draycol/core compilado)
RUN pnpm --filter @draycol/server deploy --prod --legacy /out/server

# ---- Runtime ----
FROM node:24-alpine
ENV NODE_ENV=production \
    PORT=3000 \
    DB_PATH=/data/scores.db \
    STATIC_DIR=/app/client
WORKDIR /app
COPY --from=build /out/server /app/server
COPY --from=build /src/packages/client/dist /app/client
RUN mkdir -p /data && chown -R node:node /data /app
USER node
VOLUME ["/data"]
EXPOSE 3000
CMD ["node", "--no-warnings=ExperimentalWarning", "server/dist/index.js"]
