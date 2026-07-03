import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalIcon, Plus, Map, Phone } from 'lucide-react';
import { subscribeToEvents } from '../services/calendarService';
import CreateEventModal from './CreateEventModal';

export default function CalendarBoard() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [eventToEdit, setEventToEdit] = useState(null);

  useEffect(() => {
    const unsub = subscribeToEvents(setEvents);
    return () => unsub();
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay(); 

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const handleDayClick = (day) => {
    setSelectedDate(new Date(year, month, day));
    setEventToEdit(null);
    setIsModalOpen(true);
  };

  const handleEventClick = (e, event) => {
    e.stopPropagation(); // Evita que se abra el modal de crear al hacer clic en el evento
    setEventToEdit(event);
    setSelectedDate(new Date(event.date + 'T00:00:00'));
    setIsModalOpen(true);
  };

  const getEventsForDay = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr);
  };

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  return (
    <div className="flex-1 p-6 lg:p-8 flex flex-col h-full bg-zinc-950 overflow-hidden">
      
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <CalIcon className="w-7 h-7 text-orange-500" />
            Agenda Operativa
          </h2>
          <p className="text-sm text-zinc-500 mt-1">Organiza recorridos logísticos y llamadas a clientes.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1">
            <button onClick={prevMonth} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"><ChevronLeft className="w-5 h-5"/></button>
            <span className="w-36 text-center font-black text-white text-sm uppercase tracking-widest">{monthNames[month]} {year}</span>
            <button onClick={nextMonth} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"><ChevronRight className="w-5 h-5"/></button>
          </div>
          <button onClick={() => handleDayClick(new Date().getDate())} className="bg-orange-600 hover:bg-orange-500 text-black font-black px-4 py-2.5 rounded-xl text-sm flex items-center gap-2">
            <Plus className="w-5 h-5"/> NUEVO
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="grid grid-cols-7 border-b border-zinc-800 bg-zinc-950/50 shrink-0">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
            <div key={d} className="p-3 text-center text-xs font-black text-zinc-500 uppercase tracking-widest border-r border-zinc-800 last:border-r-0">{d}</div>
          ))}
        </div>
        
        <div className="flex-1 grid grid-cols-7 auto-rows-fr">
          {emptyDays.map(d => (
             <div key={`empty-${d}`} className="border-r border-b border-zinc-800/50 bg-black/20 p-2"></div>
          ))}
          
          {days.map(day => {
            const dayEvents = getEventsForDay(day);
            const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;

            return (
              <div 
                key={day} 
                onClick={() => handleDayClick(day)}
                className="border-r border-b border-zinc-800/50 p-2 hover:bg-zinc-800/30 transition-colors cursor-pointer flex flex-col group relative"
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold ${isToday ? 'bg-orange-500 text-black' : 'text-zinc-400'}`}>
                    {day}
                  </span>
                  <Plus className="w-4 h-4 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity"/>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                  {dayEvents.map(ev => (
                    <div 
                      key={ev.id} 
                      onClick={(e) => handleEventClick(e, ev)}
                      className={`text-[10px] p-1.5 rounded-md font-bold truncate flex items-center gap-1.5 transition-transform hover:scale-[1.02] ${ev.type === 'recorrido' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}
                    >
                      {ev.type === 'recorrido' ? <Map className="w-3 h-3 shrink-0"/> : <Phone className="w-3 h-3 shrink-0"/>}
                      {ev.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isModalOpen && <CreateEventModal onClose={() => setIsModalOpen(false)} selectedDate={selectedDate} eventToEdit={eventToEdit} />}
    </div>
  );
}