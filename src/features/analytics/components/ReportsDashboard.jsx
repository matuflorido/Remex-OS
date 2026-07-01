import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, CheckCircle2, Archive, Calendar, Search } from 'lucide-react';
import { subscribeToTasks } from '../../tasks/services/taskService';

export default function ReportsDashboard() {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    // Traemos todas las tareas de la base de datos
    const unsubscribe = subscribeToTasks((data) => {
      setTasks(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 1. Filtramos SOLO las tareas terminadas (Cerradas)
  const closedTasks = tasks.filter(t => t.status === 'closed');

  // 2. Buscador local para el historial
  const filteredHistory = closedTasks.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.assignedArea.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 3. Cálculos para Estadísticas
  const totalClosed = closedTasks.length;
  
  // Calcular rendimiento por área (quién termina más tareas)
  const areaPerformance = closedTasks.reduce((acc, task) => {
    const area = task.assignedArea.split(',')[0]; // Tomamos el área principal
    acc[area] = (acc[area] || 0) + 1;
    return acc;
  }, {});

  // Ordenar áreas por rendimiento para el gráfico
  const sortedAreas = Object.keys(areaPerformance).sort((a, b) => areaPerformance[b] - areaPerformance[a]);
  
  // Encontrar el valor máximo para calcular los porcentajes de las barras
  const maxTasks = sortedAreas.length > 0 ? areaPerformance[sortedAreas[0]] : 1;

  return (
    <div className="flex-1 p-6 overflow-hidden flex flex-col bg-zinc-950">
      
      {/* CABECERA */}
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            Historial y Rendimiento
          </h2>
          <p className="text-sm text-zinc-500 mt-1">Estadísticas en tiempo real y registro de tareas archivadas</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0 overflow-hidden">
        
        {/* COLUMNA IZQUIERDA: Estadísticas (Widgets) */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2">
          
          {/* Widget 1: Tareas Completadas */}
          <div className="bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-900/40 via-zinc-900 to-zinc-900 border border-zinc-800 p-6 rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><CheckCircle2 className="w-24 h-24 text-emerald-500"/></div>
            <p className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-1 relative z-10">Total Histórico</p>
            <h3 className="text-5xl font-black text-white mb-2 relative z-10">{totalClosed}</h3>
            <p className="text-emerald-500 text-sm font-bold flex items-center gap-1 relative z-10">
              <TrendingUp className="w-4 h-4"/> Tareas Finalizadas
            </p>
          </div>

          {/* Widget 2: Gráfico de Barras (Rendimiento por Área) */}
          <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl flex-1 min-h-[300px]">
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-orange-500"/> Rendimiento por Área
            </h3>
            
            <div className="space-y-5">
              {isLoading && <p className="text-zinc-500 text-sm">Calculando estadísticas...</p>}
              {!isLoading && sortedAreas.length === 0 && <p className="text-zinc-600 text-sm italic">No hay tareas cerradas aún.</p>}
              
              {sortedAreas.map((area, index) => {
                const count = areaPerformance[area];
                const percentage = Math.round((count / maxTasks) * 100);
                
                return (
                  <div key={area}>
                    <div className="flex justify-between text-xs font-bold text-zinc-400 mb-2">
                      <span>{area}</span>
                      <span className="text-white">{count} tareas</span>
                    </div>
                    {/* Barra de progreso visual */}
                    <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${index === 0 ? 'bg-orange-500' : 'bg-zinc-600'}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: Tabla de Historial (Archivo) */}
        <div className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-3xl flex flex-col overflow-hidden">
          <div className="p-5 border-b border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-900">
            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Archive className="w-4 h-4 text-blue-500"/> Archivo Documental
            </h3>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar en el archivo..." 
                className="w-full bg-black border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:border-blue-500 outline-none transition-colors"
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-zinc-800 bg-black/20 sticky top-0 backdrop-blur-md z-10">
                  <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">ID Ticket</th>
                  <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Título / Resumen</th>
                  <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Ejecutó</th>
                  <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Vencimiento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filteredHistory.map(task => (
                  <tr key={task.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="p-4">
                      <span className="text-xs font-black text-zinc-400 bg-zinc-900 px-2 py-1 rounded-md border border-zinc-800">{task.id}</span>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-white text-sm">{task.title}</p>
                      <p className="text-xs text-zinc-500 mt-1 truncate max-w-xs">{task.blocks[0]?.content || 'Sin descripción'}</p>
                    </td>
                    <td className="p-4">
                      <span className="text-xs text-zinc-300 font-bold bg-zinc-800 px-2 py-1 rounded-md">{task.assignedArea}</span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 text-xs font-bold text-zinc-500">
                        <Calendar className="w-3 h-3"/> {task.dueDate || 'N/A'}
                      </div>
                    </td>
                  </tr>
                ))}
                {!isLoading && filteredHistory.length === 0 && (
                   <tr>
                     <td colSpan="4" className="p-12 text-center">
                       <Archive className="w-8 h-8 text-zinc-700 mx-auto mb-3"/>
                       <p className="text-zinc-500 font-bold text-sm">No hay tareas archivadas que coincidan.</p>
                     </td>
                   </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}