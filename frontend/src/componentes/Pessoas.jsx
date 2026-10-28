import { useEffect, useState } from 'react';
import { api } from '../api';
import { Icone, Cabecalho, Modal, Campo, Avatar, EstadoVazio, Esqueleto, PAPEL, SITUACAO, useUI } from './ui.jsx';

const ABAS = [['pendente', 'Pendentes'], ['aprovado', 'Aprovados'], ['recusado', 'Recusados'], ['bloqueado', 'Bloqueados'], ['todos', 'Todos']];
const ORDEM = ['admin', 'coordenador', 'orientador', 'avaliador', 'aluno'];
const COR = { aprovado: 'azul', pendente: 'amarelo', recusado: 'vermelho', bloqueado: 'cinza' };

// Cada papel é um vínculo no banco. Aqui juntamos os vínculos da mesma pessoa (o e-mail é único) em uma linha só.
function agrupar(vinculos) {
  const mapa = new Map();
  for (const v of vinculos) {
    if (!mapa.has(v.email)) mapa.set(v.email, { email: v.email, nome: v.nome, vinculos: [] });
    mapa.get(v.email).vinculos.push(v);
  }
  for (const p of mapa.values()) p.vinculos.sort((a, b) => ORDEM.indexOf(a.papel) - ORDEM.indexOf(b.papel));
  return [...mapa.values()];
}

export default function Pessoas() {
  const { avisar, perguntar } = useUI();
  const [lista, setLista] = useState(null);
  const [aba, setAba] = useState(null);
  const [add, setAdd] = useState(null);         // pessoa que vai receber outro papel
  const [gerenciar, setGerenciar] = useState(null);   // { pessoa, vinculo }

  const carregar = () => api('/vinculos').then(v => { setLista(v); setAba(a => a || (v.some(x => x.situacao === 'pendente') ? 'pendente' : 'aprovado')); })
    .catch(e => { avisar(e.message, 'erro'); setLista([]); });
  useEffect(() => { carregar(); }, []);

  // Muda a situação de um ou mais vínculos (pede a justificativa uma única vez quando for recusar/bloquear).
  async function aplicar(vinculos, situacao, nome) {
    let justificativa;
    if (situacao !== 'aprovado') {
      const papel = vinculos.length === 1 ? ` (${PAPEL[vinculos[0].papel]})` : '';
      justificativa = await perguntar({
        titulo: (situacao === 'recusado' ? 'Recusar ' : 'Bloquear ') + nome + papel + '?',
        texto: situacao === 'recusado' ? 'A pessoa não terá acesso. Registre o motivo da recusa.' : 'O acesso é revogado imediatamente. Registre o motivo do bloqueio.',
        campo: { rotulo: 'Justificativa', tipo: 'texto-longo', ajuda: 'Fica registrada no histórico.' },
        confirmar: situacao === 'recusado' ? 'Recusar pedido' : 'Bloquear acesso', perigo: true
      });
      if (!justificativa) return false;
    }
    try {
      for (const v of vinculos) await api(`/vinculos/${v.id}/situacao`, 'POST', { situacao, justificativa });
      avisar(situacao === 'aprovado' ? `${nome} entrou pra turma!` : 'Situação atualizada.');
      carregar(); return true;
    } catch (e) { avisar(e.message, 'erro'); return false; }
  }

  async function redefinirSenha(p) {
    const senha = await perguntar({
      titulo: `Redefinir a senha de ${p.nome}`, texto: 'Informe uma senha temporária ao usuário. Ele será desconectado de todos os dispositivos.',
      campo: { rotulo: 'Nova senha temporária', tipo: 'password', minimo: 8, ajuda: 'Mínimo de 8 caracteres.' }, confirmar: 'Redefinir senha'
    });
    if (!senha) return;
    try { await api(`/vinculos/${p.vinculos[0].id}/senha`, 'POST', { senha }); avisar('Senha redefinida.'); } catch (e) { avisar(e.message, 'erro'); }
  }

  const pessoas = lista ? agrupar(lista) : [];
  const tem = (p, k) => k === 'todos' || p.vinculos.some(v => v.situacao === k);
  const contagem = k => pessoas.filter(p => tem(p, k)).length;
  const visiveis = pessoas.filter(p => tem(p, aba));

  return (
    <>
      <Cabecalho titulo="Pessoas" sub="Dê as boas-vindas à turma: aprove pedidos de acesso, conceda papéis, bloqueie contas e redefina senhas." />
      <div className="abas" role="tablist">
        {ABAS.map(([k, r]) => <button key={k} role="tab" aria-selected={aba === k} className={aba === k ? 'ativa' : ''} onClick={() => setAba(k)}>{r}<span>{contagem(k)}</span></button>)}
      </div>
      <section className="painel">
        {!lista ? <div className="painel-corpo"><Esqueleto /></div> : visiveis.length === 0 ? (
          <EstadoVazio icone="pessoas" titulo={aba === 'pendente' ? 'Nenhum pedido pendente' : 'Nada por aqui'} texto={aba === 'pendente' ? 'Quando alguém pedir acesso à instituição, o pedido aparece nesta lista.' : 'Nenhuma pessoa nesta situação.'} />
        ) : (
          <div className="rolagem">
            <table>
              <thead><tr><th>Pessoa</th><th>Papéis (clique para gerenciar)</th><th className="num">Ações</th></tr></thead>
              <tbody>
                {visiveis.map(p => {
                  const pendentes = p.vinculos.filter(v => v.situacao === 'pendente');
                  const temAprovado = p.vinculos.some(v => v.situacao === 'aprovado');
                  return (
                    <tr key={p.email}>
                      <td><span className="pessoa"><Avatar nome={p.nome} /><span><b>{p.nome}</b><span className="sub">{p.email}</span></span></span></td>
                      <td>
                        <div className="acoes">
                          {p.vinculos.map(v => (
                            <span key={v.id} className={'selo ' + COR[v.situacao]} role="button" tabIndex={0} style={{ cursor: 'pointer' }}
                              title={v.justificativa ? `${SITUACAO[v.situacao][0]}: ${v.justificativa}` : 'Gerenciar este papel'}
                              onClick={() => setGerenciar({ pessoa: p, vinculo: v })}
                              onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setGerenciar({ pessoa: p, vinculo: v })}>
                              {PAPEL[v.papel]}{v.situacao !== 'aprovado' && ` (${SITUACAO[v.situacao][0].toLowerCase()})`}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="num"><div className="acoes" style={{ justifyContent: 'flex-end' }}>
                        {pendentes.length > 0 && <button className="botao pequeno" onClick={() => aplicar(pendentes, 'aprovado', p.nome)}><Icone nome="check" tam={15} />Aprovar</button>}
                        {pendentes.length > 0 && <button className="botao contorno-perigo pequeno" onClick={() => aplicar(pendentes, 'recusado', p.nome)}>Recusar</button>}
                        {temAprovado && <button className="botao sec pequeno" onClick={() => setAdd(p)}>Adicionar papel</button>}
                        <button className="botao fantasma pequeno icone" aria-label={`Redefinir senha de ${p.nome}`} title="Redefinir senha" onClick={() => redefinirSenha(p)}><Icone nome="chave" tam={16} /></button>
                      </div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {add && <AdicionarPapel pessoa={add} aoFechar={() => setAdd(null)} aoConcluir={() => { setAdd(null); avisar('Papel concedido.'); carregar(); }} />}
      {gerenciar && <GerenciarPapel {...gerenciar} aplicar={aplicar} aoFechar={() => setGerenciar(null)} />}
    </>
  );
}

/* Gerencia UM papel da pessoa: aprovar, recusar ou bloquear só ele. */
function GerenciarPapel({ pessoa, vinculo, aplicar, aoFechar }) {
  const v = vinculo;
  const agir = situacao => aplicar([v], situacao, pessoa.nome).then(ok => ok && aoFechar());
  return (
    <Modal titulo={`${PAPEL[v.papel]}: ${pessoa.nome}`} largura={460} onFechar={aoFechar} rodape={<button className="botao sec" onClick={aoFechar}>Fechar</button>}>
      <p className="texto-modal">Situação atual deste papel: <span className={'selo ' + COR[v.situacao]}>{SITUACAO[v.situacao][0]}</span>. Os outros papéis da pessoa não são afetados.</p>
      {v.justificativa && <p className="texto-modal"><b>Justificativa registrada:</b> {v.justificativa}</p>}
      <div className="acoes">
        {v.situacao !== 'aprovado' && <button className="botao" onClick={() => agir('aprovado')}><Icone nome="check" tam={15} />Aprovar</button>}
        {v.situacao === 'pendente' && <button className="botao contorno-perigo" onClick={() => agir('recusado')}>Recusar</button>}
        {v.situacao === 'aprovado' && <button className="botao contorno-perigo" onClick={() => agir('bloqueado')}>Bloquear este papel</button>}
      </div>
    </Modal>
  );
}

function AdicionarPapel({ pessoa, aoFechar, aoConcluir }) {
  // só oferece papéis que a pessoa ainda não tem aprovados (o administrador não é concedido por aqui)
  const disponiveis = ['coordenador', 'orientador', 'avaliador', 'aluno'].filter(k => !pessoa.vinculos.some(v => v.papel === k && v.situacao === 'aprovado'));
  const [papel, setPapel] = useState(disponiveis[0] || '');
  const [erro, setErro] = useState('');
  const base = pessoa.vinculos.find(v => v.situacao === 'aprovado');
  async function salvar() { setErro(''); try { await api(`/vinculos/${base.id}/papeis`, 'POST', { papel }); aoConcluir(); } catch (e) { setErro(e.message); } }
  return (
    <Modal titulo={`Adicionar papel a ${pessoa.nome}`} largura={460} onFechar={aoFechar}
      rodape={<><button className="botao sec" onClick={aoFechar}>Cancelar</button><button className="botao" disabled={!papel} onClick={salvar}>Conceder papel</button></>}>
      {erro && <div className="erro-form" role="alert"><Icone nome="alerta" />{erro}</div>}
      <p className="texto-modal">A pessoa mantém os papéis que já tem. Cada papel pode ser bloqueado separadamente e a concessão fica registrada na auditoria.</p>
      {disponiveis.length === 0 ? <p>Esta pessoa já tem todos os papéis disponíveis.</p> : (
        <Campo rotulo="Novo papel"><select value={papel} onChange={e => setPapel(e.target.value)}>
          {disponiveis.map(k => <option key={k} value={k}>{PAPEL[k]}</option>)}</select></Campo>
      )}
    </Modal>
  );
}
