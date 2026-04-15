require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { seedDatabase } = require('./config/database');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*', methods: ['GET','POST','PUT','PATCH','DELETE'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json());

app.use('/api', routes);

app.get('/health', (_, res) => res.json({ status: 'ok', message: 'TaskFlow API running' }));
app.use((req, res) => res.status(404).json({ message: 'Rota não encontrada' }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Erro interno do servidor' });
});

seedDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 TaskFlow API rodando em http://localhost:${PORT}`);
    console.log(`\n📋 Usuários de teste:`);
    console.log(`   admin@taskflow.com  → Admin Plataforma`);
    console.log(`   carlos@empresa.com  → Admin Empresa`);
    console.log(`   ana@empresa.com     → Gestora de Área`);
    console.log(`   bruno@empresa.com   → Gerente de Projeto`);
    console.log(`   lucia@empresa.com   → Funcionária`);
    console.log(`   Senha: 123456 para todos\n`);
  });
});
