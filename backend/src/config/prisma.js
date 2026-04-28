const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

// Pega a URL do banco do seu arquivo .env
const connectionString = process.env.DATABASE_URL;

// Configura o Pool de conexão e o Adaptador do Prisma
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

// Agora sim, instanciamos o PrismaClient passando o adapter!
const prisma = new PrismaClient({ adapter });

module.exports = prisma;