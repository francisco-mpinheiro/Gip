
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

function formatRate(rate) {
  return rate === null || rate === undefined ? "—" : `${rate}%`;
}

export default function PerformancePage() {
  const { user: me } = useAuth();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sort, setSort] = useState("rate");

  useEffect(() => {
    dashboardAPI
      .performance()
      .then((r) => setResult(r.data))
      .catch((err) => {
        console.error("Erro ao carregar desempenho:", err);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const perf = result?.performance || [];
  const summary = result?.summary || {};

  // Consolidar os totais da equipe.
  const totals = {
    tasks:
      summary.totalTasks ??
      perf.reduce((sum, u) => sum + (u.totalTasks || 0), 0),

    completed:
      summary.completedTasks ??
      perf.reduce((sum, u) => sum + (u.completedTasks || 0), 0),

    overdue:
      summary.overdueTasks ??
      perf.reduce((sum, u) => sum + (u.overdueTasks || 0), 0),

    onTime:
      summary.onTimeTasks ??
      perf.reduce((sum, u) => sum + (u.onTimeTasks || 0), 0),

    lateCompleted:
      summary.lateCompletedTasks ??
      perf.reduce((sum, u) => sum + (u.lateCompletedTasks || 0), 0),
  };

  const punctualityTotal = totals.onTime + totals.lateCompleted;

  const avgRate =
    summary.completionRate ??
    (totals.tasks > 0
      ? Math.round((totals.completed / totals.tasks) * 100)
      : 0);

  const punctualityRate =
    summary.punctualityRate ??
    (punctualityTotal > 0
      ? Math.round((totals.onTime / punctualityTotal) * 100)
      : null);

  // Ordenação do ranking.
  const sorted = [...perf].sort((a, b) => {
    if (a.isMe && !b.isMe) return -1;
    if (!a.isMe && b.isMe) return 1;

    if (sort === "rate") return b.completionRate - a.completionRate;
    if (sort === "total") return b.totalTasks - a.totalTasks;
    if (sort === "overdue") return b.overdueTasks - a.overdueTasks;

    if (sort === "punctuality") {
      return (b.punctualityRate ?? -1) - (a.punctualityRate ?? -1);
    }

    return 0;
  });

  const isEmployee = me?.role === "employee";

  const chartMax = Math.max(
    1,
    ...perf.map((item) => item.totalTasks || 0)
  );

  if (loading) {
    return (
      <AppLayout>
        <div className="loading">
          <div className="spinner" />
          Carregando...
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="card">
          <div className="empty-state">
            <p>Não foi possível carregar os dados de desempenho.</p>
            <button
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const myPerformance =
    perf.find((item) => item.isMe) || perf[0];

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
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              {isEmployee ? "person" : "group"}
            </span>
            {result?.scope}
          </div>
        </div>
      </div>

      {/* QUATRO INDICADORES PRINCIPAIS */}
      <div className="metric-cards" style={{ marginBottom: 24 }}>
        <MetricCard
          icon="bi bi-bar-chart"
          iconClass="green"
          value={`${avgRate}%`}
          label="Taxa de Conclusão"
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

      {isEmployee ? (
        <MyPerformanceCard data={myPerformance} />
      ) : (
        <>
          {/* VISÃO GERAL E PONTUALIDADE */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 20,
              marginBottom: 20,
            }}
          >
            <TeamOverviewChart
              data={perf}
              maxTasks={chartMax}
            />

            <PunctualityCard
              rate={punctualityRate}
              onTime={totals.onTime}
              late={totals.lateCompleted}
              total={punctualityTotal}
            />
          </div>

          {/* RANKING */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <span className="card-title">Ranking de Desempenho</span>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                {[
                  ["rate", "Taxa"],
                  ["total", "Total"],
                  ["overdue", "Atrasadas"],
                  ["punctuality", "Pontualidade"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    className="btn btn-sm"
                    style={{
                      background:
                        sort === value
                          ? "var(--accent-blue-dim)"
                          : "transparent",
                      border: `1px solid ${
                        sort === value
                          ? "var(--accent-blue)"
                          : "var(--border)"
                      }`,
                      color:
                        sort === value
                          ? "var(--accent-blue)"
                          : "var(--text-secondary)",
                    }}
                    onClick={() => setSort(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
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
                      border: `1px solid ${
                        item.isMe
                          ? "rgba(59,130,246,0.25)"
                          : "transparent"
                      }`,
                    }}
                  >
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

                    <div className="avatar" style={{ flexShrink: 0 }}>
                      {item.user.avatar}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: 8,
                          marginBottom: 6,
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 700, fontSize: 13.5 }}>
                            {item.user.name}
                          </span>

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

                          <div
                            style={{
                              fontSize: 11.5,
                              color: "var(--text-muted)",
                              marginTop: 3,
                            }}
                          >
                            {item.user.department || "Sem departamento"}
                          </div>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            gap: 12,
                            alignItems: "center",
                            flexWrap: "wrap",
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

                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 800,
                              color: "#22c55e",
                            }}
                          >
                            Pontualidade: {formatRate(item.punctualityRate)}
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

                      <ProgressBar
                        value={item.completionRate}
                        color={color}
                      />
                    </div>
                  </div>
                );
              })}

              {sorted.length === 0 && (
                <div className="empty-state">
                  <p>Nenhum colaborador encontrado.</p>
                </div>
              )}
            </div>
          </div>

          {/* TABELA DETALHADA */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">
                Detalhamento por Colaborador
              </span>

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
                    <th>No prazo</th>
                    <th>Com atraso</th>
                    <th>Pontualidade</th>
                    <th>Conclusão</th>
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
                              <div style={{ fontWeight: 600, fontSize: 13.5 }}>
                                {item.user.name}
                                {item.isMe && (
                                  <span
                                    style={{
                                      fontSize: 10,
                                      color: "#60a5fa",
                                      marginLeft: 6,
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
                                {item.user.department || "Sem departamento"}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td style={{ fontSize: 12 }}>
                          {ROLE_LABELS[item.user.role] || item.user.role}
                        </td>

                        <td style={{ fontWeight: 700 }}>
                          {item.totalTasks}
                        </td>

                        <td style={{ color: "var(--accent-blue)", fontWeight: 700 }}>
                          {item.inProgressTasks}
                        </td>

                        <td style={{ color: "var(--accent-green)", fontWeight: 700 }}>
                          {item.completedTasks}
                        </td>

                        <td
                          style={{
                            color:
                              item.overdueTasks > 0
                                ? "var(--accent-red)"
                                : "var(--text-muted)",
                            fontWeight: 700,
                          }}
                        >
                          {item.overdueTasks}
                        </td>

                        <td style={{ color: "#22c55e", fontWeight: 700 }}>
                          {item.onTimeTasks || 0}
                        </td>

                        <td style={{ color: "#ef4444", fontWeight: 700 }}>
                          {item.lateCompletedTasks || 0}
                        </td>

                        <td
                          style={{
                            fontWeight: 800,
                            color:
                              item.punctualityRate === null ||
                              item.punctualityRate === undefined
                                ? "var(--text-muted)"
                                : barColor(item.punctualityRate),
                          }}
                        >
                          {formatRate(item.punctualityRate)}
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
                                width: 55,
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
                                  background: color,
                                  width: `${item.completionRate}%`,
                                }}
                              />
                            </div>

                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 800,
                                color,
                              }}
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

// CARTÃO DE MÉTRICA
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

// BARRA DE PROGRESSO
function ProgressBar({ value, color }) {
  return (
    <div
      style={{
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
          width: `${value}%`,
          transition: "width 0.6s ease",
        }}
      />
    </div>
  );
}

// VISÃO GERAL DA EQUIPE
function TeamOverviewChart({ data, maxTasks }) {
  const series = [
    {
      key: "completedTasks",
      label: "Concluídas",
      color: "#22c55e",
    },
    {
      key: "inProgressTasks",
      label: "Em andamento",
      color: "#3b82f6",
    },
    {
      key: "overdueTasks",
      label: "Atrasadas",
      color: "#ef4444",
    },
  ];

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Visão Geral da Equipe</span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 18 }}>
        {series.map((item) => (
          <div
            key={item.key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              color: "var(--text-secondary)",
            }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: 3,
                background: item.color,
              }}
            />
            {item.label}
          </div>
        ))}
      </div>

      {data.length === 0 ? (
        <div className="empty-state">
          <p>Não há dados de equipe para exibir.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {data.map((member) => (
            <div key={member.user.id}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  marginBottom: 9,
                  fontSize: 12,
                }}
              >
                <strong>{member.user.name}</strong>
                <span style={{ color: "var(--text-muted)" }}>
                  {member.totalTasks} tarefas
                </span>
              </div>

              {series.map((item) => {
                const value = member[item.key] || 0;
                const width = (value / maxTasks) * 100;

                return (
                  <div
                    key={item.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        width: 92,
                        fontSize: 10.5,
                        color: "var(--text-secondary)",
                        flexShrink: 0,
                      }}
                    >
                      {item.label}
                    </span>

                    <div
                      style={{
                        flex: 1,
                        height: 9,
                        background: "var(--border)",
                        borderRadius: 5,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${width}%`,
                          height: "100%",
                          background: item.color,
                          borderRadius: 5,
                          minWidth: value > 0 ? 3 : 0,
                          transition: "width 0.5s ease",
                        }}
                      />
                    </div>

                    <strong
                      style={{
                        width: 24,
                        textAlign: "right",
                        fontSize: 11,
                      }}
                    >
                      {value}
                    </strong>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// INDICADOR DE PONTUALIDADE
function PunctualityCard({ rate, onTime, late, total }) {
  const color =
    rate === null || rate === undefined
      ? "var(--text-muted)"
      : barColor(rate);

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Pontualidade da Equipe</span>
      </div>

      <div style={{ textAlign: "center", padding: "15px 5px" }}>
        <div
          style={{
            fontSize: 44,
            fontWeight: 900,
            lineHeight: 1.2,
            color,
          }}
        >
          {formatRate(rate)}
        </div>

        <div
          style={{
            fontSize: 12,
            color: "var(--text-secondary)",
            marginTop: 6,
          }}
        >
          Taxa de tarefas concluídas no prazo
        </div>

        <div
          style={{
            height: 10,
            marginTop: 18,
            background: "var(--border)",
            borderRadius: 6,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${rate ?? 0}%`,
              background: color,
              borderRadius: 6,
            }}
          />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 12,
          marginTop: 12,
        }}
      >
        <div
          style={{
            padding: 15,
            background: "var(--bg-input)",
            border: "1px solid var(--border-light)",
            borderRadius: 10,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 25, fontWeight: 900, color: "#22c55e" }}>
            {onTime}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            Concluídas no prazo
          </div>
        </div>

        <div
          style={{
            padding: 15,
            background: "var(--bg-input)",
            border: "1px solid var(--border-light)",
            borderRadius: 10,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 25, fontWeight: 900, color: "#ef4444" }}>
            {late}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            Concluídas com atraso
          </div>
        </div>
      </div>

      <p
        style={{
          fontSize: 11,
          color: "var(--text-muted)",
          textAlign: "center",
          marginTop: 14,
        }}
      >
        Base de cálculo: {total} tarefas concluídas com prazo e data registrada.
      </p>
    </div>
  );
}

// DESEMPENHO INDIVIDUAL DO COLABORADOR
function MyPerformanceCard({ data }) {
  if (!data) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-icon">
            <span className="material-symbols-outlined">assignment</span>
          </div>
          <p>Nenhuma tarefa atribuída a você ainda.</p>
        </div>
      </div>
    );
  }

  const color = barColor(data.completionRate);

  return (
    <div className="card">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
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
          <div style={{ fontSize: 17, fontWeight: 800 }}>
            {data.user.name}
          </div>

          <div
            style={{
              fontSize: 12.5,
              color: "var(--text-secondary)",
              marginTop: 2,
            }}
          >
            {ROLE_LABELS[data.user.role] || data.user.role} ·{" "}
            {data.user.department || "Sem departamento"}
          </div>
        </div>

        <div style={{ marginLeft: "auto", textAlign: "center" }}>
          <div
            style={{
              fontSize: 36,
              fontWeight: 900,
              color,
              lineHeight: 1,
            }}
          >
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

      {/* PROGRESSO */}
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

        <ProgressBar value={data.completionRate} color={color} />
      </div>

      {/* INDICADORES INDIVIDUAIS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
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
              data.overdueTasks > 0
                ? "var(--accent-red)"
                : "var(--text-muted)",
          },
          {
            label: "No prazo",
            value: data.onTimeTasks || 0,
            color: "#22c55e",
          },
          {
            label: "Com atraso",
            value: data.lateCompletedTasks || 0,
            color: "#ef4444",
          },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              textAlign: "center",
              padding: "14px 10px",
              background: "var(--bg-input)",
              borderRadius: 10,
              border: "1px solid var(--border-light)",
            }}
          >
            <div
              style={{
                fontSize: 24,
                fontWeight: 900,
                color: item.color,
              }}
            >
              {item.value}
            </div>

            <div
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                marginTop: 4,
              }}
            >
              {item.label}
            </div>
          </div>
        ))}
      </div>

      {/* PONTUALIDADE INDIVIDUAL */}
      <div
        style={{
          marginTop: 20,
          padding: 16,
          borderRadius: 10,
          background: "var(--bg-input)",
          border: "1px solid var(--border-light)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            marginBottom: 10,
          }}
        >
          <strong style={{ fontSize: 13 }}>Minha pontualidade</strong>

          <strong
            style={{
              fontSize: 19,
              color:
                data.punctualityRate === null ||
                data.punctualityRate === undefined
                  ? "var(--text-muted)"
                  : barColor(data.punctualityRate),
            }}
          >
            {formatRate(data.punctualityRate)}
          </strong>
        </div>

        <ProgressBar
          value={data.punctualityRate ?? 0}
          color={
            data.punctualityRate === null ||
            data.punctualityRate === undefined
              ? "var(--text-muted)"
              : barColor(data.punctualityRate)
          }
        />

        <p
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            marginTop: 10,
          }}
        >
          Calculada somente com tarefas concluídas que possuem prazo e data
          de conclusão registrada.
        </p>
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
          }}
        >
          ⚠ Você tem {data.overdueTasks} tarefa
          {data.overdueTasks > 1 ? "s" : ""} em atraso. Verifique seus prazos.
        </div>
      )}
    </div>
  );
}
