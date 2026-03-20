FROM node:18-alpine

WORKDIR /app

COPY ../../package.json ../../package-lock.json ./
RUN npm ci --production

COPY ../../shared ./shared
COPY services/inventory-service ./services/inventory-service

WORKDIR /app/services/inventory-service

EXPOSE 3002
CMD ["node", "src/server.js"]
