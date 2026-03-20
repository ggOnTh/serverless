import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Vercel 마켓플레이스 연동 시 자동으로 주입되는 환경 변수를 사용합니다.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

/**
 * 전역 Supabase 클라이언트 인스턴스
 * 이를 통해 데이터베이스 CRUD 작업을 수행할 수 있습니다.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 서버 측 작업을 위한 관리자 클라이언트 추가
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const supabaseAdmin = supabaseServiceRoleKey 
  ? createClient(supabaseUrl, supabaseServiceRoleKey) 
  : null;

console.log('✅ Supabase clients have been initialized.');
