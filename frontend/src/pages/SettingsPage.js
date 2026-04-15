import React from "react";
import AppLayout from "../components/layout/AppLayout";
import { useAuth, ROLE_LABELS } from "../context/AuthContext";

export default function SettingsPage() {
  const { user } = useAuth();

  const sections = [
    {
      title: "Aparência",
      icon: "",
      items: [
        {
          label: "Tema escuro",
          desc: "Interface escura para melhor conforto visual",
          defaultOn: true,
        },
        {
          label: "Animações",
          desc: "Ativar animações e transições",
          defaultOn: true,
        },
      ],
    },
  ];

  return (
    <AppLayout>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800 }}>Configurações</h1>
      </div>

      <div style={{ maxWidth: 680 }}>
        {/* ACCOUNT INFO */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header" >
            <span className="card-title">
              <i className="bi bi-person-circle"></i> Conta
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "8px 0",
            }}
          >
            <div
              className="avatar xl"
              style={{ width: 56, height: 56, fontSize: 20 }}
            >
              {user?.avatar}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{user?.name}</div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  marginTop: 2,
                }}
              >
                {user?.email}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginTop: 3,
                }}
              >
                {ROLE_LABELS[user?.role]} · {user?.department}
              </div>
            </div>
          </div>
        </div>

        {sections.map((section) => (
          <div
            key={section.title}
            className="card"
            style={{ marginBottom: 16 }}
          >
            <div className="card-header">
              <span className="card-title">
                {section.icon} {section.title}
              </span>
            </div>
            {section.items.map((item, i) => (
              <ToggleRow
                key={i}
                label={item.label}
                desc={item.desc}
                defaultOn={item.defaultOn}
              />
            ))}
          </div>
        ))}
      </div>
    </AppLayout>
  );
}

function ToggleRow({ label, desc, defaultOn }) {
  const [on, setOn] = React.useState(defaultOn);
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 0",
        borderBottom: "1px solid var(--border-light)",
      }}
    >
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
          {desc}
        </div>
      </div>
      <div
        style={{
          width: 42,
          height: 24,
          borderRadius: 12,
          cursor: "pointer",
          flexShrink: 0,
          background: on ? "var(--accent-blue)" : "var(--border)",
          position: "relative",
          transition: "background 0.2s",
        }}
        onClick={() => setOn((v) => !v)}
      >
        <div
          style={{
            position: "absolute",
            top: 3,
            left: on ? 21 : 3,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "#fff",
            transition: "left 0.2s",
            boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
          }}
        />
      </div>
    </div>
  );
}
