import React, { useState, useEffect, useRef } from 'react';
import { Activity, UserCircle, Wrench, Search, Bell, LogOut, Menu, X, CheckCircle2, BarChart3, CalendarDays, Settings, BookOpen, MessageSquare, Inbox, DollarSign, Bot } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import useUIStore from '../store/useUIStore';
import useSettingsStore from '../store/useSettingsStore';
import { subscribeToNotifications, markNotificationAsRead } from '../features/notifications/services/notificationService';
import SettingsModal from '../features/settings/components/SettingsModal';
import packageJson from '../../package.json';

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
    if (window.Notification && Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const unsubscribe = subscribeToNotifications(user.role, user.name, (data) => {
      setNotifications(data);
      const unread = data.filter(n => !n.read).length;

      if (ipcRenderer) {
        ipcRenderer.send('update-badge-count', unread);
      }

      if (data.length > prevNotifCount.current && prevNotifCount.current !== 0) {
        const newNotif = data[0];
        
        if (notificationLevel !== 'none') {
          let shouldNotify = true;
          if (notificationLevel === 'important' && newNotif.priority !== 'high' && newNotif.priority !== 'critical') {
            shouldNotify = false;
          }
          
          if (shouldNotify) {
            try {
              const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
              audio.volume = 0.8;
              audio.play().catch(e => console.log("Navegador bloqueó el sonido", e));
            } catch(e){}

            if (window.Notification && Notification.permission === "granted") {
              new Notification(newNotif.title || 'Remex OS', {
                body: newNotif.message,
                icon: 'https://cdn-icons-png.flaticon.com/512/1000/1000086.png'
              });
            } else if (ipcRenderer) {
              ipcRenderer.send('show-native-notification', {
                title: newNotif.title,
                body: newNotif.message
              });
            }
          }
        }
      }
      prevNotifCount.current = data.length;
    });

    return () => unsubscribe();
  }, [user, notificationLevel]);

  const unreadCount = notifications.filter(n => !n.read).length;
  
  const unreadMessageCount = notifications.filter(n => !n.read && n.title.toLowerCase().includes('mensaje')).length;
  const hasTaskAlerts = notifications.some(n => !n.read && (n.title.toLowerCase().includes('tarea') || n.title.toLowerCase().includes('operacion')) && !n.title.toLowerCase().includes('mensaje'));
  const hasCrmAlerts = notifications.some(n => !n.read && (n.title.toLowerCase().includes('cliente') || n.title.toLowerCase().includes('crm')));

  const handleNotificationClick = async (notif) => {
    if (!notif.read) {
      await markNotificationAsRead(notif.id);
    }
  };

  const markAllAsRead = () => {
    notifications.forEach(n => {
      if (!n.read) markNotificationAsRead(n.id);
    });
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
          <div className="text-[10px] font-black text-zinc-600 uppercase mb-4 tracking-widest px-2 mt-2">Operaciones</div>
          
          <button onClick={() => setCurrentView('tasks')} className={`w-full flex items-center px-4 py-3 rounded-xl text-sm border transition-colors relative ${currentView === 'tasks' ? 'bg-orange-900/20 text-orange-400 border-orange-500/50' : 'border-transparent text-zinc-400 hover:bg-zinc-800'}`}>
            <Activity className="w-5 h-5 shrink-0"/> 
            {isSidebarOpen && <span className="ml-3 font-bold truncate">Motor de Tareas</span>}
            {hasTaskAlerts && <span className={`ml-auto w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)] ${!isSidebarOpen ? 'absolute top-2 right-2' : ''}`}></span>}
          </button>

          <button onClick={() => setCurrentView('inbox')} className={`w-full flex items-center px-4 py-3 rounded-xl text-sm border transition-colors relative ${currentView === 'inbox' ? 'bg-orange-900/20 text-orange-400 border-orange-500/50' : 'border-transparent text-zinc-400 hover:bg-zinc-800'}`}>
            <Inbox className="w-5 h-5 shrink-0"/> 
            {isSidebarOpen && <span className="ml-3 font-bold truncate">Centro de Mensajes</span>}
            
            {unreadMessageCount > 0 && (
              <span className={`ml-auto flex items-center justify-center min-w-[24px] h-6 px-2 bg-orange-500 text-black text-xs font-black rounded-full shadow-[0_0_15px_rgba(249,115,22,1)] animate-pulse ${!isSidebarOpen ? 'absolute -top-1 -right-1' : ''}`}>
                {unreadMessageCount}
              </span>
            )}
          </button>

          <button onClick={() => setCurrentView('bot')} className={`w-full flex items-center px-4 py-3 rounded-xl text-sm border transition-colors relative ${currentView === 'bot' ? 'bg-orange-900/20 text-orange-400 border-orange-500/50' : 'border-transparent text-zinc-400 hover:bg-zinc-800'}`}>
            <Bot className="w-5 h-5 shrink-0"/> 
            {isSidebarOpen && <span className="ml-3 font-bold truncate">Bot & IA Check-Oil</span>}
          </button>

          <button onClick={() => setCurrentView('crm')} className={`w-full flex items-center px-4 py-3 rounded-xl text-sm border transition-colors ${currentView === 'crm' ? 'bg-orange-900/20 text-orange-400 border-orange-500/50' : 'border-transparent text-zinc-400 hover:bg-zinc-800'}`}>
            <UserCircle className="w-5 h-5 shrink-0"/> 
            {isSidebarOpen && <span className="ml-3 font-bold truncate">CRM Operativo</span>}
            {hasCrmAlerts && <span className={`ml-auto w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)] ${!isSidebarOpen ? 'absolute top-2 right-2' : ''}`}></span>}
          </button>

          <button onClick={() => setCurrentView('calendar')} className={`w-full flex items-center px-4 py-3 rounded-xl text-sm border transition-colors ${currentView === 'calendar' ? 'bg-orange-900/20 text-orange-400 border-orange-500/50' : 'border-transparent text-zinc-400 hover:bg-zinc-800'}`}>
            <CalendarDays className="w-5 h-5 shrink-0"/> {isSidebarOpen && <span className="ml-3 font-bold truncate">Agenda y Rutas</span>}
          </button>
          
          <div className="text-[10px] font-black text-zinc-600 uppercase mb-4 mt-6 tracking-widest px-2">Gestión</div>

          {/* NUEVO BOTÓN: Finanzas y Riesgo */}
          <button onClick={() => setCurrentView('finances')} className={`w-full flex items-center px-4 py-3 rounded-xl text-sm border transition-colors ${currentView === 'finances' ? 'bg-emerald-900/20 text-emerald-400 border-emerald-500/50' : 'border-transparent text-zinc-400 hover:bg-zinc-800'}`}>
            <DollarSign className="w-5 h-5 shrink-0"/> {isSidebarOpen && <span className="ml-3 font-bold truncate">Finanzas y Riesgo</span>}
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
               {/* LECTURA AUTOMÁTICA DESDE PACKAGE.JSON */}
               <span className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
                 Versión {packageJson.version}
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
                  <Bell className={`w-6 h-6 ${unreadCount > 0 ? 'text-orange-500 animate-bounce' : 'text-zinc-400 hover:text-white'}`}/>
                  {unreadCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-zinc-900 shadow-[0_0_8px_rgba(239,68,68,1)] animate-ping"></span>
                  )}
                </button>

                {showNotifs && (
                  <div className="absolute right-0 top-full mt-4 w-[450px] max-h-[85vh] flex flex-col bg-zinc-950 border border-zinc-700 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] z-[100] overflow-hidden">
                    <div className="p-5 border-b border-zinc-800 bg-gradient-to-r from-zinc-900 to-zinc-950 flex justify-between items-center shrink-0">
                      <div className="flex items-center gap-2">
                        <Bell className="w-5 h-5 text-orange-500"/>
                        <h3 className="font-black text-base text-white">Avisos del Sistema</h3>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] bg-orange-500 text-black px-2 py-1 rounded-full font-black">{unreadCount} Nuevos</span>
                        <button onClick={markAllAsRead} className="text-xs text-zinc-500 hover:text-white font-bold transition-colors">Marcar todo leído</button>
                      </div>
                    </div>

                    <div className="overflow-y-auto custom-scrollbar flex-1 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-900/40 via-zinc-950 to-zinc-950 divide-y divide-zinc-800/50">
                      {notifications.length === 0 && (
                        <div className="p-12 text-center text-zinc-500 text-sm font-bold flex flex-col items-center gap-3">
                          <CheckCircle2 className="w-10 h-10 text-emerald-500/50" />
                          No tienes mensajes ni avisos pendientes.
                        </div>
                      )}
                      {notifications.map(notif => {
                        const isMessage = notif.title.toLowerCase().includes('mensaje');
                        return (
                          <div 
                            key={notif.id} 
                            onClick={() => handleNotificationClick(notif)}
                            className={`p-5 cursor-pointer transition-all hover:bg-zinc-800/50 group ${!notif.read ? 'bg-orange-500/5 border-l-4 border-l-orange-500' : 'border-l-4 border-l-transparent opacity-70'}`}
                          >
                            <div className="flex items-start gap-4">
                              <div className={`mt-1 p-2 rounded-xl shrink-0 ${isMessage ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                {isMessage ? <MessageSquare className="w-4 h-4"/> : <Activity className="w-4 h-4"/>}
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between items-start mb-1">
                                  <p className={`text-sm ${!notif.read ? 'text-white font-black' : 'text-zinc-400 font-bold'}`}>{notif.title}</p>
                                  {!notif.read && <span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,1)] shrink-0"></span>}
                                </div>
                                <p className={`text-sm leading-relaxed ${!notif.read ? 'text-zinc-300' : 'text-zinc-500'}`}>{notif.message}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
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