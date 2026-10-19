import React, { useState, useEffect } from 'react';
import {
   TrendingUp, TrendingDown, DollarSign, AlertTriangle,
   Activity, BarChart3, Plus, ShieldCheck, History, Calendar, Database, Check, Crosshair, Edit2, Trash2, X
} from 'lucide-react';
import {
   Chart as ChartJS, CategoryScale, LinearScale, PointElement,
   LineElement, Title, Tooltip, Legend, Filler
 } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { doc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { subscribeToDebtSnapshots, deleteDebtSnapshotInDb, updateDebtSnapshotInDb } from '../services/financeService';
import DebtSnapshotModal from './DebtSnapshotModal';
import HelpTooltip from '../../../components/ui/HelpTooltip';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);
ChartJS.defaults.color = '#a1a1aa';
ChartJS.defaults.font.family = "'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'monospace'";

// Función para calcular el Excedente Crítico de cualquier Snapshot
const getCriticalExcess = (snap) => {
  if (!snap || !snap.tranches) return 0;
  const snapshotDateObj = new Date(snap.date + 'T00:00:00');
  const sortedTranches = [...snap.tranches].sort((a, b) => new Date(a.date) - new Date(b.date));
  let remainingLimit = snap.limit || 27000000;
  let criticalExcess = 0;
  
  sortedTranches.forEach(t => {
    if (!t.date) return;
    const tDate = new Date(t.date + 'T00:00:00');
    const diffDays = Math.ceil(Math.abs(snapshotDateObj - tDate) / (1000 * 60 * 60 * 24));
    
    const covered = Math.min(t.amount || 0, remainingLimit);
    remainingLimit -= covered;
    
    if (diffDays > 30) {
      criticalExcess += ((t.amount || 0) - covered);
    }
  });
  
  return criticalExcess;
};

export default function FinanceDashboard() {
  const [snapshots, setSnapshots] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [snapshotToEdit, setSnapshotToEdit] = useState(null);
  const [isInjecting, setIsInjecting] = useState('idle');

  // NUEVOS ESTADOS PARA EDICIÓN RÁPIDA DE LÍMITE OPERATIVO
  const [isEditingLimit, setIsEditingLimit] = useState(false);
  const [tempLimit, setTempLimit] = useState(0);

  useEffect(() => {
    const unsub = subscribeToDebtSnapshots((data) => {
      setSnapshots(data);
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  const openNewSnapshotModal = () => {
    setSnapshotToEdit(null);
    setIsModalOpen(true);
  };

  const handleDeleteSnapshot = async (id) => {
    if (window.confirm("¿Seguro que deseas eliminar permanentemente este reporte histórico?")) {
      await deleteDebtSnapshotInDb(id);
    }
  };

  // Función para guardar el Límite Editado Directamente
  const handleUpdateLimit = async () => {
    if (snapshots.length > 0) {
      const latestSnapshot = snapshots[0];
      await updateDebtSnapshotInDb(latestSnapshot.id, {
        ...latestSnapshot,
        limit: Number(tempLimit)
      });
      setIsEditingLimit(false);
    }
  };

  const handleInjectData = async () => {
    setIsInjecting('loading');
    try {
      const batch = writeBatch(db);
      
      const snapshotsToCreate = [
        {
          id: "DS-20260709",
          date: "2026-07-09",
          limit: 27000000,
          totalDebt: 28116221,
          tranches: [{ date: "2026-07-09", amount: 28116221 }]
        },
        {
          id: "DS-20260716",
          date: "2026-07-16",
          limit: 27000000,
          totalDebt: 37692403,
          tranches: [{ date: "2026-07-09", amount: 28116221 }, { date: "2026-07-16", amount: 9576182 }]
        },
        {
          id: "DS-20260723",
          date: "2026-07-23",
          limit: 27000000,
          totalDebt: 53734442,
          tranches: [{ date: "2026-07-09", amount: 28116221 }, { date: "2026-07-16", amount: 9576182 }, { date: "2026-07-23", amount: 16042039 }]
        },
        {
          id: "DS-20260730",
          date: "2026-07-30",
          limit: 27000000,
          totalDebt: 81507182,
          tranches: [{ date: "2026-07-09", amount: 28116221 }, { date: "2026-07-16", amount: 9576182 }, { date: "2026-07-23", amount: 16042039 }, { date: "2026-07-30", amount: 27772740 }]
        },
        {
          id: "DS-20260806",
          date: "2026-08-06",
          limit: 27000000,
          totalDebt: 106253462,
          tranches: [{ date: "2026-07-09", amount: 28116221 }, { date: "2026-07-16", amount: 9576182 }, { date: "2026-07-23", amount: 16042039 }, { date: "2026-07-30", amount: 27772740 }, { date: "2026-08-06", amount: 24746280 }]
        },
        {
          id: "DS-20260813",
          date: "2026-08-13",
          limit: 27000000,
          totalDebt: 122961486,
          tranches: [{ date: "2026-07-09", amount: 28116221 }, { date: "2026-07-16", amount: 9576182 }, { date: "2026-07-23", amount: 16042039 }, { date: "2026-07-30", amount: 27772740 }, { date: "2026-08-06", amount: 24746280 }, { date: "2026-08-13", amount: 16708024 }]
        },
        {
          id: "DS-20260820",
          date: "2026-08-20",
          limit: 27000000,
          totalDebt: 130006272,
          tranches: [{ date: "2026-07-09", amount: 28116221 }, { date: "2026-07-16", amount: 9576182 }, { date: "2026-07-23", amount: 16042039 }, { date: "2026-07-30", amount: 27772740 }, { date: "2026-08-06", amount: 24746280 }, { date: "2026-08-13", amount: 16708024 }, { date: "2026-08-20", amount: 7044786 }]
        }
      ];

      snapshotsToCreate.forEach(snap => {
        const docRef = doc(db, 'debt_snapshots', snap.id);
        const timestampDate = new Date(snap.date + 'T12:00:00Z');
        batch.set(docRef, {
          date: snap.date,
          limit: snap.limit,
          totalDebt: snap.totalDebt,
          tranches: snap.tranches,
          createdAt: timestampDate
        });
      });

      await batch.commit();
      setIsInjecting('success');
      setTimeout(() => setIsInjecting('idle'), 3000);

    } catch (error) {
      console.error("Error cargando datos:", error);
      setIsInjecting('idle');
    }
  };

  if (isLoading) {
    return <div className="p-8 text-orange-500 font-bold animate-pulse tracking-widest text-sm">Cargando métricas financieras...</div>;
  }

  if (snapshots.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-950 flex flex-col items-center justify-center p-6 lg:p-8 min-h-full">
        <div className="text-center max-w-md my-auto">
          <div className="w-20 h-20 bg-zinc-900 border border-zinc-800 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <BarChart3 className="w-10 h-10 text-orange-500" />
          </div>
          <h2 className="text-2xl font-black text-white mb-3">Módulo Financiero</h2>
          <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
            El sistema de control de riesgo crediticio está inactivo. Realiza el primer corte de saldos o inyecta el histórico para comenzar a auditar.
          </p>
          <div className="flex flex-col gap-4">
            <button onClick={openNewSnapshotModal} className="bg-orange-600 hover:bg-orange-500 text-black font-black px-8 py-3.5 rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:-translate-y-1 flex items-center justify-center gap-2 mx-auto w-full">
              <Plus className="w-5 h-5"/> INICIAR AUDITORÍA (MANUAL)
            </button>
            <button
              onClick={handleInjectData}
              disabled={isInjecting !== 'idle'}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold px-8 py-3.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2 mx-auto w-full border border-zinc-700 disabled:opacity-50"
            >
              {isInjecting === 'idle' && <><Database className="w-5 h-5 text-emerald-500"/> INYECTAR HISTÓRICO EXCEL</>}
              {isInjecting === 'loading' && 'Inyectando historial...'}
              {isInjecting === 'success' && <><Check className="w-5 h-5 text-emerald-500"/> ¡Histórico cargado!</>}
            </button>
          </div>
        </div>
        {isModalOpen && <DebtSnapshotModal onClose={() => setIsModalOpen(false)} snapshotToEdit={snapshotToEdit} />}
      </div>
    );
  }

  const latest = snapshots[0];
  const previous = snapshots.length > 1 ? snapshots[1] : null;

  let trendPercentage = 0;
  let trendAmount = 0;

  if (previous && previous.totalDebt > 0) {
    trendAmount = latest.totalDebt - previous.totalDebt;
    trendPercentage = (trendAmount / previous.totalDebt) * 100;
  }

  let healthy = 0;
  let warning = 0;
  let critical = 0;
  const snapshotDateObj = new Date(latest.date + 'T00:00:00');

  (latest.tranches || []).forEach(t => {
    if (!t.date) return;
    const tDate = new Date(t.date + 'T00:00:00');
    const diffDays = Math.ceil(Math.abs(snapshotDateObj - tDate) / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 20) healthy += t.amount;
    else if (diffDays <= 30) warning += t.amount;
    else critical += t.amount;
  });

  const excessRisk = Math.max(0, latest.totalDebt - (latest.limit || 0));
  const chartDataReversed = [...snapshots].slice(0, 10).reverse(); 

  const lineChartData = {
    labels: chartDataReversed.map(s => s.date.split('-').reverse().slice(0, 2).join('/')),
    datasets: [
      {
        label: 'Deuda Total en Calle',
        data: chartDataReversed.map(s => s.totalDebt),
        borderColor: '#f97316', 
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        borderWidth: 3, 
        tension: 0.4, 
        fill: true, 
        pointBackgroundColor: '#f97316',
      },
      {
        label: 'Límite Operativo',
        data: chartDataReversed.map(s => s.limit),
        borderColor: '#10b981', 
        borderDash: [5, 5],
        borderWidth: 2, 
        tension: 0, 
        pointRadius: 0,
        fill: false,
      }
    ]
  };

  const lineChartOptions = {
    responsive: true, 
    maintainAspectRatio: false,
    plugins: { 
      legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8, color: '#a1a1aa' } },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) { label += ': '; }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(context.parsed.y);
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: { grid: { color: '#27272a' }, ticks: { color: '#a1a1aa', callback: (value) => '$' + (value / 1000000) + 'M' } },
      x: { grid: { display: false }, ticks: { color: '#a1a1aa' } }
    }
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-950 block h-full min-h-full">
      <div className="p-6 lg:p-8 flex flex-col space-y-6 pb-24">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-3">
              <Activity className="w-7 h-7 text-orange-500" />
              Finanzas y Riesgo
              <HelpTooltip text="Controla el Límite de Deuda. Los cortes que superen el límite generarán tareas automáticas de cobranza. (Manual, Cap 7)" />
            </h2>
            <p className="text-sm text-zinc-500 mt-1 flex items-center gap-2">
              <Calendar className="w-4 h-4"/> Último corte procesado: <strong className="text-orange-400">{latest.date.split('-').reverse().join('/')}</strong>
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {snapshots.length < 2 && (
              <button
                onClick={handleInjectData}
                disabled={isInjecting !== 'idle'}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold px-4 py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors border border-zinc-700 disabled:opacity-50"
              >
                {isInjecting === 'idle' && <><Database className="w-4 h-4 text-emerald-500"/> INYECTAR HISTÓRICO EXCEL</>}
                {isInjecting === 'loading' && 'CARGANDO...'}
                {isInjecting === 'success' && <><Check className="w-4 h-4 text-emerald-500"/> ¡LISTO!</>}
              </button>
            )}
            <button onClick={openNewSnapshotModal} className="bg-orange-600 hover:bg-orange-500 text-black font-black px-6 py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(249,115,22,0.2)] transition-transform hover:-translate-y-0.5">
              <Plus className="w-4 h-4"/> NUEVO CORTE
            </button>
          </div>
        </div>

        {/* KPIs SUPERIORES */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl relative overflow-hidden shadow-lg">
            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-bl-full -mr-4 -mt-4"></div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1"><DollarSign className="w-3 h-3"/> Deuda Total</p>
            <h3 className="text-3xl font-black text-white">${latest.totalDebt.toLocaleString('es-AR')}</h3>
            
            <div className="mt-3 flex items-center gap-2">
              {trendPercentage > 0 ? (
                <span className="flex items-center gap-1 text-[10px] font-bold bg-red-500/10 text-red-500 px-2 py-1 rounded-md border border-red-500/20">
                  <TrendingUp className="w-3 h-3"/> +{trendPercentage.toFixed(1)}%
                </span>
              ) : trendPercentage < 0 ? (
                <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-md border border-emerald-500/20">
                  <TrendingDown className="w-3 h-3"/> {trendPercentage.toFixed(1)}%
                </span>
              ) : (
                <span className="text-[10px] text-zinc-500 font-bold uppercase">Sin cambios</span>
              )}
              {trendAmount !== 0 && <span className="text-[10px] text-zinc-500 font-mono">(${Math.abs(trendAmount).toLocaleString('es-AR')})</span>}
            </div>
          </div>
          
          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl relative overflow-hidden shadow-lg">
            <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-bl-full -mr-4 -mt-4 pointer-events-none"></div>
            
            <div className="flex justify-between items-start mb-1 relative z-10">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1"><ShieldCheck className="w-3 h-3"/> Límite Operativo</p>
              {!isEditingLimit && (
                <button onClick={() => { setTempLimit(latest.limit || 0); setIsEditingLimit(true); }} className="text-[10px] text-emerald-500 hover:text-emerald-400 underline font-bold cursor-pointer">Editar</button>
              )}
            </div>
            
            {isEditingLimit ? (
              <div className="mt-2 flex gap-2 relative z-10">
                <input
                  type="number"
                  value={tempLimit}
                  onChange={(e) => setTempLimit(e.target.value)}
                  className="w-full bg-black border border-emerald-900/50 rounded-xl px-3 py-2 text-sm text-emerald-400 font-bold outline-none focus:border-emerald-500 transition-colors"
                />
                <button onClick={handleUpdateLimit} className="bg-emerald-600 hover:bg-emerald-500 text-black px-3 rounded-xl font-bold text-xs transition-colors">OK</button>
                <button onClick={() => setIsEditingLimit(false)} className="text-zinc-500 hover:text-white px-1 transition-colors"><X className="w-4 h-4"/></button>
              </div>
            ) : (
              <h3 className="text-3xl font-black text-emerald-400 relative z-10">${(latest.limit || 0).toLocaleString('es-AR')}</h3>
            )}
            <p className="text-[10px] text-zinc-500 font-bold mt-2 uppercase tracking-wide relative z-10">Colchón máximo tolerado</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl relative overflow-hidden shadow-lg lg:col-span-2">
            <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/10 rounded-bl-full -mr-4 -mt-4"></div>
            <div className="flex justify-between items-start mb-1">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Exposición Global de Riesgo</p>
              <span className={`text-[10px] font-black uppercase px-2 py-1 rounded border ${excessRisk > 0 ? 'bg-red-500/10 text-red-500 border-red-500/30' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'}`}>
                {excessRisk > 0 ? 'LÍMITE SUPERADO' : 'ZONA SEGURA'}
              </span>
            </div>
            <h3 className={`text-3xl font-black ${excessRisk > 0 ? 'text-red-500' : 'text-zinc-300'}`}>
              ${excessRisk.toLocaleString('es-AR')}
            </h3>
            
            <div className="mt-3 w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden flex">
              {latest.totalDebt > 0 && (
                <>
                  <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${Math.min(100, ((latest.limit || 0) / latest.totalDebt) * 100)}%` }} title="Límite Sano"></div>
                  {excessRisk > 0 && (
                    <div className="h-full bg-red-500 transition-all duration-1000" style={{ width: `${(excessRisk / latest.totalDebt) * 100}%` }} title="Capital Expuesto"></div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* BLOQUE CENTRAL: GRÁFICO Y DESGLOSE ESTÁTICO */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 shrink-0 min-h-[350px]">
          
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl lg:col-span-2 shadow-xl flex flex-col">
            <h3 className="text-sm font-black text-white mb-6 uppercase tracking-widest flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-orange-500" /> Histórico de Exposición (Evolución)
            </h3>
            <div className="flex-1 w-full relative min-h-[200px]">
              <Line data={lineChartData} options={lineChartOptions} />
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-xl flex flex-col">
            <h3 className="text-sm font-black text-white mb-4 uppercase tracking-widest flex items-center gap-2">
              <History className="w-4 h-4 text-blue-500" /> Antigüedad de Saldos
            </h3>
            
            <div className="flex-1 space-y-3">
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Cartera Sana</span>
                  <span className="text-[9px] text-zinc-600 font-mono">0 a 20 días</span>
                </div>
                <p className="text-base font-black text-zinc-300">${healthy.toLocaleString('es-AR')}</p>
              </div>
              
              <div className="p-3 bg-amber-950/20 border border-amber-900/30 rounded-xl">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Preventiva</span>
                  <span className="text-[9px] text-zinc-600 font-mono">21 a 30 días</span>
                </div>
                <p className="text-base font-black text-amber-400">${warning.toLocaleString('es-AR')}</p>
              </div>

              <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-xl">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Deuda Vencida (Bruta)</span>
                  <span className="text-[9px] text-zinc-600 font-mono">+ 30 días</span>
                </div>
                <p className="text-base font-black text-red-400">${critical.toLocaleString('es-AR')}</p>
              </div>

              {/* Excedente del Último corte (El Objetivo a Cobrar) */}
              <div className="mt-4 pt-4 border-t border-zinc-800">
                <div className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center text-center transition-colors ${getCriticalExcess(latest) > 0 ? 'bg-red-500/10 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.15)]' : 'bg-emerald-500/10 border-emerald-500/50'}`}>
                  <Crosshair className={`w-5 h-5 mb-2 ${getCriticalExcess(latest) > 0 ? 'text-red-500' : 'text-emerald-500'}`} />
                  <span className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${getCriticalExcess(latest) > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    Objetivo a Cobrar Urgente
                  </span>
                  <p className={`text-2xl font-black ${getCriticalExcess(latest) > 0 ? 'text-red-500' : 'text-emerald-400'}`}>
                    ${getCriticalExcess(latest).toLocaleString('es-AR')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TABLA UNIFICADA: REGISTRO Y EVOLUCIÓN HISTÓRICA */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl flex flex-col mt-4">
          <div className="p-6 border-b border-zinc-800 bg-zinc-950/50 flex justify-between items-center">
             <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-500" /> Registro y Evolución Histórica
             </h3>
             <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest hidden sm:block">Auditoría Semana a Semana</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-zinc-950/80 border-b border-zinc-800">
                  <th className="p-5 text-xs font-black text-zinc-500 uppercase tracking-widest">Fecha del Corte</th>
                  <th className="p-5 text-xs font-black text-zinc-500 uppercase tracking-widest">Antigüedad</th>
                  <th className="p-5 text-xs font-black text-zinc-500 uppercase tracking-widest">Deuda Total</th>
                  <th className="p-5 text-xs font-black text-zinc-500 uppercase tracking-widest">Diferencia ($)</th>
                  <th className="p-5 text-xs font-black text-zinc-500 uppercase tracking-widest">Variación (%)</th>
                  <th className="p-5 text-xs font-black text-zinc-500 uppercase tracking-widest">Riesgo Vencido</th>
                  <th className="p-5 text-xs font-black text-zinc-500 uppercase tracking-widest text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                 {snapshots.map((snap, i) => {
                   const prevSnap = snapshots[i + 1];
                   const diffAmount = prevSnap ? snap.totalDebt - prevSnap.totalDebt : 0;
                   const diffPct = prevSnap && prevSnap.totalDebt > 0 ? (diffAmount / prevSnap.totalDebt) * 100 : 0;
                   const excess = getCriticalExcess(snap);
                   
                   // Días transcurridos desde el corte a la fecha actual del sistema
                   const today = new Date();
                   const snapDate = new Date(snap.date + 'T00:00:00');
                   const diasAntiguedad = Math.max(0, Math.floor((today - snapDate) / (1000 * 60 * 60 * 24)));

                   return (
                     <tr key={snap.id} className="hover:bg-zinc-800/30 transition-colors group">
                       <td className="p-5 font-bold text-white text-sm">{snap.date.split('-').reverse().join('/')}</td>
                       <td className="p-5 font-bold text-zinc-400 text-sm">Hace {diasAntiguedad} días</td>
                       <td className="p-5 font-black text-zinc-200 text-sm">${(snap.totalDebt || 0).toLocaleString('es-AR')}</td>
                       
                       <td className="p-5">
                         {prevSnap ? (
                           <span className={`text-sm font-bold ${diffAmount > 0 ? 'text-red-400' : diffAmount < 0 ? 'text-emerald-400' : 'text-zinc-500'}`}>
                             {diffAmount > 0 ? '+' : ''}{diffAmount === 0 ? '-' : `$${Math.abs(diffAmount).toLocaleString('es-AR')}`}
                           </span>
                         ) : (
                           <span className="text-zinc-600 text-sm">-</span>
                         )}
                       </td>
                       
                       <td className="p-5">
                         {prevSnap ? (
                           <span className={`flex items-center gap-1 text-[11px] font-black uppercase px-2 py-1 w-fit rounded border ${diffPct > 0 ? 'bg-red-500/10 text-red-500 border-red-500/30' : diffPct < 0 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                             {diffPct > 0 ? <TrendingUp className="w-3 h-3"/> : diffPct < 0 ? <TrendingDown className="w-3 h-3"/> : null}
                             {diffPct > 0 ? '+' : ''}{diffPct === 0 ? '0%' : `${diffPct.toFixed(1)}%`}
                           </span>
                         ) : (
                           <span className="text-zinc-600 text-[11px] font-black uppercase">Inicial</span>
                         )}
                       </td>

                       <td className="p-5">
                         <span className={`text-[11px] font-black uppercase px-3 py-1.5 rounded border ${excess > 0 ? 'bg-red-500/10 text-red-500 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'}`}>
                           {excess > 0 ? `-$${excess.toLocaleString('es-AR')}` : 'CUBIERTO'}
                         </span>
                       </td>

                       <td className="p-5 text-right">
                         <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                           <button onClick={() => { setSnapshotToEdit(snap); setIsModalOpen(true); }} className="p-2 bg-zinc-800 hover:bg-blue-600 text-zinc-400 hover:text-white rounded-lg transition-colors" title="Editar Registro"><Edit2 className="w-4 h-4" /></button>
                           <button onClick={() => handleDeleteSnapshot(snap.id)} className="p-2 bg-zinc-800 hover:bg-red-600 text-zinc-400 hover:text-white rounded-lg transition-colors" title="Eliminar Permanente"><Trash2 className="w-4 h-4" /></button>
                         </div>
                       </td>
                     </tr>
                   )
                 })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isModalOpen && <DebtSnapshotModal onClose={() => setIsModalOpen(false)} snapshotToEdit={snapshotToEdit} />}
    </div>
  );
}