export function getWorkload(tasks = []) {
  const count = tasks.filter(task => !['concluido', 'cancelado'].includes(task.status)).length;
  if (count >= 6) return { count, label: 'Sobrecarregado', tone: 'red' };
  if (count >= 3) return { count, label: 'Moderado', tone: 'amber' };
  return { count, label: 'Disponível', tone: 'green' };
}
