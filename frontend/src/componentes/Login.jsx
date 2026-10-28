import React, { useState } from 'react';

export default function Login({ onLogin, setAba, erro, carregando }) {
  const [email, setEmail] = useState('admin.a@demo.com');
  const [senha, setSenha] = useState('Senha@123');
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onLogin) {
      onLogin({ email, senha });
    }
  };

  return (
    <div className="login-card">
      <div className="login-header">
        <div className="logo-icon">C</div>
        <h2>Catapimbas</h2>
        <p>Use o e-mail e a senha cadastrados.</p>
      </div>

      <div className="login-tabs">
        <button type="button" className="tab active">Entrar</button>
        <button type="button" className="tab" onClick={() => setAba && setAba('registrar')}>
          Solicitar acesso
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {erro && <div className="erro-mensagem">{erro}</div>}

        <div className="campo">
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            required
          />
        </div>

        <div className="campo">
          <label htmlFor="senha">Senha</label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              id="senha"
              type={mostrarSenha ? 'text' : 'password'}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Sua senha"
              required
              style={{ paddingRight: '40px' }}
            />
            <button
              type="button"
              onClick={() => setMostrarSenha(!mostrarSenha)}
              title={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
              style={{
                position: 'absolute',
                right: '12px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1rem',
                padding: 0,
                lineHeight: 1,
                opacity: 0.7
              }}
            >
              {mostrarSenha ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={carregando}>
          {carregando ? 'A entrar...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}