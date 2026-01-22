
const express = require('express');
const cors = require('cors');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// MOTOR BIZERRA V6.0 - UPLOAD EDITION
const app = express();

app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json());

const TEMP_DIR = path.join(__dirname, 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// Configuração do Multer para salvar o upload temporariamente
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TEMP_DIR),
  filename: (req, file, cb) => cb(null, `upload_${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`)
});
const upload = multer({ 
  storage,
  limits: { fileSize: 200 * 1024 * 1024 } // Limite de 200MB por vídeo
});

app.use('/temp', express.static(TEMP_DIR));

function wrapSubtitle(text, maxChars = 45) {
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

const CAPTIONS = [
    "O sucesso é construído nos detalhes que ninguém vê.",
    "A disciplina vence o talento quando o talento não tem disciplina.",
    "Mude sua rotina e você mudará o seu destino financeiro.",
    "O conhecimento aplicado é a única forma real de riqueza.",
    "Não espere o momento perfeito, pegue o momento e torne-o perfeito.",
    "Foque em ser produtivo, não em estar apenas ocupado.",
    "Seu maior investimento é em você mesmo, sempre.",
    "A consistência é o que transforma o comum em extraordinário.",
    "Aprenda a investir antes de aprender a gastar.",
    "Grandes conquistas exigem grandes sacrificícios diários."
];

// Endpoint de geração via upload
app.post('/api/generate-real-clips', upload.single('video'), async (req, res) => {
    const videoFile = req.file;
    const { userId, settings: settingsStr } = req.body;
    
    if (!videoFile) return res.status(400).json({ error: "Nenhum vídeo enviado." });

    const settings = settingsStr ? JSON.parse(settingsStr) : {};
    const inputPath = videoFile.path;
    const sessionID = Date.now();
    
    console.log(`[JOB] Motor V6.0 - Processando Upload: ${videoFile.filename}`);

    try {
        let minDur = 61, maxDur = 90;
        if (settings?.durationRange) {
            const parts = settings.durationRange.split('-').map(Number);
            minDur = parts[0];
            maxDur = parts[1] || parts[0];
        }

        const durationInfo = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`).toString().trim();
        const totalVideoDuration = parseFloat(durationInfo);
        const clips = [];
        const numClips = 4; // 4 clipes para garantir estabilidade no processamento local

        for (let i = 0; i < numClips; i++) {
            let finalDuration = Math.floor(Math.random() * (maxDur - minDur + 1) + minDur);
            let startSec = Math.floor(Math.random() * (totalVideoDuration - finalDuration - 5)) + 2;
            
            if (startSec < 0) startSec = 0;

            const timestamp = new Date(startSec * 1000).toISOString().substr(11, 8);
            const clipName = `clip_v60_${sessionID}_${i}.mp4`;
            const outputPath = path.join(TEMP_DIR, clipName);
            
            const rawText = CAPTIONS[Math.floor(Math.random() * CAPTIONS.length)];
            const wrappedSubtitle = wrapSubtitle(rawText, 38); 
            const color = settings?.subtitleStyle?.color || 'white';
            
            // FILTRO V6.0 - CLEAN & STABLE
            const complexFilter = `[0:v]scale=w=540:h=960:force_original_aspect_ratio=increase,crop=540:960,setsar=1,drawtext=text='${wrappedSubtitle}':fontcolor=${color}:fontsize=12:x=(w-text_w)/2:y=h-110:shadowcolor=black@0.8:shadowx=1:shadowy=1:line_spacing=4[v]`;
            
            const cutCmd = `ffmpeg -ss ${timestamp} -i "${inputPath}" -t ${finalDuration} -filter_complex "${complexFilter}" -map "[v]" -map 0:a? -c:v libx264 -preset ultrafast -crf 30 -c:a aac -b:a 96k -y "${outputPath}"`;
            
            try {
                execSync(cutCmd, { timeout: 180000 });
                clips.push({
                    id: `clip-${sessionID}-${i}`,
                    title: `Corte de Vídeo ${i+1}`,
                    videoUrl: `/temp/${clipName}`,
                    thumbnail: `https://picsum.photos/seed/${sessionID + i}/400/700`,
                    duration: finalDuration.toString()
                });
            } catch (e) { 
                console.error(`[ERROR] Falha no corte ${i}:`, e.message);
                continue; 
            }
        }

        if (clips.length === 0) throw new Error("Não foi possível gerar clipes deste vídeo.");

        res.json({ status: "success", clips });
        
        // Limpeza dos arquivos (origem e clipes) após algum tempo
        setTimeout(() => { 
            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); 
        }, 600000);

    } catch (err) { 
        console.error("[ERROR] Falha geral:", err.message);
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        res.status(500).json({ error: "Erro ao processar o arquivo de vídeo." }); 
    }
});

app.get('/health', (req, res) => res.json({ status: "online", version: "6.0-Upload" }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Motor V6.0 Online - Modo Upload Ativado`));
