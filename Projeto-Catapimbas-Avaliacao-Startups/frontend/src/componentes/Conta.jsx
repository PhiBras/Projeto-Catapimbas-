import { useState } from 'react';
import { api } from '../api';
import { Icone, Cabecalho, Campo, Avatar, Selo, PAPEL, useUI } from './ui.jsx';

export default function Conta({ eu }) {
  const { avisar } = useUI();
  const [s, setS] = useState({ atual: '', nova: '', confirmar: '' });
  const [erro, setErro] = useState('');
  const coincide = s.nova === s.confirmar;

  async function salvar(e) {
    e.preventDefault(); setErro('');
    if (!coincide) return setErro('A confirmação não é igual à nova senha.');
    try { await api('/auth/senha', 'POST', { atual: s.atual, nova: s.nova }); avisar('Senha alterada. Os outros dispositivos foram desconectados.'); setS({ atual: '', nova: '', confirmar: '' }); }
    catch (x) { setErro(x.message); }
  }

  return (
    <>
      <Cabecalho titulo="Minha conta" sub="Seus dados de acesso e a segurança da sua conta." />
      <section className="painel">
        <div className="painel-corpo pessoa" style={{ gap: 16 }}>
          <Avatar nome={eu.nome} tam={56} />
          <div>
            <h2>{eu.nome}</h2>
            <div className="acoes" style={{ marginTop: 6 }}>
              {eu.super && <Selo tipo="azul">Superadministrador</Selo>}
              {eu.papeis.map(p => <Selo key={p} tipo="azul">{PAPEL[p]}</Selo>)}
              {eu.instNome && <small>em {eu.instNome}</small>}
            </div>
          </div>
        </div>
      </section>
      <section className="painel" style={{ maxWidth: 520 }}>
        <div className="painel-cab"><h3>Alterar senha</h3></div>
        <form className="painel-corpo" onSubmit={salvar}>
          {erro && <div className="erro-form" role="alert"><Icone nome="alerta" />{erro}</div>}
          <Campo rotulo="Senha atual"><input type="password" required autoComplete="current-password" value={s.atual} onChange={e => setS({ ...s, atual: e.target.value })} /></Campo>
          <Campo rotulo="Nova senha" ajuda="Mínimo de 8 caracteres."><input type="password" required minLength={8} autoComplete="new-password" value={s.nova} onChange={e => setS({ ...s, nova: e.target.value })} /></Campo>
          <Campo rotulo="Confirmar nova senha"><input type="password" required autoComplete="new-password" value={s.confirmar} onChange={e => setS({ ...s, confirmar: e.target.value })} /></Campo>
          <button className="botao" disabled={!s.atual || s.nova.length < 8 || !s.confirmar}>Salvar nova senha</button>
        </form>
      </section>
    </>
  );
}
