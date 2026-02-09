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
    version: '3.0',
    endpoints: {
      download: 'POST /download - Retorna URL direta',
      info: 'POST /info - Retorna informações básicas',
      formats: 'POST /formats - Retorna TODAS opções de download'
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
        timeout: 60000
      }, (error, stdout, stderr) => {
        if (error) {
          console.error(`[Erro tentativa ${attempts}]:`, stderr);
          
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

// Rota para pegar info básica do vídeo
app.post('/info', async (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL é obrigatória' });
  }
  
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

// NOVO: Rota para pegar TODAS as opções de download
app.post('/formats', async (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL é obrigatória' });
  }
  
  // Comando para pegar JSON completo com todos os formatos
  const command = `yt-dlp -J --no-check-certificates --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" "${url}"`;
  
  try {
    const stdout = await executeYtDlp(command);
    const data = JSON.parse(stdout);
    
    // Processa os formatos disponíveis
    const videoFormats = [];
    const audioFormats = [];
    
    if (data.formats && Array.isArray(data.formats)) {
      data.formats.forEach(format => {
        // Formatos de vídeo (tem vídeo E áudio, ou só vídeo)
        if (format.vcodec && format.vcodec !== 'none') {
          const resolution = format.height ? `${format.height}p` : 'unknown';
          const fps = format.fps || 30;
          const filesize = format.filesize || format.filesize_approx || 0;
          const filesizeMB = filesize ? (filesize / (1024 * 1024)).toFixed(1) : '?';
          
          videoFormats.push({
            format_id: format.format_id,
            quality: resolution,
            fps: fps,
            ext: format.ext || 'mp4',
            filesize: filesizeMB + ' MB',
            filesizeBytes: filesize,
            hasAudio: format.acodec && format.acodec !== 'none',
            note: format.format_note || '',
            url: format.url || null
          });
        }
        
        // Formatos só de áudio
        if (format.acodec && format.acodec !== 'none' && (!format.vcodec || format.vcodec === 'none')) {
          const bitrate = format.abr || format.tbr || 0;
          const filesize = format.filesize || format.filesize_approx || 0;
          const filesizeMB = filesize ? (filesize / (1024 * 1024)).toFixed(1) : '?';
          
          audioFormats.push({
            format_id: format.format_id,
            quality: bitrate ? `${Math.round(bitrate)}kbps` : 'audio',
            ext: format.ext || 'mp3',
            filesize: filesizeMB + ' MB',
            filesizeBytes: filesize,
            note: format.format_note || '',
            url: format.url || null
          });
        }
      });
    }
    
    // Remove duplicatas e ordena por qualidade
    const uniqueVideos = Array.from(new Map(
      videoFormats
        .filter(f => f.quality !== 'unknown')
        .sort((a, b) => {
          const aHeight = parseInt(a.quality);
          const bHeight = parseInt(b.quality);
          return bHeight - aHeight;
        })
        .map(f => [`${f.quality}-${f.ext}`, f])
    ).values());
    
    const uniqueAudio = Array.from(new Map(
      audioFormats
        .sort((a, b) => b.filesizeBytes - a.filesizeBytes)
        .map(f => [f.quality, f])
    ).values());
    
    // Retorna resposta completa
    res.json({
      success: true,
      video: {
        title: data.title || 'Sem título',
        thumbnail: data.thumbnail || null,
        duration: data.duration || 0,
        durationFormatted: formatDuration(data.duration || 0),
        uploader: data.uploader || data.channel || 'Desconhecido',
        views: data.view_count || 0,
        uploadDate: data.upload_date || null,
        description: data.description ? data.description.substring(0, 200) + '...' : ''
      },
      formats: {
        video: uniqueVideos.slice(0, 8), // Top 8 qualidades
        audio: uniqueAudio.slice(0, 4)   // Top 4 áudios
      }
    });
    
  } catch ({ error, stderr }) {
    console.error('Erro ao buscar formatos:', stderr);
    
    let errorMessage = 'Erro ao processar vídeo';
    
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

// Rota de download direto (mantida por compatibilidade)
app.post('/download', async (req, res) => {
  const { url, quality = 'best', format_id = null } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL é obrigatória' });
  }
  
  // Se format_id for fornecido, usa ele; senão usa quality
  const formatOption = format_id ? `-f ${format_id}` : `-f ${quality}`;
  const command = `yt-dlp ${formatOption} --get-url --no-check-certificates --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" "${url}"`;
  
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

// Função auxiliar para formatar duração
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

// Porta do servidor
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📡 Acesse: http://localhost:${PORT}`);
  console.log(`✅ yt-dlp API v3.0 iniciada com sucesso!`);
});
