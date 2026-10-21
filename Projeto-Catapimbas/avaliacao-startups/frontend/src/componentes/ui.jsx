import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

/* ---------- Ícones (SVG próprio, sem biblioteca) ---------- */
const ICONES = {
  painel: <><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></>,
  projetos: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  bancas: <><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="m9 14 2 2 4-4" /></>,
  trofeu: <><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" /></>,
  pessoas: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 3-5.5 6.5-5.5s6.5 1.9 6.5 5.5" /><circle cx="17" cy="9" r="2.5" /><path d="M17 14c3 0 4.5 1.6 4.5 4" /></>,
  predio: <path d="M4 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16M14 9h5a1 1 0 0 1 1 1v11M2 21h20M8 8h2M8 12h2M8 16h2" />,
  usuario: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-6 8-6s8 1.6 8 6" /></>,
  sair: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
  busca: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>,
  mais: <path d="M12 5v14M5 12h14" />,
  baixar: <path d="M12 3v12M7 11l5 5 5-5M4 21h16" />,
  x: <path d="M18 6 6 18M6 6l12 12" />,
  check: <path d="m5 12 5 5 9-10" />,
  alerta: <><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></>,
  chave: <><circle cx="8" cy="15" r="4" /><path d="m11 12 9-9M16 7l3 3" /></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  esquerda: <path d="m15 18-6-6 6-6" />,
  direita: <path d="m9 18 6-6-6-6" />,
  som: <path d="M11 5 6 9H3v6h3l5 4zM16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12" />,
  mudo: <path d="M11 5 6 9H3v6h3l5 4zM22 9l-6 6M16 9l6 6" />,
  festa: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" />,
  lua: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />,
  sol: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  filtro: <path d="M3 5h18l-7 8v6l-4 2v-8z" />,
  relogio: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  lixo: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
};
export const Icone = ({ nome, tam = 18 }) => (
  <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONES[nome]}</svg>
);

/* ---------- Rótulos legíveis para os valores do banco ---------- */
export const STATUS_PROJETO = { ideacao: ['Ideação', 'cinza'], em_andamento: ['Em andamento', 'azul'], concluido: ['Concluído', 'verde'], arquivado: ['Arquivado', 'cinza'] };
export const SITUACAO = { pendente: ['Pendente', 'amarelo'], aprovado: ['Aprovado', 'verde'], recusado: ['Recusado', 'vermelho'], bloqueado: ['Bloqueado', 'cinza'] };
export const PAPEL = { admin: 'Administrador', coordenador: 'Coordenador', orientador: 'Orientador', avaliador: 'Avaliador', aluno: 'Aluno' };
export const nota2 = n => (n == null ? '—' : Number(n).toFixed(2).replace('.', ','));

export const Selo = ({ tipo = 'cinza', children }) => <span className={'selo ' + tipo}>{children}</span>;
export const SeloMapa = ({ mapa, valor }) => { const [rotulo, tipo] = mapa[valor] || [valor, 'cinza']; return <Selo tipo={tipo}>{rotulo}</Selo>; };

/* ---------- Avatares com iniciais ---------- */
const iniciais = nome => nome.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');
const matiz = nome => [...nome].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
export const Avatar = ({ nome = '?', tam = 32 }) => (
  <span className="avatar" title={nome} style={{ width: tam, height: tam, background: `hsl(${matiz(nome)} 42% 38%)`, fontSize: tam * 0.38 }}>{iniciais(nome)}</span>
);
export const PilhaAvatares = ({ nomes }) => (nomes.length
  ? <span className="pilha">{nomes.slice(0, 4).map(n => <Avatar key={n} nome={n} tam={28} />)}{nomes.length > 4 && <span className="avatar" style={{ width: 28, height: 28, background: '#6b7280' }}>+{nomes.length - 4}</span>}</span>
  : <span style={{ color: 'var(--suave)' }}>—</span>);

/* ---------- Blocos de página ---------- */
export const Cabecalho = ({ titulo, sub, children }) => (
  <header className="pag-cab"><div><h1>{titulo}</h1>{sub && <p>{sub}</p>}</div>{children && <div className="acoes">{children}</div>}</header>
);
export const EstadoVazio = ({ icone = 'projetos', titulo, texto, children }) => (
  <div className="vazio"><Icone nome={icone} tam={36} /><h3>{titulo}</h3>{texto && <p>{texto}</p>}{children}</div>
);
export const Esqueleto = ({ linhas = 4, altura = 46 }) => <div>{Array.from({ length: linhas }, (_, i) => <div key={i} className="esq" style={{ height: altura }} />)}</div>;
export const Campo = ({ rotulo, ajuda, children }) => <label className="campo"><span>{rotulo}</span>{children}{ajuda && <small>{ajuda}</small>}</label>;

/* ---------- Modal ---------- */
export function Modal({ titulo, onFechar, largura = 560, rodape, children }) {
  const veu = useRef(null);
  useEffect(() => {
    const noTopo = () => [...document.querySelectorAll('.veu')].pop() === veu.current;
    const tecla = e => e.key === 'Escape' && noTopo() && onFechar();
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [onFechar]);
  return (
    <div className="veu" ref={veu} onMouseDown={e => e.target === e.currentTarget && onFechar()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={titulo} style={{ maxWidth: largura }}>
        <div className="modal-cab"><h2>{titulo}</h2><button className="botao fantasma icone" onClick={onFechar} aria-label="Fechar"><Icone nome="x" /></button></div>
        <div className="modal-corpo">{children}</div>
        {rodape && <div className="modal-rodape">{rodape}</div>}
      </div>
    </div>
  );
}

/* ---------- Avisos (toasts) e diálogos de confirmação, no lugar de alert/confirm/prompt ---------- */
const Contexto = createContext(null);
export const useUI = () => useContext(Contexto);

function Dialogo({ opcoes, aoResponder }) {
  const [valor, setValor] = useState('');
  const { titulo, texto, campo, confirmar = 'Confirmar', perigo } = opcoes;
  const valido = !campo || valor.trim().length >= (campo.minimo || 1);
  const entrada = campo && (campo.tipo === 'texto-longo'
    ? <textarea rows="3" autoFocus value={valor} onChange={e => setValor(e.target.value)} />
    : <input type={campo.tipo || 'text'} autoFocus value={valor} onChange={e => setValor(e.target.value)} />);
  return (
    <Modal titulo={titulo} largura={460} onFechar={() => aoResponder(null)}
      rodape={<><button className="botao sec" onClick={() => aoResponder(null)}>Cancelar</button>
        <button className={'botao ' + (perigo ? 'perigo' : '')} disabled={!valido} onClick={() => aoResponder(campo ? valor.trim() : true)}>{confirmar}</button></>}>
      {texto && <p className="texto-modal">{texto}</p>}
      {campo && <Campo rotulo={campo.rotulo} ajuda={campo.ajuda}>{entrada}</Campo>}
    </Modal>
  );
}

export function UIProvider({ children }) {
  const [avisos, setAvisos] = useState([]);
  const [dialogo, setDialogo] = useState(null);
  const avisar = useCallback((texto, tipo = 'ok') => {
    const id = Math.random();
    setAvisos(a => [...a, { id, texto, tipo }]);
    setTimeout(() => setAvisos(a => a.filter(x => x.id !== id)), 5000);
  }, []);
  // perguntar({ titulo, texto, campo, confirmar, perigo }) devolve true, o texto digitado, ou null (cancelou)
  const perguntar = useCallback(opcoes => new Promise(resolver => setDialogo({ opcoes, resolver })), []);
  const responder = valor => { dialogo.resolver(valor); setDialogo(null); };
  return (
    <Contexto.Provider value={{ avisar, perguntar }}>
      {children}
      <div className="toasts" aria-live="polite">
        {avisos.map(a => <div key={a.id} className={'toast ' + a.tipo}><Icone nome={a.tipo === 'erro' ? 'alerta' : 'check'} /><span>{a.texto}</span></div>)}
      </div>
      {dialogo && <Dialogo opcoes={dialogo.opcoes} aoResponder={responder} />}
    </Contexto.Provider>
  );
}
