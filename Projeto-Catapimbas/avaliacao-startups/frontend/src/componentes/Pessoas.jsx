import { useEffect, useState } from 'react';
import { api } from '../api';
import { Icone, Cabecalho, Avatar, SeloMapa, Selo, EstadoVazio, Esqueleto, PAPEL, SITUACAO, useUI } from './ui.jsx';

const ABAS = [['pendente', 'Pendentes'], ['aprovado', 'Aprovados'], ['recusado', 'Recusados'], ['bloqueado', 'Bloqueados'], ['todos', 'Todos']];

export default function Pessoas() {
  const { avisar, perguntar } = useUI();
  const [lista, setLista] = useState(null);
  const [aba, setAba] = useState(null);

  const carregar = () => api('/vinculos').then(v => { setLista(v); setAba(a => a || (v.some(x => x.situacao === 'pendente') ? 'pendente' : 'aprovado')); })
    .catch(e => { avisar(e.message, 'erro'); setLista([]); });
  useEffect(() => { carregar(); }, []);

  async function mudar(v, situacao) {
    let justificativa;
    if (situacao !== 'aprovado') {
      justificativa = await perguntar({
        titulo: situacao === 'recusado' ? `Recusar ${v.nome}?` : `Bloquear ${v.nome}?`,
        texto: situacao === 'recusado' ? 'A pessoa não terá acesso. Registre o motivo da recusa.' : 'O acesso é revogado imediatamente. Registre o motivo do bloqueio.',
        campo: { rotulo: 'Justificativa', tipo: 'texto-longo', ajuda: 'Fica registrada no histórico.' },
        confirmar: situacao === 'recusado' ? 'Recusar pedido' : 'Bloquear acesso', perigo: true
      });
      if (!justificativa) return;
    }
    try { await api(`/vinculos/${v.id}/situacao`, 'POST', { situacao, justificativa }); avisar(situacao === 'aprovado' ? `${v.nome} agora tem acesso.` : 'Situação atualizada.'); carregar(); }
    catch (e) { avisar(e.message, 'erro'); }
  }

  async function redefinirSenha(v) {
    const senha = await perguntar({
      titulo: `Redefinir a senha de ${v.nome}`, texto: 'Informe uma senha temporária ao usuário. Ele será desconectado de todos os dispositivos.',
      campo: { rotulo: 'Nova senha temporária', tipo: 'password', minimo: 8, ajuda: 'Mínimo de 8 caracteres.' }, confirmar: 'Redefinir senha'
    });
    if (!senha) return;
    try { await api(`/vinculos/${v.id}/senha`, 'POST', { senha }); avisar('Senha redefinida.'); } catch (e) { avisar(e.message, 'erro'); }
  }

  const contagem = k => !lista ? 0 : k === 'todos' ? lista.length : lista.filter(x => x.situacao === k).length;
  const visiveis = lista ? lista.filter(x => aba === 'todos' || x.situacao === aba) : [];

  return (
    <>
      <Cabecalho titulo="Pessoas" sub="Aprove pedidos de acesso, bloqueie contas e redefina senhas da sua instituição." />
      <div className="abas" role="tablist">
        {ABAS.map(([k, r]) => <button key={k} role="tab" aria-selected={aba === k} className={aba === k ? 'ativa' : ''} onClick={() => setAba(k)}>{r}<span>{contagem(k)}</span></button>)}
      </div>
      <section className="painel">
        {!lista ? <div className="painel-corpo"><Esqueleto /></div> : visiveis.length === 0 ? (
          <EstadoVazio icone="pessoas" titulo={aba === 'pendente' ? 'Nenhum pedido pendente' : 'Nada por aqui'} texto={aba === 'pendente' ? 'Quando alguém pedir acesso à instituição, o pedido aparece nesta lista.' : 'Nenhuma pessoa nesta situação.'} />
        ) : (
          <div className="rolagem">
            <table>
              <thead><tr><th>Pessoa</th><th>Papel</th><th>Situação</th><th className="num">Ações</th></tr></thead>
              <tbody>
                {visiveis.map(v => (
                  <tr key={v.id}>
                    <td><span className="pessoa"><Avatar nome={v.nome} /><span><b>{v.nome}</b><span className="sub">{v.email}</span></span></span></td>
                    <td><Selo tipo="azul">{PAPEL[v.papel]}</Selo></td>
                    <td><SeloMapa mapa={SITUACAO} valor={v.situacao} />{v.justificativa && <span className="sub" title={v.justificativa}>{v.justificativa}</span>}</td>
                    <td className="num"><div className="acoes" style={{ justifyContent: 'flex-end' }}>
                      {v.situacao !== 'aprovado' && <button className="botao pequeno" onClick={() => mudar(v, 'aprovado')}><Icone nome="check" tam={15} />Aprovar</button>}
                      {v.situacao === 'pendente' && <button className="botao contorno-perigo pequeno" onClick={() => mudar(v, 'recusado')}>Recusar</button>}
                      {v.situacao === 'aprovado' && <button className="botao contorno-perigo pequeno" onClick={() => mudar(v, 'bloqueado')}>Bloquear</button>}
                      <button className="botao fantasma pequeno icone" aria-label={`Redefinir senha de ${v.nome}`} title="Redefinir senha" onClick={() => redefinirSenha(v)}><Icone nome="chave" tam={16} /></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
