require('dotenv').config();
const { Pool } = require('pg');

const url = process.env.DATABASE_URL || '';
const local = /@(localhost|127\.0\.0\.1)/.test(url);

const pool = new Pool({
  connectionString: url,
  ssl: local ? false : { rejectUnauthorized: false },
  max: 4,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', e => console.error('Erro no pool de conexões:', e.message));

const consulta = async (sql, parametros = []) => (await pool.query(sql, parametros)).rows;
const um = async (sql, parametros = []) => (await consulta(sql, parametros))[0];

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