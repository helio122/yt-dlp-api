# 🎥 yt-dlp API Backend

Backend para download de vídeos do YouTube e Instagram usando yt-dlp.

## 🚀 Deploy no Railway

### Passo 1: Criar projeto no Railway
1. Acesse https://railway.app
2. Faça login com GitHub
3. Clique em "New Project"
4. Selecione "Deploy from GitHub repo"

### Passo 2: Upload dos arquivos
1. Crie um repositório no GitHub
2. Faça upload de todos esses arquivos
3. Conecte o repositório no Railway

### Passo 3: Configuração
Railway vai detectar automaticamente e instalar:
- Node.js
- Python
- yt-dlp
- FFmpeg

### Passo 4: Variáveis de ambiente (opcional)
Não precisa configurar nada! Mas se quiser:
- `PORT` - Railway define automaticamente
- `NODE_ENV` - pode deixar como "production"

## 📡 Endpoints da API

### GET /
Testa se API está funcionando
```
Response: { "message": "yt-dlp API funcionando!" }
```

### POST /info
Pega informações do vídeo
```json
{
  "url": "https://www.youtube.com/watch?v=..."
}
```

### POST /download
Gera URL de download
```json
{
  "url": "https://www.youtube.com/watch?v=...",
  "quality": "best"
}
```

Response:
```json
{
  "success": true,
  "downloadUrl": "https://...",
  "message": "URL de download gerada com sucesso"
}
```

## 🔗 Depois do Deploy

Quando o Railway terminar o deploy, você vai receber uma URL tipo:
```
https://seu-projeto.up.railway.app
```

Use essa URL no seu frontend do Lovable!

## 🛠️ Testando localmente

```bash
npm install
npm start
```

Acesse: http://localhost:3000

## 📝 Notas

- Suporta YouTube, Instagram, TikTok, Twitter e +1000 sites
- yt-dlp é atualizado automaticamente
- FFmpeg incluído para conversão de vídeo
- CORS habilitado para qualquer origem

## 🎨 Feito por
**Node Wave Digital Agency**
