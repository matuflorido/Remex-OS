import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalIcon, Plus, Map, Phone, CalendarDays, AlertTriangle, BarChart3, LayoutDashboard, CheckSquare, Filter } from 'lucide-react';
import { subscribeToEvents } from '../services/calendarService';
import { subscribeToZones } from '../../crm/services/crmService';
import { subscribeToTasks } from '../../tasks/services/taskService';
import CreateEventModal from './CreateEventModal';
import HelpTooltip from '../../../components/ui/HelpTooltip';
import FleetDashboard from '../../fleet/components/FleetDashboard';
import TripBoard from '../../fleet/components/TripBoard';
import useUIStore from '../../../store/useUIStore';

export default function CalendarBoard() {
  const { setCurrentView, setActiveTaskId } = useUIStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [zones, setZones] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [eventToEdit, setEventToEdit] = useState(null);
  
  // TRES PESTAÑAS: 'agenda' | 'trips' | 'stats'
  const [activeTab, setActiveTab] = useState('agenda'); 
  
  // NUEVOS ESTADOS DE VISTA Y FILTROS
  const [calendarView, setCalendarView] = useState('monthly'); // weekly, biweekly, monthly, bimonthly, quarterly, annual
  const [filters, setFilters] = useState({ tasks: true, events: true, calls: true, cycles: true });
  
  const todayRef = useRef(null);

  useEffect(() => {
    const unsubEvents = subscribeToEvents(setEvents);
    const unsubZones = subscribeToZones(setZones);
    const unsubTasks = subscribeToTasks(setTasks);
    return () => { unsubEvents(); unsubZones(); unsubTasks(); };
  }, []);

  useEffect(() => {
    if (activeTab === 'agenda' && todayRef.current) {
      setTimeout(() => todayRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    }
  }, [currentDate, events, activeTab, calendarView]);

  const getCalendarDays = () => {
    let start, end;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    if (calendarView === 'weekly') {
      const day = currentDate.getDay();
      start = new Date(year, month, currentDate.getDate() - day);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
    } else if (calendarView === 'biweekly') {
      const day = currentDate.getDay();
      start = new Date(year, month, currentDate.getDate() - day);
      end = new Date(start);
      end.setDate(start.getDate() + 13);
    } else if (calendarView === 'monthly') {
      start = new Date(year, month, 1);
      start.setDate(start.getDate() - start.getDay());
      end = new Date(start);
      end.setDate(start.getDate() + 41); // 42 cells grid
    } else if (calendarView === 'bimonthly') {
      start = new Date(year, month, 1);
      start.setDate(start.getDate() - start.getDay());
      const lastDay = new Date(year, month + 2, 0); // End of next month
      end = new Date(lastDay);
      end.setDate(end.getDate() + (6 - end.getDay())); // Until Saturday
    } else if (calendarView === 'quarterly') {
      start = new Date(year, month, 1);
      start.setDate(start.getDate() - start.getDay());
      const lastDay = new Date(year, month + 3, 0); // End of third month
      end = new Date(lastDay);
      end.setDate(end.getDate() + (6 - end.getDay()));
    } else if (calendarView === 'annual') {
      start = new Date(year, 0, 1);
      start.setDate(start.getDate() - start.getDay());
      const lastDay = new Date(year, 12, 0); // End of December
      end = new Date(lastDay);
      end.setDate(end.getDate() + (6 - end.getDay()));
    }

    const daysArray = [];
    let current = new Date(start);
    while (current <= end) {
      const cYear = current.getFullYear();
      const cMonth = current.getMonth();
      
      let isCurrent = false;
      if (calendarView === 'monthly') isCurrent = cMonth === month;
      else if (calendarView === 'bimonthly') isCurrent = (cMonth === month || cMonth === (month + 1) % 12);
      else if (calendarView === 'quarterly') isCurrent = (cMonth === month || cMonth === (month + 1) % 12 || cMonth === (month + 2) % 12);
      else if (calendarView === 'annual') isCurrent = cYear === year;
      else isCurrent = true; // Para vistas semanales, todos están en foco

      daysArray.push({
        year: cYear,
        month: cMonth,
        day: current.getDate(),
        isCurrentMonth: isCurrent,
        dateStr: `${cYear}-${String(cMonth + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`
      });
      current.setDate(current.getDate() + 1);
    }
    return daysArray;
  };

  const calendarDays = getCalendarDays();

  const prevTime = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      if (calendarView === 'weekly') d.setDate(d.getDate() - 7);
      else if (calendarView === 'biweekly') d.setDate(d.getDate() - 14);
      else if (calendarView === 'monthly') d.setMonth(d.getMonth() - 1);
      else if (calendarView === 'bimonthly') d.setMonth(d.getMonth() - 2);
      else if (calendarView === 'quarterly') d.setMonth(d.getMonth() - 3);
      else if (calendarView === 'annual') d.setFullYear(d.getFullYear() - 1);
      return d;
    });
  };

  const nextTime = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      if (calendarView === 'weekly') d.setDate(d.getDate() + 7);
      else if (calendarView === 'biweekly') d.setDate(d.getDate() + 14);
      else if (calendarView === 'monthly') d.setMonth(d.getMonth() + 1);
      else if (calendarView === 'bimonthly') d.setMonth(d.getMonth() + 2);
      else if (calendarView === 'quarterly') d.setMonth(d.getMonth() + 3);
      else if (calendarView === 'annual') d.setFullYear(d.getFullYear() + 1);
      return d;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleDayClick = (year, month, day) => {
    setSelectedDate(new Date(year, month, day));
    setEventToEdit(null);
    setIsModalOpen(true);
  };

  const handleEventClick = (e, event) => {
    e.stopPropagation();
    setEventToEdit(event);
    const dateRef = (event.type === 'ciclo' && event.repartoStart) ? event.repartoStart : (event.date || new Date().toISOString().split('T')[0]);
    setSelectedDate(new Date(dateRef + 'T00:00:00'));
    setIsModalOpen(true);
  };

  const handleTaskClick = (e, taskId) => {
    e.stopPropagation();
    setActiveTaskId(taskId);
    setCurrentView('tasks');
  };

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  const getCalendarTitle = () => {
    const year = currentDate.getFullYear();
    const m1 = monthNames[currentDate.getMonth()];
    if (calendarView === 'weekly' || calendarView === 'biweekly') {
      const start = currentDate;
      const end = new Date(currentDate);
      end.setDate(end.getDate() + (calendarView === 'weekly' ? 6 : 13));
      if (start.getMonth() === end.getMonth()) return `${m1} ${year}`;
      return `${m1} - ${monthNames[end.getMonth()]} ${year}`;
    } else if (calendarView === 'bimonthly') {
      const nextM = new Date(year, currentDate.getMonth() + 1, 1);
      return `${m1} - ${monthNames[nextM.getMonth()]} ${nextM.getFullYear()}`;
    } else if (calendarView === 'quarterly') {
      const nextM = new Date(year, currentDate.getMonth() + 2, 1);
      return `${m1} - ${monthNames[nextM.getMonth()]} ${nextM.getFullYear()}`;
    } else if (calendarView === 'annual') {
      return `Año ${year}`;
    }
    return `${m1} ${year}`;
  };

  return (
    <div className="flex-1 p-4 flex flex-col h-full bg-zinc-950 min-h-0">
      
      <div className="flex flex-col gap-4 mb-4 shrink-0">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black text-white flex items-center gap-3">
              <CalIcon className="w-7 h-7 text-orange-500" />
              Módulo Logístico
            </h2>
            <HelpTooltip text="Programa Ciclos Logísticos en la Agenda. Cambia al Tablero de Viajes para rendir las Hojas de Ruta. Las Tareas pueden filtrarse para no saturar. (Manual, Cap 5)" />
          </div>
          
          <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-xl shadow-sm overflow-x-auto custom-scrollbar">
            <button 
              onClick={() => setActiveTab('agenda')}
              className={`px-5 py-2 shrink-0 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'agenda' ? 'bg-orange-600 text-black shadow-md' : 'text-zinc-500 hover:text-white'}`}
            >
              <CalendarDays className="w-4 h-4"/> Agenda Operativa
            </button>
            <button 
              onClick={() => setActiveTab('trips')}
              className={`px-5 py-2 shrink-0 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'trips' ? 'bg-orange-600 text-black shadow-md' : 'text-zinc-500 hover:text-white'}`}
            >
              <LayoutDashboard className="w-4 h-4"/> Tablero de Viajes
            </button>
            <button 
              onClick={() => setActiveTab('stats')}
              className={`px-5 py-2 shrink-0 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'stats' ? 'bg-orange-600 text-black shadow-md' : 'text-zinc-500 hover:text-white'}`}
            >
              <BarChart3 className="w-4 h-4"/> Métricas de Flota
            </button>
          </div>
        </div>

        {activeTab === 'agenda' && (
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3">
            
            {/* Panel de Filtros */}
            <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 p-1.5 rounded-xl shadow-sm overflow-x-auto custom-scrollbar w-full xl:w-auto">
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-2 shrink-0">Mostrar:</span>
              <button onClick={() => setFilters(f => ({...f, cycles: !f.cycles}))} className={`px-3 py-1.5 shrink-0 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${filters.cycles ? 'bg-orange-500/20 text-orange-500 border border-orange-500/30' : 'text-zinc-500 hover:bg-zinc-800 border border-transparent'}`}>Viajes</button>
              <button onClick={() => setFilters(f => ({...f, tasks: !f.tasks}))} className={`px-3 py-1.5 shrink-0 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${filters.tasks ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'text-zinc-500 hover:bg-zinc-800 border border-transparent'}`}>Tareas (Tablero)</button>
              <button onClick={() => setFilters(f => ({...f, events: !f.events}))} className={`px-3 py-1.5 shrink-0 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${filters.events ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-zinc-500 hover:bg-zinc-800 border border-transparent'}`}>Eventos</button>
              <button onClick={() => setFilters(f => ({...f, calls: !f.calls}))} className={`px-3 py-1.5 shrink-0 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${filters.calls ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-zinc-500 hover:bg-zinc-800 border border-transparent'}`}>Llamadas</button>
            </div>

            {/* Controles de Navegación y Creación */}
            <div className="flex justify-end items-center gap-3 w-full xl:w-auto overflow-x-auto custom-scrollbar pb-2 xl:pb-0">
              <select 
                value={calendarView} 
                onChange={e => {setCalendarView(e.target.value); setCurrentDate(new Date());}} 
                className="bg-black border border-zinc-800 text-zinc-300 font-bold px-3 py-2.5 rounded-xl text-xs outline-none focus:border-orange-500 transition-colors shrink-0"
              >
                <option value="weekly">1 Semana</option>
                <option value="biweekly">15 Días</option>
                <option value="monthly">Mensual</option>
                <option value="bimonthly">Bimestral</option>
                <option value="quarterly">Trimestral</option>
                <option value="annual">Anual</option>
              </select>

              <button onClick={goToToday} className="bg-zinc-800 hover:bg-orange-600 hover:text-white text-zinc-300 font-black px-4 py-2.5 rounded-xl text-xs transition-colors shrink-0">IR A HOY</button>
              
              <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1 shadow-sm shrink-0">
                <button onClick={prevTime} className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"><ChevronLeft className="w-5 h-5"/></button>
                <span className="w-40 text-center font-black text-white text-sm uppercase tracking-widest">{getCalendarTitle()}</span>
                <button onClick={nextTime} className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"><ChevronRight className="w-5 h-5"/></button>
              </div>
              
              <button onClick={() => setIsModalOpen(true)} className="bg-orange-600 hover:bg-orange-500 text-black font-black px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-[0_0_15px_rgba(249,115,22,0.2)] shrink-0">
                <Plus className="w-5 h-5"/> NUEVO
              </button>
            </div>
          </div>
        )}
      </div>

      {activeTab === 'agenda' && (
        <div className="flex-1 flex flex-col bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl min-h-0">
          <div className="grid grid-cols-7 border-b border-zinc-800 bg-zinc-950/50 shrink-0">
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
              <div key={d} className="p-2 sm:p-3 text-center text-xs font-black text-zinc-500 uppercase tracking-widest border-r border-zinc-800 last:border-r-0">{d}</div>
            ))}
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
            <div className="grid grid-cols-7 auto-rows-[minmax(110px,1fr)] min-h-full">
              {calendarDays.map((dateObj, index) => {
                try {
                  const dayStr = dateObj.dateStr;
                  
                  // Filtrado de Eventos (Agenda CRM)
                  const dayEvents = events.filter(e => {
                    if (e.date !== dayStr || e.type === 'ciclo') return false;
                    if (e.type === 'llamada' && !filters.calls) return false;
                    if ((e.type === 'recorrido' || e.type === 'tarea' || !e.type) && !filters.events) return false;
                    return true;
                  });

                  // Filtrado de Tareas (Tablero de Operaciones)
                  let dayTasks = [];
                  if (filters.tasks) {
                    dayTasks = tasks.filter(t => t.startDate === dayStr);
                  }

                  const realToday = new Date();
                  const isToday = realToday.getDate() === dateObj.day && realToday.getMonth() === dateObj.month && realToday.getFullYear() === dateObj.year;
                  
                  let cellStyle = {};
                  let cycleColor = '#f97316';
                  let isReparto = false;
                  let isPreventa = false;
                  let cycleEvent = null;

                  // Lógica de Ciclos Logísticos
                  if (filters.cycles) {
                    const cycle = events.find(e => e.type === 'ciclo' && (
                      (e.preventaStart && e.preventaEnd && dayStr >= e.preventaStart && dayStr <= e.preventaEnd) ||
                      (e.repartoStart && e.repartoEnd && dayStr >= e.repartoStart && dayStr <= e.repartoEnd)
                    ));
                    
                    if (cycle) {
                      const z = zones.find(z => z.name === cycle.zone);
                      if (z && z.color) cycleColor = z.color;
                      cycleEvent = cycle;
                      if (cycle.repartoStart && cycle.repartoEnd && dayStr >= cycle.repartoStart && dayStr <= cycle.repartoEnd) isReparto = true;
                      else if (cycle.preventaStart && cycle.preventaEnd && dayStr >= cycle.preventaStart && dayStr <= cycle.preventaEnd) isPreventa = true;
                    }
                  }

                  if (isReparto) cellStyle = { backgroundColor: `${cycleColor}26`, borderTop: `3px solid ${cycleColor}` };
                  else if (isPreventa) cellStyle = { borderLeft: `3px solid ${cycleColor}`, background: `linear-gradient(90deg, ${cycleColor}1A 0%, transparent 20%)` };

                  const bgClass = !dateObj.isCurrentMonth && !isReparto && !isPreventa ? 'bg-black/40' : '';

                  return (
                    <div 
                      key={`${dayStr}-${index}`} 
                      ref={isToday ? todayRef : null}
                      onClick={() => handleDayClick(dateObj.year, dateObj.month, dateObj.day)}
                      style={cellStyle}
                      className={`border-r border-b border-zinc-800/50 p-2 hover:bg-zinc-800/30 transition-colors cursor-pointer flex flex-col group relative ${bgClass} ${isReparto ? 'opacity-100' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-1 shrink-0">
                        <span className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full text-xs font-bold ${isToday ? 'bg-orange-500 text-black shadow-[0_0_15px_rgba(249,115,22,0.5)]' : (dateObj.isCurrentMonth ? 'text-zinc-300' : 'text-zinc-600')}`}>
                          {dateObj.day}
                        </span>
                        <Plus className="w-4 h-4 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity"/>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-1 min-h-0">
                        
                        {/* CICLOS (Fondo Completo) */}
                        {isReparto && cycleEvent && (
                          <div onClick={(e) => handleEventClick(e, cycleEvent)} className="text-[9px] font-black uppercase tracking-widest px-1.5 py-1 rounded-sm w-full truncate transition-transform hover:scale-[1.02]" style={{ backgroundColor: cycleColor, color: '#000' }}>
                              Viaje: {cycleEvent.zone || 'Sin Zona'}
                          </div>
                        )}
                        {isPreventa && cycleEvent && (
                          <div onClick={(e) => handleEventClick(e, cycleEvent)} className="text-[9px] font-black uppercase tracking-widest px-1.5 py-1 rounded-sm w-full truncate border transition-transform hover:scale-[1.02] flex items-center gap-1" style={{ borderColor: cycleColor, color: cycleColor, backgroundColor: `${cycleColor}1A` }}>
                            <span className="animate-pulse" style={{color: cycleColor}}>●</span> Preventa
                          </div>
                        )}

                        {/* TAREAS DEL TABLERO (Color Púrpura) */}
                        {dayTasks.map(t => (
                          <div 
                            key={`task-${t.id}`} 
                            onClick={(e) => handleTaskClick(e, t.id)}
                            className={`text-[9px] sm:text-[10px] p-1 sm:p-1.5 rounded-md font-bold truncate flex items-center gap-1.5 transition-transform hover:scale-[1.02] bg-purple-500/10 text-purple-400 border border-purple-500/20 ${!dateObj.isCurrentMonth ? 'opacity-50 hover:opacity-100' : 'opacity-100'}`}
                            title={`Ir a Tarea: ${t.title}`}
                          >
                            <CheckSquare className="w-3 h-3 shrink-0"/>
                            {t.title}
                          </div>
                        ))}

                        {/* EVENTOS NORMALES (Agenda) */}
                        {dayEvents.map(ev => {
                          let evColorClass = 'bg-zinc-800 text-zinc-300 border-zinc-700'; 
                          if (ev.type === 'recorrido') evColorClass = 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
                          else if (ev.type === 'llamada') evColorClass = 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
                          else if (ev.type === 'tarea') evColorClass = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
                          
                          return (
                            <div key={ev.id} onClick={(e) => handleEventClick(e, ev)} className={`text-[9px] sm:text-[10px] p-1 sm:p-1.5 rounded-md font-bold truncate flex items-center gap-1.5 transition-transform hover:scale-[1.02] ${evColorClass} ${!dateObj.isCurrentMonth ? 'opacity-50 hover:opacity-100' : 'opacity-100'}`}>
                              {ev.type === 'recorrido' && <Map className="w-3 h-3 shrink-0"/>}
                              {ev.type === 'llamada' && <Phone className="w-3 h-3 shrink-0"/>}
                              {(!ev.type || ev.type === 'tarea') && <CalendarDays className="w-3 h-3 shrink-0"/>}
                              {ev.title || 'Sin Título'}
                            </div>
                          );
                        })}

                      </div>
                    </div>
                  );
                } catch (err) {
                  return (
                    <div key={`${index}-error`} className="border-r border-b border-red-900/50 bg-red-950/20 p-2 flex flex-col items-center justify-center text-red-500">
                      <AlertTriangle className="w-5 h-5 mb-1" />
                      <span className="text-[10px] font-bold">Error</span>
                    </div>
                  );
                }
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'trips' && <TripBoard />}
      {activeTab === 'stats' && <FleetDashboard />}

      {isModalOpen && <CreateEventModal onClose={() => setIsModalOpen(false)} selectedDate={selectedDate} eventToEdit={eventToEdit} />}
    </div>
  );
}