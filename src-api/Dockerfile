FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
RUN mkdir -p /app/data
ENV NODE_ENV=production PORT=3000 DATABASE_PATH=/app/data/gamers-unite.sqlite
EXPOSE 3000
CMD ["node", "server.js"]
