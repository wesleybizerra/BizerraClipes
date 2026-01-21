const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();

// Configuração de CORS: Permite que seu frontend fale com este backend
app.use(cors());
app.use(express.json());

// Configuração da pasta temporária
const TEMP_DIR = path.join(__dirname, 'temp');
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Rota inicial (Health Check)
app.get('/', (req, res) => {
    res.send('🚀 Bizerra Clipes Backend - Sistema Docker Operacional!');
});

// Rota de processamento de vídeos do YouTube
app.post('/api/generate-real-clips', async (req, res) => {
    const { videoUrl, userId } = req.body;
    
    if (!videoUrl) {
        return res.status(400).json({ error: "URL do vídeo é obrigatória" });
    }

    const videoId = Date.now();
    const inputPath = path.join(TEMP_DIR, `input_${videoId}.mp4`);
    
    console.log(`[DOCKER-PROC] Iniciando download para ${userId}: ${videoUrl}`);

    // No Docker, o yt-dlp já está no PATH do sistema.
    // Limitamos a 720p para evitar que o Render mate o processo por falta de memória (plano free).
    const downloadCmd = `yt-dlp -f "bestvideo[height<=720]+bestaudio/best[height<=720]" --merge-output-format mp4 --no-check-certificates "${videoUrl}" -o "${inputPath}"`;

    exec(downloadCmd, (error, stdout, stderr) => {
        if (error) {
            console.error("[ERRO YT-DLP]:", stderr);
            return res.status(500).json({ 
                error: "Erro no download do vídeo. Verifique o link.",
                details: stderr 
            });
        }

        console.log(`[SUCESSO] Vídeo baixado no container: ${inputPath}`);
        
        res.json({ 
            status: "success",
            message: "Vídeo baixado com sucesso no servidor Docker!",
            videoId: videoId
        });

        // Limpeza após 30 minutos
        setTimeout(() => {
            if (fs.existsSync(inputPath)) {
                fs.unlinkSync(inputPath);
                console.log(`[LIMPEZA] Arquivo removido para poupar espaço: ${inputPath}`);
            }
        }, 1800000);
    });
});

// Porta padrão do Render ou 10000
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n============================================`);
    console.log(`   BACKEND DOCKER PRONTO PARA PRODUÇÃO`);
    console.log(`   Escutando em: http://0.0.0.0:${PORT}`);
    console.log(`============================================\n`);
});