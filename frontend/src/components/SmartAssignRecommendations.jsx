import React from 'react';

export default function SmartAssignRecommendations({
  isOpen = false,
  onClose,
  rankedMembers = [],
  selectedId = '',
  onSelect,
}) {
  const recommended = rankedMembers.filter((m) => m.smartAssign?.isRecommended);

  if (!isOpen || recommended.length === 0) return null;

  return (
    <div
      style={{
        marginTop: -2,
        marginBottom: 14,
        padding: '10px 12px',
        background: 'var(--bg-input)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-secondary)',
          }}
        >
          Responsáveis recomendados
        </span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: 11.5,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Fechar
          </button>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 8,
        }}
      >
        {recommended.map((m) => {
          const isSelected = String(selectedId) === String(m.id);
          const { score, reasons } = m.smartAssign;

          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelect(isSelected ? '' : m.id)}
              style={{
                textAlign: 'left',
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                background: isSelected ? 'var(--accent-blue-dim)' : 'var(--bg-card)',
                border: isSelected
                  ? '1px solid var(--accent-blue)'
                  : '1px solid var(--border)',
                color: 'var(--text-primary)',
                transition: 'var(--transition)',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <div
                    className="avatar sm"
                    style={{ width: 22, height: 22, fontSize: 9.5, flexShrink: 0, overflow: 'hidden' }}
                  >
                    {m.avatar?.startsWith('/uploads/') ? (
                      <img
                        src={m.avatar}
                        alt={m.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      m.avatar || m.name?.[0]
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: 12.5,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={m.name}
                  >
                    {m.name}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '1px 6px',
                    borderRadius: 4,
                    background: 'var(--accent-blue-dim)',
                    color: 'var(--accent-blue)',
                    flexShrink: 0,
                  }}
                >
                  {score}%
                </span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {reasons.map((reason, idx) => (
                  <span
                    key={idx}
                    style={{
                      fontSize: 10.5,
                      color: 'var(--text-secondary)',
                      background: 'var(--bg-primary)',
                      padding: '1px 6px',
                      borderRadius: 4,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '100%',
                    }}
                    title={reason}
                  >
                    {reason}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
