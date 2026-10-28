import { useEffect, useState } from 'react';
import { api } from '../api';
import { Icone, Cabecalho, Modal, Campo, Selo, EstadoVazio, Esqueleto, useUI } from './ui.jsx';

export default function Instituicoes() {
  const { avisar, perguntar } = useUI();
  const [lista, setLista] = useState(null);
  const [nova, setNova] = useState(false);
  const carregar = () => api('/instituicoes').then(setLista).catch(e => { avisar(e.message, 'erro'); setLista([]); });
  useEffect(() => { carregar(); }, []);

  async function alterar(i) {
    const suspender = i.status === 'ativa';
    if (suspender) {
      const ok = await perguntar({ titulo: `Suspender ${i.nome}?`, texto: 'Ninguém da instituição conseguirá entrar enquanto ela estiver suspensa. Os dados são mantidos.', confirmar: 'Suspender', perigo: true });
      if (!ok) return;
    }
    try { await api(`/instituicoes/${i.id}/status`, 'PATCH', { status: suspender ? 'suspensa' : 'ativa' }); avisar(suspender ? 'Instituição suspensa.' : 'Instituição reativada.'); carregar(); }
    catch (e) { avisar(e.message, 'erro'); }
  }

  return (
    <>
      <Cabecalho titulo="Instituições" sub="Cada instituição joga no seu campo, com usuários, projetos e bancas só dela.">
        <button className="botao" onClick={() => setNova(true)}><Icone nome="mais" />Nova instituição</button>
      </Cabecalho>
      {!lista ? <div className="grade-cards">{[0, 1, 2].map(i => <div key={i} className="esq" style={{ height: 150, borderRadius: 22 }} />)}</div> : lista.length === 0 ? (
        <div className="painel"><EstadoVazio icone="predio" titulo="Nenhuma instituição cadastrada" texto="Cadastre a primeira instituição e o administrador que vai gerenciá-la.">
          <button className="botao" onClick={() => setNova(true)}>Cadastrar instituição</button></EstadoVazio></div>
      ) : (
        <div className="grade-cards">
          {lista.map((i, k) => (
            <article className="cartao cartao-inst" key={i.id} style={{ animationDelay: `${k * 40}ms` }}>
              <div className="cartao-topo"><span className="cor" style={{ background: i.cor }} /><Selo tipo={i.status === 'ativa' ? 'verde' : 'cinza'}>{i.status === 'ativa' ? 'Ativa' : 'Suspensa'}</Selo></div>
              <h3>{i.nome}</h3>
              <div><code>{i.identificador}</code></div>
              <div className="cartao-pe"><span />
                <button className={'botao pequeno ' + (i.status === 'ativa' ? 'contorno-perigo' : 'sec')} onClick={() => alterar(i)}>{i.status === 'ativa' ? 'Suspender' : 'Reativar'}</button></div>
            </article>
          ))}
        </div>
      )}
      {nova && <NovaInstituicao aoFechar={() => setNova(false)} aoCriar={() => { setNova(false); avisar('Instituição criada.'); carregar(); }} />}
    </>
  );
}

function NovaInstituicao({ aoFechar, aoCriar }) {
  const [f, setF] = useState({ nome: '', identificador: '', cor: '#2563eb', admin: { nome: '', email: '', senha: '' } });
  const [erro, setErro] = useState('');
  const adm = (c, v) => setF({ ...f, admin: { ...f.admin, [c]: v } });
  async function salvar() { setErro(''); try { await api('/instituicoes', 'POST', f); aoCriar(); } catch (e) { setErro(e.message); } }
  const pronto = f.nome.trim() && f.identificador && f.admin.nome.trim() && f.admin.email && f.admin.senha.length >= 8;
  return (
    <Modal titulo="Nova instituição" largura={560} onFechar={aoFechar}
      rodape={<><button className="botao sec" onClick={aoFechar}>Cancelar</button><button className="botao" disabled={!pronto} onClick={salvar}>Criar instituição</button></>}>
      {erro && <div className="erro-form" role="alert"><Icone nome="alerta" />{erro}</div>}
      <Campo rotulo="Nome da instituição"><input autoFocus value={f.nome} onChange={e => setF({ ...f, nome: e.target.value })} /></Campo>
      <div className="linha-campos">
        <Campo rotulo="Identificador" ajuda="Letras minúsculas, números e hífen. É o que as pessoas usam para pedir acesso."><input value={f.identificador} onChange={e => setF({ ...f, identificador: e.target.value.toLowerCase() })} placeholder="minha-instituicao" /></Campo>
        <Campo rotulo="Cor da marca"><input type="color" value={f.cor} onChange={e => setF({ ...f, cor: e.target.value })} style={{ height: 42, width: '100%', padding: 3, border: '1px solid var(--linha)', borderRadius: 8, background: 'var(--superficie)' }} /></Campo>
      </div>
      <h3 style={{ margin: '8px 0 10px' }}>Administrador da instituição</h3>
      <Campo rotulo="Nome"><input value={f.admin.nome} onChange={e => adm('nome', e.target.value)} /></Campo>
      <div className="linha-campos">
        <Campo rotulo="E-mail"><input type="email" value={f.admin.email} onChange={e => adm('email', e.target.value)} /></Campo>
        <Campo rotulo="Senha inicial" ajuda="Mínimo de 8 caracteres."><input type="password" value={f.admin.senha} onChange={e => adm('senha', e.target.value)} /></Campo>
      </div>
    </Modal>
  );
}
