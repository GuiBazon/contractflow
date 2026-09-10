# Backend ContractFlow - Node.js
FROM node:20-alpine

WORKDIR /app

# Instala dependencias de producao primeiro (melhor cache)
COPY package*.json ./
RUN npm ci --omit=dev

# Copia o codigo-fonte
COPY src ./src
# Diretorio de uploads (criado em runtime se nao existir)
RUN mkdir -p /app/uploads

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "src/server.js"]
