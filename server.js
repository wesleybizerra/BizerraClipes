
const express = require('express');
const cors = require('cors');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { MercadoPagoConfig, Preference } = require('mercadopago');

// MOTOR BIZERRA V9.0 - CLEAN ENGINE & REAL PAYMENTS
const app = express();

// Configuração Mercado Pago
const mpClient = process.env.MP_ACCESS_TOKEN 
  ? new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN })
  : null;

app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json());

const TEMP_DIR = path.join(__dirname, 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TEMP_DIR),
  filename: (req, file, cb) => cb(null, `clean_v9_${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`)
});
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

app.use('/temp', express.static(TEMP_DIR));

// Endpoint para Criar Preferência do Mercado Pago
app.post('/api/create-preference', async (req, res) => {
    if (!mpClient) return res.status(500).json({ error: "Token do Mercado Pago não configurado no Railway." });

    const { planId, planName, price, userId } = req.body;

    try {
        const preference = new Preference(mpClient);
        const result = await preference.create({
            body: {
                items: [
                    {
                        id: planId,
                        title: `Bizerra Clipes - ${planName}`,
                        quantity: 1,
                        unit_price: Number(price),
                        currency_id: 'BRL'
                    }
                ],
                back_urls: {
                    success: `${req.headers.origin}/#/dashboard?payment=success&mock_plan=${planId}`,
                    failure: `${req.headers.origin}/#/planos?payment=failure`,
                    pending: `${req.headers.origin}/#/planos?payment=pending`
                },
                auto_return: 'approved',
                metadata: {
                    user_id: userId,
                    plan_id: planId
                }
            }
        });

        res.json({ init_point: result.init_point });
    } catch (error) {
        console.error("Erro ao criar preferência MP:", error);
        res.status(500).json({ error: "Falha ao gerar link de pagamento." });
    }
});

app.post('/api/generate-real-clips', upload.single('video'), async (req, res) => {
    const videoFile = req.file;
    const { userId } = req.body;
    if (!videoFile) return res.status(400).json({ error: "Nenhum vídeo enviado." });

    const inputPath = videoFile.path;
    const sessionID = Date.now();
    
    console.log(`[JOB] Motor V9.0 - Gerando 10 Cortes Limpos (Sem Texto): ${videoFile.filename}`);

    try {
        const durationInfo = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`).toString().trim();
        const totalVideoDuration = parseFloat(durationInfo);
        
        const clips = [];
        const numClips = 10;
        
        // Padrão: cortes de 60-180 segundos para maximizar retenção
        for (let i = 0; i < numClips; i++) {
            let finalDuration = Math.floor(Math.random() * (120 - 60 + 1) + 60);
            let startSec = Math.floor(Math.random() * (totalVideoDuration - finalDuration - 15)) + 5;
            if (startSec < 0) startSec = 0;

            const timestamp = new Date(startSec * 1000).toISOString().substr(11, 8);
            const clipName = `clean_clip_${sessionID}_${i}.mp4`;
            const outputPath = path.join(TEMP_DIR, clipName);
            
            // Filtro V9.0 Limpo: Apenas Redimensionamento Vertical (9:16)
            const complexFilter = `[0:v]scale=w=540:h=960:force_original_aspect_ratio=increase,crop=540:960,setsar=1[v]`;
            
            const cutCmd = `ffmpeg -ss ${timestamp} -i "${inputPath}" -t ${finalDuration} -filter_complex "${complexFilter}" -map "[v]" -map 0:a? -c:v libx264 -preset ultrafast -crf 26 -c:a aac -b:a 128k -y "${outputPath}"`;
            
            try {
                execSync(cutCmd, { timeout: 600000 }); 
                clips.push({
                    id: `clip-${sessionID}-${i}`,
                    title: `Corte Limpo ${i+1}`,
                    videoUrl: `/temp/${clipName}`,
                    thumbnail: `https://picsum.photos/seed/${sessionID + i}/400/700`,
                    duration: finalDuration.toString()
                });
            } catch (e) { 
                console.error(`Falha no corte ${i}:`, e.message);
                continue; 
            }
        }

        res.json({ status: "success", clips });
        setTimeout(() => { if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); }, 900000);

    } catch (err) { 
        console.error("[ERROR] Motor V9.0:", err.message);
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        res.status(500).json({ error: "Erro crítico no Motor V9.0 de geração." }); 
    }
});

app.get('/health', (req, res) => res.json({ status: "online", version: "9.0-Clean" }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Motor Bizerra V9.0 - Clipes Limpos Ativado - Porta ${PORT}`));
