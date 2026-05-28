FROM node:26-alpine

WORKDIR /app

COPY ../../package.json ../../package-lock.json ./
RUN npm ci --production

COPY ../../shared ./shared
COPY services/payment-service ./services/payment-service

WORKDIR /app/services/payment-service

EXPOSE 3005
CMD ["node", "src/server.js"]
