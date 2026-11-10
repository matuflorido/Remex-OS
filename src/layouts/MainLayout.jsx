import React, { useState, useEffect, useRef } from 'react';
import { Activity, UserCircle, Wrench, Search, Bell, LogOut, Menu, X, CheckCircle2, BarChart3, CalendarDays, Settings, BookOpen, MessageSquare, Inbox, DollarSign, Bot, Scale, Award, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import useUIStore from '../store/useUIStore';
import useSettingsStore from '../store/useSettingsStore';
import { subscribeToNotifications, markNotificationAsRead } from '../features/notifications/services/notificationService';
import { canAccessPartnersSection } from '../features/partners/services/partnerGovernanceService';
import SettingsModal from '../features/settings/components/SettingsModal';
import UpdateModal from '../Components/UpdateModal';
import packageJson from '../../package.json';

const electron = window.require ? window.require('electron') : null;
const ipcRenderer = electron ? electron.ipcRenderer : null;

export default function MainLayout({ children }) {
  const { user, logout } = useAuthStore();
  const { currentView, setCurrentView, searchQuery, setSearchQuery } = useUIStore();
  const { notificationLevel } = useSettingsStore();

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    try {
      const saved = localStorage.getItem('remex_sidebar_open');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });
  const [hoverHint, setHoverHint] = useState(null); // { title, badge, desc, top, left }
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('remex_sidebar_open', String(next));
      } catch {}
      return next;
    });
  };

  const handleNavHoverEnter = (e, title, desc, badge = '') => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverHint({
      title,
      badge,
      desc,
      top: Math.max(12, Math.min(window.innerHeight - 110, rect.top - 4)),
      left: rect.right + 12
    });
  };

  const handleNavHoverLeave = () => {
    setHoverHint(null);
  };

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
      
      {hoverHint && (
        <div
          style={{ top: `${hoverHint.top}px`, left: `${hoverHint.left}px` }}
          className="fixed z-[150] w-72 pointer-events-none bg-zinc-950/95 backdrop-blur-md border border-orange-500/50 rounded-2xl p-3.5 shadow-[0_15px_40px_rgba(0,0,0,0.85)] animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-black text-white">{hoverHint.title}</span>
            {hoverHint.badge && (
              <span className="px-2 py-0.5 text-[9px] font-black rounded bg-amber-400 text-black uppercase">
                {hoverHint.badge}
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-300 leading-relaxed font-sans">{hoverHint.desc}</p>
        </div>
      )}

      <aside className={`${isSidebarOpen ? 'w-56' : 'w-[72px]'} transition-all duration-300 bg-zinc-900/95 border-r border-zinc-800 flex-shrink-0 flex flex-col z-20 relative`}>
        {/* Botón flotante lateral para extender o cerrar la barra en cualquier momento */}
        <button
          onClick={toggleSidebar}
          title={isSidebarOpen ? 'Cerrar / Contraer barra lateral' : 'Extender barra lateral'}
          className="absolute -right-3.5 top-[68px] z-40 w-7 h-7 rounded-full bg-zinc-900 border border-orange-500/50 text-orange-400 hover:bg-orange-500 hover:text-black flex items-center justify-center shadow-lg transition-all"
        >
          {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        <div className="p-3.5 bg-black/40 flex items-center justify-between border-b border-zinc-800 h-[76px]">
          {isSidebarOpen ? (
            <div>
              <h1 className="font-black text-white text-lg tracking-tight leading-none">REMEX</h1>
              <p className="text-[10px] text-orange-500 font-bold uppercase tracking-widest mt-0.5">Work-OS</p>
            </div>
          ) : (
            <h1 className="font-black text-white text-base mx-auto">RX</h1>
          )}
          <button
            onClick={toggleSidebar}
            title={isSidebarOpen ? 'Contraer barra izquierda' : 'Extender barra izquierda'}
            className="p-1.5 rounded-lg bg-zinc-800/70 text-zinc-300 hover:bg-orange-500 hover:text-black transition-colors"
          >
            {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4 mx-auto" />}
          </button>
        </div>

        <nav className="flex-1 p-2.5 space-y-1.5 overflow-y-auto custom-scrollbar">
          {isSidebarOpen && (
            <div className="text-[10px] font-black text-zinc-500 uppercase mb-2 tracking-widest px-2 mt-1">
              Operaciones
            </div>
          )}

          <button
            onClick={() => setCurrentView('tasks')}
            onMouseEnter={(e) =>
              handleNavHoverEnter(
                e,
                '⚡ Motor de Tareas Operativas',
                'Tablero de tareas diarias, asignaciones por responsable, prioridades y seguimiento de ejecución en sucursales.'
              )
            }
            onMouseLeave={handleNavHoverLeave}
            className={`w-full flex items-center ${isSidebarOpen ? 'px-3 py-2.5' : 'justify-center py-2.5'} rounded-xl text-xs border transition-colors relative ${
              currentView === 'tasks'
                ? 'bg-orange-900/25 text-orange-400 border-orange-500/50'
                : 'border-transparent text-zinc-400 hover:bg-zinc-800 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4 shrink-0" />
            {isSidebarOpen && <span className="ml-2.5 font-bold whitespace-nowrap">Tareas</span>}
            {hasTaskAlerts && (
              <span className={`ml-auto w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)] ${!isSidebarOpen ? 'absolute top-1.5 right-1.5' : ''}`} />
            )}
          </button>

          <button
            onClick={() => setCurrentView('inbox')}
            onMouseEnter={(e) =>
              handleNavHoverEnter(
                e,
                '💬 Centro de Mensajes Internos',
                'Comunicaciones internas del equipo, avisos entre sucursales y notificaciones directas.'
              )
            }
            onMouseLeave={handleNavHoverLeave}
            className={`w-full flex items-center ${isSidebarOpen ? 'px-3 py-2.5' : 'justify-center py-2.5'} rounded-xl text-xs border transition-colors relative ${
              currentView === 'inbox'
                ? 'bg-orange-900/25 text-orange-400 border-orange-500/50'
                : 'border-transparent text-zinc-400 hover:bg-zinc-800 hover:text-white'
            }`}
          >
            <Inbox className="w-4 h-4 shrink-0" />
            {isSidebarOpen && <span className="ml-2.5 font-bold whitespace-nowrap">Mensajes</span>}
            {unreadMessageCount > 0 && (
              <span className={`ml-auto flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-orange-500 text-black text-[10px] font-black rounded-full shadow-[0_0_12px_rgba(249,115,22,1)] animate-pulse ${!isSidebarOpen ? 'absolute -top-1 -right-1' : ''}`}>
                {unreadMessageCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setCurrentView('bot')}
            onMouseEnter={(e) =>
              handleNavHoverEnter(
                e,
                '🤖 Bot & IA Check-Oil (Recepción General)',
                'Supervisión general del bot de recepción: charlas activas, motivos de no derivación, auto-pausa humana y reglas aprendidas.'
              )
            }
            onMouseLeave={handleNavHoverLeave}
            className={`w-full flex items-center ${isSidebarOpen ? 'px-3 py-2.5' : 'justify-center py-2.5'} rounded-xl text-xs border transition-colors relative ${
              currentView === 'bot'
                ? 'bg-orange-900/25 text-orange-400 border-orange-500/50'
                : 'border-transparent text-zinc-400 hover:bg-zinc-800 hover:text-white'
            }`}
          >
            <Bot className="w-4 h-4 shrink-0" />
            {isSidebarOpen && <span className="ml-2.5 font-bold whitespace-nowrap">Bot Check-Oil</span>}
          </button>

          <button
            onClick={() => setCurrentView('bot_quotes')}
            onMouseEnter={(e) =>
              handleNavHoverEnter(
                e,
                '🧾 Presupuestos, Filtros, Aceites y Demoras',
                'Módulo exclusivo de cotizaciones: analiza lo enviado por cada sucursal, qué filtros y aceite cotizan para cada modelo, diferencias de precios entre sucursales y demoras según el horario.',
                'PILOTO CENTRO'
              )
            }
            onMouseLeave={handleNavHoverLeave}
            className={`w-full flex items-center ${isSidebarOpen ? 'px-3 py-2.5' : 'justify-center py-2.5'} rounded-xl text-xs border transition-colors relative ${
              currentView === 'bot_quotes'
                ? 'bg-amber-900/35 text-amber-300 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                : 'bg-orange-950/20 border-orange-500/30 text-orange-300 hover:bg-orange-900/30'
            }`}
          >
            <Scale className="w-4 h-4 shrink-0 text-amber-400" />
            {isSidebarOpen && (
              <>
                <span className="ml-2.5 font-black whitespace-nowrap">Presupuestos</span>
                <span className="ml-auto px-1.5 py-0.5 text-[9px] font-black rounded bg-amber-400 text-black uppercase">
                  Centro
                </span>
              </>
            )}
          </button>

          <button
            onClick={() => setCurrentView('crm')}
            onMouseEnter={(e) =>
              handleNavHoverEnter(
                e,
                '👥 CRM Operativo de Clientes',
                'Base de clientes, seguimiento comercial, historial de vehículos y oportunidades activas.'
              )
            }
            onMouseLeave={handleNavHoverLeave}
            className={`w-full flex items-center ${isSidebarOpen ? 'px-3 py-2.5' : 'justify-center py-2.5'} rounded-xl text-xs border transition-colors relative ${
              currentView === 'crm'
                ? 'bg-orange-900/25 text-orange-400 border-orange-500/50'
                : 'border-transparent text-zinc-400 hover:bg-zinc-800 hover:text-white'
            }`}
          >
            <UserCircle className="w-4 h-4 shrink-0" />
            {isSidebarOpen && <span className="ml-2.5 font-bold whitespace-nowrap">CRM Clientes</span>}
            {hasCrmAlerts && (
              <span className={`ml-auto w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)] ${!isSidebarOpen ? 'absolute top-1.5 right-1.5' : ''}`} />
            )}
          </button>

          <button
            onClick={() => setCurrentView('calendar')}
            onMouseEnter={(e) =>
              handleNavHoverEnter(
                e,
                '📅 Agenda y Rutas',
                'Calendario de turnos, vencimientos, visitas a sucursales y planificación semanal.'
              )
            }
            onMouseLeave={handleNavHoverLeave}
            className={`w-full flex items-center ${isSidebarOpen ? 'px-3 py-2.5' : 'justify-center py-2.5'} rounded-xl text-xs border transition-colors ${
              currentView === 'calendar'
                ? 'bg-orange-900/25 text-orange-400 border-orange-500/50'
                : 'border-transparent text-zinc-400 hover:bg-zinc-800 hover:text-white'
            }`}
          >
            <CalendarDays className="w-4 h-4 shrink-0" />
            {isSidebarOpen && <span className="ml-2.5 font-bold whitespace-nowrap">Agenda</span>}
          </button>

          {isSidebarOpen && (
            <div className="text-[10px] font-black text-zinc-500 uppercase mb-2 mt-4 tracking-widest px-2">
              Gestión
            </div>
          )}

          {/* SECCIÓN EXCLUSIVA SOCIOS: MARTÍN, ALEJANDRO Y JUAN PABLO */}
          {canAccessPartnersSection(user) && (
            <button
              onClick={() => setCurrentView('partners')}
              onMouseEnter={(e) =>
                handleNavHoverEnter(
                  e,
                  '🏛️ Directorio Exclusivo de Socios (Martín, Alejandro y Juan Pablo)',
                  'Espacio privado para proponer ideas, normas o reglas operativas. Requiere voto unánime 3/3 para convertirse en Regla Firme.',
                  'UNANIMIDAD 3/3'
                )
              }
              onMouseLeave={handleNavHoverLeave}
              className={`w-full flex items-center ${isSidebarOpen ? 'px-3 py-2.5' : 'justify-center py-2.5'} rounded-xl text-xs border transition-colors relative ${
                currentView === 'partners'
                  ? 'bg-amber-900/35 text-amber-300 border-amber-400/70 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                  : 'bg-amber-950/20 border-amber-500/35 text-amber-300 hover:bg-amber-900/30'
              }`}
            >
              <Award className="w-4 h-4 shrink-0 text-amber-400" />
              {isSidebarOpen && (
                <>
                  <span className="ml-2.5 font-black whitespace-nowrap">Socios</span>
                  <span className="ml-auto px-1.5 py-0.5 text-[9px] font-black rounded bg-amber-400 text-black uppercase">
                    3/3
                  </span>
                </>
              )}
            </button>
          )}

          <button
            onClick={() => setCurrentView('finances')}
            onMouseEnter={(e) =>
              handleNavHoverEnter(
                e,
                '💲 Finanzas y Riesgo',
                'Control financiero, flujo de caja, indicadores de riesgo y rentabilidad operativa.'
              )
            }
            onMouseLeave={handleNavHoverLeave}
            className={`w-full flex items-center ${isSidebarOpen ? 'px-3 py-2.5' : 'justify-center py-2.5'} rounded-xl text-xs border transition-colors ${
              currentView === 'finances'
                ? 'bg-emerald-900/25 text-emerald-400 border-emerald-500/50'
                : 'border-transparent text-zinc-400 hover:bg-zinc-800 hover:text-white'
            }`}
          >
            <DollarSign className="w-4 h-4 shrink-0" />
            {isSidebarOpen && <span className="ml-2.5 font-bold whitespace-nowrap">Finanzas</span>}
          </button>

          <button
            onClick={() => setCurrentView('reports')}
            onMouseEnter={(e) =>
              handleNavHoverEnter(
                e,
                '📊 Estadísticas Generales',
                'Métricas de rendimiento global de la empresa, cumplimiento de tareas y evolución por área.'
              )
            }
            onMouseLeave={handleNavHoverLeave}
            className={`w-full flex items-center ${isSidebarOpen ? 'px-3 py-2.5' : 'justify-center py-2.5'} rounded-xl text-xs border transition-colors ${
              currentView === 'reports'
                ? 'bg-orange-900/25 text-orange-400 border-orange-500/50'
                : 'border-transparent text-zinc-400 hover:bg-zinc-800 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4 shrink-0" />
            {isSidebarOpen && <span className="ml-2.5 font-bold whitespace-nowrap">Estadísticas</span>}
          </button>

          <button
            onClick={() => setCurrentView('admin')}
            onMouseEnter={(e) =>
              handleNavHoverEnter(
                e,
                '🛠️ Administración y Usuarios',
                'Gestión de usuarios, permisos, sucursales y parámetros del sistema Remex OS.'
              )
            }
            onMouseLeave={handleNavHoverLeave}
            className={`w-full flex items-center ${isSidebarOpen ? 'px-3 py-2.5' : 'justify-center py-2.5'} rounded-xl text-xs border transition-colors ${
              currentView === 'admin'
                ? 'bg-orange-900/25 text-orange-400 border-orange-500/50'
                : 'border-transparent text-zinc-400 hover:bg-zinc-800 hover:text-white'
            }`}
          >
            <Wrench className="w-4 h-4 shrink-0" />
            {isSidebarOpen && <span className="ml-2.5 font-bold whitespace-nowrap">Admin</span>}
          </button>

          <div className="my-2 border-t border-zinc-800/60" />

          <button
            onClick={() => setCurrentView('manual')}
            onMouseEnter={(e) =>
              handleNavHoverEnter(
                e,
                '📖 Manual de Uso',
                'Guía paso a paso sobre cómo utilizar cada módulo de Remex OS y el sistema Check-Oil.'
              )
            }
            onMouseLeave={handleNavHoverLeave}
            className={`w-full flex items-center ${isSidebarOpen ? 'px-3 py-2.5' : 'justify-center py-2.5'} rounded-xl text-xs border transition-colors ${
              currentView === 'manual'
                ? 'bg-orange-900/25 text-orange-400 border-orange-500/50'
                : 'border-transparent text-zinc-400 hover:bg-zinc-800 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            {isSidebarOpen && <span className="ml-2.5 font-bold whitespace-nowrap">Manual</span>}
          </button>
        </nav>

        <div className="p-3 border-t border-zinc-800 bg-black/40 space-y-2">
          <button
            onClick={toggleSidebar}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white hover:border-zinc-700 transition-colors"
            title={isSidebarOpen ? 'Contraer menú lateral para ganar espacio' : 'Extender menú lateral'}
          >
            {isSidebarOpen ? (
              <>
                <ChevronLeft className="w-3.5 h-3.5 text-orange-500" />
                <span>Contraer Menú</span>
              </>
            ) : (
              <ChevronRight className="w-4 h-4 text-orange-500" />
            )}
          </button>

          {isSidebarOpen && (
            <div className="text-center">
              <span className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase bg-zinc-900 px-3 py-0.5 rounded-full border border-zinc-800">
                v{packageJson.version}
              </span>
            </div>
          )}

          <button
            onClick={logout}
            onMouseEnter={(e) =>
              handleNavHoverEnter(e, '🚪 Cerrar Sesión', 'Salir de tu cuenta actual en Remex Work-OS.')
            }
            onMouseLeave={handleNavHoverLeave}
            className="w-full flex items-center justify-center py-2.5 rounded-xl text-xs bg-red-950/40 text-red-500 border border-red-900/50 hover:bg-red-600 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {isSidebarOpen && <span className="ml-2 font-bold">SALIR</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 bg-zinc-950 relative">
        <header className="h-[76px] bg-zinc-900/80 border-b border-zinc-800 px-6 flex items-center justify-between shrink-0 z-50">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative w-full max-w-xs hidden md:block">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar tarea, cliente..." 
                className="w-full bg-black border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:border-orange-500 outline-none transition-colors"
              />
            </div>

            <button
              onClick={() => setCurrentView('bot_quotes')}
              className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-2 border transition-all shrink-0 ${
                currentView === 'bot_quotes'
                  ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                  : 'bg-amber-950/40 text-amber-300 border-amber-500/40 hover:bg-amber-900/50'
              }`}
              title="Módulo exclusivo de Presupuestos: compara qué filtros y aceites cotiza cada sucursal por modelo, diferencias de precios y demoras por franja horaria"
            >
              <Scale className="w-4 h-4 text-orange-400" />
              <span>🧾 Presupuestos (Centro)</span>
            </button>

            {canAccessPartnersSection(user) && (
              <button
                onClick={() => setCurrentView('partners')}
                className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-2 border transition-all shrink-0 ${
                  currentView === 'partners'
                    ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                    : 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/50'
                }`}
                title="Directorio exclusivo para Martín, Alejandro y Juan Pablo: votación unánime 3/3 para aprobar normas y reglas firmes"
              >
                <Award className="w-4 h-4 text-emerald-400" />
                <span>🏛️ Socios (3/3)</span>
              </button>
            )}
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
      <UpdateModal />
    </div>
  );
}