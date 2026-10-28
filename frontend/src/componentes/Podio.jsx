import { useEffect, useState } from 'react';
import { Icone, nota2 } from './ui.jsx';
import { canhoes, chuva, confete, musicaVitoria, definirVolumeVitoria, obterVolumeVitoria, pararVitoria, iniciarBatida, setBpmBatida, pararBatida } from '../efeitos.js';

const COROA = { 1: '👑' };

function Degrau({ pos, ranking, visivel = true }) {
  const itens = ranking.filter(r => r.posicao === pos);
  return (
    <div className={`degrau d${pos}` + (itens.length ? '' : ' vazio-degrau') + (visivel ? ' revelado' : ' oculto')}>
      <div className="nomes">
        {visivel && itens.length && COROA[pos] ? <span className="coroa" aria-hidden="true">{COROA[pos]}</span> : null}
        {visivel && itens.length ? (
          itens.map(r => (
            <div key={r.id} className="item-vencedor">
              <b>{r.nome}</b><br /><small>{nota2(r.pontuacao)} pts</small>
            </div>
          ))
        ) : (
          <small>{visivel ? 'Sem projeto nesta posição' : '???'}</small>
        )}
      </div>
      <div className="bloco">{pos}º</div>
    </div>
  );
}

export default function Podio({ ranking, revelarTodos = true }) {
  return (
    <div className="podio">
      <Degrau pos={2} ranking={ranking} visivel={revelarTodos} />
      <Degrau pos={1} ranking={ranking} visivel={revelarTodos} />
      <Degrau pos={3} ranking={ranking} visivel={revelarTodos} />
    </div>
  );
}

export function Apresentacao({ titulo, ranking, aoFechar }) {
  const [etapa, setEtapa] = useState(0);
  const [processando, setProcessando] = useState(false);
  const [volume, setVolume] = useState(() => obterVolumeVitoria() ?? 1);

  useEffect(() => {
    iniciarBatida(60);

    const tecla = e => e.key === 'Escape' && aoFechar();
    window.addEventListener('keydown', tecla);
    return () => {
      window.removeEventListener('keydown', tecla);
      pararBatida();
      pararVitoria();
    };
  }, [aoFechar]);

  function alterarVolume(novoVol) {
    setVolume(novoVol);
    definirVolumeVitoria(novoVol);
  }

  function avançar() {
    if (processando) return;

    if (etapa === 0) {
      setEtapa(1);
      setBpmBatida(85);
      confete({ x: 0.78, y: 0.65, qtd: 45, forca: 0.9, cores: ['#ffc794', '#e39a5b', '#ffffff'] });
    } else if (etapa === 1) {
      setEtapa(2);
      setBpmBatida(120);
      confete({ x: 0.22, y: 0.65, qtd: 55, forca: 1.0, cores: ['#ffffff', '#b4bfd3', '#35b6ff'] });
    } else if (etapa === 2) {
      setProcessando(true);
      setEtapa(3);
      
      setBpmBatida(155);
      musicaVitoria();

      setTimeout(() => {
        pararBatida();
        setEtapa(4);
        setProcessando(false);
        
        confete({ x: 0.5, y: 0.5, qtd: 80, forca: 1.4, cores: ['#ffc93c', '#ffe875', '#ffffff', '#ff8a3d'] });

        setTimeout(() => {
          canhoes();
          chuva(3500);
        }, 250);
      }, 4000);
    }
  }

  function reiniciar() {
    pararVitoria();
    setEtapa(0);
    setProcessando(false);
    iniciarBatida(60);
  }

  return (
    <div className="apresentacao" role="dialog" aria-label="Modo apresentação">
      <div className="apresentacao-cabecalho">
        <small className="tag-festa">🏆 CERIMÓNIA DE PREMIAÇÃO</small>
        <h2>{titulo}</h2>
      </div>

      <div className="palco-apresentacao">
        {etapa === 1 && (
          <div className="cortina-suspense">
            <div className="tag-revelacao bronze">🥉 3º Lugar Revelado!</div>
          </div>
        )}

        {etapa === 2 && (
          <div className="cortina-suspense">
            <div className="tag-revelacao prata">🥈 2º Lugar Revelado!</div>
          </div>
        )}

        {etapa === 3 && (
          <div className="cortina-suspense">
            <div className="rufar-texto">
              <span className="rufar-icone">💓</span>
              <span>E O GRANDE VENCEDOR É...</span>
              <span className="rufar-icone">💓</span>
            </div>
          </div>
        )}

        <div className="podio podio-apresentacao">
          <Degrau pos={2} ranking={ranking} visivel={etapa >= 2} />
          <Degrau pos={1} ranking={ranking} visivel={etapa === 4} />
          <Degrau pos={3} ranking={ranking} visivel={etapa >= 1} />
        </div>
      </div>

      <div className="acoes-festa">
        {etapa < 4 ? (
          <button className="botao festa gigante" disabled={processando} onClick={avançar}>
            <Icone nome="trofeu" tam={22} />
            {etapa === 0 && 'Iniciar Revelação (3º Lugar)'}
            {etapa === 1 && 'Revelar 2º Lugar'}
            {etapa === 2 && '🔥 Revelar o Grande Campeão!'}
            {etapa === 3 && 'A apresentar o Campeão...'}
          </button>
        ) : (
          <button className="botao festa gigante" onClick={reiniciar}>
            <Icone nome="festa" tam={22} /> Repetir Cerimónia
          </button>
        )}

        <div className="controle-volume" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#fff', background: 'rgba(12, 9, 30, 0.92)', border: '1px solid rgba(255,255,255,0.2)', padding: '8px 14px', borderRadius: '12px' }}>
          <button className="botao sec pequeno icone" style={{ color: '#fff', border: 'none', background: 'transparent', padding: '2px' }} onClick={() => alterarVolume(volume > 0 ? 0 : 1)} title={volume === 0 ? 'Ativar som' : 'Mudar para mudo'} aria-label={volume === 0 ? 'Ativar som' : 'Silenciar'}>
            <Icone nome={volume === 0 ? 'mudo' : 'som'} tam={18} />
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => alterarVolume(parseFloat(e.target.value))}
            title="Ajustar Volume"
            style={{
              width: '85px',
              height: '6px',
              padding: 0,
              margin: 0,
              border: 'none',
              background: 'rgba(255,255,255,0.25)',
              borderRadius: '4px',
              cursor: 'pointer',
              accentColor: '#ffc93c',
              boxShadow: 'none'
            }}
          />
          <small style={{ color: '#fff', fontWeight: 'bold', minWidth: '34px', textAlign: 'right' }}>{Math.round(volume * 100)}%</small>
        </div>

        <button className="botao sec" onClick={aoFechar}>
          <Icone nome="x" /> Fechar
        </button>
      </div>
    </div>
  );
}