
# 🚀 Passo Final: Ativando o Pagamento Real

Para que o botão "Assinar Agora" funcione, você precisa colocar o seu servidor no ar.

## 1️⃣ Subindo o Servidor (Railway)
1. Vá para [Railway.app](https://railway.app/).
2. Clique em **New Project** > **Deploy from GitHub repo** (ou use a CLI do Railway).
3. Selecione a pasta onde está o arquivo `server.js` e o `Dockerfile`.
4. O Railway vai gerar um link automático (Ex: `https://bizerra-clips.up.railway.app`).

## 2️⃣ Conectando o Site ao Servidor
1. Copie o link que o Railway te deu.
2. Abra o arquivo `services/api.ts` no seu código.
3. Substitua `https://seu-backend-final.up.railway.app` pelo seu link real.

## 3️⃣ Instalando as dependências do servidor
No seu terminal local (ou para o Railway saber o que instalar), certifique-se de ter o `package.json` com estas dependências:
```json
"dependencies": {
  "express": "^4.18.2",
  "cors": "^2.8.5",
  "mercadopago": "^2.0.8",
  "@supabase/supabase-js": "^2.39.0",
  "@google/genai": "^0.1.0",
  "dotenv": "^16.3.1"
}
```

## 4️⃣ Por que o erro acontecia?
O navegador não consegue falar com o Mercado Pago diretamente por motivos de segurança (CORS e proteção de Token). O fluxo obrigatório é:
**SITE -> SEU SERVIDOR -> MERCADO PAGO -> LINK DE VOLTA**

---
### Dica de Ouro:
Se você quiser apenas **testar** no seu computador antes de subir para o site, rode `node server.js` no seu terminal. O site vai detectar automaticamente o `localhost:3000` e o botão vai funcionar!
