FROM node:20-alpine

WORKDIR /app

ENV PORT=3000

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000

CMD npx next start -H 0.0.0.0
