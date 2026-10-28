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
    <div className="card login-card" style={{ maxWidth: '420px', margin: '40px auto', padding: '2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>C</div>
        <h2 style={{ margin: '0.5rem 0 0.25rem' }}>Catapimbas</h2>
        <p style={{ opacity: 0.8, fontSize: '0.9rem' }}>Use o e-mail e a senha cadastrados.</p>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button type="button" className="tab active" style={{ flex: 1, padding: '0.5rem' }}>Entrar</button>
        <button type="button" className="tab" style={{ flex: 1, padding: '0.5rem' }} onClick={() => setAba && setAba('registrar')}>
          Solicitar acesso
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {erro && <div className="erro" style={{ color: '#ef4444', marginBottom: '1rem', textAlign: 'center' }}>{erro}</div>}

        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '0.4rem' }}>E-mail</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            required
            style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid #374151', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label htmlFor="senha" style={{ display: 'block', marginBottom: '0.4rem' }}>Senha</label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              id="senha"
              type={mostrarSenha ? 'text' : 'password'}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Sua senha"
              required
              style={{ width: '100%', padding: '0.6rem 2.8rem 0.6rem 0.8rem', borderRadius: '6px', border: '1px solid #374151', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
            />
            <button
              type="button"
              onClick={() => setMostrarSenha(!mostrarSenha)}
              title={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
              style={{
                position: 'absolute',
                right: '8px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.1rem',
                padding: '4px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {mostrarSenha ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={carregando} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', fontWeight: 'bold' }}>
          {carregando ? 'A entrar...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}