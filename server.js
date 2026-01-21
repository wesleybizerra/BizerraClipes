
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
    res.json({ status: "online", version: "3.0-FONT-FIX" });
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
    
    console.log(`[JOB] Iniciando Motor V3.0 (Font 20) para ${userId}`);

    try {
        try { execSync('yt-dlp --rm-cache-dir'); } catch(e) {}

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

        console.log("[STEP 1] Download Universal...");
        
        const spoofArgs = [
            '--user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"',
            '--no-check-certificates',
            '--geo-bypass',
            '--format-sort "res:480,ext:mp4:m4a"',
            '--referer "https://www.youtube.com/"'
        ].join(' ');

        const downloadCmd = `yt-dlp -f "bestvideo[height<=480]+bestaudio/best[height<=480]/best" ${spoofArgs} --merge-output-format mp4 "${videoUrl}" -o "${inputPath}"`;

        exec(downloadCmd, (error, stdout, stderr) => {
            if (error) {
                console.error("[DOWNLOAD FAIL]:", stderr);
                return res.status(500).json({ 
                  error: "Bloqueio do YouTube detectado. Reinicie o serviço na Railway ou tente outro vídeo público." 
                });
            }

            if (!fs.existsSync(inputPath) || fs.statSync(inputPath).size < 1000) {
                return res.status(500).json({ error: "Vídeo inválido ou indisponível." });
            }

            try {
                const durationInfo = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`).toString().trim();
                const totalVideoDuration = parseFloat(durationInfo);
                
                if (isNaN(totalVideoDuration) || totalVideoDuration <= 0) {
                    throw new Error("Duração ilegível");
                }

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
                    const clipName = `clip_v30_${sessionID}_${i}.mp4`;
                    const outputPath = path.join(TEMP_DIR, clipName);
                    
                    const hook = VIRAL_HOOKS[i % VIRAL_HOOKS.length];
                    const color = settings?.subtitleStyle?.color || 'yellow';
                    
                    // FILTRO V3.0: Legendas ajustadas para tamanho 20 e centralização otimizada
                    const complexFilter = `[0:v]scale=w='if(gt(a,9/16),-1,540)':h='if(gt(a,9/16),960,-1)',crop=540:960,setsar=1,drawtext=text='${hook}':fontcolor=${color}:fontsize=20:x=(w-text_w)/2:y=(h-text_h)/2:box=1:boxcolor=black@0.7:boxborderw=8[v]`;
                    
                    const cutCmd = `ffmpeg -ss ${timestamp} -i "${inputPath}" -t ${finalDuration} -filter_complex "${complexFilter}" -map "[v]" -map 0:a? -c:v libx264 -preset ultrafast -crf 28 -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 128k -y "${outputPath}"`;
                    
                    console.log(`[RENDER] Processando Clipe ${i+1}/10 (Font: 20)...`);
                    try {
                        execSync(cutCmd, { stdio: 'ignore' });
                    } catch (e) {
                        continue; 
                    }
                    
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

                if (clips.length === 0) throw new Error("Falha total na renderização.");

                res.json({ status: "success", clips });
                setTimeout(() => { if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); }, 300000);

            } catch (err) {
                console.error("[INTERNAL ERROR]:", err);
                res.status(500).json({ error: "Erro ao processar o arquivo de vídeo. Tente outro link." });
            }
        });
    } catch (e) {
        console.error("[FATAL]:", e);
        res.status(500).json({ error: "Erro crítico no motor de vídeo." });
    }
};

app.post('/api/generate-real-clips', generateHandler);
app.post('/generate-real-clips', generateHandler);

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] Motor V3.0 Online - Legendas Otimizadas (Tamanho 20)`);
});
