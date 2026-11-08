FROM node:26
WORKDIR /app
COPY package.json package-lock.json ./
RUN unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy ALL_PROXY all_proxy \
  && npm ci \
  && node -e "require.resolve('express'); require.resolve('better-sqlite3')"
COPY src/ ./src/
COPY docs/ ./docs/
EXPOSE 3000
CMD ["node", "src/server.js"]
