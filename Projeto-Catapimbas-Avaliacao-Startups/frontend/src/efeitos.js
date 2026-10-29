// Efeitos visuais (confetes), reprodução MP3 e Motor Orgânico de Batida de Coração
const CORES = ['#ff5c93', '#ffc93c', '#1fd6a0', '#35b6ff', '#7c4dff', '#ff8a3d'];
let tela = null, ctx = null, pecas = [], rodando = false;

const reduzido = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function garantir() {
  if (tela && document.body.contains(tela)) return;
  tela = document.createElement('canvas');
  tela.className = 'confete';
  tela.style.display = 'block';
  tela.setAttribute('aria-hidden', 'true');
  document.body.appendChild(tela);
  ctx = tela.getContext('2d');
}

function quadro() {
  ctx.clearRect(0, 0, tela.width, tela.height);
  pecas = pecas.filter(p => p.y < tela.height + 30 && p.vida > 0);
  for (const p of pecas) {
    p.vx *= 0.985; p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.vida -= 1;
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.globalAlpha = Math.min(1, p.vida / 40);
    ctx.fillStyle = p.cor;
    if (p.forma === 0) ctx.fillRect(-p.t / 2, -p.t / 4, p.t, p.t / 2);
    else { ctx.beginPath(); ctx.arc(0, 0, p.t / 3, 0, 6.3); ctx.fill(); }
    ctx.restore();
  }
  if (pecas.length) requestAnimationFrame(quadro); else { rodando = false; tela.remove(); tela = null; }
}

export function confete({ x = 0.5, y = 0.4, qtd = 140, forca = 1, queda = false, cores = CORES } = {}) {
  if (reduzido()) return;
  garantir();
  tela.width = innerWidth; tela.height = innerHeight;
  for (let i = 0; i < qtd; i++) {
    const ang = queda ? Math.PI / 2 : Math.random() * Math.PI * 2;
    const vel = (queda ? 1 + Math.random() * 3 : 4 + Math.random() * 11) * forca;
    pecas.push({
      x: queda ? Math.random() * tela.width : x * tela.width,
      y: queda ? -20 - Math.random() * 200 : y * tela.height,
      vx: Math.cos(ang) * vel + (queda ? Math.random() * 2 - 1 : 0), vy: Math.sin(ang) * vel - (queda ? 0 : 4),
      g: queda ? 0.05 : 0.22, t: 8 + Math.random() * 9, rot: Math.random() * 6, vr: Math.random() * 0.4 - 0.2,
      cor: cores[(Math.random() * cores.length) | 0], forma: Math.random() < 0.7 ? 0 : 1, vida: 200 + Math.random() * 120
    });
  }
  if (!rodando) { rodando = true; requestAnimationFrame(quadro); }
}

export function chuva(ms = 3500) {
  const fim = Date.now() + ms;
  const id = setInterval(() => { confete({ qtd: 20, queda: true }); if (Date.now() > fim) clearInterval(id); }, 150);
}

export function canhoes() {
  confete({ x: 0.08, y: 0.9, qtd: 100, forca: 1.5 });
  confete({ x: 0.92, y: 0.9, qtd: 100, forca: 1.5 });
}

/* ---------- Controlo Global de Volume ---------- */
let volumeGeral = 1.0;
const audioVitoria = new Audio('/vitoria(We Are The Champions-Queen).mp3');

export function definirVolumeVitoria(vol) {
  try {
    volumeGeral = Math.max(0, Math.min(1, vol));
    audioVitoria.volume = volumeGeral;
  } catch (e) {}
}

export function obterVolumeVitoria() {
  return volumeGeral;
}

/* ---------- Motor de Batida de Coração Orgânica (Equilibrado) ---------- */
let audioCtx = null;
let timerBatidaLoop = null;
let bpmAtual = 60;
let rodandoBatida = false;

function getCtx() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  } catch { return null; }
}

function tocarLubDubOrgânico() {
  if (volumeGeral <= 0) return;
  const a = getCtx(); if (!a) return;
  const t = a.currentTime;
  
  // Volume em 0.85 (próximo do teto digital de 1.0)
  const volBase = 2 * volumeGeral;

  // Filtro aberto para 220Hz (deixa passar o punch audível)
  const filtro = a.createBiquadFilter();
  filtro.type = 'lowpass';
  filtro.frequency.setValueAtTime(220, t);
  filtro.Q.setValueAtTime(1.2, t);
  filtro.connect(a.destination);

  // 1º Impacto: Lub (frequência ajustada para 75Hz para bater forte em caixas comuns)
  const osc1 = a.createOscillator(), g1 = a.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(75, t);
  osc1.frequency.exponentialRampToValueAtTime(35, t + 0.12);
  g1.gain.setValueAtTime(volBase, t);
  g1.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  osc1.connect(g1); g1.connect(filtro);
  osc1.start(t); osc1.stop(t + 0.14);

  // 2º Impacto: Dub
  const t2 = t + 0.13;
  const osc2 = a.createOscillator(), g2 = a.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(90, t2);
  osc2.frequency.exponentialRampToValueAtTime(40, t2 + 0.10);
  g2.gain.setValueAtTime(volBase * 0.8, t2);
  g2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.10);
  osc2.connect(g2); g2.connect(filtro);
  osc2.start(t2); osc2.stop(t2 + 0.12);
}

function loopBatida() {
  if (!rodandoBatida) return;
  tocarLubDubOrgânico();
  const ms = (60 / bpmAtual) * 1000;
  timerBatidaLoop = setTimeout(loopBatida, ms);
}

export function iniciarBatida(bpm = 60) {
  bpmAtual = bpm;
  if (!rodandoBatida) {
    rodandoBatida = true;
    loopBatida();
  }
}

export function setBpmBatida(novoBpm) {
  bpmAtual = novoBpm;
}

export function pararBatida() {
  rodandoBatida = false;
  if (timerBatidaLoop) {
    clearTimeout(timerBatidaLoop);
    timerBatidaLoop = null;
  }
}

/* ---------- Gestão de Áudio MP3 (Queen) ---------- */
export function musicaVitoria() {
  try {
    audioVitoria.currentTime = 0;
    audioVitoria.volume = volumeGeral;
    audioVitoria.play().catch((err) => console.warn('Aviso ao tocar áudio:', err));
  } catch (e) {}
}

export function pararVitoria() {
  try {
    audioVitoria.pause();
    audioVitoria.currentTime = 0;
  } catch (e) {}
}

// Compatibilidade
export function batidaCoracao() { iniciarBatida(90); }
export function tocarSuspense() { iniciarBatida(110); }
export function somBronze() { setBpmBatida(85); }
export function somPrata() { setBpmBatida(120); }
export const tocar = (nome) => {
  if (nome === 'fanfarra') musicaVitoria();
  if (nome === 'tambor' || nome === 'clique') setBpmBatida(100);
};
export function musicaFundo() { return () => {}; }