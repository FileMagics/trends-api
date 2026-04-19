FROM ghcr.io/puppeteer/puppeteer:latest

USER root
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Render defaults to port 10000
EXPOSE 10000
CMD ["node", "index.js"]
