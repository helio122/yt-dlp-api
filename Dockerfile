# Use Node.js 18 com Python incluído
FROM node:18-bullseye

# Instala Python, pip e FFmpeg
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Instala yt-dlp globalmente
RUN pip3 install --no-cache-dir yt-dlp

# Cria diretório de trabalho
WORKDIR /app

# Copia package.json e instala dependências Node
COPY package*.json ./
RUN npm install

# Copia o resto dos arquivos
COPY . .

# Expõe a porta
EXPOSE 3000

# Comando para iniciar
CMD ["node", "server.js"]
