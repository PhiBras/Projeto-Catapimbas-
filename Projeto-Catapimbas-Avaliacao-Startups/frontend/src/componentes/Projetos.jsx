import { useEffect, useState } from 'react';
import { api } from '../api';
import { Icone, Cabecalho, Modal, Campo, Avatar, PilhaAvatares, SeloMapa, EstadoVazio, STATUS_PROJETO, useUI } from './ui.jsx';
import ModalAvaliadoresAdmin from './ModalAvaliadoresadmin.jsx';

const VAZIO = { q: '', orientador: '', aluno: '', ano: '', semestre: '' };

export default function Projetos({ eu }) {
  const { avisar } = useUI();
  const gestor = eu.papeis.includes('admin') || eu.papeis.includes('coordenador');
  const podeCriar = gestor || eu.papeis.includes('orientador');
  const [filtro, setFiltro] = useState(VAZIO);
  const [filtros, setFiltros] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [dados, setDados] = useState(null);
  
  // Modais
  const [novo, setNovo] = useState(false);
  const [projetoParaEditar, setProjetoParaEditar] = useState(null);
  const [projetoSelecionado, setProjetoSelecionado] = useState(null);

  const params = () => new URLSearchParams(filtro).toString();
  const listar = () => api(`/projetos?${params()}&page=${pagina}`).then(setDados).catch(e => { avisar(e.message, 'erro'); setDados({ total: 0, itens: [] }); });
  useEffect(() => { const t = setTimeout(listar, 300); return () => clearTimeout(t); }, [filtro, pagina]);

  const muda = (campo, valor) => { setPagina(1); setFiltro({ ...filtro, [campo]: valor }); };
  const total = dados?.total || 0, paginas = Math.max(1, Math.ceil(total / 10));
  const ativos = Object.values(filtro).filter(Boolean).length;

  return (
    <>
      <Cabecalho titulo="Projetos" sub="Startups e projetos da instituição, com orientação e equipe.">
        <button className="botao sec" onClick={() => { window.location = '/api/exportar?' + params(); }}><Icone nome="baixar" />Exportar Excel</button>
        {podeCriar && <button className="botao" onClick={() => { setProjetoParaEditar(null); setNovo(true); }}><Icone nome="mais" />Novo projeto</button>}
      </Cabecalho>

      <div className="barra">
        <div className="busca" style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1 }}>
          <span style={{ position: 'absolute', left: '16px', display: 'flex', alignItems: 'center', pointerEvents: 'none', color: '#94a3b8', zIndex: 2 }}>
            <Icone nome="busca" tam={16} />
          </span>
          <input 
            type="search" 
            placeholder="Buscar projeto pelo nome" 
            aria-label="Buscar projeto" 
            value={filtro.q} 
            onChange={e => muda('q', e.target.value)} 
            style={{ paddingLeft: '50px', width: '100%' }}
          />
        </div>

        <button className="botao sec" onClick={() => setFiltros(!filtros)} aria-expanded={filtros}><Icone nome="filtro" tam={16} />Filtros{ativos > 0 && ` (${ativos})`}</button>
        {ativos > 0 && <button className="botao fantasma" onClick={() => { setPagina(1); setFiltro(VAZIO); }}>Limpar</button>}
      </div>

      {filtros && (
        <div className="painel"><div className="painel-corpo" style={{ paddingBottom: 6 }}>
          <div className="linha-campos">
            <Campo rotulo="Orientador"><input value={filtro.orientador} onChange={e => muda('orientador', e.target.value)} /></Campo>
            <Campo rotulo="Aluno"><input value={filtro.aluno} onChange={e => muda('aluno', e.target.value)} /></Campo>
            <Campo rotulo="Ano"><input type="number" value={filtro.ano} onChange={e => muda('ano', e.target.value)} /></Campo>
            <Campo rotulo="Semestre"><select value={filtro.semestre} onChange={e => muda('semestre', e.target.value)}><option value="">Todos</option><option value="1">1º</option><option value="2">2º</option></select></Campo>
          </div>
        </div></div>
      )}

      {!dados ? (
        <div className="grade-cards">{[0, 1, 2, 3, 4, 5].map(i => <div key={i} className="esq" style={{ height: 190, borderRadius: 22 }} />)}</div>
      ) : dados.itens.length === 0 ? (
        <div className="painel"><EstadoVazio titulo={ativos ? 'Nenhum projeto com esses filtros' : 'Nenhum projeto cadastrado'}
          texto={ativos ? 'Tente remover algum filtro ou buscar por outro nome.' : 'Os projetos da instituição aparecem aqui assim que forem cadastrados.'}>
          {!ativos && podeCriar && <button className="botao" onClick={() => { setProjetoParaEditar(null); setNovo(true); }}>Cadastrar o primeiro projeto</button>}
        </EstadoVazio></div>
      ) : (
        <>
          <div className="grade-cards">
            {dados.itens.map((p, i) => (
              <article 
                className="cartao" 
                key={p.id} 
                style={{ animationDelay: `${i * 40}ms`, cursor: gestor ? 'pointer' : 'default' }}
                onClick={() => gestor && setProjetoSelecionado(p)}
              >
                <div className="cartao-topo">
                  <span className="faixa-cor" />
                  <SeloMapa mapa={STATUS_PROJETO} valor={p.status} />
                </div>
                <h3>{p.nome}</h3>
                <p className="desc">{p.descricao || 'Sem descrição.'}</p>
                
                {gestor && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '6px 0 10px' }}>
                    <small style={{ color: 'var(--marca)', fontWeight: 'bold' }}>
                      🔍 Avaliadores
                    </small>
                    <button 
                      className="botao sec pequeno"
                      style={{ padding: '2px 8px', fontSize: '11px', margin: 0 }}
                      onClick={(e) => {
                        e.stopPropagation(); // Não abre o modal de avaliadores ao clicar em editar
                        setProjetoParaEditar(p);
                        setNovo(true);
                      }}
                    >
                      ✏️ Editar
                    </button>
                  </div>
                )}

                <div className="cartao-pe">
                  {p.orientador ? <span className="pessoa" title="Orientador"><Avatar nome={p.orientador} tam={28} /><small style={{ color: 'var(--texto)' }}>{p.orientador}</small></span> : <small>Sem orientador</small>}
                  <span className="acoes" style={{ gap: 10 }}><PilhaAvatares nomes={p.equipe ? p.equipe.split(', ') : []} /><small>{p.ano}.{p.semestre}</small></span>
                </div>
              </article>
            ))}
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

      {/* Modal de Criação / Edição de Projeto */}
      {novo && (
        <ModalProjeto 
          gestor={gestor} 
          projetoEdicao={projetoParaEditar}
          aoFechar={() => { setNovo(false); setProjetoParaEditar(null); }} 
          aoSalvar={() => { setNovo(false); setProjetoParaEditar(null); avisar(projetoParaEditar ? 'Projeto atualizado.' : 'Projeto criado.'); listar(); }} 
        />
      )}
      
      {/* Modal do Administrador para Ver Status de Avaliações */}
      {projetoSelecionado && (
        <ModalAvaliadoresAdmin 
          projeto={projetoSelecionado} 
          aoFechar={() => setProjetoSelecionado(null)} 
        />
      )}
    </>
  );
}

function ModalProjeto({ gestor, projetoEdicao, aoFechar, aoSalvar }) {
  const [f, setF] = useState({ 
    nome: projetoEdicao?.nome || '', 
    descricao: projetoEdicao?.descricao || '', 
    ano: projetoEdicao?.ano || new Date().getFullYear(), 
    semestre: projetoEdicao?.semestre || 1, 
    status: projetoEdicao?.status || 'ideacao', 
    orientador_id: projetoEdicao?.orientador_id || '', 
    membros: Array.isArray(projetoEdicao?.membros) ? projetoEdicao.membros : [] 
  });

  const [pessoas, setPessoas] = useState([]);
  const [erro, setErro] = useState('');

  useEffect(() => { 
    api('/pessoas').then(res => {
      const lista = Array.isArray(res) ? res : [];
      setPessoas(lista);

      // Caso esteja editando e os membros não vieram como array de IDs, podemos inferir se necessário
      if (projetoEdicao && (!f.membros || f.membros.length === 0) && projetoEdicao.equipe) {
        const nomesEquipe = projetoEdicao.equipe.split(', ').map(n => n.trim().toLowerCase());
        const idsMembros = lista.filter(p => nomesEquipe.includes(String(p.nome).trim().toLowerCase())).map(p => p.id);
        if (idsMembros.length > 0) setF(prev => ({ ...prev, membros: idsMembros }));
      }
    }).catch(() => {}); 
  }, [projetoEdicao]);

  const alunos = pessoas.filter(p => String(p.papeis || '').toLowerCase().includes('aluno'));
  const alterna = id => setF({ ...f, membros: f.membros.includes(id) ? f.membros.filter(m => m !== id) : [...f.membros, id] });

  async function salvar() {
    setErro('');
    try { 
      const payload = { 
        ...f, 
        ano: Number(f.ano), 
        semestre: Number(f.semestre), 
        orientador_id: Number(f.orientador_id) || null 
      };

      if (projetoEdicao?.id) {
        await api(`/projetos/${projetoEdicao.id}`, 'PUT', payload);
      } else {
        await api('/projetos', 'POST', payload);
      }
      aoSalvar(); 
    } catch (e) { 
      setErro(e.message); 
    }
  }

  return (
    <Modal titulo={projetoEdicao ? "Editar projeto" : "Novo projeto"} largura={620} onFechar={aoFechar}
      rodape={<><button className="botao sec" onClick={aoFechar}>Cancelar</button><button className="botao" disabled={!f.nome.trim()} onClick={salvar}>{projetoEdicao ? "Salvar alterações" : "Criar projeto"}</button></>}>
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
            {pessoas.filter(p => String(p.papeis || '').toLowerCase().includes('orientador')).map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
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