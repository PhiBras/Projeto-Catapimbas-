import { useEffect, useState } from 'react';
import { api } from '../api';
import { Icone, Cabecalho, Modal, Campo, Selo, EstadoVazio, Esqueleto, useUI } from './ui.jsx';

const ESCALA = ['Insuficiente', 'Fraco', 'Adequado', 'Bom', 'Excelente'];   // rubrica padrão, se o administrador não preencher
const MODELO = ['Clareza do problema', 'Mercado e escalabilidade', 'Conceito e produto', 'Estratégia de diferenciação', 'Desempenho da apresentação'];

export default function Bancas({ eu, irPara }) {
  const { avisar, perguntar } = useUI();
  const gestor = eu.papeis.includes('admin') || eu.papeis.includes('coordenador');
  const [bancas, setBancas] = useState(null);
  const [nova, setNova] = useState(false);
  const [avaliando, setAvaliando] = useState(null);

  const carregar = () => api('/bancas').then(setBancas).catch(e => { avisar(e.message, 'erro'); setBancas([]); });
  useEffect(() => { carregar(); }, []);

  async function publicar(b) {
    const ok = await perguntar({ titulo: 'Publicar resultado?', texto: `O ranking de "${b.nome}" ficará visível para todos da instituição e a banca será encerrada. Depois disso não é possível lançar novas notas.`, confirmar: 'Publicar resultado' });
    if (!ok) return;
    try { await api(`/bancas/${b.id}/publicar`, 'POST'); avisar('Resultado publicado.'); carregar(); } catch (e) { avisar(e.message, 'erro'); }
  }

  return (
    <>
      <Cabecalho titulo="Bancas" sub={gestor ? 'Monte bancas com critérios e pesos, designe avaliadores e publique os resultados.' : 'Bancas em que você foi designado como avaliador ou que já têm resultado publicado.'}>
        {gestor && <button className="botao" onClick={() => setNova(true)}><Icone nome="mais" />Nova banca</button>}
      </Cabecalho>

      {!bancas ? <Esqueleto linhas={2} altura={120} /> : bancas.length === 0 ? (
        <div className="painel"><EstadoVazio icone="bancas" titulo={gestor ? 'Nenhuma banca criada' : 'Nenhuma banca para você ainda'}
          texto={gestor ? 'Crie uma banca para escolher os projetos, os critérios e os avaliadores.' : 'Quando um administrador designar você para uma banca, ela aparece aqui.'}>
          {gestor && <button className="botao" onClick={() => setNova(true)}>Criar a primeira banca</button>}
        </EstadoVazio></div>
      ) : bancas.map(b => {
        const feitas = b.minhas.length, total = b.projetos.length;
        const avalia = b.designado && b.status === 'aberta';
        return (
          <section className="painel" key={b.id}>
            <div className="painel-cab">
              <div>
                <h3>{b.nome}</h3>
                <small>{total} {total === 1 ? 'projeto' : 'projetos'} e {b.criterios.length} {b.criterios.length === 1 ? 'critério' : 'critérios'}</small>
              </div>
              <div className="acoes">
                <Selo tipo={b.status === 'aberta' ? 'azul' : 'cinza'}>{b.status === 'aberta' ? 'Aberta' : 'Encerrada'}</Selo>
                <Selo tipo={b.publicada ? 'verde' : 'amarelo'}>{b.publicada ? 'Resultado publicado' : 'Rascunho'}</Selo>
                {gestor && !b.publicada && <button className="botao pequeno" onClick={() => publicar(b)}>Publicar resultado</button>}
                {(gestor || b.publicada) && <button className="botao sec pequeno" onClick={() => irPara('resultados')}><Icone nome="trofeu" tam={15} />Ver resultado</button>}
              </div>
            </div>
            <div className="painel-corpo">
              {avalia ? (
                <>
                  <div className="acoes" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                    <b>Suas avaliações</b><small>{feitas} de {total} enviadas</small>
                  </div>
                  <div className="progresso" style={{ marginBottom: 12 }}><i style={{ width: `${total ? feitas / total * 100 : 0}%` }} /></div>
                  {b.projetos.map(p => (
                    <div key={p.id} className="acoes" style={{ justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid var(--linha)' }}>
                      <span>{p.nome}</span>
                      {b.minhas.includes(p.id)
                        ? <Selo tipo="verde">Avaliado</Selo>
                        : <button className="botao pequeno" onClick={() => setAvaliando({ banca: b, projeto: p })}>Avaliar</button>}
                    </div>
                  ))}
                </>
              ) : (
                <div className="acoes">{b.projetos.map(p => <Selo key={p.id}>{p.nome}</Selo>)}</div>
              )}
            </div>
          </section>
        );
      })}

      {nova && <NovaBanca aoFechar={() => setNova(false)} aoCriar={() => { setNova(false); avisar('Banca criada.'); carregar(); }} />}
      {avaliando && <Avaliar {...avaliando} aoFechar={() => setAvaliando(null)} aoConcluir={() => { setAvaliando(null); carregar(); }} />}
    </>
  );
}

/* Ficha de avaliação: nota de 1 a 5 por critério, com a rubrica correspondente aparecendo ao escolher. */
function Avaliar({ banca, projeto, aoFechar, aoConcluir }) {
  const { perguntar } = useUI();
  const [notas, setNotas] = useState({});
  const [recibo, setRecibo] = useState(null);
  const [erro, setErro] = useState('');
  const feitos = banca.criterios.filter(c => notas[c.id]).length;
  const completo = feitos === banca.criterios.length;

  async function enviar() {
    const ok = await perguntar({ titulo: 'Enviar avaliação?', texto: 'Depois de enviada, a avaliação não pode ser alterada.', confirmar: 'Enviar avaliação' });
    if (!ok) return;
    setErro('');
    try { const d = await api('/avaliacoes', 'POST', { banca_id: banca.id, projeto_id: projeto.id, notas }); setRecibo(d.recibo); }
    catch (e) { setErro(e.message); }
  }

  if (recibo) return (
    <Modal titulo="Avaliação enviada" largura={460} onFechar={aoConcluir} rodape={<button className="botao" onClick={aoConcluir}>Concluir</button>}>
      <div className="recibo"><Icone nome="check" tam={44} /><h3 style={{ marginTop: 8 }}>{projeto.nome}</h3>
        <p style={{ color: 'var(--suave)' }}>Sua avaliação foi registrada. Guarde o código do recibo.</p><code>{recibo}</code></div>
    </Modal>
  );

  return (
    <Modal titulo={`Avaliar ${projeto.nome}`} largura={680} onFechar={aoFechar}
      rodape={<><small style={{ marginRight: 'auto' }}>{feitos} de {banca.criterios.length} critérios com nota</small>
        <button className="botao sec" onClick={aoFechar}>Cancelar</button>
        <button className="botao" disabled={!completo} onClick={enviar}>Enviar avaliação</button></>}>
      {erro && <div className="erro-form" role="alert"><Icone nome="alerta" />{erro}</div>}
      {banca.criterios.map(c => (
        <div className="criterio" key={c.id}>
          <div className="criterio-cab"><h3>{c.titulo}</h3>{c.peso !== 1 && <Selo tipo="azul">peso {c.peso}</Selo>}</div>
          <div className="seg" role="radiogroup" aria-label={c.titulo}>
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} type="button" role="radio" aria-checked={notas[c.id] === n} className={notas[c.id] === n ? 'on' : ''} onClick={() => setNotas({ ...notas, [c.id]: n })}>{n}</button>
            ))}
          </div>
          <div className="descritor">{notas[c.id] ? <><b style={{ color: 'var(--texto)' }}>{notas[c.id]}</b> {c.descritores[notas[c.id]]}</> : `Escolha de 1 (${c.descritores[1] || ESCALA[0]}) a 5 (${c.descritores[5] || ESCALA[4]}).`}</div>
        </div>
      ))}
    </Modal>
  );
}

/* Criação de banca: critérios editáveis (com rubricas opcionais), projetos e avaliadores. */
function NovaBanca({ aoFechar, aoCriar }) {
  const [nome, setNome] = useState('');
  const [criterios, setCriterios] = useState(MODELO.map(t => ({ titulo: t, peso: 1, rubricas: ['', '', '', '', ''], aberto: false })));
  const [projetos, setProjetos] = useState([]);
  const [avaliadores, setAvaliadores] = useState([]);
  const [selP, setSelP] = useState([]);
  const [selA, setSelA] = useState([]);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api('/projetos?limit=50').then(d => setProjetos(d.itens)).catch(() => {});
    api('/pessoas').then(p => setAvaliadores(p.filter(x => x.papeis.includes('avaliador')))).catch(() => {});
  }, []);

  const altera = (i, mudanca) => setCriterios(criterios.map((c, j) => j === i ? { ...c, ...mudanca } : c));
  const marca = (lista, set, id) => set(lista.includes(id) ? lista.filter(x => x !== id) : [...lista, id]);
  const validos = criterios.filter(c => c.titulo.trim());
  const pronto = nome.trim() && validos.length && selP.length && selA.length;

  async function salvar() {
    setErro('');
    const itens = validos.map(c => ({ titulo: c.titulo, peso: Number(c.peso) || 1, descritores: Object.fromEntries(c.rubricas.map((r, i) => [i + 1, r.trim() || ESCALA[i]])) }));
    try { await api('/bancas', 'POST', { nome, criterios: itens, projetos: selP, avaliadores: selA }); aoCriar(); }
    catch (e) { setErro(e.message); }
  }

  return (
    <Modal titulo="Nova banca" largura={760} onFechar={aoFechar}
      rodape={<><button className="botao sec" onClick={aoFechar}>Cancelar</button><button className="botao" disabled={!pronto} onClick={salvar}>Criar banca</button></>}>
      {erro && <div className="erro-form" role="alert"><Icone nome="alerta" />{erro}</div>}
      <Campo rotulo="Nome da banca"><input autoFocus value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex.: Banca final 2026.1" /></Campo>

      <h3 style={{ margin: '8px 0 4px' }}>Critérios de avaliação</h3>
      <p className="texto-modal" style={{ marginBottom: 10 }}>Cada critério recebe nota de 1 a 5. O peso define a importância dele na média. Use “Rubricas” para descrever o que significa cada nota.</p>
      {criterios.map((c, i) => (
        <div className="crit-linha" key={i}>
          <input aria-label="Título do critério" placeholder="Título do critério" value={c.titulo} onChange={e => altera(i, { titulo: e.target.value })} />
          <input aria-label="Peso" type="number" min="0.1" max="10" step="0.1" value={c.peso} onChange={e => altera(i, { peso: e.target.value })} title="Peso" />
          <div className="acoes">
            <button type="button" className="botao sec pequeno" onClick={() => altera(i, { aberto: !c.aberto })}>Rubricas</button>
            <button type="button" className="botao fantasma pequeno icone" aria-label="Remover critério" onClick={() => setCriterios(criterios.filter((_, j) => j !== i))}><Icone nome="lixo" tam={16} /></button>
          </div>
          {c.aberto && (
            <div className="crit-rubricas">
              {c.rubricas.map((r, k) => (
                <div key={k}><b>{k + 1}</b><input aria-label={`Rubrica da nota ${k + 1}`} placeholder={ESCALA[k]} value={r} onChange={e => altera(i, { rubricas: c.rubricas.map((x, y) => y === k ? e.target.value : x) })} /></div>
              ))}
            </div>
          )}
        </div>
      ))}
      <button type="button" className="botao sec pequeno" style={{ marginBottom: 18 }} onClick={() => setCriterios([...criterios, { titulo: '', peso: 1, rubricas: ['', '', '', '', ''], aberto: false }])}><Icone nome="mais" tam={15} />Adicionar critério</button>

      <div className="linha-campos" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        <Campo rotulo={`Projetos (${selP.length} de ${projetos.length})`}>
          <div className="marcar">
            {projetos.length === 0 && <label style={{ color: 'var(--suave)' }}>Cadastre projetos antes de criar a banca.</label>}
            {projetos.map(p => <label key={p.id}><input type="checkbox" checked={selP.includes(p.id)} onChange={() => marca(selP, setSelP, p.id)} />{p.nome}</label>)}
          </div>
          {projetos.length > 0 && <button type="button" className="botao fantasma pequeno" onClick={() => setSelP(selP.length === projetos.length ? [] : projetos.map(p => p.id))}>{selP.length === projetos.length ? 'Desmarcar todos' : 'Marcar todos'}</button>}
        </Campo>
        <Campo rotulo={`Avaliadores (${selA.length} de ${avaliadores.length})`}>
          <div className="marcar">
            {avaliadores.length === 0 && <label style={{ color: 'var(--suave)' }}>Nenhum avaliador aprovado ainda.</label>}
            {avaliadores.map(a => <label key={a.id}><input type="checkbox" checked={selA.includes(a.id)} onChange={() => marca(selA, setSelA, a.id)} />{a.nome}</label>)}
          </div>
        </Campo>
      </div>
    </Modal>
  );
}
