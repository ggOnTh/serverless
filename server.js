// server.js - Node.js Express 서버 (Gemini API 프록시)
// 환경 변수: GEMINI_API_KEY (발급받은 API 키)
// 사용 방법:
//   1. 프로젝트 루트에 .env 파일을 만들고 `GEMINI_API_KEY=YOUR_KEY` 를 입력
//   2. `npm init -y` 로 package.json 생성 후 `npm install express cors dotenv node-fetch` 실행
//   3. `node server.js` 로 서버 실행 (포트 3000 기본)
//   4. 클라이언트(index.js)에서 `/gemini` 엔드포인트로 POST 요청 전송

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error('❌ GEMINI_API_KEY 환경 변수가 설정되지 않았습니다. .env 파일을 확인하세요.');
  process.exit(1);
}

app.post('/gemini', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'prompt 필드가 필요합니다.' });
  }
  try {
    console.log('Gemini API 호출 중... 프롬프트:', prompt.substring(0, 50) + '...');
    const response = await fetch(`${GEMINI_API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      })
    });
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Gemini API 에러 응답:', JSON.stringify(data));
      return res.status(response.status).json(data);
    }
    
    console.log('Gemini API 호출 성공');
    res.json(data);
  } catch (err) {
    console.error('서버 내부 오류:', err);
    res.status(500).json({ error: 'Gemini API 호출 실패 (서버 내부 오류)' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Gemini 프록시 서버가 http://localhost:${PORT} 에서 실행 중`);
});
