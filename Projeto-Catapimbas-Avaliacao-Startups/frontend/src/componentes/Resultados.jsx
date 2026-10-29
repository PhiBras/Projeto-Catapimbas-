import { useEffect, useState } from 'react';
import { api } from '../api';
import { Icone, Cabecalho, Selo, EstadoVazio, Esqueleto, nota2, useUI } from './ui.jsx';
import Podio, { Apresentacao } from './Podio.jsx';

export default function Resultados({ irPara }) {
  const { avisar } = useUI();
  const [bancas, setBancas] = useState(null);
  const [id, setId] = useState('');
  const [d, setD] = useState(null);
  const [erro, setErro] = useState('');
  const [apresentando, setApresentando] = useState(false);

  useEffect(() => {
    api('/bancas').then(b => { setBancas(b); if (b.length) setId(String(b[0].id)); }).catch(e => { avisar(e.message, 'erro'); setBancas([]); });
  }, []);
  useEffect(() => {
    if (!id) return;
    setD(null); setErro('');
    api(`/bancas/${id}/ranking`).then(setD).catch(e => setErro(e.message));
  }, [id]);

  return (
    <>
      <Cabecalho titulo="Resultados" sub="Ranking pela média ponderada das notas. Projetos com a mesma pontuação dividem a posição.">
        {bancas?.length > 0 && <select aria-label="Banca" style={{ width: 'auto', maxWidth: 320 }} value={id} onChange={e => setId(e.target.value)}>
          {bancas.map(b => <option key={b.id} value={b.id}>{b.nome}{b.publicada ? '' : ' (rascunho)'}</option>)}</select>}
        {d && <button className="botao sec" onClick={() => { window.location = '/api/exportar?banca_id=' + id; }}><Icone nome="baixar" />Exportar Excel</button>}
        {d?.ranking.length > 0 && <button className="botao" onClick={() => setApresentando(true)}><Icone nome="festa" />Modo apresentação</button>}
      </Cabecalho>

      {!bancas ? <Esqueleto linhas={2} altura={140} /> : bancas.length === 0 ? (
        <div className="painel"><EstadoVazio icone="trofeu" titulo="Nenhum resultado disponível" texto="Os resultados aparecem aqui quando uma banca for publicada." /></div>
      ) : erro ? (
        <div className="painel"><EstadoVazio icone="relogio" titulo="Resultado indisponível" texto={erro + '.'} /></div>
      ) : !d ? <Esqueleto linhas={3} altura={90} /> : (
        <>
          {!d.banca.publicada && (
            <div className="alerta"><Icone nome="alerta" /><p>Este resultado é um rascunho. Só administradores e coordenadores conseguem vê-lo.</p>
              <button className="botao pequeno" onClick={() => irPara('bancas')}>Ir para bancas</button></div>
          )}
          <section className="palco">
            <div className="palco-titulo"><small>{d.banca.publicada ? 'Resultado publicado' : 'Rascunho'}</small><h2>{d.banca.nome}</h2></div>
            <Podio key={id} ranking={d.ranking} auto />
          </section>
          {d.ranking.length === 0 ? (
            <div className="painel"><EstadoVazio icone="bancas" titulo="Ainda não há avaliações completas" texto="O ranking aparece quando pelo menos um avaliador preencher todos os critérios de um projeto." /></div>
          ) : (
            <div className="rank-lista" aria-label="Classificação completa">
              {d.ranking.map((r, i) => (
                <div className="rank-linha" key={r.id} style={{ animationDelay: `${i * 45}ms` }}>
                  <span className={'medalha' + (r.posicao <= 3 ? ' m' + r.posicao : '')}>{r.posicao}</span>
                  <div><b>{r.nome}</b> {r.empate && <Selo tipo="azul">empate</Selo>}<div className="av">{r.avaliadores} {r.avaliadores === 1 ? 'avaliador' : 'avaliadores'}</div></div>
                  <div className="nota-barra barra-col"><div className="progresso"><i style={{ width: `${r.pontuacao / 5 * 100}%` }} /></div></div>
                  <b style={{ fontFamily: 'var(--titulo)', fontSize: '1.3rem', textAlign: 'right' }}>{nota2(r.pontuacao)}</b>
                </div>
              ))}
            </div>
          )}
          {d.semNota.length > 0 && <p style={{ marginTop: 14 }}><small>Sem avaliação completa: {d.semNota.map(p => p.nome).join(', ')}.</small></p>}
        </>
      )}
      {apresentando && d && <Apresentacao titulo={d.banca.nome} ranking={d.ranking} aoFechar={() => setApresentando(false)} />}
    </>
  );
}
