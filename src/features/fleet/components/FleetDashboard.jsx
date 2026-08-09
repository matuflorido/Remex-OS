import React, { useState, useEffect } from 'react';
import { BarChart3, Truck, DollarSign, Settings, ArrowUpRight, TrendingUp } from 'lucide-react';
import { subscribeToAllTrips } from '../services/fleetService';
import ExpenseCategoryManagerModal from './ExpenseCategoryManagerModal';

export default function FleetDashboard() {
  const [trips, setTrips] = useState([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  useEffect(() => {
    const unsub = subscribeToAllTrips((data) => setTrips(data));
    return () => unsub();
  }, []);

  const closedTrips = trips.filter(t => t.status === 'liquidado');
  const totalKm = closedTrips.reduce((acc, t) => acc + ((t.return?.km || 0) - (t.departure?.km || 0)), 0);
  const totalExpenses = closedTrips.reduce((acc, t) => acc + (t.finances?.expenses || []).reduce((sum, e) => sum + e.amount, 0), 0);
  const costPerKm = totalKm > 0 ? (totalExpenses / totalKm) : 0;

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 overflow-y-auto custom-scrollbar p-2">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-900 border border-zinc-800 p-4 rounded-2xl shadow-lg shrink-0 mb-6">
        <div>
          <h3 className="text-white font-black flex items-center gap-2"><BarChart3 className="w-5 h-5 text-orange-500"/> Análisis de Flota</h3>
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">Estadísticas de rentabilidad</p>
        </div>
        <button 
          onClick={() => setIsCategoryModalOpen(true)}
          className="w-full sm:w-auto bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors border border-zinc-700"
        >
          <Settings className="w-4 h-4 text-orange-500"/> Plan de Cuentas (Categorías)
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl relative overflow-hidden shadow-lg">
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-bl-full -mr-4 -mt-4"></div>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1"><Truck className="w-3 h-3"/> Viajes Liquidados</p>
          <h3 className="text-3xl font-black text-white">{closedTrips.length}</h3>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl relative overflow-hidden shadow-lg">
          <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/10 rounded-bl-full -mr-4 -mt-4"></div>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1"><ArrowUpRight className="w-3 h-3"/> Distancia Histórica</p>
          <h3 className="text-3xl font-black text-white">{totalKm.toLocaleString('es-AR')} <span className="text-lg text-zinc-500">km</span></h3>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl relative overflow-hidden shadow-lg">
          <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/10 rounded-bl-full -mr-4 -mt-4"></div>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1"><DollarSign className="w-3 h-3"/> Gastos Operativos Totales</p>
          <h3 className="text-3xl font-black text-red-400">${totalExpenses.toLocaleString('es-AR')}</h3>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl relative overflow-hidden shadow-lg">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-bl-full -mr-4 -mt-4"></div>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3"/> Costo Promedio por Km</p>
          <h3 className="text-3xl font-black text-emerald-400">${costPerKm.toFixed(2)}</h3>
        </div>
      </div>

      <div className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-2xl flex flex-col items-center justify-center p-8 text-center">
        <BarChart3 className="w-12 h-12 text-zinc-700 mb-4"/>
        <p className="text-zinc-400 font-bold">Gráficos Financieros Detallados Próximamente</p>
        <p className="text-xs text-zinc-500 mt-2">Aquí se visualizará el rendimiento histórico de cada zona logística.</p>
      </div>

      {isCategoryModalOpen && <ExpenseCategoryManagerModal onClose={() => setIsCategoryModalOpen(false)} />}
    </div>
  );
}