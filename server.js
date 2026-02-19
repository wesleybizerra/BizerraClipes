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

// CORS TOTALMENTE ABERTO PARA EVITAR BLOQUEIOS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

// Inicialização segura do Gemini para o servidor NÃO CAIR se a chave estiver vazia
let ai = null;
if (process.env.API_KEY) {
  try {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    console.log("✅ [Motor] Gemini AI inicializado com sucesso.");
  } catch (e) {
    console.error("❌ [Erro] Falha ao carregar Gemini:", e.message);
  }
} else {
  console.warn("⚠️ [Aviso] API_KEY não encontrada. O motor usará timestamps fixos.");
}

// Rota raiz - O Railway usa isso para saber se o app está vivo
app.get('/', (req, res) => {
  res.status(200).send(`
        <div style="font-family: sans-serif; text-align: center; padding: 50px; background: #0f172a; color: white;">
            <h1 style="color: #22c55e;">⚡ MOTOR BIZERRA V10 ONLINE</h1>
            <p>Se você está vendo isso, o servidor está rodando perfeitamente!</p>
            <hr style="border: 0; border-top: 1px solid #1e293b; margin: 20px auto; max-width: 300px;">
            <div style="font-size: 14px; color: #64748b;">
                <p>Status: Ativo</p>
                <p>Porta: ${process.env.PORT || 8080}</p>
                <p>Gemini: ${ai ? 'Conectado' : 'Modo Offline'}</p>
            </div>
        </div>
    `);
});

// Endpoint de Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: "online",
    motor: "Bizerra V10",
    ffmpeg: true,
    timestamp: new Date().toISOString()
  });
});

const mpClient = process.env.MP_ACCESS_TOKEN
  ? new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN })
  : null;

let usersDB = [
  {
    id: 'admin-1',
    name: 'Admin Bizerra',
    email: 'wesleybizerra@hotmail.com',
    password: '123',
    credits: 9999,
    role: 'ADMIN',
    plan: 'PROFESSIONAL',
    createdAt: new Date().toISOString()
  }
];

let jobsDB = {};

const TEMP_DIR = path.join(__dirname, 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
app.use('/temp', express.static(TEMP_DIR));

app.get('/api/users', (req, res) => res.json(usersDB));

app.post('/api/register', (req, res) => {
  const { name, email, password } = req.body;
  if (usersDB.find(u => u.email === email)) return res.status(400).json({ error: "E-mail já cadastrado." });
  const newUser = {
    id: `user-${Date.now()}`,
    name, email, password,
    credits: 70,
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
  if (password && user.password !== password) return res.status(401).json({ error: "Senha incorreta." });
  res.json(user);
});

app.put('/api/users/:id/credits', (req, res) => {
  const userIndex = usersDB.findIndex(u => u.id === req.params.id);
  if (userIndex === -1) return res.status(404).json({ error: "Usuário não encontrado." });
  usersDB[userIndex].credits += req.body.amount;
  res.json(usersDB[userIndex]);
});

app.post('/api/create-preference', async (req, res) => {
  if (!mpClient) return res.status(500).json({ error: "Configuração do Mercado Pago ausente." });
  try {
    const { userId, planId, planName, price } = req.body;
    const preference = new Preference(mpClient);
    const result = await preference.create({
      body: {
        items: [{ title: planName, quantity: 1, unit_price: Number(price), currency_id: 'BRL' }],
        back_urls: {
          success: `https://bizerraclipes.netlify.app/#/dashboard?payment=success&mock_plan=${planId}`,
          failure: `https://bizerraclipes.netlify.app/#/dashboard?payment=failure`,
          pending: `https://bizerraclipes.netlify.app/#/dashboard?payment=pending`
        },
        auto_return: 'approved',
        external_reference: userId
      }
    });
    res.json({ init_point: result.init_point });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TEMP_DIR),
  filename: (req, file, cb) => cb(null, `src_${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`)
});
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

async function getSmartTimestamps(duration) {
  if (!ai) {
    const interval = Math.floor(duration / 12);
    return Array.from({ length: 10 }, (_, i) => (i + 1) * interval);
  }
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analise um vídeo de ${duration} segundos. Identifique os 10 melhores momentos (em segundos) para cortes virais. Retorne apenas os números separados por vírgula.`,
    });
    const text = response.text || "";
    const points = text.split(',').map(n => parseFloat(n.trim())).filter(n => !isNaN(n) && n < duration - 60);
    return points.length >= 10 ? points.slice(0, 10) : points;
  } catch (e) {
    const interval = Math.floor(duration / 12);
    return Array.from({ length: 10 }, (_, i) => (i + 1) * interval);
  }
}

app.post('/api/generate-real-clips', upload.single('video'), async (req, res) => {
  const videoFile = req.file;
  if (!videoFile) return res.status(400).json({ error: "Nenhum vídeo enviado." });

  const jobID = `job_${Date.now()}`;
  jobsDB[jobID] = { status: 'processing', progress: 0, totalClips: 10, currentClip: 0, clips: [] };
  res.json({ jobId: jobID });

  const inputPath = videoFile.path;
  const sessionID = Date.now();

  (async () => {
    try {
      const { stdout: dur } = await execPromise(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`);
      const totalDuration = parseFloat(dur.trim());

      jobsDB[jobID].status = 'analyzing';
      const timestamps = await getSmartTimestamps(totalDuration);

      for (let i = 0; i < 10; i++) {
        jobsDB[jobID].status = 'processing';
        jobsDB[jobID].currentClip = i + 1;
        jobsDB[jobID].progress = Math.floor((i / 10) * 100);

        const startTime = timestamps[i] || (i * 60);
        const duration = 45;
        const outName = `clip_${sessionID}_${i}.mp4`;
        const outPath = path.join(TEMP_DIR, outName);

        const filter = `scale=w=1080:h=1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1`;
        const cmd = `ffmpeg -ss ${startTime} -t ${duration} -i "${inputPath}" -vf "${filter}" -c:v libx264 -preset ultrafast -crf 28 -c:a aac -b:a 128k -y "${outPath}"`;

        await execPromise(cmd);

        jobsDB[jobID].clips.push({
          id: `${sessionID}-${i}`,
          title: `Corte Viral #${i + 1}`,
          videoUrl: `/temp/${outName}`,
          thumbnail: `https://picsum.photos/seed/${sessionID + i}/400/700`,
          duration: duration.toString()
        });
      }
      jobsDB[jobID].status = 'completed';
      jobsDB[jobID].progress = 100;
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    } catch (err) {
      console.error(`[Job ${jobID}] Erro Fatal:`, err);
      jobsDB[jobID].status = 'error';
      jobsDB[jobID].error = err.message;
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    }
  })();
});

app.get('/api/jobs/:id', (req, res) => {
  const job = jobsDB[req.params.id];
  if (!job) return res.status(404).json({ error: "Job não encontrado." });
  res.json(job);
});

// IMPORTANTE: Railway injeta a porta em process.env.PORT. 
// O fallback 8080 deve ser o mesmo configurado no painel do Railway.
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 [Sucesso] Motor Bizerra V10 rodando em: http://0.0.0.0:${PORT}`);
});