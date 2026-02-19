import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import util from 'util';
import { GoogleGenAI } from "@google/genai";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execPromise = util.promisify(exec);

const app = express();
const PORT = process.env.PORT || 8080;

// 1. CONFIGURAÇÃO DE CORS - CRUCIAL PARA FALAR COM O NETLIFY
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

// 2. HEALTH CHECK IMEDIATO (O Railway precisa disso para não matar o app)
app.get('/health', (req, res) => {
  res.status(200).json({ status: "ok", message: "Motor Bizerra V10 Ativo" });
});

app.get('/', (req, res) => {
  res.status(200).send("<h1>Motor Bizerra V10 está ONLINE!</h1>");
});

// 3. INICIALIZAÇÃO ASSÍNCRONA DAS IAs (Para não travar o boot)
let ai = null;
const initAI = () => {
  if (process.env.API_KEY) {
    try {
      ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      console.log("✅ [Gemini] Conectado.");
    } catch (e) {
      console.error("❌ [Gemini] Erro:", e.message);
    }
  }
};
initAI();

// Config Mercado Pago
const mpClient = process.env.MP_ACCESS_TOKEN
  ? new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN })
  : null;

// Banco de dados em memória (limpa a cada deploy)
let usersDB = [{
  id: 'admin-1',
  name: 'Admin Bizerra',
  email: 'wesleybizerra@hotmail.com',
  password: '123',
  credits: 9999,
  role: 'ADMIN',
  plan: 'PROFESSIONAL'
}];
let jobsDB = {};

const TEMP_DIR = path.join(__dirname, 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
app.use('/temp', express.static(TEMP_DIR));

// Rota de Login/Registro
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = usersDB.find(u => u.email === email);
  if (!user) return res.status(404).json({ error: "Usuário não encontrado." });
  if (password && user.password !== password) return res.status(401).json({ error: "Senha incorreta." });
  res.json(user);
});

app.post('/api/register', (req, res) => {
  const { name, email, password } = req.body;
  if (usersDB.find(u => u.email === email)) return res.status(400).json({ error: "E-mail já cadastrado." });
  const newUser = { id: `user-${Date.now()}`, name, email, password, credits: 70, role: 'USER', plan: 'FREE' };
  usersDB.push(newUser);
  res.json(newUser);
});

app.get('/api/users', (req, res) => res.json(usersDB));

app.put('/api/users/:id/credits', (req, res) => {
  const userIndex = usersDB.findIndex(u => u.id === req.params.id);
  if (userIndex !== -1) {
    usersDB[userIndex].credits += req.body.amount;
    return res.json(usersDB[userIndex]);
  }
  res.status(404).json({ error: "Usuário não encontrado" });
});

// Geração de Clipes
const upload = multer({ dest: TEMP_DIR, limits: { fileSize: 500 * 1024 * 1024 } });

app.post('/api/generate-real-clips', upload.single('video'), async (req, res) => {
  const jobID = `job_${Date.now()}`;
  jobsDB[jobID] = { status: 'processing', progress: 0, clips: [] };
  res.json({ jobId: jobID });

  // Processamento pesado em background
  (async () => {
    try {
      const inputPath = req.file.path;
      const outName = `clip_${jobID}.mp4`;
      const outPath = path.join(TEMP_DIR, outName);

      // Comando FFmpeg básico para teste de viralização
      const cmd = `ffmpeg -i "${inputPath}" -ss 0 -t 30 -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" -c:v libx264 -preset ultrafast -y "${outPath}"`;
      await execPromise(cmd);

      jobsDB[jobID].status = 'completed';
      jobsDB[jobID].progress = 100;
      jobsDB[jobID].clips = [{
        id: jobID,
        title: "Corte Viral Gerado",
        videoUrl: `/temp/${outName}`,
        thumbnail: "https://picsum.photos/seed/bizerra/400/700",
        duration: "30"
      }];
    } catch (e) {
      jobsDB[jobID].status = 'error';
      jobsDB[jobID].error = e.message;
    }
  })();
});

app.get('/api/jobs/:id', (req, res) => res.json(jobsDB[req.params.id] || { status: 'not_found' }));

// INICIAR ESCUTA - Railway exige 0.0.0.0
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
    -------------------------------------------
    ⚡ MOTOR BIZERRA V10 INICIADO
    🌍 Host: 0.0.0.0
    🔌 Porta: ${PORT}
    🚀 URL Railway: https://bizerraclipes-production.up.railway.app
    -------------------------------------------
    `);
});