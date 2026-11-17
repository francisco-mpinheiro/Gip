import React from 'react';
import { getWorkload } from '../utils/memberInsights';

export function WorkloadBadge({ tasks }) {
  const workload = getWorkload(tasks);
  return (
    <span className={`workload-badge workload-${workload.tone}`}>
      <span className="workload-dot" aria-hidden="true" />
      {workload.label} · {workload.count} {workload.count === 1 ? 'tarefa ativa' : 'tarefas ativas'}
    </span>
  );
}

export function EducationTags({ educations = [] }) {
  return (
    <div className="education-tags" aria-label="Formações acadêmicas">
      {educations.length ? educations.map(education => (
        <span className="education-tag" key={education.id} title={`${education.degree} · ${education.institution}`}>
          {education.degree}
        </span>
      )) : <span className="education-empty">Sem formação cadastrada</span>}
    </div>
  );
}

export default function MemberInsights({ user }) {
  return (
    <div className="member-insights">
      <WorkloadBadge tasks={user.tasks} />
      <EducationTags educations={user.educations || []} />
    </div>
  );
}
