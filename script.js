/* =========================================================
   사운드 합성 (오디오 파일 없이 Web Audio API로 생성)
   ========================================================= */
let audioCtx = null;
function getCtx(){
  if(!audioCtx){
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if(audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

// 키캡 "도각" 클릭 소리
// ▼▼▼ 원하는 mp3로 바꾸려면: 아래 파일명을 본인이 준비한 mp3 파일명으로 변경하고,
//     이 html 파일과 "같은 폴더"에 그 mp3 파일을 넣어두면 됩니다.
//     예) const CLICK_SOUND_FILE = 'my-click-sound.mp3';
const CLICK_SOUND_FILE = 'leaf-crunch2.mp3';
const clickAudioTemplate = new Audio(CLICK_SOUND_FILE);
const CORRECT_SOUND_FILE = 'clapping.mp3';
const correctAudioTemplate = new Audio(CORRECT_SOUND_FILE);
const ENVELOPE_SOUND_FILE = 'envelope.mp3';
const envelopeAudioTemplate = new Audio(ENVELOPE_SOUND_FILE);
clickAudioTemplate.preload = 'auto';

function playClickSound(){
  // cloneNode로 재생해야 연속으로 빠르게 눌러도 소리가 겹쳐서 잘 재생됩니다
  const sfx = clickAudioTemplate.cloneNode();
  sfx.volume = 1.0;
  sfx.play().catch(()=>{
    // mp3 파일을 아직 준비하지 않았거나 경로가 잘못된 경우를 대비한 예비 효과음(합성음)
    playClickFallback();
  });
}


// 봉투 여는 "촤르륵" 종이 넘기는 소리 (짧은 노이즈 버스트를 여러 번 겹쳐서 리플 효과 재현)
function playEnvelopeSound(){
  const sfx = envelopeAudioTemplate.cloneNode();
  sfx.play();
}

// 음성 효과음 (No! / Yeah~)
function speak(text, {pitch=1, rate=1} = {}){
  if(!('speechSynthesis' in window)) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'en-US';
  utter.pitch = pitch;
  utter.rate = rate;
  utter.volume = 1;
  window.speechSynthesis.cancel(); // 이전 발화 취소 후 재생
  window.speechSynthesis.speak(utter);
}

/* =========================================================
   화면 전환 (원형 와이프 효과)
   ========================================================= */
const wipeOverlay = document.getElementById('wipe-overlay');

function wipeTransition(x, y, hideEl, showEl, showDisplay='flex'){
  wipeOverlay.style.setProperty('--x', x + 'px');
  wipeOverlay.style.setProperty('--y', y + 'px');

  wipeOverlay.classList.remove('shrink');
  // 강제 리플로우로 애니메이션 재시작 보장
  void wipeOverlay.offsetWidth;
  wipeOverlay.classList.add('expand');

  setTimeout(()=>{
    hideEl.style.display = 'none';   // 인라인 스타일도 명시적으로 지워야 완전히 사라짐
    hideEl.classList.add('hidden');
    showEl.classList.remove('hidden');
    showEl.style.display = showDisplay;

    wipeOverlay.classList.remove('expand');
    void wipeOverlay.offsetWidth;
    wipeOverlay.classList.add('shrink');
  }, 800);
}

/* =========================================================
   1단계: 봉투 화면
   ========================================================= */
const envelopeWrap = document.getElementById('envelope-wrap');
const envelope = document.getElementById('envelope');
const stageEnvelope = document.getElementById('stage-envelope');
const stageQuestion = document.getElementById('stage-question');

envelopeWrap.addEventListener('click', (e)=>{
  if(envelope.classList.contains('open')) return;
  getCtx(); // 사용자 제스처 시점에 오디오 컨텍스트 활성화
  playEnvelopeSound();
  envelope.classList.add('open');

  // 봉투에서 하트 파편이 튀어나오는 효과
  const rect = envelope.getBoundingClientRect();
  const cx = rect.left + rect.width/2;
  const cy = rect.top + rect.height/2;
  spawnPopHearts(cx, cy);

  setTimeout(()=>{
    wipeTransition(cx, cy, stageEnvelope, stageQuestion);
  }, 550);
});

function spawnPopHearts(cx, cy){
  const count = 10;
  for(let i=0;i<count;i++){
    const h = document.createElement('div');
    h.className = 'pop-heart';
    h.textContent = ['💖','💕','💗','💓'][Math.floor(Math.random()*4)];
    h.style.left = cx + 'px';
    h.style.top = cy + 'px';
    document.body.appendChild(h);

    const angle = Math.random()*Math.PI*2;
    const dist = 60 + Math.random()*90;
    const dx = Math.cos(angle)*dist;
    const dy = Math.sin(angle)*dist - 40;

    h.animate([
      { transform:'translate(-50%,-50%) scale(0.4)', opacity:1 },
      { transform:`translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1.1)`, opacity:0 }
    ], { duration: 900 + Math.random()*400, easing:'ease-out' });

    setTimeout(()=> h.remove(), 1400);
  }
}

/* =========================================================
   2단계: 키캡 질문 화면
   ========================================================= */
let gridLocked = false;
const keycaps = document.querySelectorAll('.keycap');
const stageFinal = document.getElementById('final-stage');

keycaps.forEach(cap=>{
  cap.addEventListener('click', ()=>{
    if(gridLocked) return;

    playClickSound();
    const val = parseInt(cap.dataset.value, 10);

    if(val === 400){
      gridLocked = true;
      keycaps.forEach(c => c.classList.add('locked'));

      // 클릭 소리와 "동시에" 하트+빛줄기가 사방으로 쏟아짐
      const rect = cap.getBoundingClientRect();
      const cx = rect.left + rect.width/2;
      const cy = rect.top + rect.height/2;
      spawnRays(cx, cy);
      burstHearts(cx, cy);

      correctAudioTemplate.cloneNode().play();
      wipeTransition(cx, cy, stageQuestion, stageFinal, 'flex');

    } else if(val === 3){
      // 이모티콘은 누르자마자 바로 표시
      const rect = cap.getBoundingClientRect();
      const cx = rect.left + rect.width/2;
      const cy = rect.top + rect.height/2;
      showSadEmoji(cx, cy);

      // 음성 효과음은 클릭 소리가 끝나고 0.8초 뒤에 재생
      setTimeout(()=>{
        speak('No!', {pitch:0.75, rate:1.05});
      }, 300);

    } else if(val === 100){
      // 이모티콘은 누르자마자 바로 표시
      const rect = cap.getBoundingClientRect();
      const cx = rect.left + rect.width/2;
      const cy = rect.top + rect.height/2;
      showSurpriseEmoji(cx, cy);

      // 음성 효과음은 클릭 소리가 끝나고 0.8초 뒤에 재생
      setTimeout(()=>{
        speak('No!', {pitch:0.75, rate:1.05});
      }, 300);

    } else if(val === 250){
      // 이모티콘은 누르자마자 바로 표시
      const rect = cap.getBoundingClientRect();
      const cx = rect.left + rect.width/2;
      const cy = rect.top + rect.height/2;
      showAngryEmoji(cx, cy);

      // 음성 효과음은 클릭 소리가 끝나고 0.8초 뒤에 재생
      setTimeout(()=>{
        speak('No!', {pitch:0.75, rate:1.05});
      }, 300);

    } else if(val === 300){
      // 이모티콘은 누르자마자 바로 표시
      const rect = cap.getBoundingClientRect();
      const cx = rect.left + rect.width/2;
      const cy = rect.top + rect.height/2;
      showZzzEmoji(cx, cy);

      // 음성 효과음은 클릭 소리가 끝나고 0.8초 뒤에 재생
      setTimeout(()=>{
        speak('No!', {pitch:0.75, rate:1.05});
      }, 300);

    } else if(val === 500){
      // 이모티콘은 누르자마자 바로 표시
      const rect = cap.getBoundingClientRect();
      const cx = rect.left + rect.width/2;
      const cy = rect.top + rect.height/2;
      showSmileEmoji(cx, cy);

      // 음성 효과음은 클릭 소리가 끝나고 0.8초 뒤에 재생
      setTimeout(()=>{
        speak('No!', {pitch:0.75, rate:1.05});
      }, 300);

    } else if(val === 750){
      // 이모티콘은 누르자마자 바로 표시
      const rect = cap.getBoundingClientRect();
      const cx = rect.left + rect.width/2;
      const cy = rect.top + rect.height/2;
      showKisscatEmoji(cx, cy);

      // 음성 효과음은 클릭 소리가 끝나고 0.8초 뒤에 재생
      setTimeout(()=>{
        speak('No!', {pitch:0.75, rate:1.05});
      }, 300);

    } else if(val === 900){
      // 이모티콘은 누르자마자 바로 표시
      const rect = cap.getBoundingClientRect();
      const cx = rect.left + rect.width/2;
      const cy = rect.top + rect.height/2;
      showPartyEmoji(cx, cy);

      // 음성 효과음은 클릭 소리가 끝나고 0.8초 뒤에 재생
      setTimeout(()=>{
        speak('No!', {pitch:0.75, rate:1.05});
      }, 300);

    } else {
      // 이모티콘은 누르자마자 바로 표시
      const rect = cap.getBoundingClientRect();
      const cx = rect.left + rect.width/2;
      const cy = rect.top + rect.height/2;
      showHeartEmoji(cx, cy);

      // 음성 효과음은 클릭 소리가 끝나고 0.8초 뒤에 재생
      setTimeout(()=>{
        speak('No!', {pitch:0.75, rate:1.05});
      }, 300);
    }
  });
});

function showAngryEmoji(cx, cy){
  const el = document.createElement('div');
  el.className = 'angry-pop';
  el.textContent = '🤬';
  el.style.left = cx + 'px';
  el.style.top = cy + 'px';
  document.body.appendChild(el);
  setTimeout(()=> el.remove(), 1200);
}

function showSadEmoji(cx, cy){
  const el = document.createElement('div');
  el.className = 'sad-pop';
  el.textContent = '😭';
  el.style.left = cx + 'px';
  el.style.top = cy + 'px';
  document.body.appendChild(el);
  setTimeout(()=> el.remove(), 1200);
}

function showSurpriseEmoji(cx, cy){
  const el = document.createElement('div');
  el.className = 'surprise-pop';
  el.textContent = '😮';
  el.style.left = cx + 'px';
  el.style.top = cy + 'px';
  document.body.appendChild(el);
  setTimeout(()=> el.remove(), 1200);
}
function showZzzEmoji(cx, cy){
  const el = document.createElement('div');
  el.className = 'zzz-pop';
  el.textContent = '😴';
  el.style.left = cx + 'px';
  el.style.top = cy + 'px';
  document.body.appendChild(el);
  setTimeout(()=> el.remove(), 1200);
}

function showSmileEmoji(cx, cy){
  const el = document.createElement('div');
  el.className = 'smile-pop';
  el.textContent = '😊';
  el.style.left = cx + 'px';
  el.style.top = cy + 'px';
  document.body.appendChild(el);
  setTimeout(()=> el.remove(), 1200);
}

function showKisscatEmoji(cx, cy){
  const el = document.createElement('div');
  el.className = 'kisscat-pop';
  el.textContent = '😽';
  el.style.left = cx + 'px';
  el.style.top = cy + 'px';
  document.body.appendChild(el);
  setTimeout(()=> el.remove(), 1200);
}

function showPartyEmoji(cx, cy){
  const el = document.createElement('div');
  el.className = 'party-pop';
  el.textContent = '🥳';
  el.style.left = cx + 'px';
  el.style.top = cy + 'px';
  document.body.appendChild(el);
  setTimeout(()=> el.remove(), 1200);
}

function showHeartEmoji(cx, cy){
  const el = document.createElement('div');
  el.className = 'heart-pop';
  el.textContent = '❤️';
  el.style.left = cx + 'px';
  el.style.top = cy + 'px';
  document.body.appendChild(el);
  setTimeout(()=> el.remove(), 1200);
}

function burstHearts(cx, cy){
  const emojis = ['❤️','💖','💗','💕','💓','💘','💞'];
  const sparkles = ['✨','⭐'];

  // 안쪽 링(작고 빠르게) + 바깥쪽 링(크고 느리게) 두 겹으로 터뜨려서
  // 참고 사진처럼 훨씬 조밀하고 폭발적인 느낌을 냄
  const rings = [
    { count: 16, minDist: 70,  maxDist: 150, minDur: 700,  maxDur: 1000, minScale:0.9, maxScale:1.5 },
    { count: 20, minDist: 150, maxDist: 260, minDur: 1000, maxDur: 1500, minScale:1.1, maxScale:1.8 }
  ];

  rings.forEach(ring=>{
    for(let i=0;i<ring.count;i++){
      const h = document.createElement('div');
      h.className = 'heart-particle';
      const isSparkle = Math.random() < 0.22;
      h.textContent = isSparkle
        ? sparkles[Math.floor(Math.random()*sparkles.length)]
        : emojis[Math.floor(Math.random()*emojis.length)];
      h.style.left = cx + 'px';
      h.style.top = cy + 'px';
      h.style.fontSize = (isSparkle ? 16 : 20) + Math.random()*10 + 'px';
      document.body.appendChild(h);

      const angle = (Math.PI*2 / ring.count) * i + (Math.random()*0.5-0.25);
      const dist = ring.minDist + Math.random()*(ring.maxDist-ring.minDist);
      const dx = Math.cos(angle)*dist;
      const dy = Math.sin(angle)*dist;
      const scale = ring.minScale + Math.random()*(ring.maxScale-ring.minScale);
      const duration = ring.minDur + Math.random()*(ring.maxDur-ring.minDur);

      h.animate([
        { transform:'translate(-50%,-50%) scale(0.2) rotate(0deg)', opacity:1 },
        { transform:`translate(calc(-50% + ${dx*0.6}px), calc(-50% + ${dy*0.6}px)) scale(${scale}) rotate(${Math.random()*120-60}deg)`, opacity:1, offset:0.5 },
        { transform:`translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(${scale*0.9}) rotate(${Math.random()*220-110}deg)`, opacity:0 }
      ], { duration, easing:'cubic-bezier(.15,.7,.3,1)' });

      setTimeout(()=> h.remove(), duration + 100);
    }
  });
}

// 하트 폭발과 함께 방사형으로 뻗어나가는 빛줄기 효과
function spawnRays(cx, cy){
  const rayCount = 16;
  for(let i=0;i<rayCount;i++){
    const ray = document.createElement('div');
    ray.className = 'burst-ray';
    const angle = (360/rayCount)*i + (Math.random()*14-7);
    const length = 90 + Math.random()*110;

    ray.style.left = cx + 'px';
    ray.style.top = cy + 'px';
    ray.style.height = length + 'px';
    ray.style.transformOrigin = 'top center';
    ray.style.transform = `rotate(${angle}deg) scaleY(0)`;
    document.body.appendChild(ray);

    ray.animate([
      { transform:`rotate(${angle}deg) scaleY(0)`, opacity:1 },
      { transform:`rotate(${angle}deg) scaleY(1)`, opacity:0.9, offset:0.4 },
      { transform:`rotate(${angle}deg) scaleY(1.15)`, opacity:0 }
    ], { duration: 550 + Math.random()*250, easing:'ease-out' });

    setTimeout(()=> ray.remove(), 900);
  }
}

/* =========================================================
   3단계: 다시보기 버튼 (선택 기능)
   ========================================================= */
document.getElementById('replay-btn').addEventListener('click', ()=>{
  location.reload();
});
