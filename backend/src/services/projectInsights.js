const terminal = status => ['concluido', 'cancelado'].includes(status);
const dateKey = value => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};
const dayNumber = key => Date.parse(`${key}T12:00:00Z`) / 86400000;

function computeProjectHealth(project, now = new Date()) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const tasks = (project.tasks || []).filter(task => task.status !== 'cancelado');
  const active = tasks.filter(task => !terminal(task.status));
  const completed = tasks.filter(task => task.status === 'concluido').length;
  const overdue = active.filter(task => dateKey(task.dueDate) && dateKey(task.dueDate) < today).length;
  const unassigned = active.filter(task => !task.assigneeId).length;
  const pendingReviews = (project.reviews || []).filter(review => review.status === 'pending').length;
  const openIssues = (project.issues || []).filter(issue => issue.status === 'open');
  const taskMap = new Map((project.tasks || []).map(task => [task.id, task]));
  const blockedIds = new Set(openIssues.filter(issue => issue.taskId && taskMap.has(issue.taskId) && !terminal(taskMap.get(issue.taskId).status)).map(issue => issue.taskId));
  for (const dependency of project.dependencies || []) {
    const predecessor = taskMap.get(dependency.dependsOnId) || dependency.dependsOn;
    const successor = taskMap.get(dependency.taskId) || dependency.task;
    if (predecessor && successor && !terminal(predecessor.status) && !terminal(successor.status)) blockedIds.add(dependency.taskId);
  }
  const metrics = { total: tasks.length, completed, overdue, unassigned, blocked: blockedIds.size, pendingReviews };
  if (terminal(project.status)) return { level: 'healthy', label: 'Saudável', reasons: ['Projeto encerrado'], metrics };
  if (!tasks.length) return { level: 'healthy', label: 'Saudável', reasons: ['Nenhuma tarefa cadastrada'], metrics };
  const reasons = [];
  let critical = false;
  if (tasks.length && overdue / tasks.length > 0.3) { critical = true; reasons.push(`${overdue} de ${tasks.length} tarefas estão atrasadas`); }
  const end = dateKey(project.endDate);
  const daysLeft = end ? dayNumber(end) - dayNumber(today) : null;
  const progress = tasks.length ? completed / tasks.length * 100 : 0;
  if (end && daysLeft < 5 && progress < 70) { critical = true; reasons.push(daysLeft < 0 ? 'Prazo do projeto vencido com entregas pendentes' : 'Menos de 5 dias para o prazo e conclusão abaixo de 70%'); }
  if (unassigned) reasons.push(`${unassigned} tarefa(s) sem responsável`);
  if (active.some(task => task.status === 'a_fazer' && dateKey(task.dueDate) && dayNumber(dateKey(task.dueDate)) - dayNumber(today) >= 0 && dayNumber(dateKey(task.dueDate)) - dayNumber(today) <= 2)) reasons.push('Há tarefas a fazer com vencimento em até 48 horas');
  if (openIssues.length) reasons.push(`${openIssues.length} impedimento(s) em aberto`);
  if (blockedIds.size) reasons.push(`${blockedIds.size} tarefa(s) bloqueada(s) por impedimentos ou dependências`);
  if (pendingReviews) reasons.push(`${pendingReviews} entrega(s) aguardando revisão`);
  const level = critical ? 'critical' : reasons.length ? 'attention' : 'healthy';
  if (!reasons.length) reasons.push(tasks.length ? 'Tarefas em dia e sem pendências identificadas' : 'Nenhuma tarefa cadastrada');
  return { level, label: { critical: 'Crítico', attention: 'Atenção', healthy: 'Saudável' }[level], reasons, metrics };
}

function wouldCreateCycle(dependencies, taskId, dependsOnId) {
  if (taskId === dependsOnId) return true;
  const graph = new Map();
  for (const edge of dependencies) {
    if (!graph.has(edge.taskId)) graph.set(edge.taskId, []);
    graph.get(edge.taskId).push(edge.dependsOnId);
  }
  const stack = [dependsOnId], seen = new Set();
  while (stack.length) {
    const id = stack.pop();
    if (id === taskId) return true;
    if (seen.has(id)) continue;
    seen.add(id); stack.push(...(graph.get(id) || []));
  }
  return false;
}
module.exports = { computeProjectHealth, wouldCreateCycle };
