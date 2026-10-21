import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import { Icone, Avatar, PAPEL, UIProvider } from './componentes/ui.jsx';
import Login from './componentes/Login.jsx';
import Painel from './componentes/Painel.jsx';
import Projetos from './componentes/Projetos.jsx';
import Bancas from './componentes/Bancas.jsx';
import Resultados from './componentes/Resultados.jsx';
import Pessoas from './componentes/Pessoas.jsx';
import Instituicoes from './componentes/Instituicoes.jsx';
import Conta from './componentes/Conta.jsx';

export default function App() {
  return <UIProvider><Raiz /></UIProvider>;
}

function temaInicial() {
  try { const salvo = localStorage.getItem('tema'); if (salvo) return salvo; } catch { /* sem armazenamento */ }
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
}

function Raiz() {
  const [eu, setEu] = useState(undefined);   // undefined = carregando | null = sem login
  const [aba, setAba] = useState('painel');
  const [menu, setMenu] = useState(false);
  const [tema, setTema] = useState(temaInicial);

  const carregar = useCallback(() => api('/auth/eu').then(setEu).catch(() => setEu(null)), []);
  useEffect(() => {
    carregar();
    const expirou = () => setEu(null);
    window.addEventListener('sessao-expirada', expirou);
    return () => window.removeEventListener('sessao-expirada', expirou);
  }, [carregar]);
  useEffect(() => {
    document.documentElement.dataset.tema = tema;
    try { localStorage.setItem('tema', tema); } catch { /* ignora */ }
  }, [tema]);
  useEffect(() => { document.documentElement.style.setProperty('--c', eu?.cor || '#2563eb'); }, [eu]);

  if (eu === undefined) return null;
  if (!eu) return <Login aoEntrar={carregar} />;

  // Os itens do menu dependem dos papéis (a API também confere tudo no servidor).
  const itens = [];
  if (eu.inst) {
    itens.push(['painel', 'Painel', 'painel', Painel], ['projetos', 'Projetos', 'projetos', Projetos], ['bancas', 'Bancas', 'bancas', Bancas], ['resultados', 'Resultados', 'trofeu', Resultados]);
    if (eu.papeis.includes('admin')) itens.push(['pessoas', 'Pessoas', 'pessoas', Pessoas]);
  }
  if (eu.super) itens.push(['instituicoes', 'Instituições', 'predio', Instituicoes]);
  itens.push(['conta', 'Minha conta', 'usuario', Conta]);
  const atual = itens.find(i => i[0] === aba) || itens[0];
  const Tela = atual[3];
  const irPara = chave => { setAba(chave); setMenu(false); window.scrollTo(0, 0); };
  const sair = async () => { await api('/auth/logout', 'POST'); setEu(null); setAba('painel'); };
  const trocar = async id => { await api('/auth/trocar', 'POST', { instituicao_id: Number(id) }); await carregar(); setAba('painel'); };
  const nomeInst = eu.instNome || 'Plataforma';

  return (
    <div className="app">
      <div className="topo-movel">
        <button className="botao fantasma icone" onClick={() => setMenu(true)} aria-label="Abrir menu"><Icone nome="menu" /></button>
        <b>{nomeInst}</b>
      </div>
      <div className={'veu-menu' + (menu ? ' aberta' : '')} onClick={() => setMenu(false)} />
      <aside className={'lateral' + (menu ? ' aberta' : '')}>
        <div className="marca">
          <span className="marca-sigla">{nomeInst[0]}</span>
          <div><b>{nomeInst}</b><small>Avaliação de startups</small></div>
        </div>
        {eu.instituicoes.length > 1 && (
          <select aria-label="Instituição ativa" value={eu.inst || ''} onChange={e => trocar(e.target.value)}>
            {eu.instituicoes.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
          </select>
        )}
        <nav className="nav" aria-label="Principal">
          {itens.map(([chave, rotulo, icone]) => (
            <button key={chave} className={chave === atual[0] ? 'ativo' : ''} onClick={() => irPara(chave)} aria-current={chave === atual[0] ? 'page' : undefined}>
              <Icone nome={icone} />{rotulo}
            </button>
          ))}
        </nav>
        <div className="lateral-rodape">
          <div className="usuario">
            <Avatar nome={eu.nome} tam={36} />
            <div><b>{eu.nome}</b><small>{eu.papeis.map(p => PAPEL[p]).join(', ') || 'Superadministrador'}</small></div>
          </div>
          <button className="botao fantasma" onClick={() => setTema(tema === 'escuro' ? 'claro' : 'escuro')}>
            <Icone nome={tema === 'escuro' ? 'sol' : 'lua'} />{tema === 'escuro' ? 'Tema claro' : 'Tema escuro'}
          </button>
          <button className="botao fantasma" onClick={sair}><Icone nome="sair" />Sair</button>
        </div>
      </aside>
      <main className="conteudo">
        <div className="pagina"><Tela key={atual[0] + eu.inst} eu={eu} irPara={irPara} /></div>
      </main>
    </div>
  );
}
