import React, { useState } from 'react';

export default function Login({ onLogin, setAba, erro, carregando }) {
  const [email, setEmail] = useState('admin.a@demo.com');
  const [senha, setSenha] = useState('Senha@123');

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
          <input
            id="senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Sua senha"
            required
          />
        </div>

        <button type="submit" className="btn-primary" disabled={carregando}>
          {carregando ? 'A entrar...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}