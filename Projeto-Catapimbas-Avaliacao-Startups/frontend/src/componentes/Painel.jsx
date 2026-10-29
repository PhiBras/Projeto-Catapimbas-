import { useEffect, useState } from 'react';
import { api } from '../api';
import { useUI, Icone, Esqueleto, EstadoVazio, Contador, STATUS_PROJETO } from './ui.jsx';

const CORES = { ideacao: '#9b93c9', em_andamento: '#35b6ff', concluido: '#1fd6a0', arquivado: '#d9d3ec' };

const isAvaliadorDaBanca = (b, u) => {
  if (!b || !u) return false;
  const uEmail = String(u.email || u.usuario_email || '').toLowerCase().trim();
  const uId = u.id !== undefined ? u.id : u.usuario_id;

  if (Array.isArray(b.avaliadores) && b.avaliadores.length > 0) {
    const match = b.avaliadores.some(a => {
      if (a === null || a === undefined) return false;
      if (typeof a === 'string' || typeof a === 'number') {
        const strA = String(a).toLowerCase().trim();
        return (uEmail && strA === uEmail) || (uId !== undefined && String(a) === String(uId));
      }
      if (typeof a === 'object') {
        const aEmail = String(a.email || a.usuario_email || a.usuarioEmail || '').toLowerCase().trim();
        const aId = a.id !== undefined ? a.id : (a.usuario_id !== undefined ? a.usuario_id : a.usuarioId);
        return (uEmail && aEmail === uEmail) || (uId !== undefined && String(aId) === String(uId));
      }
      return false;
    });
    if (match) return true;
  }

  if (b.avaliador_email && uEmail && String(b.avaliador_email).toLowerCase().trim() === uEmail) return true;
  if (b.avaliadorEmail && uEmail && String(b.avaliadorEmail).toLowerCase().trim() === uEmail) return true;
  if (b.avaliador_id !== undefined && uId !== undefined && String(b.avaliador_id) === String(uId)) return true;
  if (b.avaliadorId !== undefined && uId !== undefined && String(b.avaliadorId) === String(uId)) return true;

  return false;
};

export default function Painel({ eu, irPara }) {
  const [d, setD] = useState(null);
  const [pendencias, setPendencias] = useState(0);
  const [paraAvaliar, setParaAvaliar] = useState(0);

  useEffect(() => {
    api('/dashboard').then(setD).catch(() => setD(false));

    const u = eu || {};
    const papeis = Array.isArray(u.papeis)
      ? u.papeis.map(p => String(p).toLowerCase())
      : (u.papel ? [String(u.papel).toLowerCase()] : []);

    const ehAdmin = papeis.includes('admin') || papeis.includes('administrador') || u.admin === true;
    const ehAvaliador = papeis.includes('avaliador');

    if (ehAdmin) {
      api('/vinculos')
        .then(v => setPendencias(Array.isArray(v) ? v.filter(x => x.situacao === 'pendente').length : 0))
        .catch(() => {});
    }

    if (ehAvaliador && !ehAdmin) {
      api('/bancas').then(bs => {
        if (!Array.isArray(bs)) return setParaAvaliar(0);

        const bancasDoAvaliador = bs.filter(b => {
          if (b.encerrada || b.status === 'encerrada') return false;
          return isAvaliadorDaBanca(b, u);
        });

        const total = bancasDoAvaliador.reduce((s, b) => {
          const avaliados = Array.isArray(b.minhas) ? b.minhas : [];
          const projetos = Array.isArray(b.projetos) ? b.projetos : [];
          return s + projetos.filter(p => !avaliados.includes(p.id)).length;
        }, 0);

        setParaAvaliar(total);
      }).catch(() => setParaAvaliar(0));
    } else {
      setParaAvaliar(0);
    }
  }, [eu]);

  const primeiroNome = eu?.nome ? eu.nome.split(' ')[0] : '';
  const topo = (
    <section className="hero">
      <div>
        <small>{eu?.instNome}</small>
        <h1>Olá, {primeiroNome}</h1>
        <p>Um resumo dos projetos, bancas e avaliações da sua instituição.</p>
      </div>
      <div className="acoes">
        {paraAvaliar > 0 && (
          <button className="botao" onClick={() => irPara('bancas')}>
            <Icone nome="bancas" />Avaliar ({paraAvaliar})
          </button>
        )}
        <button className="botao sec" onClick={() => irPara('projetos')}>
          <Icone nome="projetos" />Projetos
        </button>
        <button className="botao sec" onClick={() => irPara('resultados')}>
          <Icone nome="trofeu" />Resultados
        </button>
      </div>
    </section>
  );

  if (d === null) return <>{topo}<Esqueleto linhas={3} altura={110} /></>;
  if (d === false) return <EstadoVazio icone="alerta" titulo="Não foi possível carregar o painel" texto="Verifique a conexão e recarregue a página." />;

  let acc = 0;
  const fatias = d.porStatus ? d.porStatus.map(s => { const de = acc; acc += s.n / d.total * 100; return `${CORES[s.status] || '#9b93c9'} ${de}% ${acc}%`; }) : [];
  const maxPeriodo = d.porPeriodo ? Math.max(1, ...d.porPeriodo.map(x => x.n)) : 1;

  return (
    <>
      {topo}
      {pendencias > 0 && (
        <div className="alerta">
          <p><Icone nome="relogio" /> {pendencias === 1 ? '1 pessoa aguarda' : `${pendencias} pessoas aguardam`} aprovação de acesso.</p>
          <button className="botao pequeno" onClick={() => irPara('pessoas')}>Revisar pedidos</button>
        </div>
      )}
      <div className="bento">
        <div className="tile kpi"><span>{d.total === 1 ? 'Projeto' : 'Projetos'}</span><b><Contador valor={d.total} /></b></div>
        <div className="tile kpi"><span>{d.avaliacoes === 1 ? 'Avaliação concluída' : 'Avaliações concluídas'}</span><b><Contador valor={d.avaliacoes} /></b></div>
        <div className="tile kpi"><span>{d.bancas === 1 ? 'Banca' : 'Bancas'}</span><b><Contador valor={d.bancas} /></b></div>
        {d.total === 0 ? (
          <div className="tile" style={{ gridColumn: '1 / -1' }}>
            <EstadoVazio titulo="Nenhum projeto ainda" texto="Quando houver projetos cadastrados, a distribuição por situação e por período aparece aqui.">
              <button className="botao" onClick={() => irPara('projetos')}>Ir para projetos</button>
            </EstadoVazio>
          </div>
        ) : (
          <>
            <section className="tile larga">
              <h3>Projetos por situação</h3>
              <div className="donut-bloco">
                <div className="donut" data-total={d.total} style={{ background: `conic-gradient(${fatias.join(', ')})` }} role="img" aria-label="Distribuição por situação" />
                <div className="legenda">
                  {d.porStatus && d.porStatus.map(s => <div key={s.status}><i style={{ background: CORES[s.status] || '#9b93c9' }} />{(STATUS_PROJETO[s.status] || [s.status])[0]}<b>{s.n}</b></div>)}
                </div>
              </div>
            </section>
            <section className="tile">
              <h3>Projetos por período</h3>
              <div className="barras">
                {d.porPeriodo && d.porPeriodo.map(p => (
                  <div key={p.periodo} className="barra-item">
                    <div className="barra-col">
                      <span className="val">{p.n}</span>
                      <div className="barra-fill" style={{ height: `${(p.n / maxPeriodo) * 100}%` }} />
                    </div>
                    <span className="rotulo">{p.periodo}</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}