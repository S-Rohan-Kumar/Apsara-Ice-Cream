FROM node:20-alpine

# Install local Redis server inside the container
RUN apk add --no-cache redis

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 8000

ENV NODE_ENV=production
ENV PORT=8000
ENV REDIS_HOST=127.0.0.1
ENV REDIS_PORT=6379

# Launch local Redis daemon, then start Node backend
CMD ["sh", "-c", "redis-server --daemonize yes && node src/index.js"]
