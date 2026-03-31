FROM node:22-slim

# Enable corepack (ships with Node.js) to get pnpm
RUN corepack enable

WORKDIR /app

# Copy entire repo
COPY . .

# Install deps — no frozen-lockfile because the lockfile was originally
# generated on Replit (Linux x64) and may not match this build environment exactly.
# The preinstall script (which guards against non-pnpm installs) runs fine on Linux.
RUN pnpm install --no-frozen-lockfile

# 1. Build the React frontend → artifacts/khata-app/dist/public
RUN pnpm --filter @workspace/khata-app run build

# 2. Bundle the Express server → artifacts/api-server/dist/index.mjs
RUN pnpm --filter @workspace/api-server run build

EXPOSE 8080

ENV PORT=8080
ENV NODE_ENV=production

CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
