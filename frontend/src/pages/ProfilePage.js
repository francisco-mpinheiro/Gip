import React from 'react';
import AppLayout from '../components/layout/AppLayout';
import UserProfile from '../components/UserProfile';

export default function ProfilePage() {
  return (
    <AppLayout>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800 }}>Meu Perfil</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>Gerencie suas informações pessoais</p>
      </div>
      <UserProfile />
    </AppLayout>
  );
}
