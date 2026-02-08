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
    version: '2.0',
    endpoints: {
      download: 'POST /download',
      info: 'POST /info'
    }
  });
});

// Função auxiliar para executar yt-dlp com retry
function executeYtDlp(command, maxRetries = 2) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    function attempt() {
      attempts++;
      console.log(`[Tentativa ${attempts}] Executando: ${command}`);
      
      exec(command, { 
        maxBuffer: 1024 * 1024 * 10,
        timeout: 60000 // 60 segundos
      }, (error, stdout, stderr) => {
        if (error) {
          console.error(`[Erro tentativa ${attempts}]:`, stderr);
          
          // Se não foi a última tentativa, tenta novamente
          if (attempts < maxRetries) {
            console.log(`Tentando novamente em 2 segundos...`);
            setTimeout(attempt, 2000);
          } else {
            reject({ error, stderr });
          }
        } else {
          console.log('[Sucesso]:', stdout.substring(0, 100));
          resolve(stdout);
        }
      });
    }
    
    attempt();
  });
}

// Rota para pegar info do vídeo
app.post('/info', async (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL é obrigatória' });
  }
  
  // Comando yt-dlp com opções para evitar bloqueio
  const command = `yt-dlp --dump-json --no-check-certificates --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" "${url}"`;
  
  try {
    const stdout = await executeYtDlp(command);
    const info = JSON.parse(stdout);
    
    res.json({
      title: info.title || 'Sem título',
      thumbnail: info.thumbnail || null,
      duration: info.duration || 0,
      uploader: info.uploader || info.channel || 'Desconhecido'
    });
  } catch ({ error, stderr }) {
    console.error('Erro ao buscar informações:', stderr);
    
    // Mensagens de erro mais amigáveis
    let errorMessage = 'Erro ao buscar informações do vídeo';
    
    if (stderr.includes('Sign in') || stderr.includes('cookies')) {
      errorMessage = 'Este vídeo requer autenticação. Tente com outro link.';
    } else if (stderr.includes('Video unavailable')) {
      errorMessage = 'Vídeo indisponível ou privado.';
    } else if (stderr.includes('Unsupported URL')) {
      errorMessage = 'URL não suportada. Verifique o link.';
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: stderr.substring(0, 200)
    });
  }
});

// Rota principal de download
app.post('/download', async (req, res) => {
  const { url, quality = 'best' } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL é obrigatória' });
  }
  
  // Comando yt-dlp com opções para evitar bloqueio e pegar URL direta
  const command = `yt-dlp -f ${quality} --get-url --no-check-certificates --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" "${url}"`;
  
  try {
    const stdout = await executeYtDlp(command);
    const downloadUrl = stdout.trim();
    
    res.json({ 
      success: true,
      downloadUrl: downloadUrl,
      message: 'URL de download gerada com sucesso'
    });
  } catch ({ error, stderr }) {
    console.error('Erro ao gerar download:', stderr);
    
    // Mensagens de erro mais amigáveis
    let errorMessage = 'Erro ao processar vídeo';
    
    if (stderr.includes('Sign in') || stderr.includes('cookies')) {
      errorMessage = 'Este vídeo requer autenticação. Tente com outro link.';
    } else if (stderr.includes('Video unavailable')) {
      errorMessage = 'Vídeo indisponível ou privado.';
    } else if (stderr.includes('Unsupported URL')) {
      errorMessage = 'URL não suportada. Verifique o link.';
    } else if (stderr.includes('timeout')) {
      errorMessage = 'Timeout ao processar. Tente novamente.';
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: stderr.substring(0, 200)
    });
  }
});

// Porta do servidor
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📡 Acesse: http://localhost:${PORT}`);
  console.log(`✅ yt-dlp API v2.0 iniciada com sucesso!`);
});
