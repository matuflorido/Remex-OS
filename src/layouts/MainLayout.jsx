import React, { useState, useEffect } from 'react';
import { Activity, UserCircle, Wrench, Search, Bell, LogOut, Menu, X, CheckCircle2, BarChart3 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import useUIStore from '../store/useUIStore';
import { subscribeToNotifications, markNotificationAsRead } from '../features/notifications/services/notificationService';

export default function MainLayout({ children }) {
  const { user, logout } = useAuthStore();
  const { currentView, setCurrentView, searchQuery, setSearchQuery } = useUIStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Estados para notificaciones
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);

  // Escuchar notificaciones en tiempo real al iniciar sesión
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToNotifications(user.role, (data) => {
      setNotifications(data);
    });
    return () => unsubscribe();
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = async (notif) => {
    if (!notif.read) {
      await markNotificationAsRead(notif.id);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 font-mono text-slate-200 flex h-screen overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 bg-zinc-900/95 border-r border-zinc-800 flex-shrink-0 flex flex-col z-20`}>
        <div className="p-4 bg-black/40 flex items-center justify-between border-b border-zinc-800 h-[80px]">
          {isSidebarOpen ? (
            <div>
              <h1 className="font-black text-white text-xl tracking-tight">REMEX</h1>
              <p className="text-[10px] text-orange-500 font-bold uppercase tracking-widest">Work-OS</p>
            </div>
          ) : (
            <h1 className="font-black text-white text-xl mx-auto">RX</h1>
          )}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-zinc-400 hover:text-orange-500">
            {isSidebarOpen ? <X className="w-5 h-5"/> : <Menu className="w-5 h-5 mx-auto"/>}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <div className="text-[10px] font-black text-zinc-600 uppercase mb-4 tracking-widest px-2 mt-2">Módulos</div>
          <button onClick={() => setCurrentView('tasks')} className={`w-full flex items-center px-4 py-3 rounded-xl text-sm border transition-colors ${currentView === 'tasks' ? 'bg-orange-900/20 text-orange-400 border-orange-500/50' : 'border-transparent text-zinc-400 hover:bg-zinc-800'}`}>
            <Activity className="w-5 h-5 shrink-0"/> {isSidebarOpen && <span className="ml-3 font-bold truncate">Motor de Tareas</span>}
          </button>
          <button onClick={() => setCurrentView('crm')} className={`w-full flex items-center px-4 py-3 rounded-xl text-sm border transition-colors ${currentView === 'crm' ? 'bg-orange-900/20 text-orange-400 border-orange-500/50' : 'border-transparent text-zinc-400 hover:bg-zinc-800'}`}>
            <UserCircle className="w-5 h-5 shrink-0"/> {isSidebarOpen && <span className="ml-3 font-bold truncate">CRM Operativo</span>}
          </button>
          
          <button onClick={() => setCurrentView('reports')} className={`w-full flex items-center px-4 py-3 rounded-xl text-sm border transition-colors ${currentView === 'reports' ? 'bg-orange-900/20 text-orange-400 border-orange-500/50' : 'border-transparent text-zinc-400 hover:bg-zinc-800'}`}>
            <BarChart3 className="w-5 h-5 shrink-0"/> {isSidebarOpen && <span className="ml-3 font-bold truncate">Estadísticas</span>}
          </button>

          <button onClick={() => setCurrentView('admin')} className={`w-full flex items-center px-4 py-3 rounded-xl text-sm border transition-colors ${currentView === 'admin' ? 'bg-orange-900/20 text-orange-400 border-orange-500/50' : 'border-transparent text-zinc-400 hover:bg-zinc-800'}`}>
            <Wrench className="w-5 h-5 shrink-0"/> {isSidebarOpen && <span className="ml-3 font-bold truncate">Administración</span>}
          </button>
        </nav>

        <div className="p-4 border-t border-zinc-800 bg-black/40">
           <button onClick={logout} className="w-full flex items-center justify-center py-3 rounded-xl text-sm bg-red-950/40 text-red-500 border border-red-900/50 hover:bg-red-600 hover:text-white transition-colors">
             <LogOut className="w-5 h-5" /> 
             {isSidebarOpen && <span className="ml-2 font-bold">CERRAR SESIÓN</span>}
           </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0 bg-zinc-950 relative">
        <header className="h-[80px] bg-zinc-900/80 border-b border-zinc-800 px-6 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-full max-w-md hidden md:block">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input 
                type="text" 
                value={searchQuery || ''}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar tarea, cliente..." 
                className="w-full bg-black border border-zinc-800 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white focus:border-orange-500 outline-none transition-colors"
              />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
               <p className="text-white font-bold text-sm leading-tight">{user?.name || 'Usuario'}</p>
               <p className="text-orange-500 text-xs font-bold uppercase">{user?.role || 'Rol'}</p>
            </div>
            
            {/* CAMPANA DE NOTIFICACIONES */}
            <div className="relative">
              <button onClick={() => setShowNotifs(!showNotifs)} className="relative p-2 hover:bg-zinc-800 rounded-xl transition-colors">
                <Bell className="w-5 h-5 text-zinc-400 hover:text-white"/>
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-zinc-900"></span>
                )}
              </button>

              {/* DROPDOWN NOTIFICACIONES */}
              {showNotifs && (
                <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-50 custom-scrollbar">
                  <div className="p-4 border-b border-zinc-800 bg-black/20 flex justify-between items-center sticky top-0 backdrop-blur-md">
                    <h3 className="font-bold text-sm text-white">Notificaciones</h3>
                    <span className="text-[10px] bg-orange-500/10 text-orange-500 px-2 py-1 rounded font-bold">{unreadCount} Nuevas</span>
                  </div>
                  <div className="divide-y divide-zinc-800/50">
                    {notifications.length === 0 && (
                      <div className="p-6 text-center text-zinc-500 text-xs font-bold">No hay avisos recientes.</div>
                    )}
                    {notifications.map(notif => (
                      <div 
                        key={notif.id} 
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-4 cursor-pointer transition-colors ${!notif.read ? 'bg-orange-500/5 hover:bg-orange-500/10' : 'hover:bg-zinc-800/50'}`}
                      >
                        <div className="flex items-start gap-3">
                          {!notif.read ? <span className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 shrink-0"></span> : <CheckCircle2 className="w-4 h-4 text-zinc-600 mt-0.5 shrink-0"/>}
                          <div>
                            <p className={`text-sm ${!notif.read ? 'text-white font-bold' : 'text-zinc-400'}`}>{notif.title}</p>
                            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{notif.message}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-hidden flex flex-col" onClick={() => showNotifs && setShowNotifs(false)}>
          {children}
        </main>
      </div>
    </div>
  );
}