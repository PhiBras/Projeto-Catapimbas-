import { useEffect, useState } from 'react';
import { api } from '../api';
import { Icone, Cabecalho, Esqueleto, EstadoVazio, STATUS_PROJETO } from './ui.jsx';

const CORES = { ideacao: '#94a3b8', em_andamento: '#3b82f6', concluido: '#16a34a', arquivado: '#cbd5e1' };

export default function Painel({ eu, irPara }) {
  const [d, setD] = useState(null);
  const [pendencias, setPendencias] = useState(0);     // solicitações de ingresso (administrador)
  const [paraAvaliar, setParaAvaliar] = useState(0);   // projetos que faltam avaliar (avaliador)

  useEffect(() => {
    api('/dashboard').then(setD).catch(() => setD(false));
    if (eu.papeis.includes('admin')) api('/vinculos').then(v => setPendencias(v.filter(x => x.situacao === 'pendente').length)).catch(() => {});
    if (eu.papeis.includes('avaliador')) api('/bancas').then(bs => setParaAvaliar(
      bs.filter(b => b.designado && b.status === 'aberta').reduce((s, b) => s + b.projetos.filter(p => !b.minhas.includes(p.id)).length, 0))).catch(() => {});
  }, []);

  const primeiroNome = eu.nome.split(' ')[0];
  if (d === null) return <><Cabecalho titulo={`Olá, ${primeiroNome}`} /><Esqueleto linhas={3} altura={90} /></>;
  if (d === false) return <EstadoVazio icone="alerta" titulo="Não foi possível carregar o painel" texto="Verifique a conexão e recarregue a página." />;

  const maxPeriodo = Math.max(1, ...d.porPeriodo.map(x => x.n));
  return (
    <>
      <Cabecalho titulo={`Olá, ${primeiroNome}`} sub={`Veja como estão os projetos e as avaliações de ${eu.instNome}.`} />

      {pendencias > 0 && (
        <div className="alerta"><Icone nome="relogio" /><p>{pendencias === 1 ? '1 pessoa aguarda' : `${pendencias} pessoas aguardam`} aprovação de acesso.</p>
          <button className="botao pequeno" onClick={() => irPara('pessoas')}>Revisar pedidos</button></div>
      )}
      {paraAvaliar > 0 && (
        <div className="alerta"><Icone nome="bancas" /><p>{paraAvaliar === 1 ? 'Falta 1 projeto' : `Faltam ${paraAvaliar} projetos`} para você avaliar.</p>
          <button className="botao pequeno" onClick={() => irPara('bancas')}>Avaliar agora</button></div>
      )}

      <div className="painel resumo">
        <div><b>{d.total}</b><span>{d.total === 1 ? 'projeto' : 'projetos'}</span></div>
        <div><b>{d.avaliacoes}</b><span>{d.avaliacoes === 1 ? 'avaliação concluída' : 'avaliações concluídas'}</span></div>
        <div><b>{d.bancas}</b><span>{d.bancas === 1 ? 'banca' : 'bancas'}</span></div>
      </div>

      {d.total === 0 ? (
        <div className="painel"><EstadoVazio titulo="Nenhum projeto ainda" texto="Quando houver projetos cadastrados, a distribuição por situação e por período aparece aqui.">
          <button className="botao" onClick={() => irPara('projetos')}>Ir para projetos</button></EstadoVazio></div>
      ) : (
        <div className="duas-colunas">
          <section className="painel">
            <div className="painel-cab"><h3>Projetos por situação</h3></div>
            <div className="painel-corpo">
              <div className="segmentos" role="img" aria-label="Distribuição por situação">
                {d.porStatus.map(s => <i key={s.status} style={{ width: `${s.n / d.total * 100}%`, background: CORES[s.status] || '#94a3b8' }} />)}
              </div>
              <div className="legenda">
                {d.porStatus.map(s => <div key={s.status}><i style={{ background: CORES[s.status] || '#94a3b8' }} />{(STATUS_PROJETO[s.status] || [s.status])[0]}<b>{s.n}</b></div>)}
              </div>
            </div>
          </section>
          <section className="painel">
            <div className="painel-cab"><h3>Projetos por período</h3></div>
            <div className="painel-corpo">
              <div className="colunas">
                {d.porPeriodo.map(p => (
                  <div key={p.ano + '-' + p.semestre}><b>{p.n}</b><i style={{ height: `${p.n / maxPeriodo * 100}%` }} /><small>{p.ano}.{p.semestre}</small></div>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
