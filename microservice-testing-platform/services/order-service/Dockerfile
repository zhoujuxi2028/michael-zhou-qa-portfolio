FROM node:26-alpine

WORKDIR /app

COPY ../../package.json ../../package-lock.json ./
RUN npm ci --production

COPY ../../shared ./shared
COPY services/order-service ./services/order-service

WORKDIR /app/services/order-service

EXPOSE 3003
CMD ["node", "src/server.js"]
