const path = require('node:path'), fs = require('node:fs'), express = require('express');
const { um } = require('./config/db');
const { erro } = require('./utils');
const { cabecalhos, verificarOrigem } = require('./middlewares/seguranca');
const { autenticar, soSuper, temInstituicao } = require('./middlewares/auth');
const auth = require('./routes/auth');

const app = express();

app.set('trust proxy', true);
app.disable('x-powered-by');

app.use(cabecalhos);
app.use(verificarOrigem);
app.use(express.json({ limit: '100kb' }));

app.get('/api/saude', async (req, res) => { 
  await um('SELECT 1'); 
  res.json({ ok: true }); 
});

app.use('/api/auth', auth.publicas);
app.use('/api', autenticar);
app.use('/api/auth', auth.privadas);
app.use('/api/instituicoes', soSuper, require('./routes/instituicoes'));
app.use('/api', temInstituicao);
app.use('/api', require('./routes/vinculos'), require('./routes/projetos'), require('./routes/bancas'), require('./routes/relatorios'));

app.use('/api', (req, res) => erro(res, 'Rota não encontrada', 404));

const dist = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.use((req, res, next) => req.method === 'GET' ? res.sendFile(path.join(dist, 'index.html')) : next());
}

app.use((e, req, res, next) => {
  if (e.status) return erro(res, 'Requisição inválida', e.status);
  if (e.code === '23505') return erro(res, 'Registro duplicado', 409);
  console.error(e.message || e);
  erro(res, 'Erro interno no servidor', 500);
});

module.exports = app;