import { useCallback, useEffect, useRef, useState } from 'react';
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
  const [menu, setMenu] = useState(false);   // menu do usuário (canto superior direito)
  const [tema, setTema] = useState(temaInicial);
  const areaMenu = useRef(null);

  // Captura o link do QR Code (?banca=X&projeto=Y) no navegador antes do login
  useEffect(() => {
    const busca = window.location.search;
    if (busca.includes('banca=')) {
      sessionStorage.setItem('destino_qr_code', busca);
    }
  }, []);

  const carregar = useCallback(() => api('/auth/eu').then(setEu).catch(() => setEu(null)), []);
  
  useEffect(() => {
    carregar();
    const expirou = () => setEu(null);
    window.addEventListener('sessao-expirada', expirou);
    return () => window.removeEventListener('sessao-expirada', expirou);
  }, [carregar]);

  // Assim que o login for confirmado, altera a aba para 'bancas' e injeta os parâmetros do QR Code
  useEffect(() => {
    if (!eu) return;
    const destinoPendente = sessionStorage.getItem('destino_qr_code') || window.location.search;
    if (destinoPendente.includes('banca=')) {
      sessionStorage.removeItem('destino_qr_code');
      if (!window.location.search.includes('banca=')) {
        window.history.replaceState({}, '', `${window.location.pathname}${destinoPendente}`);
      }
      setAba('bancas');
    }
  }, [eu]);

  useEffect(() => {
    document.documentElement.dataset.tema = tema;
    try { localStorage.setItem('tema', tema); } catch { /* ignora */ }
  }, [tema]);

  useEffect(() => { document.documentElement.style.setProperty('--c', eu?.cor || '#6d4aff'); }, [eu]);

  useEffect(() => {   // fecha o menu ao clicar fora ou apertar Esc
    if (!menu) return;
    const fora = e => areaMenu.current && !areaMenu.current.contains(e.target) && setMenu(false);
    const esc = e => e.key === 'Escape' && setMenu(false);
    document.addEventListener('mousedown', fora); window.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fora); window.removeEventListener('keydown', esc); };
  }, [menu]);

  if (eu === undefined) return null;
  if (!eu) return <Login aoEntrar={carregar} />;

  // Os itens do menu dependem dos papéis (a API também confere tudo no servidor).
  const itens = [];
  if (eu.inst) {
    itens.push(['painel', 'Painel', 'painel', Painel], ['projetos', 'Projetos', 'projetos', Projetos], ['bancas', 'Bancas', 'bancas', Bancas], ['resultados', 'Resultados', 'trofeu', Resultados]);
    if (eu.papeis.includes('admin')) itens.push(['pessoas', 'Pessoas', 'pessoas', Pessoas]);
  }
  if (eu.super) itens.push(['instituicoes', 'Instituições', 'predio', Instituicoes]);
  const principais = [...itens];
  itens.push(['conta', 'Minha conta', 'usuario', Conta]);
  const atual = itens.find(i => i[0] === aba) || itens[0];
  const Tela = atual[3];
  const irPara = chave => { setAba(chave); setMenu(false); window.scrollTo(0, 0); };
  const sair = async () => { await api('/auth/logout', 'POST'); setEu(null); setAba('painel'); setMenu(false); };
  const trocar = async id => { await api('/auth/trocar', 'POST', { instituicao_id: Number(id) }); await carregar(); setAba('painel'); };
  const nomeInst = eu.instNome || 'Plataforma';
  const papel = eu.papeis.map(p => PAPEL[p]).join(', ') || 'Superadministrador';

  return (
    <>
      <header className="topo">
        <div className="topo-in">
          <div className="marca"><span className="marca-sigla">{nomeInst[0]}</span><b>{nomeInst}</b></div>
          <nav className="pilulas" aria-label="Principal">
            {principais.map(([chave, rotulo, icone]) => (
              <button key={chave} className={chave === atual[0] ? 'ativo' : ''} onClick={() => irPara(chave)} aria-current={chave === atual[0] ? 'page' : undefined}>
                <Icone nome={icone} tam={16} />{rotulo}
              </button>
            ))}
          </nav>
          <div className="topo-dir">
            {eu.instituicoes.length > 1 && (
              <select aria-label="Instituição ativa" value={eu.inst || ''} onChange={e => trocar(e.target.value)}>
                {eu.instituicoes.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
              </select>
            )}
            <button className="botao fantasma icone" onClick={() => setTema(tema === 'escuro' ? 'claro' : 'escuro')} aria-label={tema === 'escuro' ? 'Usar tema claro' : 'Usar tema escuro'}>
              <Icone nome={tema === 'escuro' ? 'sol' : 'lua'} />
            </button>
            <div className="menu-usuario" ref={areaMenu}>
              <button className="btn-usuario" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-haspopup="menu">
                <Avatar nome={eu.nome} tam={30} /><span className="so-desktop">{eu.nome.split(' ')[0]}</span>
              </button>
              {menu && (
                <div className="menu-pop" role="menu">
                  <div className="quem"><Avatar nome={eu.nome} tam={38} /><div><b>{eu.nome}</b><small>{papel}</small></div></div>
                  <button role="menuitem" onClick={() => irPara('conta')}><Icone nome="usuario" tam={16} />Minha conta</button>
                  <button role="menuitem" onClick={sair}><Icone nome="sair" tam={16} />Sair</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="conteudo">
        <div className="pagina"><Tela key={atual[0] + eu.inst} eu={eu} irPara={irPara} /></div>
      </main>

      <nav className="dock" aria-label="Navegação">
        {principais.map(([chave, rotulo, icone]) => (
          <button key={chave} className={chave === atual[0] ? 'ativo' : ''} onClick={() => irPara(chave)} aria-current={chave === atual[0] ? 'page' : undefined}>
            <Icone nome={icone} tam={20} />{rotulo}
          </button>
        ))}
      </nav>
    </>
  );
}