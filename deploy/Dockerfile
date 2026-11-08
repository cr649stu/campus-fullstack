# 生产镜像：先构建前端，再只保留运行所需文件
FROM node:24-bookworm-slim AS build

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY server/package.json server/
COPY web/package.json web/
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM node:24-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8787

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY server/package.json server/
COPY web/package.json web/
RUN pnpm install --prod --frozen-lockfile

COPY --from=build /app/server/src server/src
COPY --from=build /app/server/public server/public
COPY --from=build /app/web/dist web/dist

EXPOSE 8787
VOLUME ["/app/server/data"]

CMD ["node", "server/src/index.js"]
