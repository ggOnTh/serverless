import Redis from 'ioredis';
import 'dotenv/config';

/**
 * 다이어리 히스토리를 가져오는 API 핸들러
 */
export default async function handler(req, res) {
  // CORS 처리
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: '허용되지 않는 메소드입니다.' });
  }

  const REDIS_URL = process.env.REDIS_URL;
  if (!REDIS_URL) {
    console.error('REDIS_URL is missing');
    return res.status(500).json({ error: 'REDIS_URL 환경 변수가 설정되어 있지 않습니다.' });
  }

  try {
    const redis = new Redis(REDIS_URL);
    
    // 일기 데이터 키 검색
    const keys = await redis.keys('diary-*');
    
    if (!keys || keys.length === 0) {
      await redis.quit();
      return res.status(200).json({ history: [] });
    }

    // 키를 내림차순(최신순)으로 정렬
    keys.sort().reverse();

    // 모든 키에 대한 데이터 가져오기
    const values = await redis.mget(...keys);
    
    // JSON 파싱 및 데이터 구성
    const history = values.map((val, index) => {
      try {
        const parsed = JSON.parse(val);
        return {
          id: keys[index],
          ...parsed
        };
      } catch (err) {
        return { id: keys[index], content: '데이터 파싱 오류', response: '' };
      }
    });

    await redis.quit();
    return res.status(200).json({ history });
  } catch (error) {
    console.error('History API Error:', error);
    return res.status(500).json({ error: '히스토리를 가져오는 중 오류가 발생했습니다.' });
  }
}
