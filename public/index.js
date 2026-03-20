// Supabase 설정
const SUPABASE_URL = "https://hpbgrbadivzxdmbtfozn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwYmdyYmFkaXZ6eGRtYnRmb3puIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NzEyOTMsImV4cCI6MjA4OTU0NzI5M30.Ce9HEh1RQb-vS4WTpRDt6VH-FDCkcgIvInDQrnQVN_M";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {
  const authContainer = document.getElementById('auth-container');
  const appContainer = document.getElementById('app-container');
  const authEmail = document.getElementById('auth-email');
  const authPassword = document.getElementById('auth-password');
  const loginBtn = document.getElementById('login-btn');
  const signupBtn = document.getElementById('signup-btn');
  const googleLoginBtn = document.getElementById('google-login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const userEmailDisplay = document.getElementById('user-email');

  const diaryInput = document.getElementById('diary-input');
  const analyzeBtn = document.getElementById('analyze-btn');
  const voiceBtn = document.getElementById('voice-btn');
  const aiResult = document.getElementById('ai-result');
  const loading = document.getElementById('loading');
  const historyContainer = document.getElementById('history-container');

  // 페이지 로드 시 로컬 스토리지에서 데이터 복원
  const savedDiary = localStorage.getItem('diary_content');
  const savedAiResponse = localStorage.getItem('ai_response');

  if (savedDiary) {
    diaryInput.value = savedDiary;
    // 입력창 높이 자동 조절 트리거
    setTimeout(() => diaryInput.dispatchEvent(new Event('input')), 0);
  }

  if (savedAiResponse) {
    aiResult.innerText = savedAiResponse;
  }

  // 분석 요청하기 클릭 이벤트 (Vercel Serverless Function 호출)
  analyzeBtn.addEventListener('click', async () => {
    const text = diaryInput.value.trim();

    if (!text) {
      aiResult.innerHTML = '<span style="color: #ef4444;">일기 내용을 입력해주세요.</span>';
      return;
    }

    // 로딩 상태 표시
    aiResult.style.opacity = '0.3';
    loading.style.display = 'flex';
    analyzeBtn.disabled = true;

    try {
      // 사용자 세션에서 토큰 가져오기
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // 자체 API 서버 호출 (/api/analyze)
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ diaryContent: text })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '분석 요청에 실패했습니다.');
      }

      const resultText = data.result || '응답을 받지 못했습니다.';
      aiResult.innerText = resultText;

      // 로컬 스토리지에 저장
      localStorage.setItem('diary_content', text);
      localStorage.setItem('ai_response', resultText);
      
      // 최신 히스토리 다시 불러오기
      fetchHistory();
    } catch (err) {
      console.error('분석 오류:', err);
      aiResult.innerHTML = `<span style="color: #ef4444;">${err.message || '분석 중 오류가 발생했습니다.'}</span>`;
    }

    // 로딩 해제
    aiResult.style.opacity = '1';
    loading.style.display = 'none';
    analyzeBtn.disabled = false;
    aiResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  // 음성으로 입력하기 클릭 이벤트 (Web Speech API 구현)
  let recognition;
  let isListening = false;
  // 브라우저 호환성 확인
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    // 음성 인식 결과 처리
    recognition.addEventListener('result', (event) => {
      console.log('Speech recognition result event:', event);
      // 현재 인덱스의 결과 사용
      const transcript = event.results[event.resultIndex][0].transcript;
      console.log('Recognized transcript:', transcript);
      // 텍스트를 textarea에 삽입 (기존 내용에 추가)
      diaryInput.value = diaryInput.value ? diaryInput.value + '\n' + transcript : transcript;
      diaryInput.focus();
      // 자동 높이 조절 트리거
      diaryInput.dispatchEvent(new Event('input'));
    });

    // 인식 종료 처리
    recognition.addEventListener('end', () => {
      console.log('Speech recognition ended');
      isListening = false;
      voiceBtn.querySelector('span').innerText = '음성으로 입력하기';
      voiceBtn.style.color = '';
      voiceBtn.style.borderColor = '';
    });

    // 오류 처리
    recognition.addEventListener('error', (event) => {
      console.error('Speech recognition error:', event.error);
      isListening = false;
      voiceBtn.querySelector('span').innerText = '음성으로 입력하기';
      voiceBtn.style.color = '';
      voiceBtn.style.borderColor = '';
    });
  } else {
    console.warn('Web Speech API not supported in this browser.');
  }

  voiceBtn.addEventListener('click', () => {
    if (isListening) return; // 이미 인식 중이면 무시
    if (!recognition) {
      alert('이 브라우저는 음성 인식을 지원하지 않습니다.');
      return;
    }
    isListening = true;
    voiceBtn.querySelector('span').innerText = '음성 인식중...';
    voiceBtn.style.color = '#38bdf8';
    voiceBtn.style.borderColor = '#38bdf8';
    recognition.start();
  });

  // 텍스트 영역 자동 크기 조절
  diaryInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.max(250, this.scrollHeight) + 'px';
  });

  // 히스토리 관련 로직
  async function fetchHistory() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch('/api/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('히스토리 로드 실패');
      
      const data = await response.json();
      renderHistory(data.history || []);
    } catch (err) {
      console.error('히스토리 요청 오류:', err);
      historyContainer.innerHTML = '<p class="empty-msg">기록을 불러오는 데 실패했습니다.</p>';
    }
  }

  function renderHistory(history) {
    if (history.length === 0) {
      historyContainer.innerHTML = '<p class="empty-msg">아직 기록된 일기가 없습니다. 첫 일기를 작성해보세요!</p>';
      return;
    }

    historyContainer.innerHTML = history.map(item => {
      // timestamp가 없을 경우 id에서 추출 시도 (diary-YYYYMMDDHHMMSS)
      let dateText = '알 수 없는 날짜';
      if (item.timestamp) {
        const date = new Date(item.timestamp);
        dateText = date.toLocaleString('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
      } else if (item.id) {
        const raw = item.id.split('-')[1]; // YYYYMMDDHHMMSS
        if (raw && raw.length >= 8) {
          dateText = `${raw.slice(0, 4)}년 ${raw.slice(4, 6)}월 ${raw.slice(6, 8)}일`;
        }
      }

      return `
        <div class="diary-card">
          <div class="card-date">${dateText}</div>
          <div class="card-content">${item.content || '(내용 없음)'}</div>
          <div class="card-response">${item.response || '(분석 결과 없음)'}</div>
        </div>
      `;
    }).join('');
  }

  // 초기 실행
  fetchHistory();

  // --- 인증 로직 추가 ---
  
  // 로그인 상태 변경 감지
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth event:', event, session);
    if (session) {
      // 로그인 성공
      authContainer.style.display = 'none';
      appContainer.style.display = 'block';
      userEmailDisplay.innerText = session.user.email;
      fetchHistory(); // 로그인 후 히스토리 갱신
    } else {
      // 로그아웃 상태
      authContainer.style.display = 'block';
      appContainer.style.display = 'none';
    }
  });

  // 이메일 로그인
  loginBtn.addEventListener('click', async () => {
    const email = authEmail.value.trim();
    const password = authPassword.value;
    if (!email || !password) return alert('이메일과 비밀번호를 입력해주세요.');

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert('로그인 실패: ' + error.message);
  });

  // 이메일 회원가입
  signupBtn.addEventListener('click', async () => {
    const email = authEmail.value.trim();
    const password = authPassword.value;
    if (!email || !password) return alert('이메일과 비밀번호를 입력해주세요.');

    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert('회원가입 실패: ' + error.message);
    else alert('가입 확인 메일을 확인해주세요!');
  });

  // 구글 로그인
  googleLoginBtn.addEventListener('click', async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + window.location.pathname
      }
    });
    if (error) alert('구글 로그인 실패: ' + error.message);
  });

  // 로그아웃
  logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
  });
});
