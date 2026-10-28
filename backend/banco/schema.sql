-- Esquema do banco PostgreSQL (Supabase). Pode ser executado várias vezes (IF NOT EXISTS).
CREATE TABLE IF NOT EXISTS instituicoes (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  identificador TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa','suspensa')),
  cor TEXT NOT NULL DEFAULT '#2563eb'
);
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  hash TEXT NOT NULL,
  superadmin BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'ativo'
);
CREATE TABLE IF NOT EXISTS vinculos (
  id SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL REFERENCES usuarios(id),
  instituicao_id INT NOT NULL REFERENCES instituicoes(id),
  papel TEXT NOT NULL CHECK (papel IN ('admin','coordenador','orientador','avaliador','aluno')),
  situacao TEXT NOT NULL DEFAULT 'pendente' CHECK (situacao IN ('pendente','aprovado','recusado','bloqueado')),
  justificativa TEXT,
  UNIQUE (usuario_id, instituicao_id, papel)
);
CREATE TABLE IF NOT EXISTS projetos (
  id SERIAL PRIMARY KEY,
  instituicao_id INT NOT NULL REFERENCES instituicoes(id),
  nome TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  ano INT NOT NULL,
  semestre INT NOT NULL CHECK (semestre IN (1,2)),
  status TEXT NOT NULL DEFAULT 'ideacao',
  orientador_id INT REFERENCES usuarios(id),
  excluido BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE TABLE IF NOT EXISTS membros (
  projeto_id INT NOT NULL REFERENCES projetos(id),
  usuario_id INT NOT NULL REFERENCES usuarios(id),
  funcao TEXT NOT NULL DEFAULT 'integrante',
  PRIMARY KEY (projeto_id, usuario_id)
);
CREATE TABLE IF NOT EXISTS bancas (
  id SERIAL PRIMARY KEY,
  instituicao_id INT NOT NULL REFERENCES instituicoes(id),
  nome TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','encerrada')),
  publicada BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE TABLE IF NOT EXISTS banca_projetos (
  banca_id INT NOT NULL REFERENCES bancas(id),
  projeto_id INT NOT NULL REFERENCES projetos(id),
  PRIMARY KEY (banca_id, projeto_id)
);
CREATE TABLE IF NOT EXISTS banca_avaliadores (
  banca_id INT NOT NULL REFERENCES bancas(id),
  usuario_id INT NOT NULL REFERENCES usuarios(id),
  PRIMARY KEY (banca_id, usuario_id)
);
CREATE TABLE IF NOT EXISTS criterios (
  id SERIAL PRIMARY KEY,
  banca_id INT NOT NULL REFERENCES bancas(id),
  titulo TEXT NOT NULL,
  peso DOUBLE PRECISION NOT NULL CHECK (peso > 0 AND peso <= 10),
  descritores JSONB NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS avaliacoes (
  id SERIAL PRIMARY KEY,
  banca_id INT NOT NULL REFERENCES bancas(id),
  projeto_id INT NOT NULL REFERENCES projetos(id),
  avaliador_id INT NOT NULL REFERENCES usuarios(id),
  criterio_id INT NOT NULL REFERENCES criterios(id),
  nota INT NOT NULL CHECK (nota BETWEEN 1 AND 5),
  criada TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (banca_id, projeto_id, avaliador_id, criterio_id)
);
CREATE TABLE IF NOT EXISTS auditoria (
  id SERIAL PRIMARY KEY,
  instituicao_id INT,
  ator_id INT,
  operacao TEXT NOT NULL,
  entidade TEXT,
  entidade_id INT,
  detalhes JSONB,
  data TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessoes (
  token TEXT PRIMARY KEY,
  usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  instituicao_id INT,
  criada TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_projetos ON projetos (instituicao_id, ano, semestre);
CREATE INDEX IF NOT EXISTS ix_avaliacoes ON avaliacoes (banca_id, projeto_id);
CREATE INDEX IF NOT EXISTS ix_vinculos ON vinculos (instituicao_id, situacao);

-- SEGURANÇA NO SUPABASE: ativa o RLS em todas as tabelas, sem nenhuma política.
-- Assim, a API pública do Supabase (chaves anon/publishable) não consegue ler nem alterar nada.
-- Nosso servidor Node conecta com o usuário "postgres" do banco, então continua funcionando normalmente.
ALTER TABLE instituicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE vinculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE projetos ENABLE ROW LEVEL SECURITY;
ALTER TABLE membros ENABLE ROW LEVEL SECURITY;
ALTER TABLE bancas ENABLE ROW LEVEL SECURITY;
ALTER TABLE banca_projetos ENABLE ROW LEVEL SECURITY;
ALTER TABLE banca_avaliadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE criterios ENABLE ROW LEVEL SECURITY;
ALTER TABLE avaliacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessoes ENABLE ROW LEVEL SECURITY;
