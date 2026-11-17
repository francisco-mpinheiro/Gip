import React from 'react';

export function TaskCardAssignee({ assignee, onAssign }) {
  if (assignee) {
    const initials = assignee.avatar || assignee.name.split(' ').filter(Boolean).map(part => part[0]).slice(0, 2).join('').toUpperCase();
    return (
      <div className="avatar sm task-card-assignee" title={`Responsável: ${assignee.name}`} aria-label={`Responsável: ${assignee.name}`}>
        {assignee.avatar?.startsWith('/uploads/') ? <img src={assignee.avatar} alt={assignee.name} /> : initials}
      </div>
    );
  }
  return onAssign ? (
    <button type="button" className="task-assign-button" title="Atribuir responsável" onClick={event => { event.stopPropagation(); onAssign(); }} onDragStart={event => event.stopPropagation()}>
      <span className="material-symbols-outlined" aria-hidden="true">person_add</span> Atribuir
    </button>
  ) : <span className="task-unassigned">Sem responsável</span>;
}

export function TaskCardCounts({ counts = {} }) {
  const { comments = 0, attachments = 0 } = counts;
  if (!comments && !attachments) return null;
  return (
    <span className="task-card-counts">
      {comments > 0 && <span title={`${comments} ${comments === 1 ? 'comentário' : 'comentários'}`} aria-label={`${comments} ${comments === 1 ? 'comentário' : 'comentários'}`}><i className="bi bi-chat-left-text" aria-hidden="true" /> {comments}</span>}
      {attachments > 0 && <span title={`${attachments} ${attachments === 1 ? 'anexo' : 'anexos'}`} aria-label={`${attachments} ${attachments === 1 ? 'anexo' : 'anexos'}`}><i className="bi bi-paperclip" aria-hidden="true" /> {attachments}</span>}
    </span>
  );
}
