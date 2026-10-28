import { useState, useEffect } from 'react';
import { api } from '../api';
import { useUI, Icone, Esqueleto, EstadoVazio } from './ui';

const FORM_INICIAL = {
  nome: '',
  projetos: [],
  avaliadores: [],
  criterios: [
    { titulo: 'Inovação', peso: 2.5 },
    { titulo: 'Apresentação', peso: 2.5 },
    { titulo: 'Modelagem de Negócio', peso: 2.5 },
    { titulo: 'Viabilidade Técnica', peso: 2.5 }
  ]
};

export default function Bancas({ admin, eu }) {
  const ui = useUI() || {};
  const { perguntar, avisar } = ui;
  const u = eu || ui.usuario || ui.eu || ui.user || {};

  const [bancas, setBancas] = useState([]);
  const [projetos, setProjetos] = useState([]);
  const [pessoas, setPessoas] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Estados dos Modais
  const [criando, setCriando] = useState(false);
  const [editandoId, setEditandoId] = useState(null); // ID da banca em edição (null se for criação)
  const [carregandoModal, setCarregandoModal] = useState(false);
  const [formBanca, setFormBanca] = useState(FORM_INICIAL);

  const [avaliando, setAvaliando] = useState(null);
  const [notasForm, setNotasForm] = useState({});
  const [qrModal, setQrModal] = useState(null);

  // Verificação de Administrador/Gestor
  const papeis = Array.isArray(u.papeis)
    ? u.papeis.map(p => String(p).toLowerCase())
    : (u.papel ? [String(u.papel).toLowerCase()] : []);

  const ehAdmin = Boolean(
    admin === true ||
    papeis.includes('admin') ||
    papeis.includes('administrador') ||
    papeis.includes('coordenador') ||
    u.admin === true
  );

  const carregarBancas = async () => {
    setCarregando(true);
    try {
      const resBancas = await api('/bancas');
      const lista = Array.isArray(resBancas) ? resBancas : [];
      setBancas(lista);

      // Leitura automática do QR Code pela URL
      const params = new URLSearchParams(window.location.search);
      const bId = params.get('banca');
      const pId = params.get('projeto');

      if (bId && pId) {
        const bEncontrada = lista.find(b => String(b.id) === String(bId));
        if (bEncontrada && bEncontrada.projetos) {
          const pEncontrado = bEncontrada.projetos.find(p => String(p.id) === String(pId));
          if (pEncontrado) {
            setAvaliando({ banca: bEncontrada, projeto: pEncontrado });
          }
        }
      }
    } catch (erro) {
      console.error("Erro ao carregar bancas:", erro);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { carregarBancas(); }, []);

  // Busca dados de apoio (Projetos e Avaliadores) para o Modal
  const carregarDadosModal = async () => {
    const resProj = await api('/projetos?limit=100').catch(() => ({ itens: [] }));
    const projList = Array.isArray(resProj) ? resProj : (resProj?.itens || resProj?.projetos || []);
    setProjetos(projList);

    const resPessoas = await api('/pessoas').catch(() => []);
    const listaPessoas = Array.isArray(resPessoas) ? resPessoas : [];

    const avaliadores = listaPessoas
      .filter(p => {
        if (!p || !p.id) return false;
        const papeisStr = String(p.papeis || '').toLowerCase();
        return papeisStr.includes('avaliador');
      })
      .map(p => ({
        id: Number(p.id),
        nome: p.nome,
        email: p.email || ''
      }));

    setPessoas(avaliadores);
  };

  // Abrir Modal em Modo de CRIAÇÃO
  const abrirModalCriar = async () => {
    setEditandoId(null);
    setFormBanca(FORM_INICIAL);
    setCriando(true);
    setCarregandoModal(true);
    try {
      await carregarDadosModal();
    } catch (err) {
      console.error("Erro ao carregar modal:", err);
    } finally {
      setCarregandoModal(false);
    }
  };

  // Abrir Modal em Modo de EDIÇÃO
  const abrirModalEditar = async (b) => {
    setEditandoId(b.id);
    setCriando(true);
    setCarregandoModal(true);
    try {
      await carregarDadosModal();

      // Tenta obter detalhes completos da banca, ou usa os dados existentes na lista
      let bancaDetalhada = b;
      try {
        const resDet = await api(`/bancas/${b.id}`);
        if (resDet && resDet.id) bancaDetalhada = resDet;
      } catch { /* usa o objeto b já em memória */ }

      setFormBanca({
        nome: bancaDetalhada.nome || '',
        projetos: (bancaDetalhada.projetos || []).map(p => Number(p.id)),
        avaliadores: (bancaDetalhada.avaliadores || []).map(a => Number(a.id || a.usuario_id || a)),
        criterios: (bancaDetalhada.criterios || []).length > 0 
          ? bancaDetalhada.criterios.map(c => ({ id: c.id, titulo: c.titulo || c.nome || '', peso: Number(c.peso) || 1 }))
          : FORM_INICIAL.criterios
      });
    } catch (err) {
      console.error("Erro ao carregar edição da banca:", err);
    } finally {
      setCarregandoModal(false);
    }
  };

  // Salvar Banca (Criação via POST ou Edição via PUT)
  const salvarBanca = async (e) => {
    e.preventDefault();
    if (!formBanca.projetos.length || !formBanca.avaliadores.length) {
      alert("Selecione pelo menos um projeto e um avaliador.");
      return;
    }
    if (!formBanca.criterios.length) {
      alert("Adicione pelo menos um critério de avaliação.");
      return;
    }

    try {
      if (editandoId) {
        await api(`/bancas/${editandoId}`, 'PUT', formBanca);
        if (avisar) avisar('Banca atualizada com sucesso!');
      } else {
        await api('/bancas', 'POST', formBanca);
        if (avisar) avisar('Banca criada com sucesso!');
      }
      
      setCriando(false);
      setEditandoId(null);
      setFormBanca(FORM_INICIAL);
      carregarBancas();
    } catch (err) {
      console.error("Erro ao salvar banca:", err);
      alert(err.message || "Erro ao salvar banca.");
    }
  };

  // Submeter Avaliação
  const submeterAvaliacao = async (e) => {
    e.preventDefault();
    if (!avaliando) return;

    const notasFormatadas = {};
    for (const key in notasForm) {
      notasFormatadas[key] = parseInt(notasForm[key], 10);
    }

    try {
      await api('/avaliacoes', 'POST', {
        banca_id: avaliando.banca.id,
        projeto_id: avaliando.projeto.id,
        notas: notasFormatadas
      });
      setAvaliando(null);
      setNotasForm({});
      window.history.replaceState({}, document.title, window.location.pathname);
      carregarBancas();
    } catch (err) {
      console.error("Erro ao enviar avaliação:", err);
      alert(err.message || "Erro ao enviar avaliação.");
    }
  };

  // Encerrar Banca
  const encerrar = async (b) => {
    const ok = await perguntar({
      titulo: 'Publicar resultado?',
      texto: `O ranking de "${b.nome}" ficará visível para todos da instituição e a banca será encerrada.`,
      confirmar: 'Publicar resultado'
    });
    if (ok) {
      try {
        await api(`/bancas/${b.id}/publicar`, 'POST');
        carregarBancas();
      } catch (err) {
        console.error("Erro ao publicar banca:", err);
      }
    }
  };

  // Filtro de exibição
  const bancasExibidas = (bancas || []).filter(b => {
    if (ehAdmin) return true;
    return b.designado === true || b.publicada === true;
  });

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px 0' }}>Bancas</h2>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '14px' }}>
            Organize apresentações, atribua avaliadores e acompanhe os lançamentos.
          </p>
        </div>
        {ehAdmin && (
          <button className="botao" onClick={abrirModalCriar} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Icone nome="mais" tam={18} /> Nova banca
          </button>
        )}
      </div>

      {/* Grid de Bancas */}
      {carregando ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          <Esqueleto linhas={4} altura={140} />
          <Esqueleto linhas={4} altura={140} />
        </div>
      ) : bancasExibidas.length === 0 ? (
        <EstadoVazio 
          icone="bancas"
          titulo="Nenhuma banca encontrada"
          texto="Você ainda não foi vinculado a nenhuma banca ou não há bancas cadastradas no momento."
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {bancasExibidas.map(b => {
            const totalProjetos = b.projetos ? b.projetos.length : 0;
            const totalCriterios = b.criterios ? b.criterios.length : 0;
            const podeAvaliar = !b.publicada && b.status !== 'encerrada' && b.designado && !ehAdmin;

            return (
              <div key={b.id} style={{ 
                background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', 
                borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column',
                justify: 'space-between', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)', backdropFilter: 'blur(10px)'
              }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', gap: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#ffffff', wordBreak: 'break-word' }}>
                      {b.nome || 'Banca sem nome'}
                    </h3>
                    <span className={`badge ${b.publicada || b.status === 'encerrada' ? 'ok' : 'alerta'}`} style={{ whiteSpace: 'nowrap' }}>
                      {b.publicada || b.status === 'encerrada' ? 'Encerrada' : 'Em andamento'}
                    </span>
                  </div>

                  <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px', display: 'flex', gap: '12px' }}>
                    <span>📁 {totalProjetos} {totalProjetos === 1 ? 'projeto' : 'projetos'}</span>
                    <span>•</span>
                    <span>📋 {totalCriterios} {totalCriterios === 1 ? 'critério' : 'critérios'}</span>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: 'bold', marginBottom: '8px' }}>
                      Projetos da Banca
                    </div>
                    
                    {b.projetos && b.projetos.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {b.projetos.map(p => {
                          const jaAvaliado = (b.minhas || []).includes(p.id);

                          return (
                            <div key={p.id} style={{ 
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)',
                              padding: '8px 12px', borderRadius: '8px', gap: '8px'
                            }}>
                              <span style={{ fontWeight: '500', fontSize: '14px', color: '#e2e8f0', flex: 1 }}>{p.nome}</span>
                              
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <button className="botao sec pequeno" onClick={() => setQrModal({ banca: b, projeto: p })} title="Gerar QR Code" style={{ margin: 0, padding: '4px 8px', fontSize: '12px' }}>
                                  📱 QR Code
                                </button>

                                {podeAvaliar && (
                                  jaAvaliado ? (
                                    <span style={{ fontSize: '12px', color: '#1fd6a0', fontWeight: 'bold', padding: '0 4px' }}>✓ Avaliado</span>
                                  ) : (
                                    <button className="botao sec pequeno" onClick={() => setAvaliando({ banca: b, projeto: p })} style={{ margin: 0, padding: '4px 12px', fontSize: '12px' }}>
                                      Avaliar
                                    </button>
                                  )
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ fontStyle: 'italic', fontSize: '13px', color: '#64748b', padding: '4px 0' }}>
                        Nenhum projeto cadastrado nesta banca.
                      </div>
                    )}
                  </div>
                </div>

                {/* Botões de Ação para Admin */}
                {ehAdmin && !b.publicada && b.status !== 'encerrada' && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                    <button className="botao sec pequeno" style={{ flex: 1, justifyContent: 'center' }} onClick={() => abrirModalEditar(b)}>
                      ✏️ Editar
                    </button>
                    <button className="botao sec pequeno" style={{ flex: 1, justifyContent: 'center' }} onClick={() => encerrar(b)}>
                      Publicar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: QR Code */}
      {qrModal && (() => {
        const urlAcesso = `${window.location.origin}${window.location.pathname}?banca=${qrModal.banca.id}&projeto=${qrModal.projeto.id}`;
        const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(urlAcesso)}&bgcolor=181824&color=ffffff`;

        const copiarLink = () => {
          navigator.clipboard.writeText(urlAcesso);
          if (avisar) avisar('Link copiado!'); else alert('Link copiado!');
        };

        return (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <div style={{ background: '#181824', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '420px', boxShadow: '0 20px 50px rgba(0,0,0,0.6)', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '20px', color: '#fff' }}>Acesso Rápido por QR Code</h3>
              <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#94a3b8' }}>{qrModal.projeto.nome} ({qrModal.banca.nome})</p>
              <div style={{ background: '#12121c', padding: '16px', borderRadius: '12px', display: 'inline-block', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '16px' }}>
                <img src={qrCodeApiUrl} alt="QR Code" style={{ width: '200px', height: '200px', display: 'block', borderRadius: '8px' }} />
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>Aponta a câmera do celular para abrir o formulário direto.</p>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                <input type="text" readOnly value={urlAcesso} style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: '12px' }} />
                <button type="button" className="botao sec pequeno" onClick={copiarLink}>Copiar</button>
              </div>
              <button type="button" className="botao" style={{ width: '100%' }} onClick={() => setQrModal(null)}>Fechar</button>
            </div>
          </div>
        );
      })()}

      {/* MODAL: Criar ou Editar Banca */}
      {criando && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#181824', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '540px', boxShadow: '0 20px 50px rgba(0,0,0,0.6)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '20px', color: '#fff' }}>
              {editandoId ? 'Editar Banca' : 'Criar Nova Banca'}
            </h3>
            
            {carregandoModal ? (
              <div style={{ padding: '20px 0' }}><Esqueleto linhas={3} altura={80} /></div>
            ) : (
              <form onSubmit={salvarBanca} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Nome da Banca</label>
                  <input 
                    type="text" required value={formBanca.nome}
                    onChange={e => setFormBanca({ ...formBanca, nome: e.target.value })}
                    placeholder="Ex: Banca Final 2026.1"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>

                {/* Critérios */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '13px', color: '#94a3b8' }}>Critérios de Avaliação</label>
                    <button type="button" onClick={() => setFormBanca({ ...formBanca, criterios: [...formBanca.criterios, { titulo: '', peso: 2.5 }] })} style={{ background: 'none', border: 'none', color: '#35b6ff', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                      + Adicionar critério
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '140px', overflowY: 'auto', background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {formBanca.criterios.map((crit, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input type="text" placeholder="Título" required value={crit.titulo} onChange={e => { const n = [...formBanca.criterios]; n[idx].titulo = e.target.value; setFormBanca({ ...formBanca, criterios: n }); }} style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px' }} />
                        <input type="number" placeholder="Peso" min="0.1" max="10" step="0.1" required value={crit.peso} onChange={e => { const n = [...formBanca.criterios]; n[idx].peso = Number(e.target.value); setFormBanca({ ...formBanca, criterios: n }); }} style={{ width: '70px', padding: '6px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px' }} />
                        {formBanca.criterios.length > 1 && (
                          <button type="button" onClick={() => { const n = formBanca.criterios.filter((_, i) => i !== idx); setFormBanca({ ...formBanca, criterios: n }); }} style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#ef4444', borderRadius: '6px', cursor: 'pointer', padding: '4px 8px', fontSize: '12px' }}>✕</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Projetos */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Projetos Participantes</label>
                  <div style={{ maxHeight: '120px', overflowY: 'auto', background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {projetos.map(p => (
                      <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', color: '#e2e8f0', cursor: 'pointer', fontSize: '13px' }}>
                        <input type="checkbox" checked={formBanca.projetos.includes(Number(p.id))} onChange={e => { const pId = Number(p.id); setFormBanca({ ...formBanca, projetos: e.target.checked ? [...formBanca.projetos, pId] : formBanca.projetos.filter(id => id !== pId) }); }} />
                        {p.nome || p.titulo}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Avaliadores */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Avaliadores Escalados</label>
                  <div style={{ maxHeight: '120px', overflowY: 'auto', background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {pessoas.map(p => (
                      <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', color: '#e2e8f0', cursor: 'pointer', fontSize: '13px' }}>
                        <input type="checkbox" checked={formBanca.avaliadores.includes(Number(p.id))} onChange={e => { const uId = Number(p.id); setFormBanca({ ...formBanca, avaliadores: e.target.checked ? [...formBanca.avaliadores, uId] : formBanca.avaliadores.filter(id => id !== uId) }); }} />
                        {p.nome} {p.email ? `(${p.email})` : ''}
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                  <button type="button" className="botao sec" onClick={() => { setCriando(false); setEditandoId(null); }}>Cancelar</button>
                  <button type="submit" className="botao">{editandoId ? 'Salvar Alterações' : 'Criar Banca'}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Avaliar */}
      {avaliando && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#181824', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '20px', color: '#fff' }}>Avaliar: {avaliando.projeto?.nome}</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#94a3b8' }}>{avaliando.banca?.nome}</p>
            <form onSubmit={submeterAvaliacao} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {avaliando.banca?.criterios && avaliando.banca.criterios.map((crit) => (
                <div key={crit.id}>
                  <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>{crit.titulo} (Nota de 1 a 5)</label>
                  <select required value={notasForm[crit.id] || ''} onChange={e => setNotasForm({ ...notasForm, [crit.id]: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#222232', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}>
                    <option value="">Selecione uma nota...</option>
                    <option value="1">1 - Insuficiente</option>
                    <option value="2">2 - Regular</option>
                    <option value="3">3 - Bom</option>
                    <option value="4">4 - Muito Bom</option>
                    <option value="5">5 - Excelente</option>
                  </select>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="botao sec" onClick={() => { setAvaliando(null); setNotasForm({}); }}>Cancelar</button>
                <button type="submit" className="botao">Enviar Avaliação</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}