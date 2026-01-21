
const express = require('express');
const cors = require('cors');
const { exec, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

app.use(cors({ 
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());

const TEMP_DIR = path.join(__dirname, 'temp');
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

app.use('/temp', express.static(TEMP_DIR, {
    setHeaders: (res, path) => {
        if (path.endsWith('.mp4')) {
            res.set('Content-Type', 'video/mp4');
            res.set('Access-Control-Allow-Origin', '*');
        }
    }
}));

app.get('/health', (req, res) => {
    res.json({ status: "online", version: "2.7-ULTRA-ROBUST" });
});

const VIRAL_HOOKS = [
    "VOCÊ NÃO VAI ACREDITAR NO QUE ACONTECEU! 😱",
    "O SEGREDO REVELADO PARA VOCÊ 🤫",
    "PARE TUDO E ASSISTA ISSO AGORA! 🔥",
    "ISSO VAI MUDAR SUA FORMA DE PENSAR 🧠",
    "O MOMENTO QUE NINGUÉM ESPERAVA... ⏳",
    "A PURA VERDADE QUE ELES ESCONDEM 📣",
    "ASSISTA ATÉ O FINAL, VALE A PENA! 💎",
    "VOCÊ JÁ SABIA DISSO? COMENTE ABAIXO 🤔",
    "O CONSELHO QUE VALE 1 MILHÃO DE REAIS 🚀",
    "EMOCIONANTE: VEJA A REAÇÃO DELE 🥺"
];

const generateHandler = async (req, res) => {
    const { videoUrl, userId, settings } = req.body;
    
    if (!videoUrl) return res.status(400).json({ error: "URL é necessária" });

    const sessionID = Date.now();
    const inputPath = path.join(TEMP_DIR, `source_${sessionID}.mp4`);
    
    console.log(`[JOB] Iniciando geração V2.7 para ${userId}`);

    try {
        let minDur = 61, maxDur = 90;
        let isRandom = false;
        
        if (settings && settings.durationRange) {
            if (settings.durationRange === '60-180') {
                isRandom = true;
                minDur = 60;
                maxDur = 180;
            } else {
                const parts = settings.durationRange.split('-').map(Number);
                minDur = parts[0];
                maxDur = parts[1];
            }
        }

        console.log("[STEP 1] Download Agressivo Iniciado...");
        
        // Comando Ultra Robusto: 
        // 1. Simula Chrome no Windows
        // 2. Geo-bypass
        // 3. Força formato MP4 compatível
        // 4. Limita resolução para 480p para velocidade e estabilidade
        const downloadCmd = `yt-dlp -f "best[height<=480][ext=mp4]/best[height<=480]" --no-playlist --no-check-certificates --merge-output-format mp4 --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" --referer "https://www.youtube.com/" --geo-bypass "${videoUrl}" -o "${inputPath}"`;

        exec(downloadCmd, (error, stdout, stderr) => {
            if (error) {
                console.error("[DOWNLOAD ERROR]:", stderr);
                return res.status(500).json({ error: "O YouTube bloqueou o acesso deste vídeo ao nosso servidor. Tente outro link ou vídeo." });
            }

            // Verifica se o arquivo realmente existe e tem tamanho
            if (!fs.existsSync(inputPath) || fs.statSync(inputPath).size === 0) {
                return res.status(500).json({ error: "O download falhou em gerar um arquivo válido. Tente um link diferente." });
            }

            try {
                const durationInfo = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`).toString().trim();
                const totalVideoDuration = parseFloat(durationInfo);
                
                if (isNaN(totalVideoDuration)) throw new Error("Duração inválida");

                const clips = [];
                const numberOfClips = 10; 

                for (let i = 0; i < numberOfClips; i++) {
                    let finalDuration = isRandom 
                        ? Math.floor(Math.random() * (maxDur - minDur + 1) + minDur)
                        : Math.floor((minDur + maxDur) / 2);
                    
                    let gap = (totalVideoDuration - finalDuration) / (numberOfClips - 1);
                    if (gap < 0) gap = 0;
                    
                    let startSec = i * gap;
                    if (startSec + finalDuration > totalVideoDuration) {
                        startSec = Math.max(0, totalVideoDuration - finalDuration);
                    }

                    const timestamp = new Date(startSec * 1000).toISOString().substr(11, 8);
                    const clipName = `clip_v27_${sessionID}_${i}.mp4`;
                    const outputPath = path.join(TEMP_DIR, clipName);
                    
                    const hook = VIRAL_HOOKS[i % VIRAL_HOOKS.length];
                    const color = settings?.subtitleStyle?.color || 'yellow';
                    
                    // FILTRO OTIMIZADO: Fonte 18 (pequena e segura) + Centralização Vertical corrigida
                    const complexFilter = `[0:v]crop=ih*9/16:ih,scale=540:960,eq=brightness=0.04:saturation=1.3:contrast=1.1,drawtext=text='${hook}':fontcolor=${color}:fontsize=18:x=(w-text_w)/2:y=(h-text_h)/2:box=1:boxcolor=black@0.5:boxborderw=4[v]`;
                    
                    const cutCmd = `ffmpeg -ss ${timestamp} -i "${inputPath}" -t ${finalDuration} -filter_complex "${complexFilter}" -map "[v]" -map 0:a? -c:v libx264 -preset ultrafast -crf 28 -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 128k -y "${outputPath}"`;
                    
                    console.log(`[RENDER] Processando Clipe ${i+1}/10...`);
                    execSync(cutCmd);
                    
                    clips.push({
                        id: `clip-${sessionID}-${i}`,
                        title: hook,
                        videoUrl: `/temp/${clipName}`,
                        thumbnail: `https://picsum.photos/seed/${sessionID + i}/400/700`,
                        duration: finalDuration.toString(),
                        startTime: startSec,
                        endTime: startSec + finalDuration
                    });
                }

                res.json({ status: "success", clips });

                // Limpeza segura do arquivo fonte após o envio da resposta
                setTimeout(() => { 
                    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); 
                }, 600000);

            } catch (err) {
                console.error("[PROCESSING ERROR]:", err);
                res.status(500).json({ error: "Erro ao processar os cortes. O vídeo pode ter uma estrutura de áudio/vídeo incompatível." });
            }
        });
    } catch (e) {
        console.error("[CRITICAL ERROR]:", e);
        res.status(500).json({ error: "Ocorreu um erro crítico no servidor de processamento." });
    }
};

app.post('/api/generate-real-clips', generateHandler);
app.post('/generate-real-clips', generateHandler);

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] Motor V2.7 Ativo - Pronto para 10 Clipes`);
});
