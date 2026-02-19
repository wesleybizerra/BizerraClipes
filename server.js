
const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { MercadoPagoConfig, Preference } = require('mercadopago');
const util = require('util');
const { GoogleGenAI } = require("@google/genai");
const execPromise = util.promisify(exec);

const app = express();

// CONFIGURAÇÃO GEMINI AI
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// CONFIGURAÇÃO MERCADO PAGO
const mpClient = process.env.MP_ACCESS_TOKEN
  ? new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN })
  : null;

app.use(cors());
app.use(express.json());

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

app.get('/health', (req, res) => res.json({ status: "online", motor: "Gemini Hybrid V10" }));

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
  if (!mpClient) return res.status(500).json({ error: "Token Mercado Pago não configurado." });
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

// Lógica Inteligente de Segmentação
async function getSmartTimestamps(duration) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Você é um estrategista de vídeos virais. O vídeo tem ${duration} segundos. 
            Sugira 10 timestamps de início (em segundos) para clipes de 45 a 60 segundos que teriam maior chance de viralizar. 
            Retorne APENAS uma lista de números separados por vírgula. Exemplo: 10, 45, 120...`,
    });
    const text = response.text;
    return text.split(',').map(n => parseFloat(n.trim())).filter(n => n < duration - 60);
  } catch (e) {
    // Fallback caso a IA falhe
    return Array.from({ length: 10 }, () => Math.floor(Math.random() * (duration - 70)) + 5);
  }
}

app.post('/api/generate-real-clips', upload.single('video'), async (req, res) => {
  const videoFile = req.file;
  if (!videoFile) return res.status(400).json({ error: "Arquivo não recebido." });

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

        let d = 50; // Duração ideal para Reels/TikTok
        let s = timestamps[i] || (i * 60);

        const outName = `clip_${sessionID}_${i}.mp4`;
        const outPath = path.join(TEMP_DIR, outName);

        // Filtro Pro: Centraliza e corta para 9:16 sem distorção
        const filter = `scale=w=1080:h=1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1`;
        const cmd = `ffmpeg -ss ${s} -t ${d} -i "${inputPath}" -vf "${filter}" -c:v libx264 -preset ultrafast -crf 23 -c:a aac -ac 2 -b:a 192k -y "${outPath}"`;

        await execPromise(cmd);

        jobsDB[jobID].clips.push({
          id: `${sessionID}-${i}`,
          title: `Corte Viral #${i + 1} (Inteligência AI)`,
          videoUrl: `/temp/${outName}`,
          thumbnail: `https://picsum.photos/seed/${sessionID + i}/400/700`,
          duration: d.toString()
        });
      }
      jobsDB[jobID].status = 'completed';
      jobsDB[jobID].progress = 100;
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    } catch (err) {
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

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`>>> MOTOR BIZERRA AI V10 ATIVO NA PORTA ${PORT}`);
});
