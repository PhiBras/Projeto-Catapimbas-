import { useEffect, useRef, useState } from 'react';
import { Icone, nota2 } from './ui.jsx';

/* Pódio: o bronze sobe primeiro, depois a prata, por último o ouro. Projetos empatados dividem a mesma posição. */
function Degrau({ pos, ranking }) {
  const itens = ranking.filter(r => r.posicao === pos);
  return (
    <div className={`degrau d${pos}` + (itens.length ? '' : ' vazio-degrau')}>
      <div className="nomes">
        {itens.length ? itens.map(r => <div key={r.id}><b>{r.nome}</b><small>{nota2(r.pontuacao)}</small></div>) : <small>Sem projeto nesta posição</small>}
      </div>
      <div className="bloco">{pos}º</div>
    </div>
  );
}
export default function Podio({ ranking }) {
  return <div className="podio"><Degrau pos={2} ranking={ranking} /><Degrau pos={1} ranking={ranking} /><Degrau pos={3} ranking={ranking} /></div>;
}

/* Confete (canvas) e som opcional (Web Audio). */
export function useCelebracao() {
  const tela = useRef(null);
  const celebrar = som => {
    const c = tela.current; if (!c) return;
    const ctx = c.getContext('2d');
    c.width = innerWidth; c.height = innerHeight; c.style.display = 'block';
    const pecas = Array.from({ length: 200 }, () => ({ x: Math.random() * c.width, y: -Math.random() * c.height / 1.5, v: 2 + Math.random() * 4, r: 6 + Math.random() * 7, h: Math.random() * 360, d: Math.random() * 3 - 1.5 }));
    let quadros = 0;
    (function animar() {
      ctx.clearRect(0, 0, c.width, c.height);
      pecas.forEach(p => { p.y += p.v; p.x += p.d; ctx.fillStyle = `hsl(${p.h} 90% 58%)`; ctx.fillRect(p.x, p.y, p.r, p.r * 0.6); });
      if (++quadros < 320) requestAnimationFrame(animar); else c.style.display = 'none';
    })();
    if (som) {
      try {
        const audio = new AudioContext();
        [523, 659, 784, 1047, 1319].forEach((freq, i) => {
          const osc = audio.createOscillator(), vol = audio.createGain(), t = audio.currentTime + i * 0.17;
          osc.frequency.value = freq; osc.connect(vol); vol.connect(audio.destination);
          vol.gain.setValueAtTime(0.15, t); vol.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
          osc.start(t); osc.stop(t + 0.4);
        });
      } catch { /* navegador sem suporte a áudio */ }
    }
  };
  return [tela, celebrar];
}

/* Modo apresentação: tela cheia com controles para iniciar, repetir e silenciar. */
export function Apresentacao({ titulo, ranking, aoFechar }) {
  const [tela, celebrar] = useCelebracao();
  const [som, setSom] = useState(true);
  const [rodada, setRodada] = useState(0);
  useEffect(() => {
    const tecla = e => e.key === 'Escape' && aoFechar();
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [aoFechar]);
  const iniciar = () => { setRodada(rodada + 1); celebrar(som); };   // nova rodada remonta o pódio e repete a animação

  return (
    <div className="apresentacao" role="dialog" aria-label="Modo apresentação">
      <canvas ref={tela} className="confete" />
      <h2>{titulo}</h2>
      <div style={{ width: '100%' }} key={rodada}><Podio ranking={ranking} /></div>
      <div className="acoes">
        <button className="botao" onClick={iniciar}><Icone nome="festa" />{rodada ? 'Repetir celebração' : 'Iniciar celebração'}</button>
        <button className="botao sec" onClick={() => setSom(!som)} aria-pressed={som}><Icone nome={som ? 'som' : 'mudo'} />{som ? 'Som ligado' : 'Som desligado'}</button>
        <button className="botao sec" onClick={aoFechar}><Icone nome="x" />Fechar</button>
      </div>
    </div>
  );
}
