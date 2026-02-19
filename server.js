
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

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: "ok" }));
app.get('/', (req, res) => res.send("Motor Bizerra V10 ONLINE"));

const TEMP_DIR = path.join(__dirname, 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
app.use('/temp', express.static(TEMP_DIR));

// DB em memória
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

// Mercado Pago
const mpClient = process.env.MP_ACCESS_TOKEN
  ? new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN })
  : null;

app.post('/api/create-preference', async (req, res) => {
  if (!mpClient) return res.status(500).json({ error: "MP não configurado" });
  try {
    const { planName, price, userId } = req.body;
    const preference = await new Preference(mpClient).create({
      body: {
        items: [{ title: planName, quantity: 1, unit_price: Number(price), currency_id: 'BRL' }],
        back_urls: { success: `https://bizerraclipes.netlify.app/#/dashboard?payment=success&user=${userId}` },
        auto_return: 'approved',
      }
    });
    res.json({ init_point: preference.init_point });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

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

const upload = multer({ dest: TEMP_DIR });
app.post('/api/generate-real-clips', upload.single('video'), async (req, res) => {
  const jobID = `job_${Date.now()}`;
  jobsDB[jobID] = { status: 'processing', progress: 10, currentClip: 1, totalClips: 1, clips: [] };
  res.json({ jobId: jobID });

  (async () => {
    try {
      const outName = `clip_${jobID}.mp4`;
      const outPath = path.join(TEMP_DIR, outName);
      await execPromise(`ffmpeg -i "${req.file.path}" -t 15 -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" -c:v libx264 -preset ultrafast -y "${outPath}"`);
      jobsDB[jobID].status = 'completed';
      jobsDB[jobID].progress = 100;
      jobsDB[jobID].clips = [{ id: jobID, title: "Corte Viral", videoUrl: `/temp/${outName}`, thumbnail: "https://picsum.photos/200/300", duration: "15" }];
    } catch (e) {
      jobsDB[jobID].status = 'error';
      jobsDB[jobID].error = e.message;
    }
  })();
});

app.get('/api/jobs/:id', (req, res) => res.json(jobsDB[req.params.id] || { status: 'not_found' }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Motor V10 rodando na porta ${PORT}`);
});
