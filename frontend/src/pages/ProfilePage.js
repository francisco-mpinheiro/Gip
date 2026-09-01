import React from 'react';
import AppLayout from '../components/layout/AppLayout';
import UserProfile from '../components/UserProfile';

export default function ProfilePage() {
  return (
    <AppLayout>
      <div className="page-header">
        <h1>Meu Perfil</h1>
        <p>Visão geral dos seus projetos, tarefas e formações.</p>
      </div>
      <UserProfile />
    </AppLayout>
  );
}
