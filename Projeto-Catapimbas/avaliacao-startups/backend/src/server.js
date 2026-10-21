const app = require('./app');
const { consulta } = require('./config/db');

// No computador (npm run dev) o servidor liga normalmente.
// Na Vercel o arquivo só é importado e o Express roda como função serverless (sem listen e sem setInterval).
if (require.main === module) {
  const PORTA = process.env.PORT || 3000;
  setInterval(() => consulta("DELETE FROM sessoes WHERE criada < now() - interval '8 hours'").catch(console.error), 3600000).unref();
  app.listen(PORTA, () => console.log(`API ativa em http://localhost:${PORTA}`));
}

module.exports = app;
