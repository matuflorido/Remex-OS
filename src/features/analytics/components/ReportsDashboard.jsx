import React from 'react';
import { 
  PieChart, Download, TrendingUp, CheckCircle, 
  AlertTriangle, Activity, MapPin, Layers 
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

// Configuración global para que los gráficos combinen con el tema oscuro
ChartJS.defaults.color = '#a1a1aa';
ChartJS.defaults.font.family = "'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'monospace'";

export default function ReportsDashboard() {

  const lineChartData = {
    labels: ['Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Tareas Creadas',
        data: [850, 920, 880, 1050, 1100, 950, 1200, 1150, 1300, 1250, 1400, 1450],
        borderColor: '#52525b', // zinc-600
        backgroundColor: 'rgba(82, 82, 91, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#52525b',
      },
      {
        label: 'Tareas Cerradas',
        data: [800, 890, 850, 1000, 1080, 920, 1150, 1100, 1280, 1200, 1380, 1420],
        borderColor: '#f97316', // orange-500
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#f97316',
      }
    ]
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8 } }
    },
    scales: {
      y: { grid: { color: '#27272a' }, beginAtZero: true },
      x: { grid: { display: false } }
    }
  };

  const doughnutChartData = {
    labels: ['Bariloche', 'Neuquén', 'Gral. Roca', 'San Martín', 'Viedma', 'El Bolsón'],
    datasets: [{
      data: [33, 24, 15, 11, 9, 8],
      backgroundColor: [
        '#f97316', // orange-500
        '#10b981', // emerald-500
        '#3b82f6', // blue-500
        '#eab308', // yellow-500
        '#8b5cf6', // violet-500
        '#ef4444'  // red-500
      ],
      borderWidth: 0,
      hoverOffset: 4
    }]
  };

  const doughnutChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '75%',
    plugins: {
      legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8, padding: 20 } }
    }
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-950 flex flex-col h-full">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 lg:p-8 shrink-0">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <PieChart className="w-7 h-7 text-orange-500" /> Dashboard Gerencial
          </h2>
          <p className="text-sm text-zinc-500 mt-1">Rendimiento anual consolidado de las 6 sucursales.</p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <select className="flex-1 md:flex-none bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:border-orange-500 outline-none">
            <option>Últimos 12 Meses (2025-2026)</option>
            <option>Año Anterior</option>
          </select>
          <button className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors text-white shrink-0">
            <Download className="w-4 h-4" /> Exportar PDF
          </button>
        </div>
      </div>

      <div className="px-6 lg:px-8 pb-8 space-y-6">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl relative overflow-hidden shadow-lg">
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-bl-full -mr-4 -mt-4"></div>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Total Tareas / Visitas</p>
            <h3 className="text-4xl font-black text-white">12,450</h3>
            <p className="text-sm text-emerald-500 font-bold mt-2 flex items-center gap-1"><TrendingUp className="w-4 h-4"/> +14% vs año ant.</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl relative overflow-hidden shadow-lg">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full -mr-4 -mt-4"></div>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Tasa de Cierre (SLA)</p>
            <h3 className="text-4xl font-black text-white">94.2%</h3>
            <p className="text-sm text-emerald-500 font-bold mt-2 flex items-center gap-1"><CheckCircle className="w-4 h-4"/> Dentro de las 48hs</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl relative overflow-hidden shadow-lg">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-bl-full -mr-4 -mt-4"></div>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Cartera Activa CRM</p>
            <h3 className="text-4xl font-black text-white">3,102</h3>
            <p className="text-sm text-zinc-400 font-bold mt-2 flex items-center gap-1">Clientes y Proveedores</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl relative overflow-hidden shadow-lg">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-bl-full -mr-4 -mt-4"></div>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Cuellos de Botella</p>
            <h3 className="text-4xl font-black text-red-500">24</h3>
            <p className="text-sm text-red-400 font-bold mt-2 flex items-center gap-1"><AlertTriangle className="w-4 h-4"/> Tareas bloqueadas hoy</p>
          </div>
        </div>

        {/* Gráficos Principales */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl lg:col-span-2 shadow-xl">
            <h3 className="text-sm font-black text-white mb-6 uppercase tracking-widest flex items-center gap-2">
              <Activity className="w-4 h-4 text-orange-500" /> Volumen Operativo Mensual (1 Año)
            </h3>
            <div className="h-[300px] w-full">
              <Line data={lineChartData} options={lineChartOptions} />
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-xl">
            <h3 className="text-sm font-black text-white mb-6 uppercase tracking-widest flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-500" /> Carga por Sucursal
            </h3>
            <div className="h-[300px] w-full flex justify-center">
              <Doughnut data={doughnutChartData} options={doughnutChartOptions} />
            </div>
          </div>
        </div>

        {}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="p-6 border-b border-zinc-800 bg-zinc-950/50">
            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-500" /> Desempeño Consolidado de las 6 Sucursales
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black/40 border-b border-zinc-800">
                  <th className="p-4 text-xs font-black text-zinc-500 uppercase">Sucursal / Zona</th>
                  <th className="p-4 text-xs font-black text-zinc-500 uppercase text-center">Tareas Generadas</th>
                  <th className="p-4 text-xs font-black text-zinc-500 uppercase text-center">Tareas Cerradas</th>
                  <th className="p-4 text-xs font-black text-zinc-500 uppercase text-center">Eficiencia</th>
                  <th className="p-4 text-xs font-black text-zinc-500 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                <tr className="hover:bg-zinc-800/30 transition-colors">
                  <td className="p-4 font-bold text-white text-sm">San Carlos de Bariloche <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded ml-2 text-zinc-400">Sede Central</span></td>
                  <td className="p-4 text-center text-zinc-400 font-bold">4,120</td>
                  <td className="p-4 text-center text-white font-bold">3,980</td>
                  <td className="p-4 text-center text-emerald-400 font-black">96.6%</td>
                  <td className="p-4"><span className="text-[10px] px-2 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded uppercase font-bold">Óptimo</span></td>
                </tr>
                <tr className="hover:bg-zinc-800/30 transition-colors">
                  <td className="p-4 font-bold text-white text-sm">Neuquén Capital</td>
                  <td className="p-4 text-center text-zinc-400 font-bold">3,050</td>
                  <td className="p-4 text-center text-white font-bold">2,810</td>
                  <td className="p-4 text-center text-emerald-400 font-black">92.1%</td>
                  <td className="p-4"><span className="text-[10px] px-2 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded uppercase font-bold">Óptimo</span></td>
                </tr>
                <tr className="hover:bg-zinc-800/30 transition-colors">
                  <td className="p-4 font-bold text-white text-sm">General Roca (Valle)</td>
                  <td className="p-4 text-center text-zinc-400 font-bold">1,890</td>
                  <td className="p-4 text-center text-white font-bold">1,600</td>
                  <td className="p-4 text-center text-yellow-400 font-black">84.6%</td>
                  <td className="p-4"><span className="text-[10px] px-2 py-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded uppercase font-bold">Revisión</span></td>
                </tr>
                <tr className="hover:bg-zinc-800/30 transition-colors">
                  <td className="p-4 font-bold text-white text-sm">San Martín de los Andes</td>
                  <td className="p-4 text-center text-zinc-400 font-bold">1,400</td>
                  <td className="p-4 text-center text-white font-bold">1,350</td>
                  <td className="p-4 text-center text-emerald-400 font-black">96.4%</td>
                  <td className="p-4"><span className="text-[10px] px-2 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded uppercase font-bold">Óptimo</span></td>
                </tr>
                <tr className="hover:bg-zinc-800/30 transition-colors">
                  <td className="p-4 font-bold text-white text-sm">Viedma</td>
                  <td className="p-4 text-center text-zinc-400 font-bold">1,150</td>
                  <td className="p-4 text-center text-white font-bold">1,020</td>
                  <td className="p-4 text-center text-yellow-400 font-black">88.6%</td>
                  <td className="p-4"><span className="text-[10px] px-2 py-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded uppercase font-bold">Estable</span></td>
                </tr>
                <tr className="hover:bg-zinc-800/30 transition-colors">
                  <td className="p-4 font-bold text-white text-sm">El Bolsón</td>
                  <td className="p-4 text-center text-zinc-400 font-bold">840</td>
                  <td className="p-4 text-center text-white font-bold">650</td>
                  <td className="p-4 text-center text-red-400 font-black">77.3%</td>
                  <td className="p-4"><span className="text-[10px] px-2 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded uppercase font-bold">Crítico</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}