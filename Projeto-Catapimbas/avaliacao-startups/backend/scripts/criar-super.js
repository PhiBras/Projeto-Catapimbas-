// Cria o superadministrador (use em produção): npm run super
const bcrypt = require('bcryptjs');
const { pool, consulta } = require('../src/config/db');
const { SUPER_EMAIL: email, SUPER_SENHA: senha, SUPER_NOME: nome } = process.env;
(async () => {
  if (!email || !senha || senha.length < 12) throw new Error('Defina SUPER_EMAIL, SUPER_NOME e SUPER_SENHA (mínimo 12 caracteres) no .env');
  await consulta('INSERT INTO usuarios (nome, email, hash, superadmin) VALUES ($1,$2,$3,TRUE)', [nome || 'Superadministrador', email.toLowerCase(), await bcrypt.hash(senha, 12)]);
  console.log('Superadministrador criado: ' + email);
  await pool.end();
})().catch(e => { console.error(e.message); process.exit(1); });
