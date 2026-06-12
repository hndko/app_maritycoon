FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY backend/package.json backend/package.json
RUN npm install

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY package.json ./
COPY backend ./backend
WORKDIR /app/backend
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/package.json ./backend/package.json
COPY --from=builder /app/backend/database ./backend/database
COPY --from=builder /app/backend/scripts ./backend/scripts
COPY --from=builder /app/backend/src ./backend/src
COPY --from=builder /app/backend/dist ./backend/dist
WORKDIR /app/backend
EXPOSE 4000
CMD ["npm", "run", "start"]
