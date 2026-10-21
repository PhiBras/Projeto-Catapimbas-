// Cria as tabelas no banco (Supabase ou local): npm run migrar
const fs = require('node:fs'), path = require('node:path');
const { pool } = require('../src/config/db');
(async () => {
  await pool.query(fs.readFileSync(path.join(__dirname, '..', 'banco', 'schema.sql'), 'utf8'));
  console.log('Tabelas criadas/atualizadas (com RLS ativado).');
  await pool.end();
})().catch(e => { console.error(e.message); process.exit(1); });
