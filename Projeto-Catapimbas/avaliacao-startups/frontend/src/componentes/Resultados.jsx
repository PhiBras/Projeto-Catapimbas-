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
      <Cabecalho titulo="Resultados" sub="Ranking por média ponderada das notas dos avaliadores. Projetos com a mesma pontuação dividem a posição.">
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
          <section className="painel"><div className="painel-corpo"><Podio key={id} ranking={d.ranking} /></div></section>
          <section className="painel">
            <div className="painel-cab"><h3>Classificação completa</h3><Selo tipo={d.banca.publicada ? 'verde' : 'amarelo'}>{d.banca.publicada ? 'Publicado' : 'Rascunho'}</Selo></div>
            {d.ranking.length === 0 ? <EstadoVazio icone="bancas" titulo="Ainda não há avaliações completas" texto="O ranking aparece quando pelo menos um avaliador preencher todos os critérios de um projeto." /> : (
              <div className="rolagem">
                <table>
                  <thead><tr><th>Posição</th><th>Projeto</th><th>Pontuação (de 1 a 5)</th><th className="num">Avaliadores</th></tr></thead>
                  <tbody>
                    {d.ranking.map(r => (
                      <tr key={r.id}>
                        <td><span className={'medalha' + (r.posicao <= 3 ? ' m' + r.posicao : '')}>{r.posicao}</span></td>
                        <td><b>{r.nome}</b> {r.empate && <Selo tipo="azul">empate</Selo>}</td>
                        <td><div className="nota-barra"><div className="progresso"><i style={{ width: `${r.pontuacao / 5 * 100}%` }} /></div><b>{nota2(r.pontuacao)}</b></div></td>
                        <td className="num">{r.avaliadores}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {d.semNota.length > 0 && <div className="rodape-tabela"><small>Sem avaliação completa: {d.semNota.map(p => p.nome).join(', ')}.</small></div>}
          </section>
        </>
      )}
      {apresentando && d && <Apresentacao titulo={d.banca.nome} ranking={d.ranking} aoFechar={() => setApresentando(false)} />}
    </>
  );
}
