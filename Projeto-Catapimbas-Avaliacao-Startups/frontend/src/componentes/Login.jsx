import { useState } from 'react';
import { api } from '../api';
import { Icone, Campo, useUI } from './ui.jsx';

// Ficha de exemplo desenhada na tela de login
const CRITERIOS = [
  ['Clareza do problema', 4],
  ['Mercado e escalabilidade', 5],
  ['Conceito e produto', 4],
  ['Diferenciação', 3],
  ['Apresentação', 5]
];

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
  const [modo, setModo] = useState(() => {
    const parametros = new URLSearchParams(window.location.search);
    return parametros.has('recuperar') ? 'novaSenha' : parametros.has('confirmarEmail') ? 'confirmarEmail' : 'entrar';
  });
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [f, setF] = useState({ nome: '', email: '', senha: '', instituicao: '', papel: 'aluno' });

  const campo = nome => ({ value: f[nome], onChange: e => setF({ ...f, [nome]: e.target.value }) });

  async function enviar(e) {
    e.preventDefault();
    setErro('');
    setMensagem('');
    setOcupado(true);

    try {
      if (modo === 'confirmarEmail') {
        const token = new URLSearchParams(window.location.search).get('confirmarEmail');
        const d = await api('/auth/confirmar-email', 'POST', { token });
        setMensagem(d.mensagem);
        window.history.replaceState({}, document.title, window.location.pathname);
        setModo('entrar');
      } else if (modo === 'entrar') {
        await api('/auth/login', 'POST', { email: f.email.trim().toLowerCase(), senha: f.senha });
        // Aciona a atualização do usuário no App.jsx, que fará o redirecionamento automático do QR Code
        aoEntrar();
      } else if (modo === 'cadastro') {
        const d = await api('/auth/registrar', 'POST', { ...f, email: f.email.trim().toLowerCase() });
        avisar(d.mensagem);
        setModo('entrar');
        setF({ ...f, senha: '' });
      } else if (modo === 'recuperar') {
        const d = await api('/auth/esqueci-senha', 'POST', { email: f.email.trim().toLowerCase() });
        setMensagem(d.mensagem);
      } else {
        if (f.senha !== confirmarSenha) {
          setErro('As senhas não coincidem.');
          return;
        }
        const token = new URLSearchParams(window.location.search).get('recuperar');
        const d = await api('/auth/redefinir-senha', 'POST', { token, senha: f.senha });
        setMensagem(d.mensagem);
        window.history.replaceState({}, document.title, window.location.pathname);
        setModo('entrar');
        setF({ ...f, senha: '' });
        setConfirmarSenha('');
      }
    } catch (x) {
      setErro(x.message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="login">
      <div className="login-cena">
        <section className="login-lado">
          <h1>Avalie startups com clareza e acompanhe o ranking.</h1>
          <p>Cadastre projetos, monte bancas com critérios e pesos, registre as notas e publique o resultado. Os dados de cada instituição ficam separados.</p>
          <Ficha />
        </section>

        <section className="login-cartao">
          <div className="login-logo"><span className="marca-sigla">C</span>Catapimbas</div>
          <h2>{modo === 'entrar' ? 'Entre na sua conta' : modo === 'cadastro' ? 'Peça acesso à sua instituição' : modo === 'recuperar' ? 'Recupere sua senha' : modo === 'confirmarEmail' ? 'Confirme seu e-mail' : 'Crie uma nova senha'}</h2>
          <p style={{ color: 'var(--suave)' }}>{modo === 'entrar' ? 'Use o e-mail e a senha cadastrados.' : modo === 'cadastro' ? 'Confirme seu e-mail; depois, o administrador analisa o seu pedido.' : modo === 'recuperar' ? 'Enviaremos um link para o e-mail informado, se houver uma conta.' : modo === 'confirmarEmail' ? 'Confirme que este endereço de e-mail pertence a você.' : 'A nova senha deve ter entre 8 e 72 caracteres.'}</p>
          
          {(modo === 'entrar' || modo === 'cadastro') && (
              <div className="abas" role="tablist">
                <button type="button" className={modo === 'entrar' ? 'ativa' : ''} onClick={() => { setModo('entrar'); setErro(''); setMensagem(''); }}>Entrar</button>
                <button type="button" className={modo === 'cadastro' ? 'ativa' : ''} onClick={() => { setModo('cadastro'); setErro(''); setMensagem(''); }}>Solicitar acesso</button>
              </div>
          )}

          <form onSubmit={enviar}>
              {erro && <div className="erro-form" role="alert"><Icone nome="alerta" />{erro}</div>}
              {mensagem && <div className="sucesso-form" role="status">{mensagem}</div>}
            
              {modo === 'cadastro' && (
                <Campo rotulo="Nome completo">
                  <input required autoComplete="name" {...campo('nome')} />
              </Campo>
              )}

              {modo !== 'novaSenha' && modo !== 'confirmarEmail' && (
                <Campo rotulo="E-mail">
                  <input type="email" required maxLength={254} autoCapitalize="none" spellCheck="false" autoComplete="email" {...campo('email')} />
                </Campo>
              )}

              {modo !== 'recuperar' && modo !== 'confirmarEmail' && (
                <>
                  <div className="campo">
                    <span id="rotulo-senha-login">{modo === 'novaSenha' ? 'Nova senha' : 'Senha'}</span>
                    <div className="campo-senha">
                      <input
                        id="senha-login"
                        type={mostrarSenha ? 'text' : 'password'}
                        required
                        minLength={modo === 'cadastro' || modo === 'novaSenha' ? 8 : undefined}
                        maxLength={72}
                        autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
                        aria-labelledby="rotulo-senha-login"
                        {...campo('senha')}
                      />
                      <button type="button" className="botao fantasma pequeno" onClick={() => setMostrarSenha(!mostrarSenha)} aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}>
                        {mostrarSenha ? 'Ocultar' : 'Mostrar'}
                      </button>
                    </div>
                    {(modo === 'cadastro' || modo === 'novaSenha') && <small>Mínimo de 8 caracteres.</small>}
                  </div>
                  {modo === 'novaSenha' && (
                    <Campo rotulo="Confirme a nova senha">
                      <input type={mostrarSenha ? 'text' : 'password'} required minLength={8} maxLength={72} autoComplete="new-password" value={confirmarSenha} onChange={e => setConfirmarSenha(e.target.value)} />
                    </Campo>
                  )}
                </>
              )}

              {modo === 'cadastro' && (
              <>
                <Campo rotulo="Identificador da instituição" ajuda="Peça ao administrador. Exemplo: demo-a">
                  <input required {...campo('instituicao')} />
                </Campo>
                <Campo rotulo="Você é">
                  <select {...campo('papel')}>
                    <option value="aluno">Aluno</option>
                    <option value="orientador">Orientador</option>
                    <option value="avaliador">Avaliador</option>
                  </select>
                </Campo>
              </>
            )}

            <button className="botao" disabled={ocupado}>
              {ocupado ? 'Aguarde…' : modo === 'entrar' ? 'Entrar' : modo === 'cadastro' ? 'Enviar pedido de acesso' : modo === 'recuperar' ? 'Enviar link de recuperação' : modo === 'confirmarEmail' ? 'Confirmar e-mail' : 'Redefinir senha'}
            </button>
            {modo === 'entrar' && (
              <button type="button" className="login-link" onClick={() => { setModo('recuperar'); setErro(''); setMensagem(''); }}>
                Esqueci minha senha
              </button>
            )}
            {(modo === 'recuperar' || modo === 'novaSenha' || modo === 'confirmarEmail') && (
              <button type="button" className="login-link" onClick={() => { setModo('entrar'); setErro(''); setMensagem(''); window.history.replaceState({}, document.title, window.location.pathname); }}>
                Voltar para entrar
              </button>
            )}
          </form>
        </section>
      </div>
    </div>
  );
}