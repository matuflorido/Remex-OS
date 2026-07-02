import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, 
  MapPin, Phone, Truck, Clock, CalendarDays, Trash2
} from 'lucide-react';
import { subscribeToEvents, deleteEventFromDb } from '../services/calendarService';
import CreateEventModal from './CreateEventModal';

export default function CalendarBoard() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDateForModal, setSelectedDateForModal] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeToEvents((data) => {
      setEvents(data);
    });
    return () => unsubscribe();
  }, []);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const getEventsForDay = (day) => {
    // Formatear YYYY-MM-DD
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr);
  };

  const handleOpenModal = (day = null) => {
    if (day) {
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      setSelectedDateForModal(dateStr);
    } else {
      setSelectedDateForModal(null);
    }
    setIsModalOpen(true);
  };

  const handleDeleteEvent = async (e, eventId) => {
    e.stopPropagation();
    if (window.confirm("¿Seguro que deseas eliminar este evento?")) {
      await deleteEventFromDb(eventId);
    }
  };

  return (
    <div className="flex-1 p-6 overflow-hidden flex flex-col h-full bg-zinc-950">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <CalendarDays className="w-7 h-7 text-orange-500" />
            Agenda y Rutas
          </h2>
          <p className="text-sm text-zinc-500 mt-1">Planifica rutas logísticas y recordatorios de proveedores.</p>
        </div>
        <div className="flex gap-4">
          <button onClick={() => handleOpenModal()} className="bg-orange-600 hover:bg-orange-500 text-black font-black px-6 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-all hover:scale-105">
            <Plus className="w-4 h-4"/> PROGRAMAR EVENTO
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        
        {}
        <div className="w-full lg:w-80 bg-zinc-900 border border-zinc-800 rounded-3xl p-5 flex flex-col shrink-0 shadow-xl">
          <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-4">Filtro Logístico</h3>
          <div className="grid grid-cols-2 gap-2 mb-8">
            {['Línea Sur', 'Valle', 'Centro', 'Nacional'].map(zona => (
              <div key={zona} className="flex items-center justify-center gap-2 bg-black/50 border border-zinc-800 p-2.5 rounded-xl cursor-pointer hover:border-orange-500/50 hover:bg-orange-500/5 transition-all">
                <MapPin className="w-3.5 h-3.5 text-orange-500"/>
                <span className="text-xs font-bold text-zinc-300">{zona}</span>
              </div>
            ))}
          </div>

          <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-4">Próximos Días</h3>
          <div className="space-y-3 overflow-y-auto custom-scrollbar flex-1 pr-2">
             {events.length === 0 && <p className="text-zinc-600 text-sm font-bold text-center mt-4">Sin eventos programados</p>}
             
             {/* Mostramos los primeros 5 eventos próximos ordenados por fecha */}
             {events.sort((a,b) => new Date(a.date) - new Date(b.date)).slice(0,5).map(e => (
               <div key={e.id} className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl hover:border-zinc-700 transition-colors group relative cursor-pointer">
                 <div className="flex justify-between items-start mb-2">
                   <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider">
                     {e.type === 'ruta' ? <Truck className="w-3 h-3 text-emerald-500"/> : <Phone className="w-3 h-3 text-blue-500"/>}
                     <span className={e.type === 'ruta' ? 'text-emerald-500' : 'text-blue-500'}>
                       {e.type === 'ruta' ? 'RUTA LOGÍSTICA' : 'LLAMADA'}
                     </span>
                   </div>
                   <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-bold truncate max-w-[80px]">{e.area}</span>
                 </div>
                 <p className="text-white text-sm font-bold leading-tight group-hover:text-orange-400 transition-colors pr-6">{e.title}</p>
                 <div className="flex items-center gap-2 mt-2 text-xs text-zinc-500 font-bold">
                    <Clock className="w-3 h-3"/> {e.date}
                 </div>
                 <button onClick={(ev) => handleDeleteEvent(ev, e.id)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-2 text-zinc-600 hover:text-red-500 transition-all bg-zinc-900 rounded-lg">
                   <Trash2 className="w-4 h-4"/>
                 </button>
               </div>
             ))}
          </div>
        </div>

        {}
        <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-3xl flex flex-col overflow-hidden shadow-xl">
          
          <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/80">
            <h3 className="text-2xl font-black text-white capitalize">{monthNames[currentDate.getMonth()]} <span className="text-orange-500">{currentDate.getFullYear()}</span></h3>
            <div className="flex gap-2">
              <button onClick={prevMonth} className="p-2.5 bg-zinc-800 hover:bg-zinc-700 hover:text-white rounded-xl text-zinc-400 transition-colors"><ChevronLeft className="w-5 h-5"/></button>
              <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl text-sm transition-colors">HOY</button>
              <button onClick={nextMonth} className="p-2.5 bg-zinc-800 hover:bg-zinc-700 hover:text-white rounded-xl text-zinc-400 transition-colors"><ChevronRight className="w-5 h-5"/></button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-px bg-zinc-800 border-b border-zinc-800">
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
              <div key={day} className="bg-zinc-950 p-3 text-center text-xs font-black text-zinc-500 uppercase tracking-widest">{day}</div>
            ))}
          </div>

          <div className="flex-1 grid grid-cols-7 gap-px bg-zinc-800 overflow-y-auto custom-scrollbar">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-zinc-900/40 min-h-[120px]"></div>
            ))}
            
            {}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEvents = getEventsForDay(day);
              const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();

              return (
                <div key={day} className={`bg-zinc-950 min-h-[120px] p-2 hover:bg-zinc-900 transition-colors group relative flex flex-col ${isToday ? 'bg-orange-950/10' : ''}`}>
                  
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-sm font-bold w-8 h-8 flex items-center justify-center rounded-full ${isToday ? 'bg-orange-500 text-black shadow-[0_0_15px_rgba(249,115,22,0.4)]' : 'text-zinc-400 group-hover:text-white'}`}>
                      {day}
                    </span>
                    <button onClick={() => handleOpenModal(day)} className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-orange-500 bg-zinc-800 rounded transition-all">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  
                  <div className="space-y-1.5 mt-1 flex-1 overflow-y-auto custom-scrollbar pr-1">
                    {dayEvents.map(e => (
                      <div 
                        key={e.id} 
                        title={e.title}
                        className={`text-[10px] font-bold px-2 py-1.5 rounded-md truncate border cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1.5
                          ${e.type === 'ruta' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}
                        `}
                      >
                        {e.type === 'ruta' ? <Truck className="w-3 h-3 shrink-0"/> : <Phone className="w-3 h-3 shrink-0"/>}
                        <span className="truncate">{e.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {isModalOpen && (
        <CreateEventModal 
          onClose={() => setIsModalOpen(false)} 
          selectedDateStr={selectedDateForModal}
        />
      )}
    </div>
  );
}