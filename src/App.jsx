  import React, { useEffect } from 'react';
  import { useAuthStore } from './store/useAuthStore';
  import useUIStore from './store/useUIStore';
  import MainLayout from './layouts/MainLayout';
  import LoginForm from './features/auth/components/LoginForm';
  import TaskBoard from './features/tasks/components/TaskBoard';
  import CRMBoard from './features/crm/components/CRMBoard';
  import AdminPanel from './features/admin/components/AdminPanel';
  import ReportsDashboard from './features/analytics/components/ReportsDashboard';
  import CalendarBoard from './features/calendar/components/CalendarBoard';
  import SystemManual from './features/manual/components/SystemManual';

  export default function App() {
    const { user, loading, init } = useAuthStore();
    const { currentView } = useUIStore();

    useEffect(() => {
      init();
    }, [init]);

    if (loading) {
      return (
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center font-mono text-orange-500">
          <div className="animate-spin w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full mb-4"></div>
          <p className="font-bold text-sm tracking-widest uppercase">Iniciando Sistema...</p>
        </div>
      );
    }

    if (!user) {
      return <LoginForm />;
    }

    const renderCurrentView = () => {
      switch (currentView) {
        case 'tasks':
          return <TaskBoard />;
        case 'crm':            // <--- ¡ESTA ES LA LÍNEA QUE FALTABA!
          return <CRMBoard />;
        case 'calendar': 
          return <CalendarBoard />;
        case 'admin':
          return <AdminPanel />;
        case 'reports':
          return <ReportsDashboard />;
        case 'manual':
          return <SystemManual />;
        default:
          return <TaskBoard />;
      }
    };

    return (
      <MainLayout>
        {renderCurrentView()}
      </MainLayout>
    );
  }