import React, { useState, useEffect, useMemo } from 'react';
import { Inbox, Search, Calendar, Check, CheckCheck, MessageSquare, ExternalLink, Filter } from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';
import useUIStore from '../../../store/useUIStore';
import { subscribeToTasks } from '../../tasks/services/taskService';
import HelpTooltip from '../../../components/ui/HelpTooltip';

export default function InboxBoard() {
  const { user } = useAuthStore();
  
  // AQUÍ: Cambiamos setSearchQuery por setActiveTaskId
  const { setCurrentView, setActiveTaskId } = useUIStore();
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filtros
  const [filterType, setFilterType] = useState('unread'); // 'all', 'unread', 'received', 'sent'
  const [localSearch, setLocalSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    const unsub = subscribeToTasks((data) => {
      setTasks(data);
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  // Extraer y aplanar todos los mensajes de todas las tareas
  const allMessages = useMemo(() => {
    let msgs = [];
    tasks.forEach(task => {
      if (task.history) {
        task.history.forEach(h => {
          if (h.isMessage && (h.targetUser === user?.name || h.user === user?.name)) {
            msgs.push({
              ...h,
              taskId: task.id,
              taskTitle: task.title,
              isSentByMe: h.user === user?.name,
              timestamp: new Date(`${h.date}T${h.time || '00:00'}`).getTime()
            });
          }
        });
      }
    });
    return msgs.sort((a, b) => b.timestamp - a.timestamp);
  }, [tasks, user?.name]);

  // Aplicar filtros
  const filteredMessages = useMemo(() => {
    return allMessages.filter(msg => {
      if (filterType === 'unread' && (msg.isSentByMe || msg.status === 'read')) return false;
      if (filterType === 'received' && msg.isSentByMe) return false;
      if (filterType === 'sent' && !msg.isSentByMe) return false;
      if (dateFilter && msg.date !== dateFilter) return false;

      if (localSearch) {
        const q = localSearch.toLowerCase();
        const matchesComment = msg.comment.toLowerCase().includes(q);
        const matchesUser = msg.user.toLowerCase().includes(q);
        const matchesTarget = (msg.targetUser || '').toLowerCase().includes(q);
        const matchesTask = msg.taskId.toLowerCase().includes(q);
        if (!matchesComment && !matchesUser && !matchesTarget && !matchesTask) return false;
      }

      return true;
    });
  }, [allMessages, filterType, localSearch, dateFilter]);

  // AQUÍ: Nueva función para saltar directo a la tarea limpia
  const handleGoToTask = (taskId) => {
    setActiveTaskId(taskId); // Le pasamos la orden silenciosa de abrir la tarea
    setCurrentView('tasks'); // Saltamos al Tablero
  };

  return (
    <div className="flex-1 p-6 lg:p-8 overflow-y-auto custom-scrollbar bg-zinc-950 flex flex-col h-full">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 shrink-0">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <Inbox className="w-7 h-7 text-orange-500" /> 
            Centro de Mensajes
            <HelpTooltip text="Aquí se centralizan todos los chats de todas las tareas. Puedes buscar palabras clave o saltar directo a la tarea para responder. (Manual, Cap 2)" />
          </h2>
          <p className="text-sm text-zinc-500 mt-1">Supervisa, filtra y analiza la comunicación interna.</p>
        </div>
      </div>

      {/* BARRA DE FILTROS */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-6 flex flex-col xl:flex-row gap-4 shrink-0 shadow-lg">
        
        <div className="flex bg-black p-1 rounded-xl border border-zinc-800 shrink-0 w-fit">
          <button onClick={() => setFilterType('unread')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filterType === 'unread' ? 'bg-orange-600 text-black shadow-md' : 'text-zinc-500 hover:text-white'}`}>
            No Leídos
          </button>
          <button onClick={() => setFilterType('all')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filterType === 'all' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-white'}`}>
            Todos
          </button>
          <button onClick={() => setFilterType('received')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filterType === 'received' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-white'}`}>
            Recibidos
          </button>
          <button onClick={() => setFilterType('sent')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filterType === 'sent' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-white'}`}>
            Enviados
          </button>
        </div>

        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input 
            type="text" 
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Buscar en mensajes, personas o tareas..." 
            className="w-full bg-black border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-orange-500 outline-none transition-colors"
          />
        </div>

        <div className="relative shrink-0 w-full xl:w-48">
          <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input 
            type="date" 
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full bg-black border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-orange-500 outline-none color-scheme-dark transition-colors"
          />
        </div>
      </div>

      {/* LISTA DE MENSAJES */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-orange-500 font-bold">Cargando mensajes...</div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500">
            <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
            <p className="font-bold text-lg text-zinc-400">Bandeja Limpia</p>
            <p className="text-sm mt-1">No se encontraron mensajes con estos filtros.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {filteredMessages.map((msg, idx) => (
              <div key={idx} className={`p-5 flex flex-col md:flex-row gap-5 transition-colors hover:bg-zinc-800/30 ${!msg.isSentByMe && msg.status !== 'read' ? 'bg-orange-500/5' : ''}`}>
                
                <div className="w-full md:w-48 shrink-0 flex flex-col gap-1">
                  <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">{msg.date} - {msg.time}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0 ${msg.isSentByMe ? 'bg-zinc-800 text-zinc-400' : 'bg-orange-500/20 text-orange-500'}`}>
                      {msg.user.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-sm font-black text-white truncate">{msg.user}</span>
                      <span className="text-[10px] text-zinc-500 font-bold flex items-center gap-1">
                        Para: {msg.targetUser}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-center">
                  {msg.replyTo && (
                    <div className="bg-black/30 p-2 rounded-lg mb-2 text-xs border-l-2 border-zinc-700 text-zinc-500">
                      <b>{msg.replyTo.user}:</b> {msg.replyTo.comment}
                    </div>
                  )}
                  <p className={`text-sm leading-relaxed ${!msg.isSentByMe && msg.status !== 'read' ? 'text-white font-medium' : 'text-zinc-300'}`}>
                    {msg.comment}
                  </p>
                </div>

                <div className="w-full md:w-56 shrink-0 flex flex-col items-end justify-center gap-3 border-t md:border-t-0 md:border-l border-zinc-800/50 pt-4 md:pt-0 md:pl-5">
                  {msg.isSentByMe && (
                    <div className="flex items-center gap-1.5 text-xs font-bold bg-black px-2 py-1 rounded-md border border-zinc-800">
                      {msg.status === 'read' ? <CheckCheck className="w-4 h-4 text-blue-500"/> : <Check className="w-4 h-4 text-zinc-500"/>}
                      <span className={msg.status === 'read' ? 'text-blue-500' : 'text-zinc-500'}>
                        {msg.status === 'read' ? 'Leído' : 'Enviado'}
                      </span>
                    </div>
                  )}

                  <button 
                    onClick={() => handleGoToTask(msg.taskId)}
                    className="w-full bg-zinc-800 hover:bg-orange-600 text-zinc-300 hover:text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors group"
                  >
                    <div className="flex flex-col items-start overflow-hidden">
                      <span className="text-[10px] uppercase text-zinc-500 group-hover:text-orange-200">Ir a Tarea</span>
                      <span className="truncate w-full text-left">{msg.taskId}</span>
                    </div>
                    <ExternalLink className="w-4 h-4 shrink-0 opacity-50 group-hover:opacity-100"/>
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}