// Cria o superadministrador (use em produção): npm run super
const bcrypt = require('bcryptjs');
const { pool, consulta } = require('../src/config/db');
const { emailValido } = require('../src/utils');
const { SUPER_EMAIL: email, SUPER_SENHA: senha, SUPER_NOME: nome } = process.env;
(async () => {
  if (!emailValido(email) || !senha || senha.length < 12) throw new Error('Defina SUPER_EMAIL válido, SUPER_NOME e SUPER_SENHA (mínimo 12 caracteres) no .env');
  const emailNormalizado = email.trim().toLowerCase();
  await consulta('INSERT INTO usuarios (nome, email, hash, superadmin) VALUES ($1,$2,$3,TRUE)', [nome || 'Superadministrador', emailNormalizado, await bcrypt.hash(senha, 12)]);
  console.log('Superadministrador criado: ' + emailNormalizado);
  await pool.end();
})().catch(e => { console.error(e.message); process.exit(1); });
