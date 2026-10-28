const app = require('./app');
const { consulta } = require('./config/db');
const PORTA = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'production') {
  setInterval(() => {
    consulta("DELETE FROM sessoes WHERE criada < now() - interval '8 hours'").catch(console.error);
  }, 3600000).unref();
}

app.listen(PORTA, () => console.log(`API ativa em http://localhost:${PORTA}`));