// Função única para falar com o backend. Em caso de erro, lança uma exceção com a mensagem da API.
const API_BASE = import.meta.env.VITE_API_URL || '';

export async function api(url, metodo = 'GET', corpo) {
  const resposta = await fetch(`${API_BASE}/api${url}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: corpo ? JSON.stringify(corpo) : undefined
  });
  if (resposta.status === 204) return {};
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    if (resposta.status === 401) window.dispatchEvent(new Event('sessao-expirada'));
    const erro = new Error(dados.erro || 'Erro inesperado');
    erro.status = resposta.status;
    throw erro;
  }
  return dados;
}