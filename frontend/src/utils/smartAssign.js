// Utilitário de Recomendação Inteligente de Responsável (Smart Assign — HU-01)

const normalize = (str = '') =>
  String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const DOMAIN_KEYWORDS = [
  {
    terms: ['dev', 'desenvolvimento', 'codigo', 'api', 'backend', 'frontend', 'react', 'node', 'banco', 'bug', 'sistema', 'software', 'engenharia de software', 'computacao', 'sistemas'],
    tags: ['desenvolvimento', 'ti', 'computacao', 'sistema', 'software', 'engenharia', 'analise'],
  },
  {
    terms: ['infra', 'rede', 'servidor', 'docker', 'deploy', 'seguranca', 'suporte', 'ti', 'tecnologia', 'dados', 'autenticacao'],
    tags: ['ti', 'desenvolvimento', 'infraestrutura', 'redes', 'sistemas', 'computacao'],
  },
  {
    terms: ['design', 'ui', 'ux', 'layout', 'tela', 'prototipo', 'figma', 'identidade', 'visual', 'arte', 'interface'],
    tags: ['design', 'arte', 'publicidade', 'marketing', 'arquitetura', 'visual'],
  },
  {
    terms: ['teste', 'qa', 'qualidade', 'homologacao', 'revisao', 'revisar', 'validacao', 'validar', 'auditoria'],
    tags: ['qa', 'qualidade', 'teste', 'desenvolvimento', 'ti'],
  },
  {
    terms: ['gestao', 'administracao', 'planejamento', 'orcamento', 'compra', 'comprar', 'contratar', 'contrato', 'financeiro', 'diretoria', 'relatorio', 'predio', 'obra', 'materia'],
    tags: ['diretoria', 'administracao', 'gestao', 'geral', 'engenharia', 'financas', 'economia', 'contabeis'],
  },
];

/**
 * Calcula pontuação de recomendação para cada membro candidato a uma tarefa.
 * Critérios:
 *  1. Menor quantidade de tarefas ativas e atrasadas (Disponibilidade)
 *  2. Formação acadêmica cadastrada (Education)
 *  3. Afinidade de Departamento / Formação com o contexto da tarefa e projeto
 */
export function rankMembersForTask(candidates = [], context = {}) {
  const {
    taskTitle = '',
    taskDescription = '',
    taskPriority = 'media',
    project = null,
    allTasks = [],
  } = context;

  const now = new Date();
  const contextText = normalize(
    `${taskTitle} ${taskDescription} ${project?.name || ''} ${project?.description || ''}`
  );

  // Identifica quais domínios aparecem no título/descrição da tarefa ou projeto
  const matchedDomains = DOMAIN_KEYWORDS.filter((d) =>
    d.terms.some((term) => contextText.includes(term))
  );

  const scored = candidates.map((member) => {
    // Obter tarefas do membro (vindas de member.tasks ou filtradas de allTasks)
    const userTasks = Array.isArray(member.tasks)
      ? member.tasks
      : allTasks.filter((t) => t.assigneeId === member.id);

    const activeTasks = userTasks.filter((t) => t.status !== 'concluido');
    const overdueTasks = activeTasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < now
    );
    const completedTasks = userTasks.filter((t) => t.status === 'concluido');

    // 1. Pontuação de Disponibilidade (base 60 pontos)
    let availabilityScore = 60 - activeTasks.length * 12 - overdueTasks.length * 18;
    availabilityScore = Math.max(5, Math.min(60, availabilityScore));

    // 2. Pontuação por Formação Acadêmica (Education) e Departamento (até 20 pontos)
    const educations = Array.isArray(member.educations) ? member.educations : [];
    let educationScore = 0;
    if (educations.length > 0) {
      educationScore += 12 + Math.min(8, (educations.length - 1) * 4);
    } else if (member.department) {
      educationScore += 5;
    }

    // 3. Afinidade Contextual: Departamento + Formação vs Tarefa/Projeto (até 20 pontos)
    const memberProfileText = normalize(
      `${member.department || ''} ${educations.map((e) => `${e.degree} ${e.institution}`).join(' ')}`
    );

    let affinityScore = 0;
    let hasDomainMatch = false;

    if (matchedDomains.length > 0) {
      hasDomainMatch = matchedDomains.some((d) =>
        d.tags.some((tag) => memberProfileText.includes(tag))
      );
      if (hasDomainMatch) {
        affinityScore += 15;
      }
    }

    // Match direto de palavras entre formação/departamento e contexto da tarefa
    const profileTokens = memberProfileText
      .split(/\s+/)
      .filter((w) => w.length > 3);
    if (
      !hasDomainMatch &&
      profileTokens.some((token) => contextText.includes(token))
    ) {
      hasDomainMatch = true;
      affinityScore += 15;
    }

    // Bônus por histórico de entregas concluídas (até 5 pontos)
    const historyBonus = Math.min(5, completedTasks.length * 2.5);

    // Bônus para tarefas de alta prioridade se o membro não tiver atrasos
    const priorityBonus =
      taskPriority === 'alta' && overdueTasks.length === 0 ? 5 : 0;

    const rawScore = Math.round(
      availabilityScore + educationScore + affinityScore + historyBonus + priorityBonus
    );
    const score = Math.max(15, Math.min(99, rawScore));

    // Montar motivos/tags explicativas para exibir na UI
    const reasons = [];
    if (activeTasks.length === 0) {
      reasons.push('Livre (0 ativas)');
    } else if (overdueTasks.length > 0) {
      reasons.push(`${activeTasks.length} ativa(s) • ${overdueTasks.length} atrasada(s)`);
    } else {
      reasons.push(`${activeTasks.length} ativa(s)`);
    }

    if (educations.length > 0) {
      const mainEdu = educations[0];
      reasons.push(mainEdu.degree);
    }

    if (member.department) {
      reasons.push(member.department);
    }

    return {
      ...member,
      smartAssign: {
        score,
        activeCount: activeTasks.length,
        overdueCount: overdueTasks.length,
        completedCount: completedTasks.length,
        hasEducation: educations.length > 0,
        primaryEducation: educations[0] || null,
        hasDomainMatch,
        reasons,
        isRecommended: false, // definido após ordenação
      },
    };
  });

  // Ordena por maior score (desempate por menor número de atrasadas e menor número de ativas)
  scored.sort((a, b) => {
    if (b.smartAssign.score !== a.smartAssign.score) {
      return b.smartAssign.score - a.smartAssign.score;
    }
    if (a.smartAssign.overdueCount !== b.smartAssign.overdueCount) {
      return a.smartAssign.overdueCount - b.smartAssign.overdueCount;
    }
    return a.smartAssign.activeCount - b.smartAssign.activeCount;
  });

  // Marca até os Top 3 com score >= 50 como "Recomendado"
  let recommendedCount = 0;
  scored.forEach((m) => {
    if (recommendedCount < 3 && m.smartAssign.score >= 50) {
      m.smartAssign.isRecommended = true;
      m.smartAssign.rank = recommendedCount + 1;
      recommendedCount++;
    }
  });

  return scored;
}

