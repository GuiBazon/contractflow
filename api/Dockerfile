# Backend ContractFlow - Node.js
FROM node:24-bookworm-slim

# PDF escaneado é convertido em imagem antes do OCR.
RUN apt-get update \
    && apt-get install -y --no-install-recommends poppler-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instala dependencias de producao primeiro (melhor cache)
COPY --chown=node:node package*.json ./
RUN --mount=type=secret,id=environment_ca \
    if [ -s /run/secrets/environment_ca ]; then \
      NODE_EXTRA_CA_CERTS=/run/secrets/environment_ca npm ci --omit=dev; \
    else npm ci --omit=dev; fi

# Copia o codigo-fonte
COPY --chown=node:node src ./src
COPY --chown=node:node scripts ./scripts
COPY --chown=node:node database/migrations ./database/migrations
# Diretorio de uploads (criado em runtime se nao existir)
RUN mkdir -p /app/uploads /app/.cache \
    && chown -R node:node /app/uploads /app/.cache

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

USER node

CMD ["npm", "start"]
