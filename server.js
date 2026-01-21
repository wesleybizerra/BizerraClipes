const express = require('express');
const cors = require('cors');
const { exec, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { GoogleGenAI } = require('@google/genai');

const app = express();

// Logar todas as requisições para debug no Railway
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

app.use(cors({ origin: '*' }));
app.use(express.json());

const TEMP_DIR = path.join(__dirname, 'temp');
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

app.use('/temp', express.static(TEMP_DIR));

// Rota de Saúde
app.get('/health', (req, res) => {
    res.json({ status: "online", time: new Date().toISOString() });
});

// Rota principal (tentamos com e sem /api/)
const generateHandler = async (req, res) => {
    const { videoUrl, userId, settings } = req.body;
    
    console.log(`[GERAÇÃO] Iniciando para vídeo: ${videoUrl}`);

    if (!videoUrl) return res.status(400).json({ error: "URL é necessária" });

    const sessionID = Date.now();
    const inputPath = path.join(TEMP_DIR, `source_${sessionID}.mp4`);
    
    try {
        let clipDuration = 70; 
        if (settings && settings.durationRange) {
            const [min, max] = settings.durationRange.split('-').map(Number);
            clipDuration = Math.floor((min + max) / 2);
        }

        const ytDlpBaseCmd = `yt-dlp --no-check-certificates --no-playlist --user-agent "Mozilla/5.0"`;

        // Verifica se o vídeo existe e pega duração
        exec(`${ytDlpBaseCmd} --get-duration "${videoUrl}"`, (infoErr) => {
            if (infoErr) {
                console.error("[ERRO YT-DLP]:", infoErr);
                return res.status(500).json({ error: "Vídeo indisponível ou link inválido." });
            }

            const downloadCmd = `${ytDlpBaseCmd} -f "bestvideo[height<=480]+bestaudio/best[height<=480]" --merge-output-format mp4 "${videoUrl}" -o "${inputPath}"`;

            exec(downloadCmd, (error) => {
                if (error) {
                    console.error("[ERRO DOWNLOAD]:", error);
                    return res.status(500).json({ error: "Falha ao baixar o vídeo." });
                }

                try {
                    const clips = [];
                    const numberOfClips = 20;

                    for (let i = 0; i < numberOfClips; i++) {
                        const startSec = i * 20; // 20 segundos de intervalo
                        const timestamp = new Date(startSec * 1000).toISOString().substr(11, 8);
                        const clipName = `clip_${sessionID}_${i}.mp4`;
                        const outputPath = path.join(TEMP_DIR, clipName);
                        
                        const cutCmd = `ffmpeg -ss ${timestamp} -i "${inputPath}" -t ${clipDuration} -c copy -y "${outputPath}"`;
                        execSync(cutCmd);
                        
                        clips.push({
                            id: `clip-${sessionID}-${i}`,
                            title: `Corte Viral #${i + 1}`,
                            videoUrl: `/temp/${clipName}`,
                            thumbnail: `https://picsum.photos/seed/${sessionID + i}/400/700`,
                            duration: clipDuration.toString(),
                            startTime: startSec,
                            endTime: startSec + clipDuration
                        });
                    }

                    res.json({ status: "success", clips });

                    // Limpeza em 10 minutos
                    setTimeout(() => { 
                      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); 
                    }, 600000);

                } catch (err) {
                    console.error("[ERRO FFMPEG]:", err);
                    res.status(500).json({ error: "Erro no processamento do clipe." });
                }
            });
        });
    } catch (e) {
        res.status(500).json({ error: "Erro inesperado no servidor." });
    }
};

app.post('/api/generate-real-clips', generateHandler);
app.post('/generate-real-clips', generateHandler); // Rota alternativa sem /api/

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] Rodando na porta ${PORT}`);
});
