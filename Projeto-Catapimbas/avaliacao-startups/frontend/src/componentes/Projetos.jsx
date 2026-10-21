import { useEffect, useState } from 'react';
import { api } from '../api';
import { Icone, Cabecalho, Modal, Campo, Avatar, PilhaAvatares, SeloMapa, EstadoVazio, Esqueleto, STATUS_PROJETO, useUI } from './ui.jsx';

const VAZIO = { q: '', orientador: '', aluno: '', ano: '', semestre: '' };

export default function Projetos({ eu }) {
  const { avisar } = useUI();
  const gestor = eu.papeis.includes('admin') || eu.papeis.includes('coordenador');
  const podeCriar = gestor || eu.papeis.includes('orientador');
  const [filtro, setFiltro] = useState(VAZIO);
  const [filtros, setFiltros] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [dados, setDados] = useState(null);
  const [novo, setNovo] = useState(false);

  const params = () => new URLSearchParams(filtro).toString();
  const listar = () => api(`/projetos?${params()}&page=${pagina}`).then(setDados).catch(e => { avisar(e.message, 'erro'); setDados({ total: 0, itens: [] }); });
  useEffect(() => { const t = setTimeout(listar, 300); return () => clearTimeout(t); }, [filtro, pagina]);   // busca ao digitar, com pequena espera

  const muda = (campo, valor) => { setPagina(1); setFiltro({ ...filtro, [campo]: valor }); };
  const total = dados?.total || 0, paginas = Math.max(1, Math.ceil(total / 10));
  const ativos = Object.values(filtro).filter(Boolean).length;

  return (
    <>
      <Cabecalho titulo="Projetos" sub="Startups e projetos cadastrados na instituição, com orientação e equipe.">
        <button className="botao sec" onClick={() => { window.location = '/api/exportar?' + params(); }}><Icone nome="baixar" />Exportar Excel</button>
        {podeCriar && <button className="botao" onClick={() => setNovo(true)}><Icone nome="mais" />Novo projeto</button>}
      </Cabecalho>

      <div className="painel">
        <div className="painel-cab" style={{ flexWrap: 'wrap' }}>
          <div className="busca"><Icone nome="busca" tam={16} /><input type="search" placeholder="Buscar projeto pelo nome" aria-label="Buscar projeto" value={filtro.q} onChange={e => muda('q', e.target.value)} /></div>
          <button className="botao sec" onClick={() => setFiltros(!filtros)}><Icone nome="filtro" tam={16} />Filtros{ativos > 0 && ` (${ativos})`}</button>
        </div>
        {filtros && (
          <div className="painel-corpo" style={{ borderBottom: '1px solid var(--linha)', paddingBottom: 6 }}>
            <div className="linha-campos">
              <Campo rotulo="Orientador"><input value={filtro.orientador} onChange={e => muda('orientador', e.target.value)} /></Campo>
              <Campo rotulo="Aluno"><input value={filtro.aluno} onChange={e => muda('aluno', e.target.value)} /></Campo>
              <Campo rotulo="Ano"><input type="number" value={filtro.ano} onChange={e => muda('ano', e.target.value)} /></Campo>
              <Campo rotulo="Semestre"><select value={filtro.semestre} onChange={e => muda('semestre', e.target.value)}><option value="">Todos</option><option value="1">1º</option><option value="2">2º</option></select></Campo>
            </div>
            {ativos > 0 && <button className="botao fantasma pequeno" style={{ marginBottom: 12 }} onClick={() => { setPagina(1); setFiltro(VAZIO); }}>Limpar filtros</button>}
          </div>
        )}

        {!dados ? <div className="painel-corpo"><Esqueleto /></div> : dados.itens.length === 0 ? (
          <EstadoVazio titulo={ativos ? 'Nenhum projeto com esses filtros' : 'Nenhum projeto cadastrado'}
            texto={ativos ? 'Tente remover algum filtro ou buscar por outro nome.' : 'Os projetos da instituição aparecem aqui assim que forem cadastrados.'}>
            {!ativos && podeCriar && <button className="botao" onClick={() => setNovo(true)}>Cadastrar o primeiro projeto</button>}
          </EstadoVazio>
        ) : (
          <>
            <div className="rolagem">
              <table>
                <thead><tr><th>Projeto</th><th>Orientação</th><th>Equipe</th><th>Período</th><th>Situação</th></tr></thead>
                <tbody>
                  {dados.itens.map(p => (
                    <tr key={p.id}>
                      <td><b>{p.nome}</b>{p.descricao && <span className="sub">{p.descricao}</span>}</td>
                      <td>{p.orientador ? <span className="pessoa"><Avatar nome={p.orientador} tam={28} />{p.orientador}</span> : <span style={{ color: 'var(--suave)' }}>Sem orientador</span>}</td>
                      <td><PilhaAvatares nomes={p.equipe ? p.equipe.split(', ') : []} /></td>
                      <td>{p.ano}.{p.semestre}</td>
                      <td><SeloMapa mapa={STATUS_PROJETO} valor={p.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="rodape-tabela">
              <small>Mostrando {(pagina - 1) * 10 + 1} a {Math.min(pagina * 10, total)} de {total}</small>
              <div className="acoes">
                <button className="botao sec pequeno" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)} aria-label="Página anterior"><Icone nome="esquerda" tam={16} /></button>
                <small>Página {pagina} de {paginas}</small>
                <button className="botao sec pequeno" disabled={pagina >= paginas} onClick={() => setPagina(pagina + 1)} aria-label="Próxima página"><Icone nome="direita" tam={16} /></button>
              </div>
            </div>
          </>
        )}
      </div>

      {novo && <NovoProjeto gestor={gestor} aoFechar={() => setNovo(false)} aoCriar={() => { setNovo(false); avisar('Projeto criado.'); listar(); }} />}
    </>
  );
}

function NovoProjeto({ gestor, aoFechar, aoCriar }) {
  const [f, setF] = useState({ nome: '', descricao: '', ano: new Date().getFullYear(), semestre: 1, status: 'ideacao', orientador_id: '', membros: [] });
  const [pessoas, setPessoas] = useState([]);
  const [erro, setErro] = useState('');
  useEffect(() => { api('/pessoas').then(setPessoas).catch(() => {}); }, []);
  const alunos = pessoas.filter(p => p.papeis.includes('aluno'));
  const alterna = id => setF({ ...f, membros: f.membros.includes(id) ? f.membros.filter(m => m !== id) : [...f.membros, id] });

  async function salvar() {
    setErro('');
    try { await api('/projetos', 'POST', { ...f, ano: Number(f.ano), semestre: Number(f.semestre), orientador_id: Number(f.orientador_id) || null }); aoCriar(); }
    catch (e) { setErro(e.message); }
  }
  return (
    <Modal titulo="Novo projeto" largura={620} onFechar={aoFechar}
      rodape={<><button className="botao sec" onClick={aoFechar}>Cancelar</button><button className="botao" disabled={!f.nome.trim()} onClick={salvar}>Criar projeto</button></>}>
      {erro && <div className="erro-form" role="alert"><Icone nome="alerta" />{erro}</div>}
      <Campo rotulo="Nome do projeto"><input autoFocus value={f.nome} onChange={e => setF({ ...f, nome: e.target.value })} /></Campo>
      <Campo rotulo="Descrição"><textarea rows="3" value={f.descricao} onChange={e => setF({ ...f, descricao: e.target.value })} /></Campo>
      <div className="linha-campos">
        <Campo rotulo="Ano"><input type="number" value={f.ano} onChange={e => setF({ ...f, ano: e.target.value })} /></Campo>
        <Campo rotulo="Semestre"><select value={f.semestre} onChange={e => setF({ ...f, semestre: e.target.value })}><option value="1">1º</option><option value="2">2º</option></select></Campo>
        <Campo rotulo="Situação"><select value={f.status} onChange={e => setF({ ...f, status: e.target.value })}>{Object.entries(STATUS_PROJETO).map(([k, [r]]) => <option key={k} value={k}>{r}</option>)}</select></Campo>
      </div>
      {gestor && (
        <Campo rotulo="Orientador">
          <select value={f.orientador_id} onChange={e => setF({ ...f, orientador_id: e.target.value })}>
            <option value="">Sem orientador por enquanto</option>
            {pessoas.filter(p => p.papeis.includes('orientador')).map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </Campo>
      )}
      <Campo rotulo="Integrantes da equipe" ajuda="Somente alunos já aprovados na instituição.">
        <div className="marcar">
          {alunos.length === 0 && <label style={{ color: 'var(--suave)' }}>Nenhum aluno aprovado ainda.</label>}
          {alunos.map(a => <label key={a.id}><input type="checkbox" checked={f.membros.includes(a.id)} onChange={() => alterna(a.id)} />{a.nome}</label>)}
        </div>
      </Campo>
    </Modal>
  );
}
