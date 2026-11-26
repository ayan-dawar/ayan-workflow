const SCENES = [
  {
    duration: 4800,
    mark: 'SCENE 01 / 08',
    caption: '3:00 AM. One pizza order. No name. No number.',
    narration:
      'At exactly three in the morning, a phone lit up. One pizza order. No name. No number. Just an address at the end of a dead end street.',
  },
  {
    duration: 4800,
    mark: 'SCENE 02 / 08',
    caption: 'He picked up the steaming box and rode into the rain.',
    narration:
      'The rider should have ignored it. Instead, he picked up the steaming box and rode out into the rain.',
  },
  {
    duration: 4800,
    mark: 'SCENE 03 / 08',
    caption: 'The streets were empty. Too empty.',
    narration:
      'The streets were empty. Too empty. Not a single car, not a single lit window. Just the hum of his engine and the smell of wet asphalt.',
  },
  {
    duration: 4800,
    mark: 'SCENE 04 / 08',
    caption: 'An old house waited at the end of the road.',
    narration:
      'At the end of the road, an old house waited. Its upstairs window flickered, like someone was watching.',
  },
  {
    duration: 4800,
    mark: 'SCENE 05 / 08',
    caption: 'The door opened by itself.',
    narration:
      'He knocked. No answer. Then the door opened by itself. Slowly. Silently. As if it had been waiting for him.',
  },
  {
    duration: 4800,
    mark: 'SCENE 06 / 08',
    caption: 'The photograph showed him — ten years younger.',
    narration:
      'Inside, a dusty table held an old photograph. It showed him, ten years younger, standing in this very room.',
  },
  {
    duration: 4800,
    mark: 'SCENE 07 / 08',
    caption: 'He turned around. The doorway was gone.',
    narration:
      'He placed the pizza down and turned to leave. The doorway was gone. Only a blank wall remained.',
  },
  {
    duration: 6400,
    mark: 'SCENE 08 / 08',
    caption: '“You’ve finally come home.”',
    narration:
      'Inside the box, a handwritten note curled at the edges. It said: you have finally come home.',
  },
];

const short = document.getElementById('short');
const scenes = [...document.querySelectorAll('.scene')];
const progressItems = [...document.querySelectorAll('.progress__item')];
const sceneMark = document.getElementById('sceneMark');
const captionText = document.getElementById('captionText');
const timeChip = document.getElementById('timeChip');
const playOverlay = document.getElementById('playOverlay');
const startBtn = document.getElementById('startBtn');
const playBtn = document.getElementById('playBtn');
const restartBtn = document.getElementById('restartBtn');
const voiceBtn = document.getElementById('voiceBtn');
const score = document.getElementById('score');

const starts = [];
let total = 0;
SCENES.forEach((scene, index) => {
  starts[index] = total;
  total += scene.duration;
  document.documentElement.style.setProperty(`--d${index}`, `${scene.duration}ms`);
});

let elapsed = 0;
let playing = false;
let done = false;
let started = false;
let lastTime = 0;
let rafId = null;
let activeIndex = -1;
let leaveTimer = null;
let voiceEnabled = true;
let finalLineSpoken = false;

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function findIndex(time) {
  for (let i = SCENES.length - 1; i >= 0; i -= 1) {
    if (time >= starts[i]) return i;
  }
  return 0;
}

function formatTime(ms) {
  const seconds = Math.max(0, ms / 1000);
  const whole = Math.floor(seconds);
  const tenth = Math.floor((seconds - whole) * 10);
  return `0:${String(whole).padStart(2, '0')}.${tenth}`;
}

function cancelSpeech() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

function preferredVoice() {
  if (!('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => /Samantha|Daniel|Google UK English|Microsoft David/i.test(v.name)) ||
    voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('en')) ||
    voices[0] ||
    null
  );
}

function speak(text, rate = 0.92, pitch = 0.76) {
  if (!voiceEnabled || !('speechSynthesis' in window)) return;
  cancelSpeech();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = rate;
  utterance.pitch = pitch;
  utterance.volume = 0.95;
  const voice = preferredVoice();
  if (voice) utterance.voice = voice;
  window.speechSynthesis.resume();
  window.speechSynthesis.speak(utterance);
}

function updateProgress() {
  const index = done ? SCENES.length - 1 : findIndex(elapsed);
  const scene = SCENES[index];
  const progress = done
    ? 1
    : clamp((elapsed - starts[index]) / scene.duration);
  const remaining = done ? 0 : scene.duration * (1 - progress);

  timeChip.textContent = formatTime(remaining);
  progressItems.forEach((item, itemIndex) => {
    const fill = itemIndex < index ? 1 : itemIndex === index ? (done ? 1 : progress) : 0;
    item.style.setProperty('--fill', fill);
  });

  if (elapsed >= total - 1000 && !finalLineSpoken && voiceEnabled && started) {
    finalLineSpoken = true;
    speak('Part two?', 0.78, 0.58);
  }
}

function activate(index, force = false) {
  if (index === activeIndex && !force) return;

  const next = document.getElementById(`scene-${index}`);
  const previous = scenes.find((scene) => scene.classList.contains('is-active'));

  clearTimeout(leaveTimer);
  scenes.forEach((scene) => scene.classList.remove('is-active', 'is-leaving'));

  if (previous && previous !== next && !force) {
    previous.classList.add('is-leaving');
    leaveTimer = setTimeout(() => previous.classList.remove('is-leaving'), 540);
  }

  void short.offsetWidth;

  next.classList.add('is-active');
  activeIndex = index;
  sceneMark.textContent = SCENES[index].mark;
  captionText.textContent = SCENES[index].caption;

  if (started && !done) speak(SCENES[index].narration);
}

function finish() {
  cancelAnimationFrame(rafId);
  rafId = null;
  elapsed = total;
  done = true;
  playing = false;
  score.pause();
  sceneMark.textContent = 'THE END';
  captionText.textContent = 'PART 2? — tell me if you want the next one.';
  timeChip.textContent = '0:00.0';
  progressItems.forEach((item) => item.style.setProperty('--fill', 1));
  short.classList.remove('is-paused');
  playBtn.textContent = 'Replay';
  playBtn.setAttribute('aria-label', 'Replay');
}

function tick(now) {
  if (!playing) return;

  if (!lastTime) lastTime = now;
  const delta = Math.min(now - lastTime, 80);
  lastTime = now;
  elapsed = Math.min(total, elapsed + delta);

  const index = findIndex(elapsed);
  activate(index);
  updateProgress();

  if (elapsed >= total) {
    finish();
    return;
  }

  rafId = requestAnimationFrame(tick);
}

function begin() {
  if (started) return;
  started = true;
  playOverlay.classList.add('is-hidden');
  voiceBtn.setAttribute('aria-pressed', String(voiceEnabled));
  score.currentTime = 0;
  score.play().catch(() => {});
  playBtn.textContent = 'Pause';
  playBtn.setAttribute('aria-label', 'Pause');
  activate(0, true);
  speak(SCENES[0].narration);
  playing = true;
  lastTime = 0;
  rafId = requestAnimationFrame(tick);
}

function play() {
  if (!started) {
    begin();
    return;
  }
  if (done) {
    seek(0);
    return;
  }
  if (playing) return;

  playing = true;
  lastTime = 0;
  short.classList.remove('is-paused');
  score.play().catch(() => {});
  if ('speechSynthesis' in window) window.speechSynthesis.resume();
  playBtn.textContent = 'Pause';
  playBtn.setAttribute('aria-label', 'Pause');
  rafId = requestAnimationFrame(tick);
}

function pause() {
  if (!playing) return;
  playing = false;
  cancelAnimationFrame(rafId);
  rafId = null;
  short.classList.add('is-paused');
  score.pause();
  if ('speechSynthesis' in window) window.speechSynthesis.pause();
  playBtn.textContent = 'Play';
  playBtn.setAttribute('aria-label', 'Play');
}

function togglePlay() {
  if (playing) pause();
  else play();
}

function seek(time) {
  if (!started) {
    started = true;
    playOverlay.classList.add('is-hidden');
    score.currentTime = 0;
    score.play().catch(() => {});
  }

  cancelAnimationFrame(rafId);
  rafId = null;
  cancelSpeech();

  elapsed = clamp(time, 0, total - 1);
  done = false;
  playing = true;
  lastTime = 0;
  finalLineSpoken = false;
  activeIndex = -1;

  clearTimeout(leaveTimer);
  short.classList.remove('is-paused');
  scenes.forEach((scene) => scene.classList.remove('is-active', 'is-leaving'));
  void short.offsetWidth;

  score.currentTime = elapsed / 1000;
  score.play().catch(() => {});
  playBtn.textContent = 'Pause';
  playBtn.setAttribute('aria-label', 'Pause');

  activate(findIndex(elapsed), true);
  updateProgress();
  rafId = requestAnimationFrame(tick);
}

startBtn.addEventListener('click', begin);
playBtn.addEventListener('click', togglePlay);
restartBtn.addEventListener('click', () => seek(0));

progressItems.forEach((item, index) => {
  item.addEventListener('click', () => seek(starts[index]));
});

voiceBtn.addEventListener('click', () => {
  voiceEnabled = !voiceEnabled;
  voiceBtn.setAttribute('aria-pressed', String(voiceEnabled));
  voiceBtn.textContent = `Voice: ${voiceEnabled ? 'on' : 'off'}`;
  if (!voiceEnabled) cancelSpeech();
  else if (started && !done) speak(SCENES[activeIndex < 0 ? 0 : activeIndex].narration);
});

document.addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLButtonElement) return;
  if (event.code === 'Space') {
    event.preventDefault();
    togglePlay();
  } else if (event.key.toLowerCase() === 'r') {
    seek(0);
  }
});

if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => preferredVoice();
}

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reducedMotion) {
  started = true;
  playOverlay.classList.add('is-hidden');
  elapsed = total;
  done = true;
  activate(SCENES.length - 1, true);
  finish();
} else {
  activate(0, true);
  updateProgress();
}
