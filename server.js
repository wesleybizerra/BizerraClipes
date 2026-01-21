
const express = require('express');
const cors = require('cors');
const { exec, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// MOTOR BIZERRA V4.0 - DEFINITIVE ANTI-BLOCK (AUTO-REDEPLOY)
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
const COOKIES_PATH = path.join(__dirname, 'cookies.txt');

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
    const hasCookies = fs.existsSync(COOKIES_PATH);
    res.json({ 
        status: "online", 
        version: "4.0-STABLE",
        antiBlockActive: true,
        usingCookies: hasCookies
    });
});

const VIRAL_HOOKS = [
    "FUTURO MILIONÁRIO: O INÍCIO 🚀",
    "ESTE SEGREDO VAI TE ENRIQUECER 🤫",
    "PARE TUDO E ASSISTA ISSO AGORA! 🔥",
    "O MINDSET DOS CAMPEÕES 🧠",
    "O MOMENTO QUE TUDO MUDOU... ⏳",
    "A PURA VERDADE SOBRE O SUCESSO 📣",
    "ASSISTA ATÉ O FINAL, VALE A PENA! 💎",
    "VOCÊ JÁ SABIA DISSO? COMENTE 🤔",
    "O CONSELHO QUE VALE 1 MILHÃO 🚀",
    "EMOCIONANTE: VEJA A REAÇÃO DELE 🥺"
];

const generateHandler = async (req, res) => {
    const { videoUrl, userId, settings } = req.body;
    
    if (!videoUrl) return res.status(400).json({ error: "URL é necessária" });

    const sessionID = Date.now();
    const inputPath = path.join(TEMP_DIR, `source_${sessionID}.mp4`);
    
    console.log(`[JOB] Iniciando Motor V4.0 para ${userId}`);

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

        // ARGUMENTOS PARA BURLAR BLOQUEIO - MOTOR V4.0
        let spoofArgs = [
            '--no-check-certificates',
            '--geo-bypass',
            '--format-sort "res:480,ext:mp4:m4a"',
            '--user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"',
            '--add-header "Accept:text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"',
            '--add-header "Accept-Language:pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7"'
        ];

        // Se existir um arquivo cookies.txt na raiz, ele será usado automaticamente
        if (fs.existsSync(COOKIES_PATH)) {
            console.log("[ANTI-BLOCK] Usando cookies de autenticação...");
            spoofArgs.push(`--cookies "${COOKIES_PATH}"`);
        }

        const fullArgs = spoofArgs.join(' ');
        const downloadCmd = `yt-dlp -f "bestvideo[height<=480]+bestaudio/best[height<=480]/best" ${fullArgs} --merge-output-format mp4 "${videoUrl}" -o "${inputPath}"`;

        exec(downloadCmd, (error, stdout, stderr) => {
            if (error) {
                console.error("[DOWNLOAD FAIL]:", stderr);
                return res.status(500).json({ 
                  error: "O YouTube bloqueou o servidor. Para corrigir: 1. Instale a extensão 'Get cookies.txt LOCALLY' no Chrome. 2. Vá ao YouTube. 3. Clique na extensão e baixe o arquivo. 4. Renomeie para cookies.txt e envie para a raiz do seu projeto." 
                });
            }

            try {
                const durationInfo = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`).toString().trim();
                const totalVideoDuration = parseFloat(durationInfo);
                
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
                    const clipName = `clip_v40_${sessionID}_${i}.mp4`;
                    const outputPath = path.join(TEMP_DIR, clipName);
                    
                    const hook = VIRAL_HOOKS[i % VIRAL_HOOKS.length];
                    const color = settings?.subtitleStyle?.color || 'yellow';
                    
                    const complexFilter = `[0:v]scale=w='if(gt(a,9/16),-1,540)':h='if(gt(a,9/16),960,-1)',crop=540:960,setsar=1,drawtext=text='${hook}':fontcolor=${color}:fontsize=13:x=(w-text_w)/2:y=(h-text_h)/2:box=1:boxcolor=black@0.7:boxborderw=4:borderw=1:bordercolor=black[v]`;
                    
                    const cutCmd = `ffmpeg -ss ${timestamp} -i "${inputPath}" -t ${finalDuration} -filter_complex "${complexFilter}" -map "[v]" -map 0:a? -c:v libx264 -preset ultrafast -crf 28 -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 128k -y "${outputPath}"`;
                    
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

                res.json({ status: "success", clips });
                setTimeout(() => { if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); }, 300000);

            } catch (err) {
                res.status(500).json({ error: "Erro de processamento dos cortes." });
            }
        });
    } catch (e) {
        res.status(500).json({ error: "Falha crítica no motor V4.0." });
    }
};

app.post('/api/generate-real-clips', generateHandler);
app.post('/generate-real-clips', generateHandler);

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] Motor V4.0 ON - Sistema de Cookies Ativo`);
});
