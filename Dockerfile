# Use Node.js 20 com Debian mais recente
FROM node:20-bookworm

# Instala Python 3.11, pip e FFmpeg
RUN apt-get update && apt-get install -y \
    python3.11 \
    python3-pip \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Cria link simbólico para python3.11 como python3
RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1

# IMPORTANTE: Instala pip e yt-dlp usando --break-system-packages
# Isso resolve o erro "externally-managed-environment"
RUN pip3 install --upgrade pip --break-system-packages

# Instala yt-dlp com todas as dependências
RUN pip3 install --no-cache-dir --break-system-packages yt-dlp

# Cria diretório de trabalho
WORKDIR /app

# Copia package.json e instala dependências Node
COPY package*.json ./
RUN npm install --production

# Copia o resto dos arquivos
COPY . .

# Expõe a porta
EXPOSE 3000

# Variáveis de ambiente para yt-dlp
ENV PYTHONUNBUFFERED=1

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

# Comando para iniciar
CMD ["node", "server.js"]
