
const express = require('express');
const cors = require('cors');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { MercadoPagoConfig, Preference } = require('mercadopago');

const app = express();

// CONFIGURAÇÃO MERCADO PAGO
const mpClient = process.env.MP_ACCESS_TOKEN 
  ? new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN })
  : null;

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT'] }));
app.use(express.json());

// BANCO DE DADOS EM MEMÓRIA (Centralizado para o Admin ver todos)
// Nota: Em produção real, use um banco de dados como MongoDB ou PostgreSQL.
// Aqui, os dados ficam no servidor enquanto ele estiver ligado no Railway.
let usersDB = [
  {
    id: 'admin-1',
    name: 'Admin Bizerra',
    email: 'wesleybizerra@hotmail.com',
    password: '123', // Em produção, use hash de senha
    credits: 9999,
    role: 'ADMIN',
    plan: 'PROFESSIONAL',
    createdAt: new Date().toISOString()
  }
];

const TEMP_DIR = path.join(__dirname, 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

app.use('/temp', express.static(TEMP_DIR));

// --- ENDPOINTS DE USUÁRIOS (FIX PARA O ADMIN) ---

app.get('/api/users', (req, res) => {
    res.json(usersDB);
});

app.post('/api/register', (req, res) => {
    const { name, email, password } = req.body;
    if (usersDB.find(u => u.email === email)) {
        return res.status(400).json({ error: "E-mail já cadastrado." });
    }
    const newUser = {
        id: `user-${Date.now()}`,
        name, email, password,
        credits: 70, // Créditos iniciais
        role: email === 'wesleybizerra@hotmail.com' ? 'ADMIN' : 'USER',
        plan: 'FREE',
        createdAt: new Date().toISOString()
    };
    usersDB.push(newUser);
    res.json(newUser);
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const user = usersDB.find(u => u.email === email);
    if (!user) return res.status(404).json({ error: "Usuário não encontrado." });
    // Se enviou senha, valida. Se for só refresh, ignora validação simples.
    if (password && user.password !== password) return res.status(401).json({ error: "Senha incorreta." });
    res.json(user);
});

app.put('/api/users/:id/credits', (req, res) => {
    const { id } = req.params;
    const { amount } = req.body;
    const userIndex = usersDB.findIndex(u => u.id === id);
    if (userIndex === -1) return res.status(404).json({ error: "Usuário não encontrado." });
    
    usersDB[userIndex].credits += amount;
    res.json(usersDB[userIndex]);
});

// --- ENDPOINT MERCADO PAGO ---

app.post('/api/create-preference', async (req, res) => {
    if (!mpClient) return res.status(500).json({ error: "Token Mercado Pago ausente no Railway." });
    const { planId, planName, price, userId } = req.body;

    try {
        const preference = new Preference(mpClient);
        const result = await preference.create({
            body: {
                items: [{
                    id: planId,
                    title: `Bizerra Clipes - ${planName}`,
                    quantity: 1,
                    unit_price: Number(price),
                    currency_id: 'BRL'
                }],
                back_urls: {
                    success: `${req.headers.origin}/#/dashboard?payment=success&mock_plan=${planId}`,
                    failure: `${req.headers.origin}/#/planos?payment=failure`,
                    pending: `${req.headers.origin}/#/planos?payment=pending`
                },
                auto_return: 'approved',
                metadata: { user_id: userId, plan_id: planId }
            }
        });
        res.json({ init_point: result.init_point });
    } catch (error) {
        res.status(500).json({ error: "Erro ao gerar checkout." });
    }
});

// --- MOTOR DE VÍDEO V9.5 (100% LIMPO) ---

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TEMP_DIR),
  filename: (req, file, cb) => cb(null, `clean_${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`)
});
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

app.post('/api/generate-real-clips', upload.single('video'), async (req, res) => {
    const videoFile = req.file;
    if (!videoFile) return res.status(400).json({ error: "Vídeo ausente." });

    const inputPath = videoFile.path;
    const sessionID = Date.now();

    try {
        const durationInfo = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`).toString().trim();
        const totalVideoDuration = parseFloat(durationInfo);
        const clips = [];

        for (let i = 0; i < 10; i++) {
            let finalDuration = Math.floor(Math.random() * (120 - 60 + 1) + 60);
            let startSec = Math.floor(Math.random() * (totalVideoDuration - finalDuration - 15)) + 5;
            if (startSec < 0) startSec = 0;

            const timestamp = new Date(startSec * 1000).toISOString().substr(11, 8);
            const clipName = `clean_v95_${sessionID}_${i}.mp4`;
            const outputPath = path.join(TEMP_DIR, clipName);
            
            // FILTRO 100% LIMPO: APENAS 9:16
            const complexFilter = `[0:v]scale=w=540:h=960:force_original_aspect_ratio=increase,crop=540:960,setsar=1[v]`;
            const cutCmd = `ffmpeg -ss ${timestamp} -i "${inputPath}" -t ${finalDuration} -filter_complex "${complexFilter}" -map "[v]" -map 0:a? -c:v libx264 -preset ultrafast -crf 26 -c:a aac -y "${outputPath}"`;
            
            try {
                execSync(cutCmd, { timeout: 600000 }); 
                clips.push({
                    id: `clip-${sessionID}-${i}`,
                    title: `Corte Limpo ${i+1}`,
                    videoUrl: `/temp/${clipName}`,
                    thumbnail: `https://picsum.photos/seed/${sessionID + i}/400/700`,
                    duration: finalDuration.toString()
                });
            } catch (e) { continue; }
        }

        res.json({ status: "success", clips });
        setTimeout(() => { if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); }, 900000);
    } catch (err) {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        res.status(500).json({ error: "Falha no Motor V9.5" });
    }
});

app.get('/health', (req, res) => res.json({ status: "online", version: "9.5-Final" }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Motor Bizerra V9.5 - Centralizado e Ativado`));
