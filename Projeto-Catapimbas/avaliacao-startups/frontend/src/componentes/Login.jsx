import { useState } from 'react';
import { api } from '../api';
import { Icone, Campo, useUI } from './ui.jsx';

// Ficha de exemplo desenhada na tela de login: mostra o produto na linguagem de uma banca de avaliação.
const CRITERIOS = [['Clareza do problema', 4], ['Mercado e escalabilidade', 5], ['Conceito e produto', 4], ['Diferenciação', 3], ['Apresentação', 5]];
const Ficha = () => (
  <div className="ficha" aria-hidden="true">
    <div className="ficha-cab"><b>VANMO</b><span>Banca final, 2025.1</span></div>
    {CRITERIOS.map(([nome, nota]) => (
      <div className="ficha-linha" key={nome}>
        <span>{nome}</span>
        <span className="mini">{[1, 2, 3, 4, 5].map(n => <i key={n} className={n <= nota ? 'on' : ''} />)}</span>
      </div>
    ))}
    <div className="ficha-total"><span>Pontuação final</span><b>4,20</b></div>
  </div>
);

export default function Login({ aoEntrar }) {
  const { avisar } = useUI();
  const [modo, setModo] = useState('entrar');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [f, setF] = useState({ nome: '', email: '', senha: '', instituicao: '', papel: 'aluno' });
  const campo = nome => ({ value: f[nome], onChange: e => setF({ ...f, [nome]: e.target.value }) });

  async function enviar(e) {
    e.preventDefault();
    setErro(''); setOcupado(true);
    try {
      if (modo === 'entrar') { await api('/auth/login', 'POST', { email: f.email, senha: f.senha }); aoEntrar(); }
      else { const d = await api('/auth/registrar', 'POST', f); avisar(d.mensagem); setModo('entrar'); setF({ ...f, senha: '' }); }
    } catch (x) { setErro(x.message); } finally { setOcupado(false); }
  }

  return (
    <div className="login">
      <section className="login-marca">
        <div>
          <h1>Cada nota com critério. Cada resultado à vista.</h1>
          <p style={{ marginTop: 16 }}>Cadastre projetos, monte bancas com rubricas e pesos, colete as avaliações e publique o ranking. Os dados de cada instituição ficam separados dos demais.</p>
        </div>
        <Ficha />
      </section>
      <section className="login-form">
        <div>
          <h2>{modo === 'entrar' ? 'Entre na sua conta' : 'Peça acesso à sua instituição'}</h2>
          <p style={{ color: 'var(--suave)' }}>{modo === 'entrar' ? 'Use o e-mail e a senha cadastrados.' : 'O administrador da instituição analisa o seu pedido.'}</p>
          <div className="abas" role="tablist">
            <button type="button" className={modo === 'entrar' ? 'ativa' : ''} onClick={() => { setModo('entrar'); setErro(''); }}>Entrar</button>
            <button type="button" className={modo === 'cadastro' ? 'ativa' : ''} onClick={() => { setModo('cadastro'); setErro(''); }}>Solicitar acesso</button>
          </div>
          <form onSubmit={enviar}>
            {erro && <div className="erro-form" role="alert"><Icone nome="alerta" />{erro}</div>}
            {modo === 'cadastro' && <Campo rotulo="Nome completo"><input required autoComplete="name" {...campo('nome')} /></Campo>}
            <Campo rotulo="E-mail"><input type="email" required autoComplete="email" {...campo('email')} /></Campo>
            <Campo rotulo="Senha" ajuda={modo === 'cadastro' ? 'Mínimo de 8 caracteres.' : undefined}>
              <input type="password" required minLength={modo === 'cadastro' ? 8 : undefined} autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'} {...campo('senha')} />
            </Campo>
            {modo === 'cadastro' && <>
              <Campo rotulo="Identificador da instituição" ajuda="Peça ao administrador. Exemplo: demo-a"><input required {...campo('instituicao')} /></Campo>
              <Campo rotulo="Você é"><select {...campo('papel')}><option value="aluno">Aluno</option><option value="orientador">Orientador</option><option value="avaliador">Avaliador</option></select></Campo>
            </>}
            <button className="botao" disabled={ocupado}>{ocupado ? 'Aguarde…' : modo === 'entrar' ? 'Entrar' : 'Enviar pedido de acesso'}</button>
          </form>
        </div>
      </section>
    </div>
  );
}
