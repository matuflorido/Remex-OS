import React, { useState, useEffect, useRef } from 'react';
import { Activity, UserCircle, Wrench, Search, Bell, LogOut, Menu, X, CheckCircle2, BarChart3, CalendarDays, Settings, BookOpen } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import useUIStore from '../store/useUIStore';
import useSettingsStore from '../store/useSettingsStore';
import { subscribeToNotifications, markNotificationAsRead } from '../features/notifications/services/notificationService';
import SettingsModal from '../features/settings/components/SettingsModal';

const electron = window.require ? window.require('electron') : null;
const ipcRenderer = electron ? electron.ipcRenderer : null;

export default function MainLayout({ children }) {
  const { user, logout } = useAuthStore();
  const { currentView, setCurrentView, searchQuery, setSearchQuery } = useUIStore();
  const { notificationLevel } = useSettingsStore(); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); 
  const prevNotifCount = useRef(0);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToNotifications(user.role, (data) => {
      setNotifications(data);

      const unread = data.filter(n => !n.read).length;

      // Actualizar el globo en el ícono de Windows/Mac
      if (ipcRenderer) {
        ipcRenderer.send('update-badge-count', unread);
      }

      if (data.length > prevNotifCount.current && prevNotifCount.current !== 0) {
        const newNotif = data[0]; 
        
        if (notificationLevel !== 'none' && ipcRenderer) {
          let shouldNotify = true;
          if (notificationLevel === 'important' && newNotif.priority !== 'high' && newNotif.priority !== 'critical') {
            shouldNotify = false;
          }
          if (shouldNotify) {
            ipcRenderer.send('show-native-notification', {
              title: newNotif.title || 'Nuevo Aviso',
              body: newNotif.message || 'Tienes actualizaciones en Remex OS.'
            });
          }
        }
      }
      prevNotifCount.current = data.length; 
    });
    return () => unsubscribe();
  }, [user, notificationLevel]);

  const unreadCount = notifications.filter(n => !n.read).length;
  // Lógica para encender puntos rojos en el menú
  const hasTaskAlerts = notifications.some(n => !n.read && (n.title.toLowerCase().includes('tarea') || n.title.toLowerCase().includes('operacion')));
  const hasCrmAlerts = notifications.some(n => !n.read && (n.title.toLowerCase().includes('cliente') || n.title.toLowerCase().includes('crm')));

  const handleNotificationClick = async (notif) => {
    if (!notif.read) {
      await markNotificationAsRead(notif.id);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 font-mono text-slate-200 flex h-screen overflow-hidden">
      
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
            <Activity className="w-5 h-5 shrink-0"/> 
            {isSidebarOpen && <span className="ml-3 font-bold truncate">Motor de Tareas</span>}
            {hasTaskAlerts && <span className="ml-auto w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>}
          </button>

          <button onClick={() => setCurrentView('crm')} className={`w-full flex items-center px-4 py-3 rounded-xl text-sm border transition-colors ${currentView === 'crm' ? 'bg-orange-900/20 text-orange-400 border-orange-500/50' : 'border-transparent text-zinc-400 hover:bg-zinc-800'}`}>
            <UserCircle className="w-5 h-5 shrink-0"/> 
            {isSidebarOpen && <span className="ml-3 font-bold truncate">CRM Operativo</span>}
            {hasCrmAlerts && <span className="ml-auto w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>}
          </button>

          <button onClick={() => setCurrentView('calendar')} className={`w-full flex items-center px-4 py-3 rounded-xl text-sm border transition-colors ${currentView === 'calendar' ? 'bg-orange-900/20 text-orange-400 border-orange-500/50' : 'border-transparent text-zinc-400 hover:bg-zinc-800'}`}>
            <CalendarDays className="w-5 h-5 shrink-0"/> {isSidebarOpen && <span className="ml-3 font-bold truncate">Agenda y Rutas</span>}
          </button>
          
          <button onClick={() => setCurrentView('reports')} className={`w-full flex items-center px-4 py-3 rounded-xl text-sm border transition-colors ${currentView === 'reports' ? 'bg-orange-900/20 text-orange-400 border-orange-500/50' : 'border-transparent text-zinc-400 hover:bg-zinc-800'}`}>
            <BarChart3 className="w-5 h-5 shrink-0"/> {isSidebarOpen && <span className="ml-3 font-bold truncate">Estadísticas</span>}
          </button>
          
          <button onClick={() => setCurrentView('admin')} className={`w-full flex items-center px-4 py-3 rounded-xl text-sm border transition-colors ${currentView === 'admin' ? 'bg-orange-900/20 text-orange-400 border-orange-500/50' : 'border-transparent text-zinc-400 hover:bg-zinc-800'}`}>
            <Wrench className="w-5 h-5 shrink-0"/> {isSidebarOpen && <span className="ml-3 font-bold truncate">Administración</span>}
          </button>
          
          <div className="my-4 border-t border-zinc-800/50"></div>
          
          <button onClick={() => setCurrentView('manual')} className={`w-full flex items-center px-4 py-3 rounded-xl text-sm border transition-colors ${currentView === 'manual' ? 'bg-orange-900/20 text-orange-400 border-orange-500/50' : 'border-transparent text-zinc-400 hover:bg-zinc-800'}`}>
            <BookOpen className="w-5 h-5 shrink-0"/> {isSidebarOpen && <span className="ml-3 font-bold truncate">Manual de Uso</span>}
          </button>
        </nav>

        <div className="p-4 border-t border-zinc-800 bg-black/40">
           {isSidebarOpen && (
             <div className="mb-4 text-center">
               <span className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
                 Versión 1.6.2
               </span>
             </div>
           )}
           <button onClick={logout} className="w-full flex items-center justify-center py-3 rounded-xl text-sm bg-red-950/40 text-red-500 border border-red-900/50 hover:bg-red-600 hover:text-white transition-colors">
             <LogOut className="w-5 h-5" /> 
             {isSidebarOpen && <span className="ml-2 font-bold">CERRAR SESIÓN</span>}
           </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 bg-zinc-950 relative">
        <header className="h-[80px] bg-zinc-900/80 border-b border-zinc-800 px-6 flex items-center justify-between shrink-0 z-50">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-full max-w-md hidden md:block">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar tarea, cliente..." 
                className="w-full bg-black border border-zinc-800 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white focus:border-orange-500 outline-none transition-colors"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="text-right hidden sm:block">
               <p className="text-white font-bold text-sm leading-tight">{user?.name || 'Usuario'}</p>
               <p className="text-orange-500 text-xs font-bold uppercase">{user?.role || 'Rol'}</p>
            </div>
            
            <div className="flex items-center gap-2 border-l border-zinc-800 pl-4 sm:pl-6">
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-400 hover:text-white"
                title="Ajustes de Notificaciones"
              >
                <Settings className="w-5 h-5"/>
              </button>

              <div className="relative">
                <button onClick={() => setShowNotifs(!showNotifs)} className="relative p-2 hover:bg-zinc-800 rounded-xl transition-colors">
                  <Bell className="w-5 h-5 text-zinc-400 hover:text-white"/>
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-zinc-900 shadow-[0_0_8px_rgba(249,115,22,0.8)]"></span>
                  )}
                </button>
                {showNotifs && (
                  <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-[100] custom-scrollbar">
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
                            {!notif.read ? <span className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(249,115,22,0.8)]"></span> : <CheckCircle2 className="w-4 h-4 text-zinc-600 mt-0.5 shrink-0"/>}
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
          </div>
        </header>

        <main className="flex-1 overflow-hidden flex flex-col" onClick={() => showNotifs && setShowNotifs(false)}>
          {children}
        </main>
      </div>
      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
    </div>
  );
}