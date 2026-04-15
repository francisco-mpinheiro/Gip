import React, { useState, useEffect } from "react";
import AppLayout from "../components/layout/AppLayout";
import { dashboardAPI } from "../utils/api";
import { useAuth, ROLE_LABELS } from "../context/AuthContext";

function barColor(rate) {
  if (rate >= 75) return "#22c55e";
  if (rate >= 45) return "#3b82f6";
  if (rate >= 20) return "#f59e0b";
  return "#ef4444";
}

function medalBg(idx) {
  if (idx === 0) return "linear-gradient(135deg,#f59e0b,#d97706)";
  if (idx === 1) return "linear-gradient(135deg,#94a3b8,#64748b)";
  if (idx === 2) return "linear-gradient(135deg,#cd7c4c,#a05c32)";
  return null;
}

export default function PerformancePage() {
  const { user: me } = useAuth();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("rate");

  useEffect(() => {
    dashboardAPI
      .performance()
      .then((r) => setResult(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const perf = result?.performance || [];

  const sorted = [...perf].sort((a, b) => {
    if (a.isMe && !b.isMe) return -1;
    if (!a.isMe && b.isMe) return 1;
    if (sort === "rate") return b.completionRate - a.completionRate;
    if (sort === "total") return b.totalTasks - a.totalTasks;
    if (sort === "overdue") return b.overdueTasks - a.overdueTasks;
    return 0;
  });

  const totals = perf.reduce(
    (acc, u) => ({
      tasks: acc.tasks + u.totalTasks,
      completed: acc.completed + u.completedTasks,
      overdue: acc.overdue + u.overdueTasks,
    }),
    { tasks: 0, completed: 0, overdue: 0 },
  );

  const avgRate =
    perf.length > 0
      ? Math.round(perf.reduce((s, u) => s + u.completionRate, 0) / perf.length)
      : 0;

  const isEmployee = me?.role === "employee";

  if (loading)
    return (
      <AppLayout>
        <div className="loading">
          <div className="spinner" />
          Carregando...
        </div>
      </AppLayout>
    );

  return (
    <AppLayout>
      {/* HEADER */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: "var(--text-primary)",
              }}
            >
              Desempenho
            </h1>
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: 13,
                marginTop: 4,
              }}
            >
              {result?.scope || "Análise de produtividade"}
            </p>
          </div>
          {/* Scope badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              borderRadius: 20,
              background: "rgba(59,130,246,0.1)",
              border: "1px solid rgba(59,130,246,0.2)",
              fontSize: 12,
              fontWeight: 600,
              color: "#60a5fa",
            }}
          >
            {isEmployee ? "👤" : "👥"} {result?.scope}
          </div>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="metric-cards" style={{ marginBottom: 24 }}>
        <MetricCard
          icon="bi bi-bar-chart"
          iconClass="green"
          value={`${avgRate}%`}
          label="Taxa Média de Conclusão"
        />

        <MetricCard
          icon="bi bi-list-check"
          iconClass="blue"
          value={totals.tasks}
          label="Total de Tarefas"
        />

        <MetricCard
          icon="bi bi-check-circle"
          iconClass="green"
          value={totals.completed}
          label="Tarefas Concluídas"
        />

        <MetricCard
          icon="bi bi-exclamation-triangle"
          iconClass="red"
          value={totals.overdue}
          label="Tarefas Atrasadas"
          accent={totals.overdue > 0 ? "var(--accent-red)" : null}
        />
      </div>

      {/* EMPLOYEE — card único do próprio usuário */}
      {isEmployee ? (
        <MyPerformanceCard data={perf[0]} />
      ) : (
        <>
          {/* RANKING */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <span className="card-title">Ranking de Desempenho</span>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  ["rate", "Taxa"],
                  ["total", "Total"],
                  ["overdue", "Atrasadas"],
                ].map(([v, l]) => (
                  <button
                    key={v}
                    className="btn btn-sm"
                    style={{
                      background:
                        sort === v ? "var(--accent-blue-dim)" : "transparent",
                      border: `1px solid ${sort === v ? "var(--accent-blue)" : "var(--border)"}`,
                      color:
                        sort === v
                          ? "var(--accent-blue)"
                          : "var(--text-secondary)",
                    }}
                    onClick={() => setSort(v)}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {sorted.map((item, idx) => {
                const color = barColor(item.completionRate);
                const medal = medalBg(idx);
                return (
                  <div
                    key={item.user.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "12px 14px",
                      borderRadius: 10,
                      background: item.isMe
                        ? "rgba(59,130,246,0.07)"
                        : "rgba(255,255,255,0.02)",
                      border: `1px solid ${item.isMe ? "rgba(59,130,246,0.25)" : "transparent"}`,
                      transition: "all 0.2s",
                    }}
                  >
                    {/* rank badge */}
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        flexShrink: 0,
                        background: medal || "var(--bg-input)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 800,
                        color: medal ? "#fff" : "var(--text-muted)",
                      }}
                    >
                      {idx + 1}
                    </div>

                    {/* avatar */}
                    <div className="avatar" style={{ flexShrink: 0 }}>
                      {item.user.avatar}
                    </div>

                    {/* info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 6,
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 700, fontSize: 13.5 }}>
                            {item.user.name}
                            {item.isMe && (
                              <span
                                style={{
                                  fontSize: 10.5,
                                  fontWeight: 600,
                                  color: "#60a5fa",
                                  marginLeft: 8,
                                  background: "rgba(59,130,246,0.15)",
                                  padding: "1px 7px",
                                  borderRadius: 10,
                                }}
                              >
                                Você
                              </span>
                            )}
                          </span>
                          <span
                            style={{
                              fontSize: 11.5,
                              color: "var(--text-muted)",
                              marginLeft: 8,
                            }}
                          >
                            {item.user.department}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: 16,
                            alignItems: "center",
                            flexShrink: 0,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              color: "var(--text-secondary)",
                            }}
                          >
                            {item.completedTasks}/{item.totalTasks} tarefas
                          </span>
                          {item.overdueTasks > 0 && (
                            <span
                              style={{
                                fontSize: 11.5,
                                color: "var(--accent-red)",
                              }}
                            >
                              ⚠ {item.overdueTasks}
                            </span>
                          )}
                          <span
                            style={{
                              fontSize: 15,
                              fontWeight: 800,
                              color,
                              minWidth: 42,
                              textAlign: "right",
                            }}
                          >
                            {item.completionRate}%
                          </span>
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            flex: 1,
                            height: 7,
                            background: "var(--border)",
                            borderRadius: 4,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              borderRadius: 4,
                              background: color,
                              width: `${item.completionRate}%`,
                              transition: "width 0.6s ease",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* DETAIL TABLE */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Detalhamento por Colaborador</span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {sorted.length} colaboradores
              </span>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Colaborador</th>
                    <th>Função</th>
                    <th>Total</th>
                    <th>Em andamento</th>
                    <th>Concluídas</th>
                    <th>Atrasadas</th>
                    <th>Taxa</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((item) => {
                    const color = barColor(item.completionRate);
                    return (
                      <tr
                        key={item.user.id}
                        style={{
                          background: item.isMe
                            ? "rgba(59,130,246,0.04)"
                            : undefined,
                        }}
                      >
                        <td>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                            }}
                          >
                            <div className="avatar">{item.user.avatar}</div>
                            <div>
                              <div
                                style={{
                                  fontWeight: 600,
                                  fontSize: 13.5,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                }}
                              >
                                {item.user.name}
                                {item.isMe && (
                                  <span
                                    style={{
                                      fontSize: 10,
                                      color: "#60a5fa",
                                      background: "rgba(59,130,246,0.15)",
                                      padding: "1px 6px",
                                      borderRadius: 8,
                                      fontWeight: 700,
                                    }}
                                  >
                                    Você
                                  </span>
                                )}
                              </div>
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "var(--text-muted)",
                                }}
                              >
                                {item.user.department}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td
                          style={{
                            fontSize: 12,
                            color: "var(--text-secondary)",
                          }}
                        >
                          {ROLE_LABELS[item.user.role]}
                        </td>
                        <td style={{ fontWeight: 700 }}>{item.totalTasks}</td>
                        <td>
                          <span
                            style={{
                              color: "var(--accent-blue)",
                              fontWeight: 700,
                            }}
                          >
                            {item.inProgressTasks}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              color: "var(--accent-green)",
                              fontWeight: 700,
                            }}
                          >
                            {item.completedTasks}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              color:
                                item.overdueTasks > 0
                                  ? "var(--accent-red)"
                                  : "var(--text-muted)",
                              fontWeight: 700,
                            }}
                          >
                            {item.overdueTasks > 0
                              ? `⚠ ${item.overdueTasks}`
                              : "—"}
                          </span>
                        </td>
                        <td>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <div
                              style={{
                                width: 64,
                                height: 7,
                                background: "var(--border)",
                                borderRadius: 4,
                                overflow: "hidden",
                                flexShrink: 0,
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  borderRadius: 4,
                                  background: color,
                                  width: `${item.completionRate}%`,
                                }}
                              />
                            </div>
                            <span
                              style={{ fontSize: 13, fontWeight: 800, color }}
                            >
                              {item.completionRate}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}

/* ─── Metric Card ──────────────────────────────────────────────────────────── */
function MetricCard({ icon, iconClass, value, label, accent }) {
  return (
    <div className="metric-card" style={{ borderColor: accent }}>
      <div className={`metric-icon ${iconClass}`}>
        <i className={icon}></i>
      </div>

      <div className="metric-info">
        <h3>{value}</h3>
        <p>{label}</p>
      </div>
    </div>
  );
}

/* ─── My Performance Card (employee view) ──────────────────────────────────── */
function MyPerformanceCard({ data }) {
  if (!data)
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <p>Nenhuma tarefa atribuída a você ainda.</p>
        </div>
      </div>
    );

  const color = barColor(data.completionRate);

  return (
    <div className="card">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div
          className="avatar xl"
          style={{ width: 56, height: 56, fontSize: 20 }}
        >
          {data.user.avatar}
        </div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>{data.user.name}</div>
          <div
            style={{
              fontSize: 12.5,
              color: "var(--text-secondary)",
              marginTop: 2,
            }}
          >
            {ROLE_LABELS[data.user.role]} · {data.user.department}
          </div>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "center" }}>
          <div style={{ fontSize: 36, fontWeight: 900, color, lineHeight: 1 }}>
            {data.completionRate}%
          </div>
          <div
            style={{
              fontSize: 11.5,
              color: "var(--text-secondary)",
              marginTop: 4,
            }}
          >
            Taxa de conclusão
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            Progresso geral
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color }}>
            {data.completionRate}%
          </span>
        </div>
        <div
          style={{
            height: 12,
            background: "var(--border)",
            borderRadius: 6,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              borderRadius: 6,
              background: `linear-gradient(90deg, ${color}, ${color}88)`,
              width: `${data.completionRate}%`,
              transition: "width 0.8s ease",
            }}
          />
        </div>
      </div>

      {/* Stat boxes */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
        }}
      >
        {[
          {
            label: "Total",
            value: data.totalTasks,
            color: "var(--text-primary)",
          },
          {
            label: "Em andamento",
            value: data.inProgressTasks,
            color: "var(--accent-blue)",
          },
          {
            label: "Concluídas",
            value: data.completedTasks,
            color: "var(--accent-green)",
          },
          {
            label: "Atrasadas",
            value: data.overdueTasks,
            color:
              data.overdueTasks > 0 ? "var(--accent-red)" : "var(--text-muted)",
          },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              textAlign: "center",
              padding: "14px 10px",
              background: "var(--bg-input)",
              borderRadius: 10,
              border: "1px solid var(--border-light)",
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 900, color: s.color }}>
              {s.value}
            </div>
            <div
              style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {data.overdueTasks > 0 && (
        <div
          style={{
            marginTop: 16,
            padding: "12px 14px",
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 8,
            fontSize: 13,
            color: "#f87171",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          ⚠ Você tem {data.overdueTasks} tarefa
          {data.overdueTasks > 1 ? "s" : ""} em atraso. Verifique seus prazos.
        </div>
      )}
    </div>
  );
}
