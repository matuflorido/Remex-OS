import React, { useState, useEffect } from 'react';
import { X, TrendingDown, DollarSign, Calendar, Plus, Trash2, Users, BellRing, AlertTriangle, Edit2 } from 'lucide-react';
import { saveDebtSnapshotInDb, updateDebtSnapshotInDb } from '../services/financeService';
import { subscribeToUsers } from '../../admin/services/adminService';

export default function DebtSnapshotModal({ onClose, snapshotToEdit = null }) {
  const isEditing = !!snapshotToEdit;
  
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [limit, setLimit] = useState(27000000);
  const [tranches, setTranches] = useState([{ date: '', amount: '' }]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  
  const [systemUsers, setSystemUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const unsub = subscribeToUsers((usersData) => {
      setSystemUsers(usersData.filter(u => u.isActive !== false));
    });
    return () => unsub();
  }, []);

  // Si estamos editando, rellenamos el formulario con los datos viejos
  useEffect(() => {
    if (snapshotToEdit) {
      setDate(snapshotToEdit.date);
      setLimit(snapshotToEdit.limit);
      setTranches(snapshotToEdit.tranches);
    }
  }, [snapshotToEdit]);

  const handleAddTranche = () => {
    setTranches([...tranches, { date: '', amount: '' }]);
  };

  const handleRemoveTranche = (index) => {
    setTranches(tranches.filter((_, i) => i !== index));
  };

  const handleTrancheChange = (index, field, value) => {
    const updated = [...tranches];
    updated[index][field] = value;
    setTranches(updated);
  };

  const toggleEmployee = (empName) => {
    if (selectedEmployees.includes(empName)) {
      setSelectedEmployees(selectedEmployees.filter(e => e !== empName));
    } else {
      setSelectedEmployees([...selectedEmployees, empName]);
    }
  };

  const totalDebt = tranches.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validTranches = tranches.filter(t => t.date && t.amount);
    if (validTranches.length === 0) return;

    setIsLoading(true);
    
    const snapshotData = {
      date,
      limit: Number(limit),
      totalDebt,
      tranches: validTranches.map(t => ({ date: t.date, amount: Number(t.amount) }))
    };

    try {
      if (isEditing) {
        await updateDebtSnapshotInDb(snapshotToEdit.id, snapshotData);
      } else {
        await saveDebtSnapshotInDb(snapshotData, selectedEmployees);
      }
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[300] flex justify-center items-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-4xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-3">
              {isEditing ? <Edit2 className="w-6 h-6 text-blue-500" /> : <TrendingDown className="w-6 h-6 text-orange-500" />}
              {isEditing ? 'Corregir Carga Histórica' : 'Nuevo Corte de Saldos (Aging)'}
            </h2>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1 ml-9">Auditoría de Cuentas por Cobrar</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5"/>
          </button>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-900/40 via-zinc-950 to-zinc-950 flex flex-col lg:flex-row gap-8">
          
          {/* Columna Izquierda: Carga de Datos */}
          <div className="flex-1 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2">Fecha de Reporte</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
                  <input 
                    type="date" value={date} onChange={(e) => setDate(e.target.value)}
                    disabled={isEditing}
                    className="w-full bg-black border border-zinc-800 rounded-xl pl-9 pr-4 py-3 text-sm text-white outline-none focus:border-orange-500 color-scheme-dark disabled:opacity-50"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-emerald-500 uppercase mb-2">Límite Permitido</label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500"/>
                  <input 
                    type="number" value={limit} onChange={(e) => setLimit(e.target.value)}
                    className="w-full bg-black border border-emerald-900/50 rounded-xl pl-9 pr-4 py-3 text-sm text-emerald-400 font-bold outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2 border-b border-zinc-800 pb-3 mb-4">
                <DollarSign className="w-4 h-4 text-orange-500"/> Tramos de Deuda Histórica
              </h3>
              
              <div className="space-y-3 mb-4">
                {tranches.map((t, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-zinc-900/50 p-2 rounded-xl border border-zinc-800/80">
                    <div className="flex-1">
                      <input 
                        type="date" value={t.date} onChange={(e) => handleTrancheChange(idx, 'date', e.target.value)}
                        className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-orange-500 color-scheme-dark"
                      />
                    </div>
                    <div className="flex-1 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">$</span>
                      <input 
                        type="number" value={t.amount} onChange={(e) => handleTrancheChange(idx, 'amount', e.target.value)}
                        placeholder="Monto pendiente..."
                        className="w-full bg-black border border-zinc-800 rounded-lg pl-7 pr-3 py-2 text-xs font-bold text-white outline-none focus:border-orange-500"
                      />
                    </div>
                    <button 
                      onClick={() => handleRemoveTranche(idx)} 
                      disabled={tranches.length === 1}
                      className="p-2 bg-black border border-zinc-800 text-zinc-500 rounded-lg hover:text-red-500 disabled:opacity-50 transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5"/>
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-between items-center bg-black/40 p-4 rounded-xl border border-zinc-800/50">
                <button onClick={handleAddTranche} className="text-xs font-bold text-zinc-400 hover:text-white flex items-center gap-2 transition-colors">
                  <Plus className="w-4 h-4"/> Añadir tramo a la lista
                </button>
                <div className="text-right">
                  <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest block">Deuda Total de la Calle:</span>
                  <span className="text-xl font-black text-white">${totalDebt.toLocaleString('es-AR')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Automatización y Alertas (Solo en modo Nuevo) */}
          {!isEditing ? (
            <div className="lg:w-1/3 flex flex-col gap-4">
              <div className="bg-orange-950/20 p-5 rounded-2xl border border-orange-900/30 flex-1">
                <h3 className="text-xs font-black text-orange-500 uppercase tracking-widest flex items-center gap-2 mb-3">
                  <BellRing className="w-4 h-4"/> Acción Inmediata
                </h3>
                <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                  Si tras realizar el cálculo, el sistema detecta capital vencido (+30 días) que supera el límite de <b>${Number(limit).toLocaleString('es-AR')}</b>, generará automáticamente una <b className="text-white">Tarea Crítica</b> de cobranza.
                </p>
                
                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2">Seleccionar personal a notificar:</label>
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                  {systemUsers.map(u => {
                    const isSelected = selectedEmployees.includes(u.name);
                    return (
                      <button
                        key={u.id}
                        onClick={() => toggleEmployee(u.name)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-3 transition-colors border ${isSelected ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' : 'bg-black text-zinc-400 border-zinc-800 hover:border-zinc-600'}`}
                      >
                        <Users className="w-3.5 h-3.5 shrink-0"/> 
                        <span className="truncate">{u.name} <span className="opacity-50 font-normal">({u.role})</span></span>
                      </button>
                    )
                  })}
                </div>
                
                {selectedEmployees.length === 0 && (
                  <div className="mt-3 flex items-start gap-2 text-[10px] text-orange-500/70 font-bold bg-orange-950/30 p-2 rounded-lg">
                    <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5"/> Si no seleccionas a nadie, la tarea no se disparará.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="lg:w-1/3 flex flex-col gap-4">
              <div className="bg-blue-950/20 p-5 rounded-2xl border border-blue-900/30 flex-1">
                <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest flex items-center gap-2 mb-3">
                  <Edit2 className="w-4 h-4"/> Modo Edición
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Estás corrigiendo un reporte histórico. Al guardar, el sistema actualizará los gráficos y la tabla, pero <b>no volverá a disparar tareas automáticas</b> para no duplicar asignaciones al personal.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="p-5 border-t border-zinc-800 bg-zinc-900 shrink-0 flex justify-between items-center">
          <span className="text-xs text-zinc-500 font-bold hidden sm:inline-block">Remex Financial Systems</span>
          <div className="flex gap-3 w-full sm:w-auto">
            <button type="button" onClick={onClose} className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-bold text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">CANCELAR</button>
            <button onClick={handleSubmit} disabled={isLoading || totalDebt === 0} className={`flex-1 sm:flex-none font-black px-8 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(0,0,0,0.3)] ${isEditing ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-orange-600 hover:bg-orange-500 text-black'}`}>
              {isLoading ? 'GUARDANDO...' : (isEditing ? 'ACTUALIZAR CORTE' : 'EJECUTAR CORTE')}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}