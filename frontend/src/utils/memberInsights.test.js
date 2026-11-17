import { getWorkload } from './memberInsights';

test.each([[0,'Disponível'],[2,'Disponível'],[3,'Moderado'],[5,'Moderado'],[6,'Sobrecarregado']])('classifica %i tarefas como %s', (count,label) => {
  expect(getWorkload(Array.from({length:count},()=>({status:'a_fazer'})))).toMatchObject({count,label});
});
test('conta em andamento e atrasadas; ignora concluídas e canceladas', () => {
  expect(getWorkload([{status:'concluido'},{status:'cancelado'},{status:'a_fazer'},{status:'em_andamento',dueDate:'2020-01-01'}]).count).toBe(2);
  expect(getWorkload().count).toBe(0);
});
