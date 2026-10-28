import { Icone } from './ui.jsx';

export default function ModalAvaliadoresAdmin({ projeto, aoFechar }) {
  if (!projeto) return null;

  const avaliadores = projeto.avaliadoresAtribuidos || [];
  const avaliacoesConcluidasIds = projeto.avaliacoes ? projeto.avaliacoes.map(a => a.avaliadorId) : [];

  const avaliadoresStatus = avaliadores.map(avaliador => {
    const jaAvaliou = avaliacoesConcluidasIds.includes(avaliador.id);
    return {
      ...avaliador,
      status: jaAvaliou ? 'concluido' : 'pendente'
    };
  });

  const concluidos = avaliadoresStatus.filter(a => a.status === 'concluido').length;
  const pendentes = avaliadoresStatus.filter(a => a.status === 'pendente').length;

  return (
    <div className="apresentacao" role="dialog" style={{ background: 'rgba(10, 12, 28, 0.85)', backdropFilter: 'blur(10px)', zIndex: 1000 }}>
      <div style={{
        background: '#161936',
        border: '1px solid rgba(255, 201, 60, 0.3)',
        borderRadius: '20px',
        padding: '28px',
        maxWidth: '520px',
        width: '90%',
        boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
        color: '#fff'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <small style={{ color: '#ffc93c', fontWeight: 'bold', letterSpacing: '1px' }}>PAINEL DO ADMINISTRADOR</small>
            <h3 style={{ margin: '4px 0 0 0', fontSize: '1.4rem' }}>{projeto.nome}</h3>
          </div>
          <button className="botao sec pequeno icone" onClick={aoFechar}>
            <Icone nome="x" />
          </button>
        </div>

        {/* Resumo do Progresso */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          marginBottom: '20px',
          background: 'rgba(255,255,255,0.04)',
          padding: '14px',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.08)'
        }}>
          <div>
            <small style={{ color: 'rgba(255,255,255,0.6)' }}>Avaliações Concluídas</small>
            <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#1fd6a0' }}>
              ✅ {concluidos} / {avaliadores.length}
            </div>
          </div>
          <div>
            <small style={{ color: 'rgba(255,255,255,0.6)' }}>Pendentes</small>
            <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: pendentes > 0 ? '#ffc93c' : '#1fd6a0' }}>
              ⏳ {pendentes}
            </div>
          </div>
        </div>

        <strong style={{ display: 'block', marginBottom: '12px', fontSize: '0.95rem' }}>Status por Avaliador:</strong>

        {/* Lista Detalhada */}
        <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {avaliadoresStatus.length > 0 ? (
            avaliadoresStatus.map(avaliador => (
              <div key={avaliador.id || avaliador.nome} style={{
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
                padding: '12px 16px',
                borderRadius: '10px',
                background: avaliador.status === 'concluido' ? 'rgba(31, 214, 160, 0.08)' : 'rgba(255, 201, 60, 0.08)',
                border: avaliador.status === 'concluido' ? '1px solid rgba(31, 214, 160, 0.25)' : '1px solid rgba(255, 201, 60, 0.25)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '1.2rem' }}>
                    {avaliador.status === 'concluido' ? '✅' : '⏳'}
                  </span>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>{avaliador.nome}</div>
                    {avaliador.email && <small style={{ color: 'rgba(255,255,255,0.5)' }}>{avaliador.email}</small>}
                  </div>
                </div>

                <span style={{
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  padding: '4px 10px',
                  borderRadius: '99px',
                  background: avaliador.status === 'concluido' ? '#1fd6a0' : '#ffc93c',
                  color: '#000'
                }}>
                  {avaliador.status === 'concluido' ? 'Avaliou' : 'Pendente'}
                </span>
              </div>
            ))
          ) : (
            <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>Nenhum avaliador atribuído a esta startup.</p>
          )}
        </div>

        <div style={{ marginTop: '24px', textAlign: 'right' }}>
          <button className="botao sec" onClick={aoFechar}>Fechar</button>
        </div>
      </div>
    </div>
  );
}