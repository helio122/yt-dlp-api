const express = require('express');
const { exec } = require('child_process');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Rota de teste
app.get('/', (req, res) => {
  res.json({ 
    message: 'yt-dlp API funcionando!',
    endpoints: {
      download: 'POST /download',
      info: 'POST /info'
    }
  });
});

// Rota para pegar info do vídeo
app.post('/info', (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL é obrigatória' });
  }
  
  const command = `yt-dlp --dump-json "${url}"`;
  
  exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
    if (error) {
      console.error('Erro:', stderr);
      return res.status(500).json({ error: 'Erro ao buscar informações do vídeo' });
    }
    
    try {
      const info = JSON.parse(stdout);
      res.json({
        title: info.title,
        thumbnail: info.thumbnail,
        duration: info.duration,
        uploader: info.uploader
      });
    } catch (e) {
      res.status(500).json({ error: 'Erro ao processar informações' });
    }
  });
});

// Rota principal de download
app.post('/download', (req, res) => {
  const { url, quality = 'best' } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL é obrigatória' });
  }
  
  // Comando yt-dlp para pegar URL direta do vídeo
  const command = `yt-dlp -f ${quality} --get-url "${url}"`;
  
  console.log('Processando:', url);
  
  exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
    if (error) {
      console.error('Erro:', stderr);
      return res.status(500).json({ 
        error: 'Erro ao processar vídeo',
        details: stderr
      });
    }
    
    const downloadUrl = stdout.trim();
    
    res.json({ 
      success: true,
      downloadUrl: downloadUrl,
      message: 'URL de download gerada com sucesso'
    });
  });
});

// Porta do servidor
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📡 Acesse: http://localhost:${PORT}`);
});
