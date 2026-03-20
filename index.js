document.addEventListener('DOMContentLoaded', () => {
  const diaryInput = document.getElementById('diary-input');
  const analyzeBtn = document.getElementById('analyze-btn');
  const voiceBtn = document.getElementById('voice-btn');
  const aiResult = document.getElementById('ai-result');
  const loading = document.getElementById('loading');

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
      // 자체 API 서버 호출 (/api/analyze)
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  // 텍스트 영역 자동 크기 조절 (선택 사항)
  diaryInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.max(250, this.scrollHeight) + 'px';
  });
});
