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

app.use(cors({ origin: '*' }));
app.use(express.json());

const TEMP_DIR = path.join(__dirname, 'temp');
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

app.use('/temp', express.static(TEMP_DIR));

app.get('/health', (req, res) => {
    res.json({ status: "online", version: "2.2-DURATION-FLEX" });
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
        let clipDuration = 75; // Default midpoint de 61-90
        
        if (settings && settings.durationRange) {
            const rangeStr = settings.durationRange; // Ex: '61-90'
            const [min, max] = rangeStr.split('-').map(Number);
            
            if (rangeStr === '60-180') {
                // Se for a faixa mista, variamos a duração
                clipDuration = "random"; 
            } else {
                // Senão pegamos a média do range para consistência
                clipDuration = Math.floor((min + max) / 2);
            }
        }

        const downloadCmd = `yt-dlp -f "bestvideo[height<=480]+bestaudio/best[height<=480]" --no-check-certificates --merge-output-format mp4 "${videoUrl}" -o "${inputPath}"`;

        console.log("[STEP 1] Baixando vídeo...");
        exec(downloadCmd, (error) => {
            if (error) {
                console.error("[ERROR] Download falhou:", error);
                return res.status(500).json({ error: "Falha ao baixar o vídeo. Verifique se o link é válido." });
            }

            console.log("[STEP 2] Download concluído. Iniciando renderização...");
            
            try {
                const clips = [];
                const numberOfClips = 10;

                for (let i = 0; i < numberOfClips; i++) {
                    // Calculando tempo de corte individual
                    let finalDuration = typeof clipDuration === 'number' ? clipDuration : Math.floor(Math.random() * (180 - 60 + 1) + 60);
                    
                    const startSec = i * (finalDuration + 10); // Espaçamento dinâmico
                    const timestamp = new Date(startSec * 1000).toISOString().substr(11, 8);
                    const clipName = `clip_v22_${sessionID}_${i}.mp4`;
                    const outputPath = path.join(TEMP_DIR, clipName);
                    
                    const hook = VIRAL_HOOKS[i % VIRAL_HOOKS.length];
                    const color = settings?.subtitleStyle?.color || 'yellow';
                    
                    const complexFilter = `[0:v]crop=ih*9/16:ih,scale=720:1280,eq=brightness=0.06:saturation=1.5:contrast=1.2,drawtext=text='${hook}':fontcolor=${color}:fontsize=38:x=(w-text_w)/2:y=(h-text_h)/2-50:box=1:boxcolor=black@0.7:boxborderw=12[v]`;
                    
                    const cutCmd = `ffmpeg -ss ${timestamp} -i "${inputPath}" -t ${finalDuration} -filter_complex "${complexFilter}" -map "[v]" -map 0:a -c:v libx264 -preset ultrafast -crf 30 -c:a aac -b:a 128k -y "${outputPath}"`;
                    
                    console.log(`[RENDER] Clipe ${i+1}/${numberOfClips} (${finalDuration}s)...`);
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

                console.log("[SUCCESS] Todos os clipes foram gerados!");
                res.json({ status: "success", clips });

                setTimeout(() => { 
                    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); 
                }, 300000);

            } catch (err) {
                console.error("[ERRO RENDER]:", err);
                res.status(500).json({ error: "O processamento de clipes longos falhou ou demorou demais." });
            }
        });
    } catch (e) {
        console.error("[CRITICAL]:", e);
        res.status(500).json({ error: "Erro interno no servidor." });
    }
};

app.post('/api/generate-real-clips', generateHandler);
app.post('/generate-real-clips', generateHandler);

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] Motor V2.2 Ativo na porta ${PORT}`);
});
