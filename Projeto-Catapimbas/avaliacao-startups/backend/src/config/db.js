// Conexão com o PostgreSQL (Supabase ou local) e funções auxiliares para consultas.
require('dotenv').config();
const { Pool } = require('pg');

const url = process.env.DATABASE_URL || '';
const local = /@(localhost|127\.0\.0\.1)/.test(url);   // o Supabase exige SSL; o PostgreSQL local não precisa
const pool = new Pool({ connectionString: url, ssl: local ? false : { rejectUnauthorized: false }, max: 10 });
pool.on('error', e => console.error('Erro no pool de conexões:', e.message));

// Retorna todas as linhas da consulta.
const consulta = async (sql, parametros = []) => (await pool.query(sql, parametros)).rows;
// Retorna apenas a primeira linha (ou undefined).
const um = async (sql, parametros = []) => (await consulta(sql, parametros))[0];

// Executa várias operações como uma só: se uma falhar, todas são desfeitas.
async function transacao(funcao) {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    const resultado = await funcao(cliente);
    await cliente.query('COMMIT');
    return resultado;
  } catch (e) {
    await cliente.query('ROLLBACK');
    throw e;
  } finally {
    cliente.release();
  }
}

module.exports = { pool, consulta, um, transacao };
