
const express = require('express');
const cors = require('cors');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// MOTOR BIZERRA V7.0 - PRO EDITION (10 CLIPS / FONT 13)
const app = express();

app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json());

const TEMP_DIR = path.join(__dirname, 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TEMP_DIR),
  filename: (req, file, cb) => cb(null, `upload_${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`)
});
const upload = multer({ 
  storage,
  limits: { fileSize: 300 * 1024 * 1024 } // Aumentado para 300MB para suportar vídeos longos
});

app.use('/temp', express.static(TEMP_DIR));

function wrapSubtitle(text, maxChars = 40) {
    const words = text.split(' ');
    let lines = [];
    let currentLine = "";
    words.forEach(word => {
        if ((currentLine + word).length <= maxChars) {
            currentLine += (currentLine ? " " : "") + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    });
    lines.push(currentLine);
    return lines.join('\n').replace(/'/g, "'\\\\\\''").replace(/:/g, '\\:');
}

// Banco de dados de legendas expandido para vídeos de longa duração
const CAPTIONS = [
    "A verdadeira liberdade financeira começa com a mudança da sua mentalidade e hábitos diários.",
    "Não foque no dinheiro, foque no valor que você gera para as pessoas ao seu redor hoje.",
    "O segredo do sucesso não é a velocidade, mas sim a direção e a consistência no longo prazo.",
    "Sua rotina matinal determina o sucesso do seu dia e, consequentemente, o sucesso da sua vida.",
    "Pare de dar desculpas para os seus fracassos e comece a buscar soluções para os seus problemas.",
    "O investimento em conhecimento sempre rende os melhores juros para quem tem paciência de aprender.",
    "Se você não encontrar um jeito de ganhar dinheiro enquanto dorme, vai trabalhar até o fim da vida.",
    "Disciplina é fazer o que precisa ser feito, mesmo quando você não tem a menor vontade de fazer.",
    "As grandes oportunidades não aparecem, elas são criadas através de muito trabalho e preparação constante.",
    "Seja tão bom naquilo que você faz que as pessoas não consigam ignorar a sua presença no mercado."
];

app.post('/api/generate-real-clips', upload.single('video'), async (req, res) => {
    const videoFile = req.file;
    const { userId, settings: settingsStr } = req.body;
    
    if (!videoFile) return res.status(400).json({ error: "Nenhum vídeo enviado." });

    const settings = settingsStr ? JSON.parse(settingsStr) : {};
    const inputPath = videoFile.path;
    const sessionID = Date.now();
    
    console.log(`[JOB] Motor V7.0 - Produção de 10 Clipes Iniciada: ${videoFile.filename}`);

    try {
        let minDur = 61, maxDur = 180;
        if (settings?.durationRange) {
            const parts = settings.durationRange.split('-').map(Number);
            minDur = parts[0];
            maxDur = parts[1] || parts[0];
        }

        const durationInfo = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`).toString().trim();
        const totalVideoDuration = parseFloat(durationInfo);
        
        const clips = [];
        const numClips = 10; // CONFIGURADO PARA 10 CLIPES

        for (let i = 0; i < numClips; i++) {
            let finalDuration = Math.floor(Math.random() * (maxDur - minDur + 1) + minDur);
            // Ajuste de margem para garantir que o clipe caiba no vídeo original
            let startSec = Math.floor(Math.random() * (totalVideoDuration - finalDuration - 10)) + 5;
            
            if (startSec < 0) startSec = 0;

            const timestamp = new Date(startSec * 1000).toISOString().substr(11, 8);
            const clipName = `clip_v70_${sessionID}_${i}.mp4`;
            const outputPath = path.join(TEMP_DIR, clipName);
            
            const rawText = CAPTIONS[i % CAPTIONS.length]; // Pega uma frase diferente para cada um dos 10 clipes
            const wrappedSubtitle = wrapSubtitle(rawText, 35); 
            const color = settings?.subtitleStyle?.color || 'white';
            
            // FILTRO V7.0 - FONTE 13 / APENAS LEGENDA RODAPÉ / ZERO TEXTO FIXO
            const complexFilter = `[0:v]scale=w=540:h=960:force_original_aspect_ratio=increase,crop=540:960,setsar=1,drawtext=text='${wrappedSubtitle}':fontcolor=${color}:fontsize=13:x=(w-text_w)/2:y=h-120:shadowcolor=black@0.9:shadowx=1:shadowy=1:line_spacing=5[v]`;
            
            const cutCmd = `ffmpeg -ss ${timestamp} -i "${inputPath}" -t ${finalDuration} -filter_complex "${complexFilter}" -map "[v]" -map 0:a? -c:v libx264 -preset ultrafast -crf 30 -c:a aac -b:a 128k -y "${outputPath}"`;
            
            try {
                execSync(cutCmd, { timeout: 300000 }); // 5 minutos por corte (necessário para 180s)
                clips.push({
                    id: `clip-${sessionID}-${i}`,
                    title: `Corte Viral ${i+1}`,
                    videoUrl: `/temp/${clipName}`,
                    thumbnail: `https://picsum.photos/seed/${sessionID + i}/400/700`,
                    duration: finalDuration.toString()
                });
            } catch (e) { 
                console.error(`[ERROR] Falha no corte ${i}:`, e.message);
                continue; 
            }
        }

        if (clips.length === 0) throw new Error("Falha ao gerar os 10 clipes.");

        res.json({ status: "success", clips });
        
        setTimeout(() => { 
            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); 
        }, 900000);

    } catch (err) { 
        console.error("[ERROR] Falha geral V7.0:", err.message);
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        res.status(500).json({ error: "Erro crítico no Motor V7.0 ao processar 10 clipes." }); 
    }
});

app.get('/health', (req, res) => res.json({ status: "online", version: "7.0-Pro" }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Motor V7.0 Ativado - 10 Clipes - Fonte 13`));
