
const express = require('express');
const cors = require('cors');
const { exec, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// MOTOR BIZERRA V5.5 - ROBUST ULTRA-CLEAN (FONT 12 ONLY)
const app = express();

app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json());

const TEMP_DIR = path.join(__dirname, 'temp');
const COOKIES_PATH = path.join(__dirname, 'cookies.txt');

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

app.use('/temp', express.static(TEMP_DIR));

// Quebra de linha inteligente para fonte 12 (máximo 45 caracteres)
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

// Legendas profissionais simuladas (Tamanho 12)
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
    "Grandes conquistas exigem grandes sacrifícios diários."
];

const generateHandler = async (req, res) => {
    const { videoUrl, userId, settings } = req.body;
    if (!videoUrl) return res.status(400).json({ error: "URL necessária" });

    const sessionID = Date.now();
    const inputPath = path.join(TEMP_DIR, `source_${sessionID}.mp4`);
    
    console.log(`[JOB] Motor V5.5 Iniciado - Fonte 12 - Sem Texto Central`);

    try {
        let minDur = 61, maxDur = 90;
        if (settings?.durationRange) {
            const parts = settings.durationRange.split('-').map(Number);
            minDur = parts[0];
            maxDur = parts[1] || parts[0];
        }

        // COMANDO ROBUSTO: Prioriza MP4 e evita erros de merge que travam o download
        let downloadCmd = `yt-dlp -f "best[ext=mp4]/best" --no-playlist --no-check-certificates --geo-bypass --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" "${videoUrl}" -o "${inputPath}"`;

        if (fs.existsSync(COOKIES_PATH)) {
            downloadCmd = `yt-dlp -f "best[ext=mp4]/best" --cookies "${COOKIES_PATH}" --no-playlist --no-check-certificates "${videoUrl}" -o "${inputPath}"`;
        }

        exec(downloadCmd, { timeout: 300000 }, (error) => {
            if (error) {
                console.error("[ERROR] Falha crítica no Download:", error.message);
                return res.status(500).json({ error: "O YouTube bloqueou o download. Verifique se o link é público ou tente outro vídeo." });
            }

            try {
                if (!fs.existsSync(inputPath)) throw new Error("Arquivo não encontrado após download.");

                const durationInfo = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`).toString().trim();
                const totalVideoDuration = parseFloat(durationInfo);
                const clips = [];
                
                // Gerando 5 clipes para garantir velocidade e não estourar memória
                const numClips = 5; 

                for (let i = 0; i < numClips; i++) {
                    let finalDuration = Math.floor(Math.random() * (maxDur - minDur + 1) + minDur);
                    let startSec = Math.floor(Math.random() * (totalVideoDuration - finalDuration - 5)) + 2;
                    
                    const timestamp = new Date(startSec * 1000).toISOString().substr(11, 8);
                    const clipName = `clip_v55_${sessionID}_${i}.mp4`;
                    const outputPath = path.join(TEMP_DIR, clipName);
                    
                    const rawText = CAPTIONS[Math.floor(Math.random() * CAPTIONS.length)];
                    const wrappedSubtitle = wrapSubtitle(rawText, 40); 
                    const color = settings?.subtitleStyle?.color || 'white';
                    
                    // FILTRO V5.5: ABSOLUTAMENTE NADA NO MEIO. 
                    // Fonte 12 (exata), posição rodapé (y=h-110), sem caixa para visual limpo.
                    const complexFilter = `[0:v]scale=w=540:h=960:force_original_aspect_ratio=increase,crop=540:960,setsar=1,drawtext=text='${wrappedSubtitle}':fontcolor=${color}:fontsize=12:x=(w-text_w)/2:y=h-110:shadowcolor=black@0.8:shadowx=1:shadowy=1:line_spacing=4[v]`;
                    
                    const cutCmd = `ffmpeg -ss ${timestamp} -i "${inputPath}" -t ${finalDuration} -filter_complex "${complexFilter}" -map "[v]" -map 0:a? -c:v libx264 -preset ultrafast -crf 28 -c:a aac -b:a 128k -y "${outputPath}"`;
                    
                    try {
                        execSync(cutCmd, { timeout: 180000 });
                        clips.push({
                            id: `clip-${sessionID}-${i}`,
                            title: `Corte Profissional ${i+1}`,
                            videoUrl: `/temp/${clipName}`,
                            thumbnail: `https://picsum.photos/seed/${sessionID + i}/400/700`,
                            duration: finalDuration.toString()
                        });
                    } catch (e) { 
                        console.error(`[ERROR] Falha no clipe ${i}:`, e.message);
                        continue; 
                    }
                }

                if (clips.length === 0) throw new Error("Não foi possível processar os cortes.");

                res.json({ status: "success", clips });
                
                // Limpeza em 10 minutos
                setTimeout(() => { if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); }, 600000);
            } catch (err) { 
                console.error("[ERROR] Falha no FFmpeg:", err.message);
                res.status(500).json({ error: "Erro ao renderizar vídeos. Tente um vídeo mais curto ou com menor resolução." }); 
            }
        });
    } catch (e) { 
        res.status(500).json({ error: "Erro geral no Motor V5.5." }); 
    }
};

app.post('/api/generate-real-clips', generateHandler);
app.get('/health', (req, res) => res.json({ status: "online", version: "5.5-Stable" }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Motor V5.5 Online - Rodapé 12px`));
