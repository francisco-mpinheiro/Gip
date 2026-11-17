const test=require('node:test'),assert=require('node:assert/strict');
const {computeProjectHealth,wouldCreateCycle}=require('../src/services/projectInsights');
const now=new Date('2026-11-16T15:00:00Z');
const task=(id,status='a_fazer',dueDate=null,assigneeId='u1')=>({id,status,dueDate,assigneeId});
test('projeto vazio é saudável sem inventar progresso',()=>{
 const h=computeProjectHealth({tasks:[]},now);assert.equal(h.level,'healthy');assert.equal(h.metrics.total,0);assert.ok(h.reasons.includes('Nenhuma tarefa cadastrada'));
});
test('mais de 30% vencidas é crítico; vencimento de hoje não está atrasado',()=>{
 const h=computeProjectHealth({tasks:[task('a','a_fazer','2026-11-15'),task('b','a_fazer','2026-11-16')]},now);assert.equal(h.level,'critical');assert.equal(h.metrics.overdue,1);
});
test('prazo próximo usa conclusão derivada e não progresso manual',()=>{
 const h=computeProjectHealth({endDate:'2026-11-18',progress:100,tasks:[task('a')]},now);assert.equal(h.level,'critical');
});
test('bloqueios por impedimento e dependência contam a mesma tarefa uma vez',()=>{
 const h=computeProjectHealth({tasks:[task('a'),task('b')],issues:[{taskId:'a',status:'open'}],dependencies:[{taskId:'a',dependsOnId:'b'}],reviews:[{status:'pending'}]},now);assert.equal(h.level,'attention');assert.equal(h.metrics.blocked,1);assert.equal(h.metrics.pendingReviews,1);
});
test('tarefas canceladas não contam como atraso; projeto encerrado é saudável',()=>{
 const h=computeProjectHealth({status:'concluido',endDate:'2020-01-01',tasks:[task('a','cancelado','2020-01-01'),task('b','concluido')]},now);assert.equal(h.level,'healthy');assert.equal(h.metrics.total,1);assert.equal(h.metrics.completed,1);assert.equal(h.metrics.overdue,0);
});
test('sem responsável e prazo em até dois dias geram atenção',()=>{
 const h=computeProjectHealth({tasks:[task('a','a_fazer','2026-11-18',null)]},now);assert.equal(h.level,'attention');assert.equal(h.metrics.unassigned,1);assert.ok(h.reasons.length>=2);
});
test('grafo rejeita auto referência e ciclo transitivo mas permite diamante',()=>{
 const edges=[{taskId:'b',dependsOnId:'a'},{taskId:'c',dependsOnId:'b'}];assert.equal(wouldCreateCycle(edges,'a','c'),true);assert.equal(wouldCreateCycle(edges,'a','a'),true);assert.equal(wouldCreateCycle(edges,'c','a'),false);assert.equal(wouldCreateCycle(edges,'d','c'),false);
});
test('projeto vazio continua saudável mesmo com data de entrega passada',()=>{
 const h=computeProjectHealth({endDate:'2020-01-01',tasks:[]},now);assert.equal(h.level,'healthy');assert.ok(h.reasons.includes('Nenhuma tarefa cadastrada'));
});
