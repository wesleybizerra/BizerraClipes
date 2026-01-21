
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
    res.json({ status: "online", version: "2.4-HEAVY-LOAD-OPTIMIZED" });
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
    
    console.log(`[JOB] Iniciando geração para ${userId} - Vídeo: ${videoUrl}`);

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

        // Primeiro, baixar o vídeo e obter a duração total
        console.log("[STEP 1] Analisando e baixando vídeo...");
        const downloadCmd = `yt-dlp -f "bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480][ext=mp4]" --no-check-certificates --merge-output-format mp4 "${videoUrl}" -o "${inputPath}"`;

        exec(downloadCmd, (error) => {
            if (error) {
                console.error("[ERROR] Download falhou:", error);
                return res.status(500).json({ error: "Falha ao baixar vídeo do YouTube. Verifique o link." });
            }

            try {
                // Obter duração real do vídeo baixado
                const durationInfo = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`).toString().trim();
                const totalVideoDuration = parseFloat(durationInfo);
                console.log(`[INFO] Duração total do vídeo original: ${totalVideoDuration}s`);

                const clips = [];
                const numberOfClips = isRandom ? 6 : 10; // Reduzir para 6 se for aleatório longo para evitar timeout extremo

                for (let i = 0; i < numberOfClips; i++) {
                    let finalDuration = isRandom 
                        ? Math.floor(Math.random() * (maxDur - minDur + 1) + minDur)
                        : Math.floor((minDur + maxDur) / 2);
                    
                    // Garantir que não tentamos cortar além do final do vídeo
                    let startSec = i * (finalDuration + 2);
                    if (startSec + finalDuration > totalVideoDuration) {
                        // Se ultrapassar, tenta pegar do final pra trás ou ajustar
                        startSec = Math.max(0, totalVideoDuration - finalDuration - (i * 2));
                    }

                    const timestamp = new Date(startSec * 1000).toISOString().substr(11, 8);
                    const clipName = `clip_v24_${sessionID}_${i}.mp4`;
                    const outputPath = path.join(TEMP_DIR, clipName);
                    
                    const hook = VIRAL_HOOKS[i % VIRAL_HOOKS.length];
                    const color = settings?.subtitleStyle?.color || 'yellow';
                    
                    // Filtro otimizado: Reduzi um pouco o brilho e aumentei o contraste para vídeos longos não ficarem "lavados"
                    const complexFilter = `[0:v]crop=ih*9/16:ih,scale=540:960,eq=brightness=0.04:saturation=1.4:contrast=1.2,drawtext=text='${hook}':fontcolor=${color}:fontsize=30:x=(w-text_w)/2:y=(h-text_h)/2:box=1:boxcolor=black@0.5:boxborderw=8[v]`;
                    
                    // COMANDO OTIMIZADO: Resolução reduzida para 540x960 e CRF 32 para renderizar vídeos de 3 minutos mais rápido
                    const cutCmd = `ffmpeg -ss ${timestamp} -i "${inputPath}" -t ${finalDuration} -filter_complex "${complexFilter}" -map "[v]" -map 0:a? -c:v libx264 -preset ultrafast -crf 32 -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 96k -y "${outputPath}"`;
                    
                    console.log(`[RENDER] Clipe ${i+1}/${numberOfClips} (${finalDuration}s) iniciando em ${timestamp}...`);
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

                console.log("[SUCCESS] Geração concluída com sucesso!");
                res.json({ status: "success", clips });

                // Limpeza após 10 minutos
                setTimeout(() => { 
                    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); 
                }, 600000);

            } catch (err) {
                console.error("[ERRO NO PROCESSO]:", err);
                res.status(500).json({ error: "O vídeo original é curto demais para a duração escolhida ou o servidor ficou sem memória. Tente durações menores." });
            }
        });
    } catch (e) {
        console.error("[CRITICAL]:", e);
        res.status(500).json({ error: "Erro crítico no processamento." });
    }
};

app.post('/api/generate-real-clips', generateHandler);
app.post('/generate-real-clips', generateHandler);

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] Motor V2.4 (OTIMIZAÇÃO PESADA) Ativo na porta ${PORT}`);
});
