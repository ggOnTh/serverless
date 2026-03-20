// api/analyze.js - Vercel Serverless Function
// 클라이언트의 요청을 받아 Gemini API를 호출하고 분석 결과를 Redis에 저장합니다.
import Redis from 'ioredis';
import 'dotenv/config';

/**
 * Vercel Serverless Function 핸들러
 * @param {import('@vercel/node').VercelRequest} req 
 * @param {import('@vercel/node').VercelResponse} res 
 */
export default async function handler(req, res) {
  // CORS 처리 (필요 시 설정)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { diaryContent } = req.body;

  if (!diaryContent) {
    return res.status(400).json({ error: '일기 내용이 없습니다.' });
  }

  const API_KEY = process.env.GEMINI_API_KEY;
  const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

  if (!API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.' });
  }

  const prompt = `너는 심리 상담가야. 사용자가 작성한 일기 내용을 읽고, 사용자의 감정을 한 단어로 요약해줘. 그리고 그 감정에 공감해주고 따뜻한 응원의 메시지를 2~3문장으로 작성해줘. 답변 형식은 반드시 '감정: [요약된 감정]\n\n[응원 메시지]' 와 같이 줄바꿈을 포함해서 보내줘.\n\n일기 내용: ${diaryContent}`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();
    
    // Gemini 응답 추출 및 반환
    const aiResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text || '응답을 생성하지 못했습니다.';
    
    // Redis에 데이터 저장
    const REDIS_URL = process.env.REDIS_URL;
    if (REDIS_URL) {
      try {
        const redis = new Redis(REDIS_URL);
        
        // 현재 시간 기반 ID 생성 (KST 기준)
        const now = new Date();
        const kstOffset = 9 * 60 * 60 * 1000;
        const kstDate = new Date(now.getTime() + kstOffset);
        
        // YYYYMMDDHHMMSS 포맷팅
        const yyyy = kstDate.getFullYear();
        const mm = String(kstDate.getMonth() + 1).padStart(2, '0');
        const dd = String(kstDate.getDate()).padStart(2, '0');
        const hh = String(kstDate.getHours()).padStart(2, '0');
        const min = String(kstDate.getMinutes()).padStart(2, '0');
        const ss = String(kstDate.getSeconds()).padStart(2, '0');
        const dateStr = `${yyyy}${mm}${dd}${hh}${min}${ss}`;
        const key = `diary-${dateStr}`;
        
        const diaryData = {
          content: diaryContent,
          response: aiResponse,
          timestamp: kstDate.toISOString()
        };
        
        await redis.set(key, JSON.stringify(diaryData));
        console.log(`✅ Redis 저장 성공: ${key}`);
        await redis.quit();
      } catch (redisError) {
        console.error('❌ Redis 저장 실패:', redisError);
      }
    } else {
      console.warn('⚠️ REDIS_URL 환경 변수가 설정되어 있지 않아 Redis 저장을 건너뜁니다.');
    }
    
    return res.status(200).json({ result: aiResponse });
  } catch (error) {
    console.error('Gemini API Error:', error);
    return res.status(500).json({ error: 'AI 분석 중 오류가 발생했습니다.' });
  }
}
