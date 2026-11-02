# syntax=docker/dockerfile:1

# stage 1: Install dependencies
FROM dhi.io/node:24-alpine3.22-dev AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./

# save npm cache inside root/.npm/ between builds to speed up installation of dependencies
RUN --mount=type=cache,target=/root/.npm \ 
      npm ci --no-audit --no-fund 

#stage 2: Build the application
FROM dhi.io/node:24-alpine3.22-dev AS builder

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules

COPY . .

ENV NODE_ENV=production

RUN npm run build

#stage 3: Run the application
FROM dhi.io/node:24-alpine3.22-dev AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder --chown=node:node /app/public ./public

RUN mkdir .next
RUN chown node:node .next

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node

EXPOSE 3000

CMD ["node", "server.js"]