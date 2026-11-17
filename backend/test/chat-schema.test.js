require('dotenv').config();
const test = require('node:test');
const assert = require('node:assert/strict');
const prisma = require('../src/config/prisma');
test('schema e cliente suportam persistência e consulta de mensagens', async () => {
  try {
    assert.ok(prisma.message, 'Delegate Message deve existir no cliente gerado');
    assert.ok(Array.isArray(await prisma.message.findMany({ take: 1 })));
  } finally { await prisma.$disconnect(); }
});
