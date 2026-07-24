import React, { useState, useEffect, useRef } from 'react';
import { 
  PieChart, Download, CheckCircle, 
  AlertTriangle, Activity, MapPin, Layers, Loader2, Users as UsersIcon 
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// Importamos los servicios reales de la base de datos
import { subscribeToTasks } from '../../tasks/services/taskService';
import { subscribeToContacts, subscribeToZones } from '../../crm/services/crmService';
import { subscribeToUsers } from '../../admin/services/adminService';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  Title, Tooltip, Legend, ArcElement, Filler
);

ChartJS.defaults.color = '#a1a1aa';
ChartJS.defaults.font.family = "'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'monospace'";

export default function ReportsDashboard() {
  const [tasks, setTasks] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [zones, setZones] = useState([]);
  const [users, setUsers] = useState([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  
  // Referencia al contenedor que vamos a convertir en PDF
  const dashboardRef = useRef(null);

  useEffect(() => {
    const unsubTasks = subscribeToTasks(setTasks);
    const unsubContacts = subscribeToContacts(setContacts);
    const unsubZones = subscribeToZones(setZones);
    const unsubUsers = subscribeToUsers(setUsers);
    
    setIsLoading(false);

    return () => {
      unsubTasks();
      unsubContacts();
      unsubZones();
      unsubUsers();
    };
  }, []);

  const handleExportPDF = async () => {
    if (!dashboardRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2, 
        backgroundColor: '#09090b', 
        useCORS: true,
        logging: false
      });

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      
      const today = new Date().toISOString().split('T')[0];
      pdf.save(`Reporte_Gerencial_${today}.pdf`);
      
    } catch (error) {
      console.error("Error al exportar a PDF:", error);
    } finally {
      setIsExporting(false);
    }
  };

  // ==========================================
  // MÉTRICAS GLOBALES
  // ==========================================
  const totalTasks = tasks.length;
  const closedTasks = tasks.filter(t => t.status === 'closed').length;
  const closureRate = totalTasks === 0 ? 0 : ((closedTasks / totalTasks) * 100).toFixed(1);
  const activeContacts = contacts.length;
  const blockedTasks = tasks.filter(t => t.status === 'blocked').length;

  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const createdPerMonth = new Array(12).fill(0);
  const closedPerMonth = new Array(12).fill(0);

  tasks.forEach(task => {
    if (task.startDate) {
      const monthIndex = new Date(task.startDate + 'T00:00:00').getMonth();
      if (monthIndex >= 0 && monthIndex <= 11) {
        createdPerMonth[monthIndex]++;
        if (task.status === 'closed') {
          closedPerMonth[monthIndex]++;
        }
      }
    }
  });

  const lineChartData = {
    labels: months,
    datasets: [
      {
        label: 'Tareas Creadas',
        data: createdPerMonth,
        borderColor: '#52525b', 
        backgroundColor: 'rgba(82, 82, 91, 0.1)',
        borderWidth: 2, tension: 0.4, fill: true, pointBackgroundColor: '#52525b',
      },
      {
        label: 'Tareas Cerradas',
        data: closedPerMonth,
        borderColor: '#f97316', 
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        borderWidth: 3, tension: 0.4, fill: true, pointBackgroundColor: '#f97316',
      }
    ]
  };

  const lineChartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8 } } },
    scales: {
      y: { grid: { color: '#27272a' }, beginAtZero: true, ticks: { stepSize: 1 } },
      x: { grid: { display: false } }
    }
  };

  // ==========================================
  // MÉTRICAS DE ZONAS
  // ==========================================
  const zoneLabels = zones.length > 0 ? zones.map(z => z.name) : ['Sin Zonas Creadas'];
  const zoneTasksCount = zones.map(z => {
    return tasks.filter(t => t.assignedArea && t.assignedArea.includes(z.name)).length;
  });

  const doughnutChartData = {
    labels: zoneLabels,
    datasets: [{
      data: zones.length > 0 ? zoneTasksCount : [1], 
      backgroundColor: zones.length > 0 
        ? ['#f97316', '#10b981', '#3b82f6', '#eab308', '#8b5cf6', '#ef4444', '#a855f7', '#ec4899']
        : ['#27272a'],
      borderWidth: 0, hoverOffset: 4
    }]
  };

  const doughnutChartOptions = {
    responsive: true, maintainAspectRatio: false, cutout: '75%',
    plugins: { legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8, padding: 20 } } }
  };

  const tableData = zones.map(zone => {
    const tasksInZone = tasks.filter(t => t.assignedArea && t.assignedArea.includes(zone.name));
    const created = tasksInZone.length;
    const closed = tasksInZone.filter(t => t.status === 'closed').length;
    
    let efficiency = 0;
    if (created > 0) {
      efficiency = Math.round((closed / created) * 100);
    }

    let statusLabel = 'Crítico';
    let statusColor = 'bg-red-500/10 text-red-500 border-red-500/20';
    if (efficiency >= 90) {
      statusLabel = 'Óptimo';
      statusColor = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    } else if (efficiency >= 60) {
      statusLabel = 'Estable';
      statusColor = 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    } else if (created === 0) {
      statusLabel = 'Sin datos';
      statusColor = 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }

    return { name: zone.name, created, closed, efficiency, statusLabel, statusColor };
  });

  // ==========================================
  // NUEVO: MÉTRICAS DEL PERSONAL
  // ==========================================
  const employeeData = users.filter(u => u.isActive !== false).map(user => {
    const assignedTasks = tasks.filter(t => 
      (t.assignedEmployees && t.assignedEmployees.includes(user.name)) || 
      (t.assignedArea && t.assignedArea.includes(user.name))
    );
    
    const total = assignedTasks.length;
    const closed = assignedTasks.filter(t => t.status === 'closed').length;
    const blocked = assignedTasks.filter(t => t.status === 'blocked').length;
    const open = total - closed - blocked; 
    
    const efficiency = total > 0 ? Math.round((closed / total) * 100) : 0;
    
    return { name: user.name, total, closed, open, blocked, efficiency };
  }).filter(e => e.total > 0).sort((a, b) => b.total - a.total); // Ocultar los que tienen 0 tareas

  const barChartData = {
    labels: employeeData.map(e => e.name),
    datasets: [
      {
        label: 'Cerradas',
        data: employeeData.map(e => e.closed),
        backgroundColor: '#10b981', // emerald-500
      },
      {
        label: 'En Proceso',
        data: employeeData.map(e => e.open),
        backgroundColor: '#3b82f6', // blue-500
      },
      {
        label: 'Bloqueadas',
        data: employeeData.map(e => e.blocked),
        backgroundColor: '#ef4444', // red-500
      }
    ]
  };

  const barChartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8 } } },
    scales: {
      x: { stacked: true, grid: { display: false } },
      y: { stacked: true, grid: { color: '#27272a' }, beginAtZero: true, ticks: { stepSize: 1 } }
    }
  };


  if (isLoading) return <div className="p-8 text-orange-500 font-bold">Cargando datos en tiempo real...</div>;

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-950 flex flex-col h-full">
      
      {/* HEADER NO SE EXPORTA (Para que el PDF quede limpio solo con los datos) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 lg:p-8 shrink-0">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <PieChart className="w-7 h-7 text-orange-500" /> Dashboard Gerencial
          </h2>
          <p className="text-sm text-zinc-500 mt-1">Rendimiento y estadísticas en tiempo real.</p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <select className="flex-1 md:flex-none bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:border-orange-500 outline-none">
            <option>Año Actual</option>
            <option>Todos los tiempos</option>
          </select>
          <button 
            onClick={handleExportPDF}
            disabled={isExporting}
            className="bg-orange-600 hover:bg-orange-500 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors text-black shrink-0 disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {isExporting ? 'Generando PDF...' : 'Exportar PDF'}
          </button>
        </div>
      </div>

      {/* ÁREA DE EXPORTACIÓN */}
      <div ref={dashboardRef} className="px-6 lg:px-8 pb-8 space-y-6 pt-4">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl relative overflow-hidden shadow-lg">
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-bl-full -mr-4 -mt-4"></div>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Total Tareas / Eventos</p>
            <h3 className="text-4xl font-black text-white">{totalTasks}</h3>
            <p className="text-[10px] text-zinc-500 font-bold mt-2 uppercase tracking-wide">Registros históricos</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl relative overflow-hidden shadow-lg">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full -mr-4 -mt-4"></div>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Tasa de Cierre Global</p>
            <h3 className="text-4xl font-black text-white">{closureRate}%</h3>
            <p className="text-sm text-emerald-500 font-bold mt-2 flex items-center gap-1"><CheckCircle className="w-4 h-4"/> Tareas completadas</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl relative overflow-hidden shadow-lg">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-bl-full -mr-4 -mt-4"></div>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Cartera Activa CRM</p>
            <h3 className="text-4xl font-black text-white">{activeContacts}</h3>
            <p className="text-[10px] text-zinc-500 font-bold mt-2 uppercase tracking-wide">Clientes y Proveedores</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl relative overflow-hidden shadow-lg">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-bl-full -mr-4 -mt-4"></div>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Cuellos de Botella</p>
            <h3 className={`text-4xl font-black ${blockedTasks > 0 ? 'text-red-500' : 'text-white'}`}>{blockedTasks}</h3>
            <p className={`text-sm font-bold mt-2 flex items-center gap-1 ${blockedTasks > 0 ? 'text-red-400' : 'text-zinc-500'}`}>
              <AlertTriangle className="w-4 h-4"/> Tareas bloqueadas hoy
            </p>
          </div>
        </div>

        {/* NUEVA SECCIÓN: RENDIMIENTO DEL PERSONAL */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl lg:col-span-2 shadow-xl">
            <h3 className="text-sm font-black text-white mb-6 uppercase tracking-widest flex items-center gap-2">
              <UsersIcon className="w-4 h-4 text-blue-500" /> Carga de Trabajo por Empleado
            </h3>
            <div className="h-[300px] w-full">
              <Bar data={barChartData} options={barChartOptions} />
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl flex flex-col">
            <div className="p-6 border-b border-zinc-800 bg-zinc-950/50 shrink-0">
              <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" /> Ranking de Efectividad
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-black/80 backdrop-blur-md border-b border-zinc-800 z-10">
                  <tr>
                    <th className="p-4 text-xs font-black text-zinc-500 uppercase">Personal</th>
                    <th className="p-4 text-xs font-black text-zinc-500 uppercase text-center">Tareas</th>
                    <th className="p-4 text-xs font-black text-zinc-500 uppercase text-center">Eficiencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {employeeData.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="p-8 text-center text-zinc-500 font-bold">Aún no hay tareas asignadas.</td>
                    </tr>
                  ) : (
                    employeeData.map((emp, idx) => (
                      <tr key={idx} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="p-4 font-bold text-white text-sm">{emp.name}</td>
                        <td className="p-4 text-center text-zinc-400 font-bold">{emp.total}</td>
                        <td className="p-4 text-center">
                          <span className={`text-[10px] px-2 py-1 border rounded uppercase font-bold ${emp.efficiency >= 80 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : emp.efficiency >= 50 ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                            {emp.efficiency}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Gráficos Globales Históricos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl lg:col-span-2 shadow-xl">
            <h3 className="text-sm font-black text-white mb-6 uppercase tracking-widest flex items-center gap-2">
              <Activity className="w-4 h-4 text-orange-500" /> Volumen Operativo Anual
            </h3>
            <div className="h-[300px] w-full">
              <Line data={lineChartData} options={lineChartOptions} />
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-xl">
            <h3 className="text-sm font-black text-white mb-6 uppercase tracking-widest flex items-center gap-2">
              <MapPin className="w-4 h-4 text-orange-500" /> Carga por Zona
            </h3>
            <div className="h-[300px] w-full flex justify-center">
              <Doughnut data={doughnutChartData} options={doughnutChartOptions} />
            </div>
          </div>
        </div>

        {/* Tabla de Zonas */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="p-6 border-b border-zinc-800 bg-zinc-950/50">
            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-500" /> Desempeño Consolidado de las Zonas Activas
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black/40 border-b border-zinc-800">
                  <th className="p-4 text-xs font-black text-zinc-500 uppercase">Zona Creada</th>
                  <th className="p-4 text-xs font-black text-zinc-500 uppercase text-center">Tareas Generadas</th>
                  <th className="p-4 text-xs font-black text-zinc-500 uppercase text-center">Tareas Cerradas</th>
                  <th className="p-4 text-xs font-black text-zinc-500 uppercase text-center">Eficiencia</th>
                  <th className="p-4 text-xs font-black text-zinc-500 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {tableData.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-zinc-500 font-bold">Aún no has creado Zonas en el CRM.</td>
                  </tr>
                ) : (
                  tableData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="p-4 font-bold text-white text-sm">{row.name}</td>
                      <td className="p-4 text-center text-zinc-400 font-bold">{row.created}</td>
                      <td className="p-4 text-center text-white font-bold">{row.closed}</td>
                      <td className="p-4 text-center text-white font-black">{row.efficiency}%</td>
                      <td className="p-4">
                        <span className={`text-[10px] px-2 py-1 border rounded uppercase font-bold ${row.statusColor}`}>
                          {row.statusLabel}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}